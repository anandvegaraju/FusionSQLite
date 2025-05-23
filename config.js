require('dotenv').config();

const isTestEnvironment = process.env.NODE_ENV === 'test';

const config = {
  database: {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    // Use a different database for tests
    database: isTestEnvironment 
              ? (process.env.TEST_DB_DATABASE || 'pwa_db_test') 
              : (process.env.DB_DATABASE || 'pwa_db'),
    password: isTestEnvironment 
              ? (process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD || 'password') 
              : (process.env.DB_PASSWORD || 'password'),
    port: parseInt(process.env.DB_PORT, 10) || 5432,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback_jwt_secret_for_dev_only_32_chars_long', // Provide a fallback for dev if not in .env
    expiresIn: '1h', // Token expiration time
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', // Fallback for dev
    ivLength: 16,
    algorithm: 'aes-256-cbc',
  },
  port: isTestEnvironment 
        ? (parseInt(process.env.TEST_PORT, 10) || 3001) // Use a different port for test server
        : (parseInt(process.env.PORT, 10) || 3000),
};

// Validate essential configurations for non-test environments
if (!isTestEnvironment) {
  if (!process.env.JWT_SECRET) {
    console.warn('WARNING: JWT_SECRET is not defined in .env, using fallback. THIS IS NOT SECURE FOR PRODUCTION.');
  }
  if (!process.env.ENCRYPTION_KEY) {
    console.warn('WARNING: ENCRYPTION_KEY is not defined in .env, using fallback. THIS IS NOT SECURE FOR PRODUCTION.');
  } else if (Buffer.from(config.encryption.key, 'hex').length !== 32 && process.env.ENCRYPTION_KEY) {
    // Only error if ENCRYPTION_KEY was explicitly set but invalid
    throw new Error('FATAL ERROR: ENCRYPTION_KEY must be a 32-byte hex string (64 hex characters). Please check your .env file.');
  }
} else {
    // For test environment, ensure the fallback keys are valid if no .env overrides are present
    if (Buffer.from(config.encryption.key, 'hex').length !== 32) {
        throw new Error('FATAL ERROR: Fallback ENCRYPTION_KEY for test environment is invalid. It must be a 32-byte hex string.');
    }
}


module.exports = config;
