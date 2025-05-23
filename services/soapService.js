const axios = require('axios');
const { parseStringPromise, Builder } = require('xml2js');
const biPublisherConfig = require('../config/biPublisherConfig'); // To get service paths

/**
 * Generic function to make SOAP requests to Oracle BI Publisher.
 * @param {string} instanceURL - The base URL of the Oracle Fusion instance.
 * @param {string} servicePath - The path to the specific SOAP service (e.g., CatalogService, ReportService).
 * @param {object} soapBodyPayload - The JavaScript object representing the SOAP body content for the specific operation.
 * @param {string} fusionUserName - The username for BI Publisher authentication.
 * @param {string} fusionPassword - The password for BI Publisher authentication.
 * @param {string} soapAction - Optional SOAPAction header, defaults to '""'.
 * @returns {Promise<object>} A promise that resolves with the parsed JavaScript object from the SOAP response body.
 * @throws {Error} Throws an error if the request fails or a SOAP fault is returned.
 */
async function makeSoapRequest(instanceURL, servicePath, soapBodyPayload, fusionUserName, fusionPassword, soapAction = '""') {
  const url = instanceURL + servicePath;
  const host = new URL(instanceURL).hostname;

  const soapEnvelope = {
    'soapenv:Envelope': {
      $: {
        'xmlns:soapenv': 'http://schemas.xmlsoap.org/soap/envelope/',
        'xmlns:v2': 'http://xmlns.oracle.com/oxp/service/v2', // Common namespace, can be parameterized if needed
      },
      'soapenv:Header': {},
      'soapenv:Body': soapBodyPayload,
    },
  };

  const builder = new Builder({ headless: true }); // headless:true to avoid <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  const xmlPayload = builder.buildObject(soapEnvelope);
  
  // console.log("SOAP Request URL:", url);
  // console.log("SOAP Request Payload:\n", xmlPayload);

  try {
    const response = await axios.post(url, xmlPayload, {
      headers: {
        'Content-Type': 'text/xml;charset=UTF-8',
        'Host': host,
        'SOAPAction': soapAction,
        // Basic Auth can also be an option if BI Publisher is configured for it
        // 'Authorization': 'Basic ' + Buffer.from(fusionUserName + ':' + fusionPassword).toString('base64'),
      },
      // It's good practice to set a timeout for external requests
      timeout: 30000, // 30 seconds
    });

    // console.log("SOAP Raw Response:\n", response.data);

    // Parse the XML response
    const parsedResponse = await parseStringPromise(response.data, {
      explicitArray: false, // Simplifies accessing elements
      tagNameProcessors: [tag => tag.replace(/^soapenv:/, '').replace(/^soap:/, '').replace(/^ns1:/, '').replace(/^m:/, '')] // Strip namespaces for easier access
    });
    
    // console.log("Parsed SOAP Response:\n", JSON.stringify(parsedResponse, null, 2));

    if (parsedResponse.Envelope && parsedResponse.Envelope.Body) {
      if (parsedResponse.Envelope.Body.Fault) {
        const fault = parsedResponse.Envelope.Body.Fault;
        const faultString = fault.faultstring || 'Unknown SOAP Fault';
        const faultCode = fault.faultcode || 'N/A';
        console.error(`SOAP Fault: ${faultString} (Code: ${faultCode})`);
        // Extract more details if available, e.g., from fault.detail
        let detailMessage = '';
        if (fault.detail && fault.detail.FaultMessage && fault.detail.FaultMessage.MESSAGE) {
            detailMessage = fault.detail.FaultMessage.MESSAGE;
        } else if (typeof fault.detail === 'string') {
            detailMessage = fault.detail;
        }
        throw new Error(`SOAP Fault: ${faultString} (Code: ${faultCode}). Detail: ${detailMessage}`);
      }
      return parsedResponse.Envelope.Body;
    } else {
      throw new Error('Invalid SOAP response structure.');
    }
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('SOAP Request Error - Status:', error.response.status);
      console.error('SOAP Request Error - Data:', error.response.data);
      // Attempt to parse SOAP fault from error response data if it's XML
      try {
        const parsedErrorResponse = await parseStringPromise(error.response.data, { explicitArray: false, tagNameProcessors: [tag => tag.replace(/^soapenv:/, '').replace(/^soap:/, '')] });
        if (parsedErrorResponse.Envelope && parsedErrorResponse.Envelope.Body && parsedErrorResponse.Envelope.Body.Fault) {
          const fault = parsedErrorResponse.Envelope.Body.Fault;
          const faultString = fault.faultstring || 'Unknown SOAP Fault from error response';
           throw new Error(`SOAP Fault: ${faultString}. Raw Error: ${error.message}`);
        }
      } catch (parseError) {
        // Ignore if error response is not a SOAP fault XML
      }
      throw new Error(`HTTP Error ${error.response.status} while making SOAP request. ${error.message}`);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('SOAP Request Error - No response:', error.request);
      throw new Error(`No response received for SOAP request. ${error.message}`);
    } else if (error.message.startsWith('SOAP Fault:')) {
        // Re-throw custom SOAP fault errors
        throw error;
    }
    else {
      // Something happened in setting up the request that triggered an Error
      console.error('SOAP Request Error - Setup:', error.message);
      throw new Error(`Error setting up SOAP request. ${error.message}`);
    }
  }
}

module.exports = {
  makeSoapRequest,
};
