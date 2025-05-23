const userModel = require('../userModel');
const db = require('../../db'); // db uses pg, which will be mocked
const bcrypt = require('bcrypt'); // Will use __mocks__/bcrypt.js

// Mock the db module. Since db.js exports an object with a query function,
// we need to mock that query function. pg.js mock handles the Pool.
jest.mock('../../db', () => ({
  query: jest.fn(),
}));
jest.mock('bcrypt'); // Already created __mocks__/bcrypt.js

describe('User Model', () => {
  beforeEach(() => {
    // Clear all instances and calls to constructor and all methods:
    db.query.mockClear();
    bcrypt.hash.mockClear();
    bcrypt.compare.mockClear();
  });

  describe('createUser', () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
    };
    const mockUserRecord = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it('should create a new user, hash password, and return the user data', async () => {
      db.query.mockResolvedValueOnce({ rows: [mockUserRecord], rowCount: 1 });
      bcrypt.hash.mockResolvedValueOnce('hashed_password123_10'); // from mock

      const user = await userModel.createUser(userData);

      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 10);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        [userData.username, userData.email.toLowerCase(), 'hashed_password123_10']
      );
      expect(user).toEqual(mockUserRecord);
    });

    it('should throw an error if username already exists (unique constraint)', async () => {
      db.query.mockRejectedValueOnce({
        code: '23505', // PostgreSQL unique violation code
        constraint: 'users_username_key',
      });

      await expect(userModel.createUser(userData)).rejects.toThrow('Username already exists.');
      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 10); // Hash is still called
    });

    it('should throw an error if email already exists (unique constraint)', async () => {
      db.query.mockRejectedValueOnce({
        code: '23505',
        constraint: 'users_email_key',
      });
      await expect(userModel.createUser(userData)).rejects.toThrow('Email already exists.');
    });

    it('should re-throw other database errors', async () => {
      db.query.mockRejectedValueOnce(new Error('Some other DB error'));
      await expect(userModel.createUser(userData)).rejects.toThrow('Some other DB error');
    });
  });

  describe('findUserByEmail', () => {
    const email = 'test@example.com';
    const mockUser = { id: 1, email: 'test@example.com', password_hash: 'hashed_password' };

    it('should find and return a user by email (case-insensitive)', async () => {
      db.query.mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 });
      const user = await userModel.findUserByEmail(email.toUpperCase()); // Test case insensitivity
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM users WHERE email = $1'), [email.toLowerCase()]);
      expect(user).toEqual(mockUser);
    });

    it('should return undefined if user not found by email', async () => {
      db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      const user = await userModel.findUserByEmail(email);
      expect(user).toBeUndefined();
    });
  });

  describe('findUserById', () => {
    const userId = 1;
    const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };

    it('should find and return a user by ID (excluding password_hash)', async () => {
      db.query.mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 });
      const user = await userModel.findUserById(userId);
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT id, username, email FROM users WHERE id = $1'), [userId]);
      expect(user).toEqual(mockUser);
    });

    it('should return undefined if user not found by ID', async () => {
      db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      const user = await userModel.findUserById(userId);
      expect(user).toBeUndefined();
    });
  });

  describe('verifyPassword', () => {
    const plainPassword = 'password123';
    const hashedPassword = 'hashed_password123_10'; // Matches mock bcrypt logic

    it('should return true for correct password', async () => {
      bcrypt.compare.mockResolvedValueOnce(true); // Mock bcrypt.compare directly
      const isMatch = await userModel.verifyPassword(plainPassword, hashedPassword);
      expect(bcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
      expect(isMatch).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      bcrypt.compare.mockResolvedValueOnce(false);
      const isMatch = await userModel.verifyPassword('wrongpassword', hashedPassword);
      expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', hashedPassword);
      expect(isMatch).toBe(false);
    });
  });
});
