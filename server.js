const express = require('express');
const config = require('./config');
const authRoutes = require('./routes/authRoutes');
const connectionRoutes = require('./routes/connectionRoutes');
// const db = require('./db'); // Ensure db connects, pool events in db.js handle logging

const app = express();

// Middleware
app.use(express.json()); // For parsing application/json

// Routes
app.get('/api/status', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
app.use('/api/auth', authRoutes);
app.use('/api/connections', connectionRoutes); // Protected by authMiddleware inside the router

// Basic Error Handling Middleware (optional, can be more sophisticated)
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.stack || err);
  // Avoid sending stack trace to client in production
  res.status(500).send('Something broke!');
});

// Start the server
if (process.env.NODE_ENV !== 'test') { // Avoid starting server during tests if any
  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
    console.log(`Database configured for: ${config.database.host}:${config.database.port}/${config.database.database}`);
    console.log(`Ensure your PostgreSQL server is running and accessible.`);
    console.log(`Ensure you have a .env file with DB_USER, DB_PASSWORD, DB_DATABASE, JWT_SECRET, and ENCRYPTION_KEY.`);
    // Test DB connection attempt (optional, as pool connects on first query)
    // db.query('SELECT NOW()', (err, res) => {
    //   if (err) {
    //     console.error('Failed to connect to database on startup:', err);
    //   } else {
    //     console.log('Successfully connected to database and executed a test query.');
    //   }
    // });
  });
}

module.exports = app; // For potential testing
