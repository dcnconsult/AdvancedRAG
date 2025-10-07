import React from 'react';
import { render, screen } from '@testing-library/react';
import Header from '@/components/Header';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

describe('Header Component', () => {
  it('renders the main navigation links', () => {
    render(<Header />);

    // Check for the presence of key navigation links
    expect(screen.getByText('Query')).toBeInTheDocument();
    expect(screen.getByText('Sessions')).toBeInTheDocument();
    expect(screen.getByText('Domains')).toBeInTheDocument();
  });

  it('renders the title of the application', () => {
    render(<Header />);
    expect(screen.getByText('RAG Showcase')).toBeInTheDocument();
  });
});
