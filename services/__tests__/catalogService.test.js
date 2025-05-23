const catalogService = require('../catalogService');
const { makeSoapRequest } = require('../soapService'); // Will use the mock from __mocks__
const biConfig = require('../../config/biPublisherConfig'); // Actual config for paths and templates
const { Buffer } = require('buffer');

jest.mock('../soapService'); // Mocks the entire soapService module

describe('Catalog Service', () => {
  const instanceURL = 'http://fake-fusion.com';
  const fusionUserName = 'testuser';
  const fusionPassword = 'testpassword';
  const objectPath = '/Custom/MyObject.xdm';
  const targetFolderPath = '/Custom/MyFolder';
  const dataModelName = 'TestDM';
  const fullDMPath = `${targetFolderPath}/${dataModelName}.xdm`;

  beforeEach(() => {
    // Clear mock calls before each test
    makeSoapRequest.mockClear();
  });

  describe('objectExists', () => {
    it('should return true if objectExistReturn is "true"', async () => {
      makeSoapRequest.mockResolvedValueOnce({ objectExistReturn: 'true' });
      const exists = await catalogService.objectExists(instanceURL, objectPath, fusionUserName, fusionPassword);
      expect(exists).toBe(true);
      expect(makeSoapRequest).toHaveBeenCalledWith(
        instanceURL,
        biConfig.CATALOG_SERVICE_PATH,
        expect.objectContaining({ 'v2:objectExist': { 'v2:reportObjectAbsolutePath': objectPath } }),
        fusionUserName,
        fusionPassword,
        '"objectExist"'
      );
    });

    it('should return false if objectExistReturn is "false"', async () => {
      makeSoapRequest.mockResolvedValueOnce({ objectExistReturn: 'false' });
      const exists = await catalogService.objectExists(instanceURL, objectPath, fusionUserName, fusionPassword);
      expect(exists).toBe(false);
    });

    it('should return false if objectExistReturn is missing', async () => {
      makeSoapRequest.mockResolvedValueOnce({}); // Empty response
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const exists = await catalogService.objectExists(instanceURL, objectPath, fusionUserName, fusionPassword);
      expect(exists).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it('should return false on SOAP fault or other errors', async () => {
      makeSoapRequest.mockRejectedValueOnce(new Error('SOAP Fault'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const exists = await catalogService.objectExists(instanceURL, objectPath, fusionUserName, fusionPassword);
      expect(exists).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
    
    it('should return false if error message includes "PathNotFoundException"', async () => {
        makeSoapRequest.mockRejectedValueOnce(new Error('Some error PathNotFoundException details'));
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const exists = await catalogService.objectExists(instanceURL, objectPath, fusionUserName, fusionPassword);
        expect(exists).toBe(false);
        expect(consoleErrorSpy).toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
    });
  });

  describe('createOrUpdateDataModel', () => {
    const sqlQuery = "SELECT * FROM DUAL WHERE DUMMY = 'test'";
    const sanitizedSQL = "SELECT * FROM DUAL WHERE DUMMY = ''test''";
    const expectedXDMData = biConfig.XDM_TEMPLATE.replace('{SQL_QUERY_PLACEHOLDER}', sanitizedSQL);
    const encodedExpectedXDM = Buffer.from(expectedXDMData, 'utf8').toString('base64');

    it('should create a new data model if it does not exist and no SQL query is provided', async () => {
      // First call to objectExists returns false
      makeSoapRequest.mockResolvedValueOnce({ objectExistReturn: 'false' }); 
      // Second call for createObject
      makeSoapRequest.mockResolvedValueOnce({ createObjectReturn: `${targetFolderPath}/${dataModelName}.xdm` });

      await catalogService.createOrUpdateDataModel(instanceURL, targetFolderPath, dataModelName, fusionUserName, fusionPassword, '');
      
      expect(makeSoapRequest).toHaveBeenCalledTimes(2);
      // Check objectExists call
      expect(makeSoapRequest).toHaveBeenNthCalledWith(1,
        instanceURL,
        biConfig.CATALOG_SERVICE_PATH,
        expect.objectContaining({'v2:objectExist': {'v2:reportObjectAbsolutePath': fullDMPath } }),
        fusionUserName, fusionPassword, '"objectExist"'
      );
      // Check createObject call
      expect(makeSoapRequest).toHaveBeenNthCalledWith(2,
        instanceURL,
        biConfig.CATALOG_SERVICE_PATH,
        expect.objectContaining({
          'v2:createObject': {
            'v2:folderAbsolutePathURL': targetFolderPath,
            'v2:objectName': dataModelName,
            'v2:objectType': 'xdm',
            'v2:objectDescription': 'Data Model for Fusion SQL Tool',
            'v2:objectData': biConfig.EMPTY_DM_OBJECT_DATA_BASE64, // Uses empty DM for creation
            'v2:userID': fusionUserName,
            'v2:password': fusionPassword,
          },
        }),
        fusionUserName, fusionPassword, '"createObject"'
      );
    });
    
    it('should create a new data model and then update it if SQL query is provided', async () => {
      // 1. objectExists returns false
      makeSoapRequest.mockResolvedValueOnce({ objectExistReturn: 'false' });
      // 2. createObject (using EMPTY_DM_OBJECT_DATA_BASE64)
      makeSoapRequest.mockResolvedValueOnce({ createObjectReturn: `${targetFolderPath}/${dataModelName}.xdm` });
      // 3. updateObject (with the actual SQL query)
      makeSoapRequest.mockResolvedValueOnce({ updateObjectReturn: true });

      await catalogService.createOrUpdateDataModel(instanceURL, targetFolderPath, dataModelName, fusionUserName, fusionPassword, sqlQuery);

      expect(makeSoapRequest).toHaveBeenCalledTimes(3);
      // Call 1: objectExists
      expect(makeSoapRequest.mock.calls[0][2]).toEqual(expect.objectContaining({'v2:objectExist': {'v2:reportObjectAbsolutePath': fullDMPath}}));
      
      // Call 2: createObject
      expect(makeSoapRequest.mock.calls[1][2]).toEqual(expect.objectContaining({
        'v2:createObject': expect.objectContaining({ 'v2:objectData': biConfig.EMPTY_DM_OBJECT_DATA_BASE64 })
      }));
      
      // Call 3: updateObject
      expect(makeSoapRequest.mock.calls[2][2]).toEqual(expect.objectContaining({
        'v2:updateObject': expect.objectContaining({
          'v2:objectAbsolutePath': fullDMPath,
          'v2:objectData': encodedExpectedXDM, // XDM with the SQL query
        })
      }));
    });

    it('should update an existing data model if it exists', async () => {
      // 1. objectExists returns true
      makeSoapRequest.mockResolvedValueOnce({ objectExistReturn: 'true' });
      // 2. updateObject
      makeSoapRequest.mockResolvedValueOnce({ updateObjectReturn: true });

      await catalogService.createOrUpdateDataModel(instanceURL, targetFolderPath, dataModelName, fusionUserName, fusionPassword, sqlQuery);

      expect(makeSoapRequest).toHaveBeenCalledTimes(2);
      // Call 1: objectExists
      expect(makeSoapRequest.mock.calls[0][2]).toEqual(expect.objectContaining({'v2:objectExist': {'v2:reportObjectAbsolutePath': fullDMPath}}));

      // Call 2: updateObject
      expect(makeSoapRequest.mock.calls[1][2]).toEqual(expect.objectContaining({
        'v2:updateObject': {
          'v2:objectAbsolutePath': fullDMPath,
          'v2:objectData': encodedExpectedXDM,
          'v2:userID': fusionUserName,
          'v2:password': fusionPassword,
        },
      }));
    });
    
    it('should throw error if createObject fails', async () => {
      makeSoapRequest.mockResolvedValueOnce({ objectExistReturn: 'false' }); // DM does not exist
      makeSoapRequest.mockRejectedValueOnce(new Error('Create failed')); // createObject fails

      await expect(
        catalogService.createOrUpdateDataModel(instanceURL, targetFolderPath, dataModelName, fusionUserName, fusionPassword, sqlQuery)
      ).rejects.toThrow('Create failed');
    });

    it('should throw error if updateObject (after creation) fails', async () => {
      makeSoapRequest.mockResolvedValueOnce({ objectExistReturn: 'false' }); // DM does not exist
      makeSoapRequest.mockResolvedValueOnce({ createObjectReturn: `${targetFolderPath}/${dataModelName}.xdm` }); // createObject succeeds
      makeSoapRequest.mockRejectedValueOnce(new Error('Update after create failed')); // updateObject fails

      await expect(
        catalogService.createOrUpdateDataModel(instanceURL, targetFolderPath, dataModelName, fusionUserName, fusionPassword, sqlQuery)
      ).rejects.toThrow('Update after create failed');
    });
    
    it('should throw error if updateObject (for existing DM) fails', async () => {
      makeSoapRequest.mockResolvedValueOnce({ objectExistReturn: 'true' }); // DM exists
      makeSoapRequest.mockRejectedValueOnce(new Error('Update existing failed')); // updateObject fails

      await expect(
        catalogService.createOrUpdateDataModel(instanceURL, targetFolderPath, dataModelName, fusionUserName, fusionPassword, sqlQuery)
      ).rejects.toThrow('Update existing failed');
    });
  });
});
