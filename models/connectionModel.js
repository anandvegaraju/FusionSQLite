const db = require('../db');
const encryptionService = require('../services/encryptionService');

async function createConnection({ userId, name, url, fusionUsername, fusionPassword }) {
  const encryptedFusionPassword = encryptionService.encrypt(fusionPassword);
  try {
    const { rows } = await db.query(
      'INSERT INTO connections (user_id, name, url, fusion_username, encrypted_fusion_password) VALUES ($1, $2, $3, $4, $5) RETURNING id, user_id, name, url, fusion_username, created_at, updated_at',
      [userId, name, url, fusionUsername, encryptedFusionPassword]
    );
    // Do not return encrypted_fusion_password
    return rows[0];
  } catch (error) {
    console.error("Error creating connection:", error);
    throw error;
  }
}

async function getConnectionsByUserId(userId) {
  try {
    const { rows } = await db.query(
      'SELECT id, user_id, name, url, fusion_username, created_at, updated_at FROM connections WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    // Do not return encrypted_fusion_password
    return rows;
  } catch (error) {
    console.error("Error getting connections by user ID:", error);
    throw error;
  }
}

async function getConnectionByIdAndUserId(id, userId) {
  try {
    const { rows } = await db.query(
      'SELECT id, user_id, name, url, fusion_username, created_at, updated_at FROM connections WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    // Do not return encrypted_fusion_password
    // For PUT operations, we might need the encrypted password to avoid re-encryption if not changed,
    // but it's safer to decrypt on demand and re-encrypt.
    // If you need to get the password for use (e.g. making a connection), you'll need a separate function
    // or modify this to include it and then decrypt. For now, keeping it out.
    return rows[0];
  } catch (error) {
    console.error("Error getting connection by ID and user ID:", error);
    throw error;
  }
}

async function getConnectionWithPassword(id, userId) {
    // This function is specifically for retrieving the connection details including the decrypted password.
    // Use with caution and only when necessary (e.g., for query execution).
    try {
        const { rows } = await db.query(
            'SELECT id, user_id, name, url, fusion_username, encrypted_fusion_password FROM connections WHERE id = $1 AND user_id = $2',
            [id, userId]
        );
        if (rows[0]) {
            const connection = rows[0];
            connection.decrypted_fusion_password = encryptionService.decrypt(connection.encrypted_fusion_password);
            // Remove the encrypted password from the object before returning
            delete connection.encrypted_fusion_password;
            return connection;
        }
        return null;
    } catch (error) {
        console.error("Error getting connection with password:", error);
        throw error;
    }
}


async function updateConnection(id, userId, { name, url, fusionUsername, fusionPassword }) {
  // Only encrypt the password if a new one is provided
  let encryptedPasswordToUpdate;
  let queryParams;
  let queryString;

  if (fusionPassword !== undefined) {
    encryptedPasswordToUpdate = encryptionService.encrypt(fusionPassword);
    queryString = `
      UPDATE connections 
      SET name = $3, url = $4, fusion_username = $5, encrypted_fusion_password = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
      RETURNING id, user_id, name, url, fusion_username, created_at, updated_at`;
    queryParams = [id, userId, name, url, fusionUsername, encryptedPasswordToUpdate];
  } else {
    // Password is not being updated
    queryString = `
      UPDATE connections 
      SET name = $3, url = $4, fusion_username = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
      RETURNING id, user_id, name, url, fusion_username, created_at, updated_at`;
    queryParams = [id, userId, name, url, fusionUsername];
  }

  try {
    const { rows } = await db.query(queryString, queryParams);
    return rows[0];
  } catch (error) {
    console.error("Error updating connection:", error);
    throw error;
  }
}

async function deleteConnection(id, userId) {
  try {
    const { rowCount } = await db.query(
      'DELETE FROM connections WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return rowCount > 0; // Returns true if a row was deleted
  } catch (error) {
    console.error("Error deleting connection:", error);
    throw error;
  }
}

module.exports = {
  createConnection,
  getConnectionsByUserId,
  getConnectionByIdAndUserId,
  updateConnection,
  deleteConnection,
  getConnectionWithPassword, // Exporting the new function
};
