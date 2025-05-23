const { makeSoapRequest } = require('./soapService');
const biConfig = require('../config/biPublisherConfig');
const { Buffer } = require('buffer'); // Node.js Buffer

/**
 * Checks if an object exists in the BI Publisher catalog.
 * @param {string} instanceURL - The base URL of the Oracle Fusion instance.
 * @param {string} objectPath - The absolute path to the object in the catalog (e.g., /Custom/Folder/MyDM.xdm).
 * @param {string} fusionUserName - The username for BI Publisher authentication.
 * @param {string} fusionPassword - The password for BI Publisher authentication.
 * @returns {Promise<boolean>} True if the object exists, false otherwise.
 */
async function objectExists(instanceURL, objectPath, fusionUserName, fusionPassword) {
  const soapBodyPayload = {
    'v2:objectExist': {
      'v2:reportObjectAbsolutePath': objectPath,
      'v2:userID': fusionUserName,
      'v2:password': fusionPassword,
    },
  };

  try {
    const responseBody = await makeSoapRequest(
      instanceURL,
      biConfig.CATALOG_SERVICE_PATH,
      soapBodyPayload,
      fusionUserName,
      fusionPassword,
      '"objectExist"' // SOAPAction from typical WSDLs for this operation
    );
    // Example response: { objectExistReturn: 'true' } or { objectExistReturn: 'false' }
    if (responseBody && responseBody.objectExistReturn !== undefined) {
      return responseBody.objectExistReturn === 'true';
    }
    console.warn("objectExistReturn not found in response, assuming object does not exist.", responseBody);
    return false; // Default to false if response is not as expected
  } catch (error) {
    console.error(`Error in objectExists for path ${objectPath}:`, error.message);
    if (error.message.includes("PathNotFoundException")) { // Specific error indicating path not found
        return false;
    }
    // For other errors, it's uncertain, so re-throwing might be appropriate or returning false.
    // For now, let's assume other errors mean it doesn't exist or can't be accessed.
    return false;
  }
}

/**
 * Updates an existing Data Model (XDM) object in BI Publisher with new SQL.
 * @param {string} instanceURL - The base URL of the Oracle Fusion instance.
 * @param {string} fullObjectPath - The absolute path to the XDM object (e.g., /Custom/Folder/MyDM.xdm).
 * @param {string} fusionUserName - The username for BI Publisher authentication.
 * @param {string} fusionPassword - The password for BI Publisher authentication.
 * @param {string} inputSQLtxt - The SQL query to embed in the data model.
 * @returns {Promise<object>} The parsed response from the updateObject operation.
 */
async function updateDataModel(instanceURL, fullObjectPath, fusionUserName, fusionPassword, inputSQLtxt) {
  console.log(`Updating DM at: ${fullObjectPath}`);
  // Sanitize SQL: In PL/SQL block, single quotes need to be doubled.
  const sanitizedSQL = inputSQLtxt.replace(/'/g, "''");
  const xdmData = biConfig.XDM_TEMPLATE.replace('{SQL_QUERY_PLACEHOLDER}', sanitizedSQL);
  const encodedXDM = Buffer.from(xdmData, 'utf8').toString('base64');

  const soapBodyPayload = {
    'v2:updateObject': {
      'v2:objectAbsolutePath': fullObjectPath,
      'v2:objectData': encodedXDM,
      'v2:userID': fusionUserName,
      'v2:password': fusionPassword,
    },
  };
  
  try {
    const responseBody = await makeSoapRequest(
      instanceURL,
      biConfig.CATALOG_SERVICE_PATH,
      soapBodyPayload,
      fusionUserName,
      fusionPassword,
      '"updateObject"'
    );
    console.log('Data Model updated successfully.');
    return responseBody; // Contains updateObjectReturn, often boolean or void-like
  } catch (error) {
    console.error(`Error updating Data Model at ${fullObjectPath}:`, error.message);
    throw error; // Re-throw to allow higher-level handling
  }
}


/**
 * Creates a new Data Model (XDM) object in BI Publisher.
 * If sqlQuery is provided, it updates the DM with that query.
 * If the DM already exists, it calls updateDataModel.
 * @param {string} instanceURL - The base URL of the Oracle Fusion instance.
 * @param {string} targetFolderPath - The path to the folder where the DM should be created (e.g., /Custom/Folder).
 * @param {string} dataModelName - The name for the new data model (e.g., FusionSQLToolDM).
 * @param {string} fusionUserName - The username for BI Publisher authentication.
 * @param {string} fusionPassword - The password for BI Publisher authentication.
 * @param {string} [sqlQuery] - Optional SQL query to embed in the data model.
 * @returns {Promise<object|string>} Response from create/update or status message.
 */
async function createOrUpdateDataModel(instanceURL, targetFolderPath, dataModelName, fusionUserName, fusionPassword, sqlQuery = '') {
  const fullObjectPath = `${targetFolderPath}/${dataModelName}.xdm`;
  const dmExists = await objectExists(instanceURL, fullObjectPath, fusionUserName, fusionPassword);

  if (dmExists) {
    console.log(`Data Model ${fullObjectPath} already exists. Updating...`);
    return updateDataModel(instanceURL, fullObjectPath, fusionUserName, fusionPassword, sqlQuery);
  } else {
    console.log(`Data Model ${fullObjectPath} does not exist. Creating...`);
    // Use the pre-encoded empty DM object from Python script for creation
    // This is because createObject might expect a simpler structure or a specific format
    // that the Python script's base64 string provides.
    const soapBodyPayload = {
      'v2:createObject': {
        'v2:folderAbsolutePathURL': targetFolderPath,
        'v2:objectName': dataModelName, // Name without .xdm extension
        'v2:objectType': 'xdm',
        'v2:objectDescription': 'Data Model for Fusion SQL Tool',
        'v2:objectData': biConfig.EMPTY_DM_OBJECT_DATA_BASE64, // From Python
        'v2:userID': fusionUserName,
        'v2:password': fusionPassword,
      },
    };
    
    try {
      const createResponse = await makeSoapRequest(
        instanceURL,
        biConfig.CATALOG_SERVICE_PATH,
        soapBodyPayload,
        fusionUserName,
        fusionPassword,
        '"createObject"' 
      );
      console.log(`Data Model ${dataModelName}.xdm created successfully in ${targetFolderPath}.`);
      
      // If SQL query is provided and DM was just created, update it with the SQL
      if (sqlQuery && sqlQuery.trim() !== '') {
        console.log(`Updating newly created DM ${fullObjectPath} with SQL query.`);
        return updateDataModel(instanceURL, fullObjectPath, fusionUserName, fusionPassword, sqlQuery);
      }
      return createResponse; // Return the response from createObject
    } catch (error) {
      console.error(`Error creating Data Model ${dataModelName}.xdm in ${targetFolderPath}:`, error.message);
      throw error;
    }
  }
}

module.exports = {
  objectExists,
  createOrUpdateDataModel,
  // updateDataModel is primarily internal to createOrUpdateDataModel but can be exported if needed
};
