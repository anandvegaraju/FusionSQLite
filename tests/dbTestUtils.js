const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const config = require('../config'); // Uses test DB config when NODE_ENV=test

let pool;

// Function to get the pool, initializing if it doesn't exist
const getPool = () => {
  if (!pool) {
    // Ensure we are using the test database configuration
    if (config.database.database !== (process.env.TEST_DB_DATABASE || 'pwa_db_test')) {
        // This check is important to prevent accidental operations on a non-test DB
        // However, config.js already handles selecting the test DB name.
        // This is more of a safeguard if config.js logic were to change or be bypassed.
        console.error('CRITICAL: Attempting to use non-test database for test utilities. Current DB from config:', config.database.database);
        throw new Error('Test utilities are not configured for the test database. Check NODE_ENV and config.js');
    }
    pool = new Pool(config.database);
    pool.on('error', (err) => {
      console.error('Test Database Pool Error:', err);
      // process.exit(-1); // Consider if tests should halt on pool errors
    });
  }
  return pool;
};


async function setupTestDB() {
  const currentPool = getPool();
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8');
    // Split statements carefully, especially if there are comments or complex PL/pgSQL blocks
    // A simple split by ';' might not be robust for all SQL files.
    // For this schema.sql, it should be okay as it's mostly CREATE TABLE and simple functions/triggers.
    const statements = schemaSql.split(';'); 
    
    const client = await currentPool.connect();
    try {
      for (const statement of statements) {
        if (statement.trim() !== '') {
          await client.query(statement);
        }
      }
      console.log('Test database schema created/verified successfully.');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error setting up test database schema:', error);
    throw error; // Re-throw to fail tests if setup fails
  }
}

async function clearTables() {
  const currentPool = getPool();
  const client = await currentPool.connect();
  try {
    // Order matters due to foreign key constraints (delete from connections first)
    await client.query('DELETE FROM connections');
    await client.query('DELETE FROM users');
    // console.log('Tables (connections, users) cleared.');
  } catch (error) {
    console.error('Error clearing tables:', error);
    // Don't re-throw here, as this might be called in afterEach/All and hide the original test error
  } finally {
    client.release();
  }
}

async function closeTestDB() {
  if (pool) {
    try {
      await pool.end();
      pool = null; // Reset pool variable
      // console.log('Test database pool closed.');
    } catch (error) {
      console.error('Error closing test database pool:', error);
    }
  }
}

module.exports = {
  getPool, // Export getPool for direct DB operations in tests if needed
  setupTestDB,
  clearTables,
  closeTestDB,
};
