// src/api/__mocks__/index.js

const mockApiClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  // If axios.create() is used and its instance methods are directly called,
  // ensure this mock structure matches.
  // For example, if you use apiClient.interceptors, mock that too if needed by tests.
};

// Default mock implementations (can be overridden in tests)
mockApiClient.get.mockResolvedValue({ data: [] }); // Default for GET requests
mockApiClient.post.mockResolvedValue({ data: {} });  // Default for POST requests
mockApiClient.put.mockResolvedValue({ data: {} });   // Default for PUT requests
mockApiClient.delete.mockResolvedValue({ data: {} });// Default for DELETE requests

export default mockApiClient;
