// jest.config.js for frontend (React)
module.exports = {
  testEnvironment: 'jest-environment-jsdom', // Use jsdom for browser-like environment
  verbose: true,
  clearMocks: true,
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{js,jsx}', // Collect coverage from src folder
    '!src/main.jsx', // Entry point, usually not much logic to test directly
    '!src/vite-env.d.ts', // TypeScript declaration file
    '!src/**/index.js', // Often just exports, check if specific index files need testing
    '!src/api/index.js', // Axios instance setup, tested via store/service tests
    '!src/App.jsx', // Routing setup, better for E2E or integration tests
    '!**/__tests__/**',
    '!**/__mocks__/**',
    '!src/store/index.js', // If it's just combining stores
  ],
  coverageDirectory: 'coverage/frontend', // Separate coverage for frontend
  coverageReporters: ['json', 'text', 'lcov', 'clover', 'html'],
  
  // Setup file to run before each test file (e.g., to import jest-dom)
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // ModuleNameMapper to mock static assets and CSS modules
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy', // Mock CSS Modules
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/__mocks__/fileMock.js', // Mock static assets
  },

  // Transform files with babel-jest
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest', // Use babel-jest for JS/JSX/TS/TSX files
  },
  
  // Don't transform node_modules except for specific ES modules if needed
  transformIgnorePatterns: [
    '/node_modules/(?!(@monaco-editor)/)', // Example: don't ignore @monaco-editor if it needs transformation
  ],

  // If using module aliases in Vite (e.g., @/components/*), configure Jest for them too
  // moduleDirectories: ['node_modules', 'src'],
  // moduleNameMapper: {
  //   '^@/(.*)$': '<rootDir>/src/$1',
  // },
};
