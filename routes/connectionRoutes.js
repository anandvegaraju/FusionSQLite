const express = require('express');
const router = express.Router();
const connectionModel = require('../models/connectionModel');
const { authenticateToken } = require('../middleware/authMiddleware');

// All connection routes are protected
router.use(authenticateToken);

// GET /api/connections - List all connections for the authenticated user
router.get('/', async (req, res) => {
  try {
    const connections = await connectionModel.getConnectionsByUserId(req.user.id);
    res.json(connections);
  } catch (error) {
    console.error('Error fetching connections:', error);
    res.status(500).json({ message: 'Failed to retrieve connections.' });
  }
});

// POST /api/connections - Create a new connection for the authenticated user
router.post('/', async (req, res) => {
  const { name, url, fusionUsername, fusionPassword } = req.body;
  const userId = req.user.id;

  if (!name || !url || !fusionUsername || !fusionPassword) {
    return res.status(400).json({ message: 'Name, URL, Fusion username, and Fusion password are required.' });
  }

  try {
    const newConnection = await connectionModel.createConnection({
      userId,
      name,
      url,
      fusionUsername,
      fusionPassword, // The model will handle encryption
    });
    res.status(201).json(newConnection);
  } catch (error) {
    console.error('Error creating connection:', error);
    res.status(500).json({ message: 'Failed to create connection.' });
  }
});

// GET /api/connections/:connection_id - Get a specific connection
router.get('/:connection_id', async (req, res) => {
  const { connection_id } = req.params;
  const userId = req.user.id;

  try {
    const connection = await connectionModel.getConnectionByIdAndUserId(connection_id, userId);
    if (!connection) {
      return res.status(404).json({ message: 'Connection not found or access denied.' });
    }
    // The model by default does not return the password.
    res.json(connection);
  } catch (error) {
    console.error('Error fetching connection:', error);
    res.status(500).json({ message: 'Failed to retrieve connection.' });
  }
});

// PUT /api/connections/:connection_id - Update a specific connection
router.put('/:connection_id', async (req, res) => {
  const { connection_id } = req.params;
  const userId = req.user.id;
  const { name, url, fusionUsername, fusionPassword } = req.body; // fusionPassword is optional

  if (!name || !url || !fusionUsername) {
    return res.status(400).json({ message: 'Name, URL, and Fusion username are required for update.' });
  }

  try {
    // First, verify the connection exists and belongs to the user.
    const existingConnection = await connectionModel.getConnectionByIdAndUserId(connection_id, userId);
    if (!existingConnection) {
      return res.status(404).json({ message: 'Connection not found or access denied.' });
    }

    const updatedConnection = await connectionModel.updateConnection(connection_id, userId, {
      name,
      url,
      fusionUsername,
      fusionPassword, // Pass it; model handles if it's undefined
    });

    if (!updatedConnection) { // Should not happen if existingConnection check passed, but as a safeguard
        return res.status(404).json({ message: 'Connection not found or failed to update.' });
    }
    res.json(updatedConnection);
  } catch (error) {
    console.error('Error updating connection:', error);
    res.status(500).json({ message: 'Failed to update connection.' });
  }
});

// DELETE /api/connections/:connection_id - Delete a specific connection
router.delete('/:connection_id', async (req, res) => {
  const { connection_id } = req.params;
  const userId = req.user.id;

  try {
    const deleted = await connectionModel.deleteConnection(connection_id, userId);
    if (!deleted) {
      return res.status(404).json({ message: 'Connection not found or access denied.' });
    }
    res.status(204).send(); // No content
  } catch (error) {
    console.error('Error deleting connection:', error);
    res.status(500).json({ message: 'Failed to delete connection.' });
  }
});

module.exports = router;
