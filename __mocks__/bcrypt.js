// __mocks__/bcrypt.js
const bcrypt = {
  hash: jest.fn((password, saltRounds) => Promise.resolve(`hashed_${password}_${saltRounds}`)),
  compare: jest.fn((plainPassword, hashedPassword) => {
    // Simple mock logic: if hashed password starts with "hashed_" + plainPassword, it's a match
    // This is a very basic mock and doesn't truly replicate bcrypt's one-way hashing.
    // For more robust tests, you might want to actually hash a known value and compare against it.
    const prefix = `hashed_${plainPassword}_`;
    return Promise.resolve(hashedPassword.startsWith(prefix));
  }),
};

module.exports = bcrypt;
