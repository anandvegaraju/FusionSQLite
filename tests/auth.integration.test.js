const request = require('supertest');
const app = require('../server'); // Path to your Express app
const dbTestUtils = require('./dbTestUtils');
const jwt = require('jsonwebtoken');
const config = require('../config'); // To access JWT secret for decoding

describe('Auth API Endpoints', () => {
  // Connect to the test database and set up schema before all tests
  beforeAll(async () => {
    await dbTestUtils.setupTestDB();
  });

  // Clear tables before each test to ensure isolation
  beforeEach(async () => {
    await dbTestUtils.clearTables();
  });

  // Close the database connection after all tests are done
  afterAll(async () => {
    await dbTestUtils.closeTestDB();
    // If your app instance or db pool doesn't close automatically, you might need to:
    // await app.close(); // Assuming server.js exports a server instance that can be closed
  });

  describe('POST /api/auth/register', () => {
    const validUserData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
    };

    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'User registered successfully.');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe(validUserData.username);
      expect(response.body.user.email).toBe(validUserData.email.toLowerCase());

      // Verify user in database (optional, but good for full integration test)
      const pool = dbTestUtils.getPool();
      const dbRes = await pool.query('SELECT * FROM users WHERE email = $1', [validUserData.email.toLowerCase()]);
      expect(dbRes.rows.length).toBe(1);
      expect(dbRes.rows[0].username).toBe(validUserData.username);
    });

    it('should fail to register a user with a duplicate username', async () => {
      // First registration
      await request(app).post('/api/auth/register').send(validUserData);
      
      // Attempt to register again with same username, different email
      const duplicateUsernameData = { ...validUserData, email: 'another@example.com' };
      const response = await request(app)
        .post('/api/auth/register')
        .send(duplicateUsernameData)
        .expect(409); // Conflict

      expect(response.body).toHaveProperty('message', 'Username already exists.');
    });

    it('should fail to register a user with a duplicate email', async () => {
      await request(app).post('/api/auth/register').send(validUserData);
      
      const duplicateEmailData = { ...validUserData, username: 'anotheruser' };
      const response = await request(app)
        .post('/api/auth/register')
        .send(duplicateEmailData)
        .expect(409);

      expect(response.body).toHaveProperty('message', 'Email already exists.');
    });

    it('should fail to register with missing fields (e.g., password)', async () => {
      const invalidData = { username: 'useronly', email: 'emailonly@example.com' };
      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);
      expect(response.body).toHaveProperty('message', 'Username, email, and password are required.');
    });
    
    it('should fail to register with a short password', async () => {
        const shortPasswordData = { ...validUserData, password: '123' };
        const response = await request(app)
            .post('/api/auth/register')
            .send(shortPasswordData)
            .expect(400);
        expect(response.body).toHaveProperty('message', 'Password must be at least 6 characters long.');
    });

    it('should fail to register with an invalid email format', async () => {
        const invalidEmailData = { ...validUserData, email: 'notanemail' };
        const response = await request(app)
            .post('/api/auth/register')
            .send(invalidEmailData)
            .expect(400);
        expect(response.body).toHaveProperty('message', 'Invalid email format.');
    });
  });

  describe('POST /api/auth/login', () => {
    const userData = {
      username: 'loginuser',
      email: 'login@example.com',
      password: 'password123',
    };

    beforeEach(async () => {
      // Register a user before each login test
      await request(app).post('/api/auth/register').send(userData);
    });

    it('should login an existing user successfully and return a JWT', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: userData.email, password: userData.password })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Login successful.');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(userData.email);

      // Verify JWT payload
      const decodedToken = jwt.verify(response.body.token, config.jwt.secret);
      expect(decodedToken).toHaveProperty('userId');
      expect(decodedToken.username).toBe(userData.username);
    });

    it('should fail to login with incorrect email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'wrong@example.com', password: userData.password })
        .expect(401);
      expect(response.body).toHaveProperty('message', 'Invalid email or password.');
    });

    it('should fail to login with incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: userData.email, password: 'wrongpassword' })
        .expect(401);
      expect(response.body).toHaveProperty('message', 'Invalid email or password.');
    });
    
    it('should fail to login with missing email', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({ password: userData.password })
          .expect(400);
        expect(response.body).toHaveProperty('message', 'Email and password are required.');
    });
  });
  
  describe('POST /api/auth/logout', () => {
    it('should return a success message for logout acknowledgement', async () => {
        // For stateless JWT, logout is primarily client-side.
        // This test just checks if the endpoint exists and acknowledges.
        const response = await request(app)
            .post('/api/auth/logout')
            // .set('Authorization', `Bearer ${someValidToken}`) // If logout requires auth
            .expect(200);
        
        expect(response.body).toHaveProperty('message', 'Logout acknowledged. Please clear your token on the client-side.');
    });
  });
});
