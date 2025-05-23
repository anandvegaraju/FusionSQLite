const reportService = require('../reportService');
const { makeSoapRequest } = require('../soapService'); // Mocked
const catalogService = require('../catalogService'); // Mocked
const biConfig = require('../../config/biPublisherConfig'); // Actual config
const { Buffer } = require('buffer');

jest.mock('../soapService');
jest.mock('../catalogService');

describe('Report Service', () => {
  const instanceURL = 'http://fake-fusion.com';
  const fusionUserName = 'testuser';
  const fusionPassword = 'testpassword';
  const targetFolderPath = '/Custom/MyReports';
  const reportName = 'TestReport';
  const dataModelPath = `${targetFolderPath}/TestDataModel.xdm`;
  const reportPath = `${targetFolderPath}/${reportName}.xdo`;

  beforeEach(() => {
    makeSoapRequest.mockClear();
    catalogService.objectExists.mockClear();
  });

  describe('createReportIfNotExists', () => {
    it('should create a report if it does not exist', async () => {
      catalogService.objectExists.mockResolvedValueOnce(false); // Report does not exist
      makeSoapRequest.mockResolvedValueOnce({ createReportReturn: reportPath }); // Successful creation

      const result = await reportService.createReportIfNotExists(instanceURL, targetFolderPath, reportName, dataModelPath, fusionUserName, fusionPassword);

      expect(catalogService.objectExists).toHaveBeenCalledWith(instanceURL, reportPath, fusionUserName, fusionPassword);
      expect(makeSoapRequest).toHaveBeenCalledWith(
        instanceURL,
        biConfig.REPORT_SERVICE_PATH,
        expect.objectContaining({
          'v2:createReport': {
            'v2:reportName': reportName,
            'v2:folderAbsolutePathURL': targetFolderPath,
            'v2:dataModelURL': dataModelPath,
            'v2:updateFlag': true,
            'v2:userID': fusionUserName,
            'v2:password': fusionPassword,
          },
        }),
        fusionUserName,
        fusionPassword,
        '"createReport"'
      );
      expect(result).toEqual({ createReportReturn: reportPath });
    });

    it('should not create a report if it already exists', async () => {
      catalogService.objectExists.mockResolvedValueOnce(true); // Report exists

      const result = await reportService.createReportIfNotExists(instanceURL, targetFolderPath, reportName, dataModelPath, fusionUserName, fusionPassword);

      expect(catalogService.objectExists).toHaveBeenCalledWith(instanceURL, reportPath, fusionUserName, fusionPassword);
      expect(makeSoapRequest).not.toHaveBeenCalled();
      expect(result).toBe(`Report ${reportPath} already exists.`);
    });

    it('should throw an error if createReport SOAP call fails', async () => {
      catalogService.objectExists.mockResolvedValueOnce(false); // Report does not exist
      makeSoapRequest.mockRejectedValueOnce(new Error('SOAP Create Failed'));

      await expect(
        reportService.createReportIfNotExists(instanceURL, targetFolderPath, reportName, dataModelPath, fusionUserName, fusionPassword)
      ).rejects.toThrow('SOAP Create Failed');
    });
  });

  describe('runReport', () => {
    const mockReportData = '<DATA_DS><G_1><COL1>Value1</COL1></G_1></DATA_DS>';
    const mockReportBytesBase64 = Buffer.from(mockReportData).toString('base64');

    it('should run a report and return decoded report data', async () => {
      makeSoapRequest.mockResolvedValueOnce({
        runReportReturn: { reportBytes: mockReportBytesBase64 },
      });

      const result = await reportService.runReport(instanceURL, reportPath, fusionUserName, fusionPassword);

      expect(makeSoapRequest).toHaveBeenCalledWith(
        instanceURL,
        biConfig.REPORT_SERVICE_PATH,
        expect.objectContaining({
          'v2:runReport': {
            'v2:reportRequest': expect.objectContaining({
              'v2:reportAbsolutePath': reportPath,
              'v2:attributeFormat': 'xml',
              'v2:byPassCache': true,
            }),
            'v2:userID': fusionUserName,
            'v2:password': fusionPassword,
          },
        }),
        fusionUserName,
        fusionPassword,
        '"runReport"'
      );
      expect(result).toBe(mockReportData);
    });

    it('should throw an error if reportBytes is missing in the response', async () => {
      makeSoapRequest.mockResolvedValueOnce({ runReportReturn: {} }); // Missing reportBytes

      await expect(
        reportService.runReport(instanceURL, reportPath, fusionUserName, fusionPassword)
      ).rejects.toThrow('Failed to retrieve report bytes from BI Publisher.');
    });
    
    it('should throw an error if runReport SOAP call fails', async () => {
      makeSoapRequest.mockRejectedValueOnce(new Error('SOAP Run Failed'));

      await expect(
        reportService.runReport(instanceURL, reportPath, fusionUserName, fusionPassword)
      ).rejects.toThrow('SOAP Run Failed');
    });
  });
});
