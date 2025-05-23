const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const config = require('../config');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Username, email, and password are required.' });
  }

  // Basic validation (more can be added, e.g., password strength)
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format.' });
  }

  try {
    const newUser = await userModel.createUser({ username, email, password });
    // Optionally, log in the user directly by issuing a JWT
    // For now, just a success message.
    res.status(201).json({
      message: 'User registered successfully.',
      user: { id: newUser.id, username: newUser.username, email: newUser.email },
    });
  } catch (error) {
    if (error.message.includes('already exists')) {
        return res.status(409).json({ message: error.message }); // 409 Conflict
    }
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error registering user.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const user = await userModel.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' }); // Generic message
    }

    const isMatch = await userModel.verifyPassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' }); // Generic message
    }

    // User matched, create JWT
    const payload = {
      userId: user.id,
      username: user.username,
    };

    const token = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

    res.json({
      message: 'Login successful.',
      token: token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in.' });
  }
});

// POST /api/auth/logout (Informational - actual logout is client-side token removal)
router.post('/logout', (req, res) => {
    // For stateless JWT, logout is primarily a client-side operation (deleting the token).
    // If a token denylist/blacklist is implemented on the backend, this endpoint would handle adding the token to it.
    // For this implementation, we'll just acknowledge.
    res.status(200).json({ message: 'Logout acknowledged. Please clear your token on the client-side.' });
});


module.exports = router;
