const biConfig = require('../config/biPublisherConfig');
const catalogService = require('./catalogService');
const reportService = require('./reportService');
const { parseStringPromise } = require('xml2js'); // For parsing the final XML result

const DEFAULT_DM_NAME = 'FusionSQLToolDM';
const DEFAULT_REPORT_NAME = 'FSTreport';

/**
 * Initializes the BI Publisher environment by creating a default Data Model and Report
 * if they don't already exist.
 * @param {string} instanceURL - The base URL of the Oracle Fusion instance.
 * @param {string} fusionUserName - The username for BI Publisher authentication.
 * @param {string} fusionPassword - The password for BI Publisher authentication.
 * @param {string} [targetFolderPath=biConfig.BI_PUBLISHER_FOLDER_PATH] - The folder to create objects in.
 * @returns {Promise<void>}
 */
async function initFusion(instanceURL, fusionUserName, fusionPassword, targetFolderPath = biConfig.BI_PUBLISHER_FOLDER_PATH) {
  console.log(`Initializing Fusion environment in folder: ${targetFolderPath}`);
  try {
    // Create Data Model (with no specific SQL initially, or a placeholder)
    await catalogService.createOrUpdateDataModel(
      instanceURL,
      targetFolderPath,
      DEFAULT_DM_NAME,
      fusionUserName,
      fusionPassword,
      'SELECT 1 FROM DUAL' // Initial placeholder SQL
    );
    console.log('Default Data Model initialization check/creation complete.');

    // Create Report based on the Data Model
    const dataModelPath = `${targetFolderPath}/${DEFAULT_DM_NAME}.xdm`;
    await reportService.createReportIfNotExists(
      instanceURL,
      targetFolderPath,
      DEFAULT_REPORT_NAME,
      dataModelPath,
      fusionUserName,
      fusionPassword
    );
    console.log('Default Report initialization check/creation complete.');
    console.log('Fusion environment initialization successful.');
  } catch (error) {
    console.error('Error during Fusion environment initialization:', error.message);
    // Decide if this should throw or just log. For now, logging.
    // Depending on the error, subsequent operations might fail.
    throw new Error(`Failed to initialize Fusion environment: ${error.message}`);
  }
}

/**
 * Runs an SQL query using BI Publisher.
 * It ensures the Data Model is updated with the new SQL, then runs the associated Report.
 * @param {string} instanceURL - The base URL of the Oracle Fusion instance.
 * @param {string} sqlQuery - The SQL query to execute.
 * @param {string} fusionUserName - The username for BI Publisher authentication.
 * @param {string} fusionPassword - The password for BI Publisher authentication.
 * @param {string} [targetFolderPath=biConfig.BI_PUBLISHER_FOLDER_PATH] - The folder where DM and Report exist/are created.
 * @param {string} [dataModelName=DEFAULT_DM_NAME] - The name of the data model.
 * @param {string} [reportName=DEFAULT_REPORT_NAME] - The name of the report.
 * @returns {Promise<object|string>} The parsed XML result as a JavaScript object, or an error string.
 */
async function runSQL(instanceURL, sqlQuery, fusionUserName, fusionPassword, 
                      targetFolderPath = biConfig.BI_PUBLISHER_FOLDER_PATH,
                      dataModelName = DEFAULT_DM_NAME,
                      reportName = DEFAULT_REPORT_NAME) {
  try {
    if (!sqlQuery || sqlQuery.trim() === '') {
      throw new Error('SQL query cannot be empty.');
    }
    
    console.log(`Running SQL query: ${sqlQuery.substring(0, 100)}...`);

    // Step 1: Update the Data Model with the new SQL query.
    // createOrUpdateDataModel handles both creation and update.
    await catalogService.createOrUpdateDataModel(
      instanceURL,
      targetFolderPath,
      dataModelName,
      fusionUserName,
      fusionPassword,
      sqlQuery // The actual SQL query
    );
    console.log('Data Model updated/verified with the new SQL query.');

    // Step 2: Ensure the report exists (initFusion should ideally handle this, but can be a fallback)
    // const dataModelPath = `${targetFolderPath}/${dataModelName}.xdm`;
    // await reportService.createReportIfNotExists(instanceURL, targetFolderPath, reportName, dataModelPath, fusionUserName, fusionPassword);
    // console.log('Report verified.');
    // Note: The original Python script's runReport has a try-except that calls createDataModel and createReport.
    // Our initFusion is meant to be called once, or if setup is suspect.
    // For runSQL, we assume DM and Report should exist or be creatable by createOrUpdateDataModel.

    // Step 3: Run the report.
    const reportPath = `${targetFolderPath}/${reportName}.xdo`;
    console.log(`Running report: ${reportPath}`);
    const reportXMLData = await reportService.runReport(
      instanceURL,
      reportPath,
      fusionUserName,
      fusionPassword
    );
    console.log('Report executed, XML data received.');
    // console.log('Raw XML Output:', reportXMLData);


    // Step 4: Parse the XML data to a more usable format (JSON)
    // The output from BI Publisher is typically XML. The Python script returns this raw XML.
    // For a Node.js service, returning JSON might be more conventional.
    try {
      const parsedResult = await parseStringPromise(reportXMLData, {
        explicitArray: false, // True if you want arrays for single elements
        explicitRoot: false,  // True to keep the root element
        emptyTag: null,       // Represent empty tags as null
        valueProcessors: [ (value, name) => { // Attempt to convert numbers and booleans
            if (value === null || value === undefined) return null;
            if (/^\d+(\.\d+)?$/.test(value)) return Number(value);
            if (value.toLowerCase() === 'true') return true;
            if (value.toLowerCase() === 'false') return false;
            return value;
        }]
      });

      // The structure of parsedResult will depend on the XML output from BI Publisher.
      // Often it's like { DATA_DS: { G_1: [ { COL1: 'val1', COL2: 'val2' }, ... ] } }
      // Or if flattenXML=true, it might be simpler.
      // The Python script's runReport has flattenXML: True.
      // The result from b64decode(reportBytes).decode('UTF-8') is the raw XML string.
      // We return the parsed object here.
      return parsedResult;

    } catch (parseError) {
      console.error('Error parsing report XML output:', parseError);
      // If parsing fails, return the raw XML as a fallback, similar to Python.
      return reportXMLData;
    }

  } catch (error) {
    console.error('Error in runSQL:', error.message);
    // The Python script returns a generic error string.
    // We can throw the error or return a similar message/object.
    // For better integration, throwing the error is often preferred.
    throw new Error(`Error running SQL query: ${error.message}. Please validate URL, credentials, query, or network connection.`);
  }
}

module.exports = {
  initFusion,
  runSQL,
};
