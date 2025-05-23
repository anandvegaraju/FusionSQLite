// __mocks__/pg.js

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
  connect: jest.fn(),
  on: jest.fn(),
};

const mockPool = {
  query: jest.fn(),
  connect: jest.fn(() => Promise.resolve(mockClient)), // Mock connect to return a client
  on: jest.fn(),
  end: jest.fn(() => Promise.resolve()),
};

// Allow dynamic mock implementations for query
mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 }); // Default mock
mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 }); // Default mock for client

module.exports = {
  Pool: jest.fn(() => mockPool),
  Client: jest.fn(() => mockClient), // If you use Client directly
  // Export the mockPool and mockClient if you need to access their jest.fn() properties directly in tests
  // e.g. to check calls or provide different mockResolvedValueOnce for specific tests
  __esModule: true, // This is important for ES6 modules
  default: { // If pg is imported as `import pg from 'pg'`
    Pool: jest.fn(() => mockPool),
    Client: jest.fn(() => mockClient),
  },
  // Expose the mock objects for easy access in tests
  mockPool,
  mockClient,
};
