const encryptionService = require('../encryptionService');
const config = require('../../config'); // To ensure we're using the same config setup

// Mock config if necessary, but for encryptionService, direct use is fine
// as long as ENCRYPTION_KEY is set in the test environment or through a .env file
// For Jest, you might set up environment variables in jest.config.js or a setup file.
// Let's assume config.js loads .env file correctly or has defaults.

// Ensure a valid ENCRYPTION_KEY is available for tests, either via .env or by mocking config
// A simple way for testing is to ensure your .env.test (if used) or .env has it.
// Or, you can mock the config module:
// jest.mock('../../config', () => ({
//   encryption: {
//     key: 'a_secure_32_byte_hex_key_for_testing_must_be_64_hex_chars_long_0123456789abcdef', // 64 hex chars = 32 bytes
//     ivLength: 16,
//     algorithm: 'aes-256-cbc',
//   },
// }));
// If you mock, ensure the key is valid hex and length.

describe('Encryption Service', () => {
  // This key must be a 64-character hex string (32 bytes) for aes-256-cbc
  // Ensure this matches what your config.js would load, or mock config.js
  const validKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  
  beforeAll(() => {
    // If config.encryption.key is not set via .env for the test environment,
    // you might need to temporarily set it or mock it.
    // This is a check to prevent tests from failing due to missing config.
    if (!config.encryption.key || Buffer.from(config.encryption.key, 'hex').length !== 32) {
      console.warn(`
        WARNING: ENCRYPTION_KEY is not properly configured for tests. 
        Falling back to a default test key for encryptionService.test.js.
        Please ensure ENCRYPTION_KEY in your .env file (or .env.test) is a 64-character hex string.
      `);
      // Temporarily override if not set, for test purposes ONLY
      // This is not ideal; better to configure your test environment.
      config.encryption.key = validKey; 
    } else if (config.encryption.key !== validKey && process.env.NODE_ENV === 'test') {
        // If a different key is set in .env for test, log it for awareness
        console.log(`Using ENCRYPTION_KEY from environment for encryptionService.test.js`);
    }
  });


  it('should encrypt and decrypt a string successfully', () => {
    const originalText = 'mysecretpassword';
    const encryptedText = encryptionService.encrypt(originalText);

    expect(encryptedText).toBeDefined();
    expect(encryptedText).not.toBe(originalText);
    expect(encryptedText.split(':').length).toBe(2); // IV:EncryptedText

    const decryptedText = encryptionService.decrypt(encryptedText);
    expect(decryptedText).toBe(originalText);
  });

  it('should return null when encrypting null or undefined', () => {
    expect(encryptionService.encrypt(null)).toBeNull();
    expect(encryptionService.encrypt(undefined)).toBeNull();
  });

  it('should return null when decrypting null or undefined', () => {
    expect(encryptionService.decrypt(null)).toBeNull();
    expect(encryptionService.decrypt(undefined)).toBeNull();
  });

  it('should handle empty string encryption and decryption', () => {
    const originalText = '';
    const encryptedText = encryptionService.encrypt(originalText);
    expect(encryptedText).toBeDefined();
    const decryptedText = encryptionService.decrypt(encryptedText);
    expect(decryptedText).toBe(originalText);
  });

  it('should return null if decryption fails due to tampered text', () => {
    const originalText = 'test';
    let encryptedText = encryptionService.encrypt(originalText);
    // Tamper with the encrypted part
    const parts = encryptedText.split(':');
    const tamperedEncryptedPart = parts[1].slice(0, -1) + (parts[1].slice(-1) === 'a' ? 'b' : 'a');
    const tamperedText = `${parts[0]}:${tamperedEncryptedPart}`;
    
    const decryptedText = encryptionService.decrypt(tamperedText);
    expect(decryptedText).toBeNull(); // Or handle error as per implementation
  });

  it('should return null if decryption fails due to incorrect IV format', () => {
    const encryptedText = "invalidformat"; // Not IV:EncryptedText
    const decryptedText = encryptionService.decrypt(encryptedText);
    expect(decryptedText).toBeNull();
  });
  
  it('should work with various characters', () => {
    const complexText = "Test@123!&*()_-+=[]{};:'\"<>,.?/|\\`~";
    const encrypted = encryptionService.encrypt(complexText);
    const decrypted = encryptionService.decrypt(encrypted);
    expect(decrypted).toBe(complexText);
  });
});
