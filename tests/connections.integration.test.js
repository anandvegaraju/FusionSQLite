const request = require('supertest');
const app = require('../server'); // Path to your Express app
const dbTestUtils = require('./dbTestUtils');
const authTestUtils = require('./authTestUtils');
const encryptionService = require('../services/encryptionService'); // To verify encryption

describe('Connection API Endpoints', () => {
  let testUserToken;
  let testUserId;

  const userCredentials = {
    username: 'connTestUser',
    email: 'conn@example.com',
    password: 'password123',
  };

  const connectionData1 = {
    name: 'My Fusion Prod',
    url: 'https://prod.fusion.com',
    fusionUsername: 'prod_user',
    fusionPassword: 'prod_password',
  };
  const connectionData2 = {
    name: 'My Fusion Test',
    url: 'https://test.fusion.com',
    fusionUsername: 'test_user',
    fusionPassword: 'test_password',
  };

  beforeAll(async () => {
    await dbTestUtils.setupTestDB();
    // Register and login a user to get a token for these tests
    await authTestUtils.registerUser(userCredentials);
    const loginRes = await authTestUtils.loginUser({ email: userCredentials.email, password: userCredentials.password });
    testUserToken = loginRes.token;
    testUserId = loginRes.userId; // Assuming loginUser helper returns userId
  });

  beforeEach(async () => {
    // Clear only connections table as user should persist for all tests in this suite
    const pool = dbTestUtils.getPool();
    await pool.query('DELETE FROM connections');
  });

  afterAll(async () => {
    // Clear all tables after this suite
    await dbTestUtils.clearTables();
    await dbTestUtils.closeTestDB();
  });

  describe('POST /api/connections', () => {
    it('should create a new connection successfully', async () => {
      const response = await request(app)
        .post('/api/connections')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(connectionData1)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(connectionData1.name);
      expect(response.body.url).toBe(connectionData1.url);
      expect(response.body.fusion_username).toBe(connectionData1.fusionUsername);
      expect(response.body).not.toHaveProperty('encrypted_fusion_password'); // Password should not be returned

      // Verify in DB
      const pool = dbTestUtils.getPool();
      const dbRes = await pool.query('SELECT * FROM connections WHERE id = $1 AND user_id = $2', [response.body.id, testUserId]);
      expect(dbRes.rows.length).toBe(1);
      expect(dbRes.rows[0].name).toBe(connectionData1.name);
      // Verify password was encrypted
      const decryptedPassword = encryptionService.decrypt(dbRes.rows[0].encrypted_fusion_password);
      expect(decryptedPassword).toBe(connectionData1.fusionPassword);
    });

    it('should fail to create a connection with missing fields', async () => {
      const incompleteData = { name: 'Incomplete' };
      const response = await request(app)
        .post('/api/connections')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(incompleteData)
        .expect(400);
      expect(response.body).toHaveProperty('message', 'Name, URL, Fusion username, and Fusion password are required.');
    });
    
    it('should fail to create a connection without authentication', async () => {
        await request(app)
          .post('/api/connections')
          .send(connectionData1)
          .expect(401); // Or 403 if token is invalid/expired
    });
  });

  describe('GET /api/connections', () => {
    it('should retrieve all connections for the authenticated user', async () => {
      // Create two connections for the user
      await request(app).post('/api/connections').set('Authorization', `Bearer ${testUserToken}`).send(connectionData1);
      await request(app).post('/api/connections').set('Authorization', `Bearer ${testUserToken}`).send(connectionData2);

      const response = await request(app)
        .get('/api/connections')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(2);
      expect(response.body.some(conn => conn.name === connectionData1.name)).toBe(true);
      expect(response.body.some(conn => conn.name === connectionData2.name)).toBe(true);
    });

    it('should return an empty array if no connections exist', async () => {
      const response = await request(app)
        .get('/api/connections')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('GET /api/connections/:connection_id', () => {
    let createdConnectionId;

    beforeEach(async () => {
      const res = await request(app).post('/api/connections').set('Authorization', `Bearer ${testUserToken}`).send(connectionData1);
      createdConnectionId = res.body.id;
    });

    it('should retrieve a specific connection by ID', async () => {
      const response = await request(app)
        .get(`/api/connections/${createdConnectionId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);
      
      expect(response.body.id).toBe(createdConnectionId);
      expect(response.body.name).toBe(connectionData1.name);
    });

    it('should return 404 if connection not found', async () => {
      await request(app)
        .get('/api/connections/9999') // Non-existent ID
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(404);
    });

    // Add test for trying to access another user's connection if you have multiple users
  });

  describe('PUT /api/connections/:connection_id', () => {
    let createdConnectionId;
    const updateData = {
      name: 'Updated Fusion Prod',
      url: 'https://updated.fusion.com',
      fusionUsername: 'updated_user',
      fusionPassword: 'updated_password', // Test password update
    };

    beforeEach(async () => {
      const res = await request(app).post('/api/connections').set('Authorization', `Bearer ${testUserToken}`).send(connectionData1);
      createdConnectionId = res.body.id;
    });

    it('should update an existing connection successfully (with password change)', async () => {
      const response = await request(app)
        .put(`/api/connections/${createdConnectionId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.url).toBe(updateData.url);
      expect(response.body.fusion_username).toBe(updateData.fusionUsername);

      // Verify password change in DB
      const pool = dbTestUtils.getPool();
      const dbRes = await pool.query('SELECT encrypted_fusion_password FROM connections WHERE id = $1', [createdConnectionId]);
      const decryptedPassword = encryptionService.decrypt(dbRes.rows[0].encrypted_fusion_password);
      expect(decryptedPassword).toBe(updateData.fusionPassword);
    });
    
    it('should update an existing connection successfully (without password change)', async () => {
        const updateDataNoPassword = {
            name: 'Updated Name Only',
            url: connectionData1.url, // Keep same URL
            fusionUsername: connectionData1.fusionUsername, // Keep same username
            // No fusionPassword field
        };
        
        // Get original encrypted password to compare
        const pool = dbTestUtils.getPool();
        const initialDbRes = await pool.query('SELECT encrypted_fusion_password FROM connections WHERE id = $1', [createdConnectionId]);
        const originalEncryptedPassword = initialDbRes.rows[0].encrypted_fusion_password;

        const response = await request(app)
            .put(`/api/connections/${createdConnectionId}`)
            .set('Authorization', `Bearer ${testUserToken}`)
            .send(updateDataNoPassword)
            .expect(200);

        expect(response.body.name).toBe(updateDataNoPassword.name);

        // Verify password did NOT change in DB
        const finalDbRes = await pool.query('SELECT encrypted_fusion_password FROM connections WHERE id = $1', [createdConnectionId]);
        expect(finalDbRes.rows[0].encrypted_fusion_password).toBe(originalEncryptedPassword);
    });


    it('should return 404 if updating a non-existent connection', async () => {
      await request(app)
        .put('/api/connections/9999')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(updateData)
        .expect(404);
    });
    
    it('should fail to update with missing required fields (name, url, username)', async () => {
        const incompleteUpdateData = { name: 'Only Name Updated' };
        const response = await request(app)
            .put(`/api/connections/${createdConnectionId}`)
            .set('Authorization', `Bearer ${testUserToken}`)
            .send(incompleteUpdateData)
            .expect(400);
        expect(response.body).toHaveProperty('message', 'Name, URL, and Fusion username are required for update.');
    });
  });

  describe('DELETE /api/connections/:connection_id', () => {
    let createdConnectionId;

    beforeEach(async () => {
      const res = await request(app).post('/api/connections').set('Authorization', `Bearer ${testUserToken}`).send(connectionData1);
      createdConnectionId = res.body.id;
    });

    it('should delete a connection successfully', async () => {
      await request(app)
        .delete(`/api/connections/${createdConnectionId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(204); // No content

      // Verify in DB
      const pool = dbTestUtils.getPool();
      const dbRes = await pool.query('SELECT * FROM connections WHERE id = $1', [createdConnectionId]);
      expect(dbRes.rows.length).toBe(0);
    });

    it('should return 404 if deleting a non-existent connection', async () => {
      await request(app)
        .delete('/api/connections/9999')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(404);
    });
  });
});
