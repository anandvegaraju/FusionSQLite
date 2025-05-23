const crypto = require('crypto');
const config = require('../config');

const ALGORITHM = config.encryption.algorithm;
const KEY = Buffer.from(config.encryption.key, 'hex'); // Key must be 32 bytes for AES-256
const IV_LENGTH = config.encryption.ivLength; // For AES, this is 16 bytes

function encrypt(text) {
  if (text == null) { // Handle null or undefined passwords
    return null;
  }
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`; // Store IV with encrypted text
}

function decrypt(text) {
  if (text == null) {
    return null;
  }
  const parts = text.split(':');
  if (parts.length !== 2) {
    console.error("Decryption error: Invalid encrypted text format. Expected 'iv:encryptedText'.");
    // Potentially throw an error or return a specific value indicating corruption
    // For now, returning null to avoid crashing but signaling failure.
    return null; 
  }
  const iv = Buffer.from(parts.shift(), 'hex');
  const encryptedText = parts.join(':');
  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error("Decryption failed:", error.message);
    // It's crucial to handle errors here, as incorrect keys or corrupted data will cause exceptions.
    // Depending on the application's needs, you might re-throw, return null, or log more details.
    return null; 
  }
}

module.exports = {
  encrypt,
  decrypt,
};
