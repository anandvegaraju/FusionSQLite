import React from 'react';
import { render, screen } from '@testing-library/react';
import Copyright from '../Copyright'; // Adjust path as needed

describe('Copyright Component', () => {
  it('should render the copyright text and current year', () => {
    render(<Copyright />);

    // Check for "Copyright ©" text
    expect(screen.getByText(/Copyright ©/i)).toBeInTheDocument();

    // Check for the link text "Fusion SQL PWA"
    const linkElement = screen.getByRole('link', { name: /Fusion SQL PWA/i });
    expect(linkElement).toBeInTheDocument();
    expect(linkElement).toHaveAttribute('href', '#'); // Or whatever href it should have

    // Check for the current year
    const currentYear = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(currentYear, 'i'))).toBeInTheDocument();

    // Check for the final period
    expect(screen.getByText(/\./, { selector: 'p' })).toBeInTheDocument(); // Ensure it's part of the paragraph
  });

  it('should pass through additional props', () => {
    render(<Copyright data-testid="copyright-component" sx={{ mt: 4 }} />);
    const copyrightElement = screen.getByTestId('copyright-component');
    expect(copyrightElement).toBeInTheDocument();
    // Check if MUI sx prop is applied (not directly testable via attributes easily,
    // but ensures props are passed down)
    // For sx prop, it's harder to assert directly without snapshot testing or specific class checks
    // For this test, just ensuring it renders with the prop is usually enough.
  });
});
