require('dotenv').config();

const config = {
  database: {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_DATABASE || 'pwa_db',
    password: process.env.DB_PASSWORD || 'password',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: '1h', // Token expiration time
  },
  encryption: {
    // Ensure this key is 32 bytes (256 bits) for AES-256, provided as a hex string
    // For example, a 64-character hex string.
    key: process.env.ENCRYPTION_KEY,
    // IV length for AES-256-CBC is 16 bytes
    ivLength: 16,
    algorithm: 'aes-256-cbc',
  },
  port: parseInt(process.env.PORT, 10) || 3000,
};

// Validate essential configurations
if (!config.jwt.secret) {
  throw new Error('FATAL ERROR: JWT_SECRET is not defined. Please set it in your .env file.');
}

if (!config.encryption.key) {
  throw new Error('FATAL ERROR: ENCRYPTION_KEY is not defined. Please set it in your .env file.');
} else if (Buffer.from(config.encryption.key, 'hex').length !== 32) {
  throw new Error('FATAL ERROR: ENCRYPTION_KEY must be a 32-byte hex string (64 hex characters). Please check your .env file.');
}

module.exports = config;
