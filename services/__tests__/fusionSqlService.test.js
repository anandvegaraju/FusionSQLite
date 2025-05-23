const fusionSqlService = require('../fusionSqlService');
const catalogService = require('../catalogService'); // Mocked
const reportService = require('../reportService'); // Mocked
const biConfig = require('../../config/biPublisherConfig'); // Actual config for default paths
const { parseStringPromise } = require('xml2js'); // Import for verifying its usage

// Mock the dependent services
jest.mock('../catalogService');
jest.mock('../reportService');
// jest.mock('xml2js', () => ({ // Optional: if we want to test specific parsing behavior
//   parseStringPromise: jest.fn(),
// }));


describe('Fusion SQL Service', () => {
  const instanceURL = 'http://fake-fusion.com';
  const fusionUserName = 'testuser';
  const fusionPassword = 'testpassword';
  const targetFolderPath = biConfig.BI_PUBLISHER_FOLDER_PATH; // Use default from config
  const defaultDMName = 'FusionSQLToolDM';
  const defaultReportName = 'FSTreport';
  const defaultDMPath = `${targetFolderPath}/${defaultDMName}.xdm`;
  const defaultReportPath = `${targetFolderPath}/${defaultReportName}.xdo`;

  beforeEach(() => {
    catalogService.createOrUpdateDataModel.mockClear();
    reportService.createReportIfNotExists.mockClear();
    reportService.runReport.mockClear();
    // if (parseStringPromise.mockClear) parseStringPromise.mockClear(); // Clear if xml2js is mocked
  });

  describe('initFusion', () => {
    it('should call createOrUpdateDataModel and createReportIfNotExists with default values', async () => {
      catalogService.createOrUpdateDataModel.mockResolvedValue({}); // Simulate success
      reportService.createReportIfNotExists.mockResolvedValue({}); // Simulate success

      await fusionSqlService.initFusion(instanceURL, fusionUserName, fusionPassword);

      expect(catalogService.createOrUpdateDataModel).toHaveBeenCalledWith(
        instanceURL,
        targetFolderPath,
        defaultDMName,
        fusionUserName,
        fusionPassword,
        'SELECT 1 FROM DUAL' // Initial placeholder SQL
      );
      expect(reportService.createReportIfNotExists).toHaveBeenCalledWith(
        instanceURL,
        targetFolderPath,
        defaultReportName,
        defaultDMPath, // Path to the DM created/updated above
        fusionUserName,
        fusionPassword
      );
    });

    it('should use provided targetFolderPath', async () => {
      const customFolderPath = '/Custom/SpecificAppFolder';
      const customDMPath = `${customFolderPath}/${defaultDMName}.xdm`;
      await fusionSqlService.initFusion(instanceURL, fusionUserName, fusionPassword, customFolderPath);

      expect(catalogService.createOrUpdateDataModel).toHaveBeenCalledWith(
        instanceURL,
        customFolderPath, // Custom path here
        defaultDMName,
        fusionUserName,
        fusionPassword,
        'SELECT 1 FROM DUAL'
      );
      expect(reportService.createReportIfNotExists).toHaveBeenCalledWith(
        instanceURL,
        customFolderPath, // Custom path here
        defaultReportName,
        customDMPath, // Custom DM path
        fusionUserName,
        fusionPassword
      );
    });

    it('should throw an error if createOrUpdateDataModel fails', async () => {
      catalogService.createOrUpdateDataModel.mockRejectedValueOnce(new Error('DM creation failed'));
      
      await expect(
        fusionSqlService.initFusion(instanceURL, fusionUserName, fusionPassword)
      ).rejects.toThrow('Failed to initialize Fusion environment: DM creation failed');
      expect(reportService.createReportIfNotExists).not.toHaveBeenCalled();
    });

    it('should throw an error if createReportIfNotExists fails', async () => {
      catalogService.createOrUpdateDataModel.mockResolvedValue({}); // DM creation succeeds
      reportService.createReportIfNotExists.mockRejectedValueOnce(new Error('Report creation failed'));

      await expect(
        fusionSqlService.initFusion(instanceURL, fusionUserName, fusionPassword)
      ).rejects.toThrow('Failed to initialize Fusion environment: Report creation failed');
    });
  });

  describe('runSQL', () => {
    const sqlQuery = "SELECT * FROM employees WHERE department = 'Sales'";
    const mockReportXMLData = '<DATA_DS><G_1><EMPLOYEE_ID>1</EMPLOYEE_ID><NAME>John Doe</NAME></G_1></DATA_DS>';
    const expectedParsedResult = { 
        //DATA_DS: { // This depends on explicitRoot: false for parseStringPromise
            G_1: { 
                EMPLOYEE_ID: 1, // Assuming valueProcessors convert '1' to 1
                NAME: 'John Doe' 
            } 
        //}
    };


    it('should successfully run SQL, update DM, run report, and parse results', async () => {
      catalogService.createOrUpdateDataModel.mockResolvedValue({}); // DM update success
      reportService.runReport.mockResolvedValue(mockReportXMLData); // Report run success
      // If mocking parseStringPromise:
      // parseStringPromise.mockResolvedValue(expectedParsedResult);

      const result = await fusionSqlService.runSQL(instanceURL, sqlQuery, fusionUserName, fusionPassword);

      expect(catalogService.createOrUpdateDataModel).toHaveBeenCalledWith(
        instanceURL,
        targetFolderPath,
        defaultDMName,
        fusionUserName,
        fusionPassword,
        sqlQuery
      );
      expect(reportService.runReport).toHaveBeenCalledWith(
        instanceURL,
        defaultReportPath,
        fusionUserName,
        fusionPassword
      );
      expect(result).toEqual(expectedParsedResult);
    });

    it('should throw an error if sqlQuery is empty or whitespace', async () => {
      await expect(fusionSqlService.runSQL(instanceURL, '', fusionUserName, fusionPassword))
        .rejects.toThrow('SQL query cannot be empty.');
      await expect(fusionSqlService.runSQL(instanceURL, '   ', fusionUserName, fusionPassword))
        .rejects.toThrow('SQL query cannot be empty.');
    });

    it('should throw an error if createOrUpdateDataModel fails', async () => {
      catalogService.createOrUpdateDataModel.mockRejectedValueOnce(new Error('DM update failed'));
      
      await expect(
        fusionSqlService.runSQL(instanceURL, sqlQuery, fusionUserName, fusionPassword)
      ).rejects.toThrow('Error running SQL query: DM update failed.');
      expect(reportService.runReport).not.toHaveBeenCalled();
    });

    it('should throw an error if runReport fails', async () => {
      catalogService.createOrUpdateDataModel.mockResolvedValue({});
      reportService.runReport.mockRejectedValueOnce(new Error('Report run failed'));

      await expect(
        fusionSqlService.runSQL(instanceURL, sqlQuery, fusionUserName, fusionPassword)
      ).rejects.toThrow('Error running SQL query: Report run failed.');
    });

    it('should return raw XML if parsing fails', async () => {
      catalogService.createOrUpdateDataModel.mockResolvedValue({});
      reportService.runReport.mockResolvedValue("<malformed xml>"); // Malformed XML

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = await fusionSqlService.runSQL(instanceURL, sqlQuery, fusionUserName, fusionPassword);
      
      expect(result).toBe("<malformed xml>");
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error parsing report XML output:', expect.any(Error));
      consoleErrorSpy.mockRestore();
    });
    
    it('should use custom DM and Report names if provided', async () => {
        const customDM = 'MyCustomDM';
        const customReport = 'MyCustomReport';
        const customReportPath = `${targetFolderPath}/${customReport}.xdo`;

        catalogService.createOrUpdateDataModel.mockResolvedValue({});
        reportService.runReport.mockResolvedValue(mockReportXMLData);

        await fusionSqlService.runSQL(instanceURL, sqlQuery, fusionUserName, fusionPassword, targetFolderPath, customDM, customReport);

        expect(catalogService.createOrUpdateDataModel).toHaveBeenCalledWith(
            instanceURL, targetFolderPath, customDM, fusionUserName, fusionPassword, sqlQuery
        );
        expect(reportService.runReport).toHaveBeenCalledWith(
            instanceURL, customReportPath, fusionUserName, fusionPassword
        );
    });
  });
});
