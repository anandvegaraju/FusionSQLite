const jwt = require('jsonwebtoken');
const config = require('../config');
const userModel = require('../models/userModel');

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <TOKEN>

  if (token == null) {
    return res.status(401).json({ message: 'No token provided. Access denied.' });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    // Check if user still exists (optional, but good practice)
    const user = await userModel.findUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found. Invalid token.' });
    }
    req.user = { id: decoded.userId, username: decoded.username, email: user.email }; // Add user info to request object
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired. Please log in again.' });
    }
    if (err.name === 'JsonWebTokenError') {
        return res.status(403).json({ message: 'Invalid token.' });
    }
    console.error("Token verification error:", err);
    return res.status(403).json({ message: 'Token verification failed. Access denied.' });
  }
}

module.exports = {
  authenticateToken,
};
