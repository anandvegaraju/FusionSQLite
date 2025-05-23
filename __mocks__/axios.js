// __mocks__/axios.js

const mockAxios = {
  // Mock methods like get, post, put, delete, etc.
  get: jest.fn(() => Promise.resolve({ data: {} })),
  post: jest.fn(() => Promise.resolve({ data: {} })),
  put: jest.fn(() => Promise.resolve({ data: {} })),
  delete: jest.fn(() => Promise.resolve({ data: {} })),
  create: jest.fn(function () { // Mock axios.create() to return the mock itself
    return this;
  }),
  // You can also mock interceptors if your code uses them, though it's often simpler
  // to test the logic that interceptors would perform directly or by asserting
  // on the arguments passed to get/post etc.
  interceptors: {
    request: {
      use: jest.fn(),
      eject: jest.fn(),
    },
    response: {
      use: jest.fn(),
      eject: jest.fn(),
    },
  },
};

// Allow dynamic mock implementations
// e.g., mockAxios.post.mockResolvedValueOnce({ data: { message: 'Success' } });

// This is important for ES6 modules if you import axios as `import axios from 'axios'`
// And also if you use `axios.create()`
export default mockAxios;
