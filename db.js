const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool(config.database);

pool.on('connect', () => {
  console.log('Connected to the PostgreSQL database.');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1); // Exit the process on a fatal database error
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(), // For transactions
};
