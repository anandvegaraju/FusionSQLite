const connectionModel = require('../connectionModel');
const db = require('../../db'); // Will be mocked via jest.mock
const encryptionService = require('../../services/encryptionService'); // Will use __mocks__

jest.mock('../../db'); // Mocks db.query
jest.mock('../../services/encryptionService'); // Uses the mock from services/__mocks__/encryptionService.js

describe('Connection Model', () => {
  const userId = 1;
  const connectionData = {
    name: 'Test Fusion Connection',
    url: 'http://fusion.example.com',
    fusionUsername: 'fusion_user',
    fusionPassword: 'fusion_password123',
  };
  const mockConnectionRecord = {
    id: 1,
    user_id: userId,
    name: connectionData.name,
    url: connectionData.url,
    fusion_username: connectionData.fusionUsername,
    // encrypted_fusion_password is not returned by create/getters
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    db.query.mockClear();
    encryptionService.encrypt.mockClear();
    encryptionService.decrypt.mockClear();
  });

  describe('createConnection', () => {
    it('should encrypt the password and create a new connection', async () => {
      db.query.mockResolvedValueOnce({ rows: [mockConnectionRecord], rowCount: 1 });
      encryptionService.encrypt.mockReturnValueOnce(`encrypted_${connectionData.fusionPassword}`);

      const result = await connectionModel.createConnection({ userId, ...connectionData });

      expect(encryptionService.encrypt).toHaveBeenCalledWith(connectionData.fusionPassword);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO connections'),
        [
          userId,
          connectionData.name,
          connectionData.url,
          connectionData.fusionUsername,
          `encrypted_${connectionData.fusionPassword}`,
        ]
      );
      expect(result).toEqual(mockConnectionRecord);
    });
    
    it('should re-throw database errors during creation', async () => {
        db.query.mockRejectedValueOnce(new Error('DB insert error'));
        encryptionService.encrypt.mockReturnValueOnce(`encrypted_${connectionData.fusionPassword}`);

        await expect(connectionModel.createConnection({ userId, ...connectionData })).rejects.toThrow('DB insert error');
    });
  });

  describe('getConnectionsByUserId', () => {
    it('should return a list of connections for a user', async () => {
      const mockConnections = [mockConnectionRecord, { ...mockConnectionRecord, id: 2, name: 'Another Connection' }];
      db.query.mockResolvedValueOnce({ rows: mockConnections, rowCount: 2 });

      const result = await connectionModel.getConnectionsByUserId(userId);

      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT id, user_id, name, url, fusion_username'), [userId]);
      expect(result).toEqual(mockConnections);
    });
    
    it('should return an empty array if no connections found', async () => {
        db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
        const result = await connectionModel.getConnectionsByUserId(userId);
        expect(result).toEqual([]);
    });
  });

  describe('getConnectionByIdAndUserId', () => {
    it('should return a single connection if found', async () => {
      db.query.mockResolvedValueOnce({ rows: [mockConnectionRecord], rowCount: 1 });
      const result = await connectionModel.getConnectionByIdAndUserId(mockConnectionRecord.id, userId);
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT id, user_id, name, url, fusion_username'), [mockConnectionRecord.id, userId]);
      expect(result).toEqual(mockConnectionRecord);
    });
    
    it('should return undefined if connection not found', async () => {
        db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
        const result = await connectionModel.getConnectionByIdAndUserId(999, userId);
        expect(result).toBeUndefined();
    });
  });

  describe('getConnectionWithPassword', () => {
    const connectionId = 1;
    const rawDbRecord = { 
        ...mockConnectionRecord, 
        encrypted_fusion_password: `encrypted_${connectionData.fusionPassword}` 
    };

    it('should return connection details with decrypted password', async () => {
      db.query.mockResolvedValueOnce({ rows: [rawDbRecord], rowCount: 1 });
      encryptionService.decrypt.mockReturnValueOnce(connectionData.fusionPassword);

      const result = await connectionModel.getConnectionWithPassword(connectionId, userId);

      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT id, user_id, name, url, fusion_username, encrypted_fusion_password'), [connectionId, userId]);
      expect(encryptionService.decrypt).toHaveBeenCalledWith(rawDbRecord.encrypted_fusion_password);
      expect(result).toBeDefined();
      expect(result.decrypted_fusion_password).toBe(connectionData.fusionPassword);
      expect(result.encrypted_fusion_password).toBeUndefined(); // Ensure it's removed
    });
    
    it('should return null if connection not found for getConnectionWithPassword', async () => {
        db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
        const result = await connectionModel.getConnectionWithPassword(999, userId);
        expect(result).toBeNull();
        expect(encryptionService.decrypt).not.toHaveBeenCalled();
    });
  });

  describe('updateConnection', () => {
    const connectionId = 1;
    const updatePayload = {
      name: 'Updated Name',
      url: 'http://new.fusion.example.com',
      fusionUsername: 'new_fusion_user',
    };

    it('should update a connection without changing the password if not provided', async () => {
      const expectedUpdatedRecord = { ...mockConnectionRecord, ...updatePayload };
      db.query.mockResolvedValueOnce({ rows: [expectedUpdatedRecord], rowCount: 1 });

      const result = await connectionModel.updateConnection(connectionId, userId, updatePayload);

      expect(encryptionService.encrypt).not.toHaveBeenCalled();
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SET name = $3, url = $4, fusion_username = $5, updated_at = CURRENT_TIMESTAMP'),
        [connectionId, userId, updatePayload.name, updatePayload.url, updatePayload.fusionUsername]
      );
      expect(result).toEqual(expectedUpdatedRecord);
    });

    it('should update a connection and encrypt new password if provided', async () => {
      const newPassword = 'new_secure_password';
      const payloadWithPassword = { ...updatePayload, fusionPassword: newPassword };
      const expectedUpdatedRecord = { ...mockConnectionRecord, ...updatePayload };
      
      db.query.mockResolvedValueOnce({ rows: [expectedUpdatedRecord], rowCount: 1 });
      encryptionService.encrypt.mockReturnValueOnce(`encrypted_${newPassword}`);

      const result = await connectionModel.updateConnection(connectionId, userId, payloadWithPassword);

      expect(encryptionService.encrypt).toHaveBeenCalledWith(newPassword);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SET name = $3, url = $4, fusion_username = $5, encrypted_fusion_password = $6'),
        [connectionId, userId, updatePayload.name, updatePayload.url, updatePayload.fusionUsername, `encrypted_${newPassword}`]
      );
      expect(result).toEqual(expectedUpdatedRecord);
    });
    
    it('should return undefined if no record was updated (e.g. wrong id/user_id)', async () => {
        db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
        const result = await connectionModel.updateConnection(999, userId, updatePayload);
        expect(result).toBeUndefined();
    });
  });

  describe('deleteConnection', () => {
    it('should delete a connection and return true if successful', async () => {
      db.query.mockResolvedValueOnce({ rowCount: 1 }); // rowCount indicates successful deletion
      const result = await connectionModel.deleteConnection(mockConnectionRecord.id, userId);
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM connections'), [mockConnectionRecord.id, userId]);
      expect(result).toBe(true);
    });

    it('should return false if no connection was deleted (e.g., not found)', async () => {
      db.query.mockResolvedValueOnce({ rowCount: 0 });
      const result = await connectionModel.deleteConnection(999, userId);
      expect(result).toBe(false);
    });
  });
});
