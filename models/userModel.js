const db = require('../db');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10; // Standard practice for bcrypt

async function createUser({ username, email, password }) {
  const lowerEmail = email.toLowerCase();
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  try {
    const { rows } = await db.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at, updated_at',
      [username, lowerEmail, passwordHash]
    );
    return rows[0];
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      if (error.constraint === 'users_username_key') {
        throw new Error('Username already exists.');
      }
      if (error.constraint === 'users_email_key') {
        throw new Error('Email already exists.');
      }
    }
    throw error; // Re-throw other errors
  }
}

async function findUserByEmail(email) {
  const lowerEmail = email.toLowerCase();
  const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [lowerEmail]);
  return rows[0];
}

async function findUserById(id) {
  const { rows } = await db.query('SELECT id, username, email FROM users WHERE id = $1', [id]);
  return rows[0];
}

async function verifyPassword(plainPassword, hashedPassword) {
  return bcrypt.compare(plainPassword, hashedPassword);
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  verifyPassword,
};
