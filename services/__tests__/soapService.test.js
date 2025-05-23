const { makeSoapRequest } = require('../soapService');
const axios = require('axios'); // Automatically uses __mocks__/axios.js
const { Builder } = require('xml2js'); // Used for comparing XML structure if needed

// Mock config to avoid dependency on actual biPublisherConfig.js values for paths
jest.mock('../../config/biPublisherConfig', () => ({
  CATALOG_SERVICE_PATH: '/xmlpserver/services/v2/CatalogService', // Example path
  // Add other paths if soapService starts using them directly, though it takes servicePath as arg
}));


describe('SOAP Service - makeSoapRequest', () => {
  const instanceURL = 'http://fake-fusion-instance.com';
  const servicePath = '/xmlpserver/services/v2/FakeService';
  const fusionUserName = 'testuser';
  const fusionPassword = 'testpassword';
  const soapAction = '"fakeAction"';

  const mockSuccessResponseBody = {
    'ns1:fakeOperationResponse': {
      $: { 'xmlns:ns1': 'http://xmlns.oracle.com/oxp/service/v2' },
      'ns1:fakeReturn': 'SuccessData',
    },
  };

  // Correctly structured XML string for a successful response
  const mockSuccessXMLResponse = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="http://xmlns.oracle.com/oxp/service/v2">
      <soapenv:Header/>
      <soapenv:Body>
        <ns1:fakeOperationResponse>
          <ns1:fakeReturn>SuccessData</ns1:fakeReturn>
        </ns1:fakeOperationResponse>
      </soapenv:Body>
    </soapenv:Envelope>
  `;

  const mockFaultXMLResponse = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
      <soapenv:Body>
        <soapenv:Fault>
          <faultcode>soapenv:Server</faultcode>
          <faultstring>An error occurred</faultstring>
          <detail>
            <FaultMessage xmlns="http://xmlns.oracle.com/oxp/service/v2">
                <MESSAGE>Detailed error message from BI Publisher.</MESSAGE>
            </FaultMessage>
          </detail>
        </soapenv:Fault>
      </soapenv:Body>
    </soapenv:Envelope>
  `;

  beforeEach(() => {
    // Clear all instances and calls to constructor and all methods:
    axios.post.mockClear();
  });

  it('should make a successful SOAP request and parse the response', async () => {
    axios.post.mockResolvedValueOnce({ data: mockSuccessXMLResponse });

    const soapBodyPayload = { 'v2:fakeOperation': { 'v2:param': 'value' } };
    const result = await makeSoapRequest(instanceURL, servicePath, soapBodyPayload, fusionUserName, fusionPassword, soapAction);
    
    // Check if axios.post was called correctly
    expect(axios.post).toHaveBeenCalledTimes(1);
    const [url, xmlPayload, config] = axios.post.mock.calls[0];
    expect(url).toBe(instanceURL + servicePath);
    expect(xmlPayload).toContain('<v2:fakeOperation><v2:param>value</v2:param></v2:fakeOperation>');
    expect(config.headers['Content-Type']).toBe('text/xml;charset=UTF-8');
    expect(config.headers['SOAPAction']).toBe(soapAction);

    // Check the parsed response (namespaces are stripped by tagNameProcessors)
    expect(result).toEqual({
      fakeOperationResponse: { // Note: ns1: is stripped
        fakeReturn: 'SuccessData',
      },
    });
  });

  it('should handle SOAP faults correctly', async () => {
    axios.post.mockResolvedValueOnce({ data: mockFaultXMLResponse });

    const soapBodyPayload = { 'v2:faultyOperation': {} };
    await expect(
      makeSoapRequest(instanceURL, servicePath, soapBodyPayload, fusionUserName, fusionPassword)
    ).rejects.toThrow('SOAP Fault: An error occurred (Code: soapenv:Server). Detail: Detailed error message from BI Publisher.');
    
    expect(axios.post).toHaveBeenCalledTimes(1);
  });

  it('should handle HTTP errors from axios', async () => {
    const errorResponse = {
      status: 500,
      data: 'Internal Server Error', // Non-XML error
    };
    axios.post.mockRejectedValueOnce({ response: errorResponse });

    await expect(
      makeSoapRequest(instanceURL, servicePath, {}, fusionUserName, fusionPassword)
    ).rejects.toThrow(`HTTP Error ${errorResponse.status} while making SOAP request.`);
  });
  
  it('should handle HTTP errors from axios with a SOAP fault in the body', async () => {
    const errorResponse = {
      status: 500, // Or other error codes like 401, 403
      data: mockFaultXMLResponse, 
    };
    axios.post.mockRejectedValueOnce({ response: errorResponse });

    await expect(
      makeSoapRequest(instanceURL, servicePath, {}, fusionUserName, fusionPassword)
    ).rejects.toThrow('SOAP Fault: An error occurred. Raw Error: Request failed with status code 500');
     // The "Raw Error" part comes from the generic error message of axios when an error object is thrown.
  });


  it('should handle network errors (no response)', async () => {
    axios.post.mockRejectedValueOnce({ request: {} }); // Simulate no response

    await expect(
      makeSoapRequest(instanceURL, servicePath, {}, fusionUserName, fusionPassword)
    ).rejects.toThrow('No response received for SOAP request.');
  });

  it('should handle request setup errors', async () => {
    axios.post.mockRejectedValueOnce(new Error('Request setup failed'));

    await expect(
      makeSoapRequest(instanceURL, servicePath, {}, fusionUserName, fusionPassword)
    ).rejects.toThrow('Error setting up SOAP request. Request setup failed');
  });

  it('should throw error for invalid SOAP response structure (e.g. no Envelope)', async () => {
    axios.post.mockResolvedValueOnce({ data: '<malformedxml></malformedxml>' });
    await expect(
      makeSoapRequest(instanceURL, servicePath, {}, fusionUserName, fusionPassword)
    ).rejects.toThrow('Invalid SOAP response structure.');
  });
  
   it('should use default empty string for soapAction if not provided', async () => {
    axios.post.mockResolvedValueOnce({ data: mockSuccessXMLResponse });
    const soapBodyPayload = { 'v2:fakeOperation': { 'v2:param': 'value' } };
    await makeSoapRequest(instanceURL, servicePath, soapBodyPayload, fusionUserName, fusionPassword); // No soapAction
    
    expect(axios.post).toHaveBeenCalledTimes(1);
    const [, , config] = axios.post.mock.calls[0];
    expect(config.headers['SOAPAction']).toBe('""'); // Default value
  });

});
