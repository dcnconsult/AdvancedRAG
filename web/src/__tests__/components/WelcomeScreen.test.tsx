import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Home from '@/app/page';

// Mock useRouter from next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock useAuth hook
jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

describe('WelcomeScreen (Home Page)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.gtag for analytics
    (window as any).gtag = jest.fn();
  });

  afterEach(() => {
    delete (window as any).gtag;
  });

  it('renders the welcome screen with main heading and description', () => {
    require('@/hooks/useAuth').useAuth.mockReturnValue({
      user: null,
      loading: false,
    });

    render(<Home />);

    expect(screen.getByText('Directly Compare Advanced RAG Paradigms')).toBeInTheDocument();
    expect(screen.getByText(/An open-source tool for AI\/ML researchers/i)).toBeInTheDocument();
  });

  it('renders the primary CTA button', () => {
    require('@/hooks/useAuth').useAuth.mockReturnValue({
      user: null,
      loading: false,
    });

    render(<Home />);

    expect(screen.getByText('Start New Comparison')).toBeInTheDocument();
  });

  it('navigates to query builder when Start New Comparison button is clicked', () => {
    require('@/hooks/useAuth').useAuth.mockReturnValue({
      user: null,
      loading: false,
    });

    render(<Home />);

    const startButton = screen.getByText('Start New Comparison');
    fireEvent.click(startButton);

    expect(mockPush).toHaveBeenCalledWith('/query-builder');
  });

  it('tracks analytics event when Start New Comparison button is clicked', () => {
    require('@/hooks/useAuth').useAuth.mockReturnValue({
      user: null,
      loading: false,
    });

    render(<Home />);

    const startButton = screen.getByText('Start New Comparison');
    fireEvent.click(startButton);

    expect((window as any).gtag).toHaveBeenCalledWith('event', 'start_comparison_click', {
      event_category: 'engagement',
      event_label: 'cta_button',
    });
  });

  it('shows Login link when user is not authenticated', () => {
    require('@/hooks/useAuth').useAuth.mockReturnValue({
      user: null,
      loading: false,
    });

    render(<Home />);

    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('shows Dashboard link when user is authenticated', () => {
    require('@/hooks/useAuth').useAuth.mockReturnValue({
      user: { id: 'test-user', email: 'test@example.com' },
      loading: false,
    });

    render(<Home />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Login')).not.toBeInTheDocument();
  });

  it('shows Create Account link when user is not authenticated', () => {
    require('@/hooks/useAuth').useAuth.mockReturnValue({
      user: null,
      loading: false,
    });

    render(<Home />);

    expect(screen.getByText('Create Account')).toBeInTheDocument();
    expect(screen.getByText('to save your comparisons')).toBeInTheDocument();
  });

  it('does not show Create Account link when user is authenticated', () => {
    require('@/hooks/useAuth').useAuth.mockReturnValue({
      user: { id: 'test-user', email: 'test@example.com' },
      loading: false,
    });

    render(<Home />);

    expect(screen.queryByText('Create Account')).not.toBeInTheDocument();
  });

  it('renders feature previews section', () => {
    require('@/hooks/useAuth').useAuth.mockReturnValue({
      user: null,
      loading: false,
    });

    render(<Home />);

    expect(screen.getByText('Side-by-Side Comparison')).toBeInTheDocument();
    expect(screen.getByText('Advanced Techniques')).toBeInTheDocument();
    expect(screen.getByText('Real-time Results')).toBeInTheDocument();
  });

  it('shows loading state while auth is loading', () => {
    require('@/hooks/useAuth').useAuth.mockReturnValue({
      user: null,
      loading: true,
    });

    render(<Home />);

    const loadingSpinner = document.querySelector('.animate-spin');
    expect(loadingSpinner).toBeInTheDocument();
  });

  it('tracks welcome screen view analytics on mount', () => {
    require('@/hooks/useAuth').useAuth.mockReturnValue({
      user: null,
      loading: false,
    });

    render(<Home />);

    expect((window as any).gtag).toHaveBeenCalledWith('event', 'welcome_screen_view', {
      event_category: 'engagement',
      event_label: 'welcome_page',
    });
  });

  it('renders navigation links in header', () => {
    require('@/hooks/useAuth').useAuth.mockReturnValue({
      user: null,
      loading: false,
    });

    render(<Home />);

    expect(screen.getByText('Documentation')).toBeInTheDocument();
    expect(screen.getByText('Community')).toBeInTheDocument();
  });

  it('renders footer with community message', () => {
    require('@/hooks/useAuth').useAuth.mockReturnValue({
      user: null,
      loading: false,
    });

    render(<Home />);

    expect(screen.getByText(/Built by the open-source community/i)).toBeInTheDocument();
  });
});

