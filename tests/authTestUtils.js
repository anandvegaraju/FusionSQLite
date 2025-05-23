const request = require('supertest');
const app = require('../server'); // Assuming your Express app is exported from server.js

// Helper function to register a user
async function registerUser(userData) {
  return request(app)
    .post('/api/auth/register')
    .send(userData);
}

// Helper function to login a user and get a token
async function loginUser(credentials) {
  const response = await request(app)
    .post('/api/auth/login')
    .send(credentials);
  
  if (response.body && response.body.token) {
    return { response, token: response.body.token, userId: response.body.user?.id };
  }
  return { response, token: null, userId: null };
}

module.exports = {
  registerUser,
  loginUser,
};
