const { makeSoapRequest } = require('./soapService');
const biConfig = require('../config/biPublisherConfig');
const catalogService = require('./catalogService'); // May need objectExists
const { Buffer } = require('buffer');

/**
 * Creates a BI Publisher report if it doesn't already exist.
 * The report is based on a data model assumed to be at folderPath/FusionSQLToolDM.xdm.
 * @param {string} instanceURL - The base URL of the Oracle Fusion instance.
 * @param {string} targetFolderPath - The folder where the report should be created (e.g., biConfig.BI_PUBLISHER_FOLDER_PATH).
 * @param {string} reportName - The name for the report (e.g., FSTreport).
 * @param {string} dataModelPath - The full path to the data model (e.g., /Custom/Folder/FusionSQLToolDM.xdm).
 * @param {string} fusionUserName - The username for BI Publisher authentication.
 * @param {string} fusionPassword - The password for BI Publisher authentication.
 * @returns {Promise<object|string>} Response from createReport or a status message.
 */
async function createReportIfNotExists(instanceURL, targetFolderPath, reportName, dataModelPath, fusionUserName, fusionPassword) {
  const reportPath = `${targetFolderPath}/${reportName}.xdo`;
  const reportExists = await catalogService.objectExists(instanceURL, reportPath, fusionUserName, fusionPassword);

  if (reportExists) {
    console.log(`Report ${reportPath} already exists.`);
    return `Report ${reportPath} already exists.`;
  }

  console.log(`Report ${reportPath} does not exist. Creating report...`);
  const soapBodyPayload = {
    'v2:createReport': {
      'v2:reportName': reportName, // Name without .xdo
      'v2:folderAbsolutePathURL': targetFolderPath,
      'v2:dataModelURL': dataModelPath,
      'v2:templateFileName': '', // No specific template file, will use default
      'v2:templateData': '',   // No template data
      'v2:XLIFFFileName': '',
      'v2:XLIFFData': '',
      'v2:updateFlag': true, // As per Python script
      'v2:userID': fusionUserName,
      'v2:password': fusionPassword,
    },
  };

  try {
    const responseBody = await makeSoapRequest(
      instanceURL,
      biConfig.REPORT_SERVICE_PATH,
      soapBodyPayload,
      fusionUserName,
      fusionPassword,
      '"createReport"' // SOAPAction often matches operation name
    );
    console.log(`Report ${reportName}.xdo created successfully in ${targetFolderPath}.`);
    return responseBody; // Contains createReportReturn, often a path or boolean
  } catch (error) {
    console.error(`Error creating report ${reportName}.xdo in ${targetFolderPath}:`, error.message);
    throw error;
  }
}

/**
 * Runs a BI Publisher report and returns the report output as a string.
 * @param {string} instanceURL - The base URL of the Oracle Fusion instance.
 * @param {string} reportPath - The absolute path to the report (e.g., /Custom/Folder/FSTreport.xdo).
 * @param {string} fusionUserName - The username for BI Publisher authentication.
 * @param {string} fusionPassword - The password for BI Publisher authentication.
 * @returns {Promise<string>} The report output, typically XML data, as a string.
 */
async function runReport(instanceURL, reportPath, fusionUserName, fusionPassword) {
  const soapBodyPayload = {
    'v2:runReport': {
      'v2:reportRequest': {
        'v2:attributeFormat': 'xml', // As per Python script
        'v2:byPassCache': true,      // As per Python script
        'v2:flattenXML': true,       // As per Python script
        'v2:reportAbsolutePath': reportPath,
        'v2:sizeOfDataChunkDownload': -1, // As per Python script
      },
      'v2:userID': fusionUserName,
      'v2:password': fusionPassword,
    },
  };

  try {
    const responseBody = await makeSoapRequest(
      instanceURL,
      biConfig.REPORT_SERVICE_PATH,
      soapBodyPayload,
      fusionUserName,
      fusionPassword,
      '"runReport"' // SOAPAction
    );

    if (responseBody && responseBody.runReportReturn && responseBody.runReportReturn.reportBytes) {
      const reportBytesBase64 = responseBody.runReportReturn.reportBytes;
      return Buffer.from(reportBytesBase64, 'base64').toString('utf8');
    } else {
      console.error('runReport response did not contain reportBytes:', responseBody);
      throw new Error('Failed to retrieve report bytes from BI Publisher.');
    }
  } catch (error) {
    // The Python script has a try-except around runReport that calls createDataModel and createReport
    // This suggests that runReport might fail if the DM or Report doesn't exist.
    // However, our initFusion function should handle this.
    // If an error still occurs here, it's likely a genuine issue with running the report or a SOAP fault.
    console.error(`Error running report ${reportPath}:`, error.message);
    // If it's a SOAP fault, makeSoapRequest would have thrown a formatted error.
    // If it's another type of error, we re-throw it.
    throw error;
  }
}

module.exports = {
  createReportIfNotExists,
  runReport,
};
