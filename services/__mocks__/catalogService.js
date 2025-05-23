// __mocks__/catalogService.js
const mockCatalogService = {
  objectExists: jest.fn(),
  createOrUpdateDataModel: jest.fn(),
  // updateDataModel is internal to createOrUpdateDataModel, so not typically mocked separately
  // unless you want to test a module that calls it directly.
};

// Default mock implementations
mockCatalogService.objectExists.mockResolvedValue(false); // Default to object not existing
mockCatalogService.createOrUpdateDataModel.mockResolvedValue({ 
  // Default response for successful DM creation/update
  createOrUpdateDataModelReturn: 'some/path/to/datamodel.xdm' 
});

module.exports = mockCatalogService;
