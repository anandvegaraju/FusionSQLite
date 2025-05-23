// jest.setup.js
import '@testing-library/jest-dom';

// Mock window.matchMedia (often used by UI libraries like Material-UI for responsive design)
// Jest/JSDOM doesn't implement it by default.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock localStorage and sessionStorage (if not already handled well by JSDOM or specific tests)
// Example:
// const localStorageMock = (function() {
//   let store = {};
//   return {
//     getItem: function(key) {
//       return store[key] || null;
//     },
//     setItem: function(key, value) {
//       store[key] = value.toString();
//     },
//     removeItem: function(key) {
//         delete store[key];
//     },
//     clear: function() {
//       store = {};
//     }
//   };
// })();
// Object.defineProperty(window, 'localStorage', { value: localStorageMock });
// Object.defineProperty(window, 'sessionStorage', { value: localStorageMock }); // Can use the same mock for sessionStorage


// Mock for @monaco-editor/react
// The actual editor is too complex for unit tests and can cause issues.
jest.mock('@monaco-editor/react', () => {
  const FakeEditor = jest.fn((props) => {
    // Simulate onChange if provided
    const handleChange = (event) => {
      if (props.onChange) {
        props.onChange(event.target.value, event);
      }
    };
    return (
      <textarea
        data-testid="mock-monaco-editor"
        value={props.value}
        onChange={handleChange}
        style={{ height: '100%', width: '100%' }} // Basic styling for layout if needed
      />
    );
  });
  return FakeEditor;
});


// Mock notistack
jest.mock('notistack', () => ({
  ...jest.requireActual('notistack'), // Import and retain default exports
  useSnackbar: () => ({
    enqueueSnackbar: jest.fn(),
    closeSnackbar: jest.fn(),
  }),
}));

// If using react-router-dom, you might want to mock useNavigate and Link
// For basic rendering tests, often not needed unless the component's logic heavily relies on them.
// jest.mock('react-router-dom', () => ({
//   ...jest.requireActual('react-router-dom'), // keep other exports like <MemoryRouter>
//   useNavigate: () => jest.fn(),
//   Link: jest.fn(({ to, children }) => <a href={to}>{children}</a>),
// }));
