// __mocks__/encryptionService.js
const encryptionService = {
  encrypt: jest.fn((text) => text ? `encrypted_${text}` : null),
  decrypt: jest.fn((text) => text ? text.replace(/^encrypted_/, '') : null),
};

module.exports = encryptionService;
