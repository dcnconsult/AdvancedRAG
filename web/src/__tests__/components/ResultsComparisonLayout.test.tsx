import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ResultsComparisonLayout from '@/components/ResultsComparisonLayout';
import { RAGTechnique } from '@/lib/rag-api-contracts';
import { Session, User } from '@supabase/supabase-js';
import { SavedSession } from '@/lib/types';

// Mock the useSession hook
jest.mock('@/hooks/useSession', () => ({
  useSession: jest.fn(),
}));

// Mock useRouter and useSearchParams from next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => ({
    get: (param: string) => {
      if (param === 'sessionId') return 'mock-session-id';
      return null;
    },
  }),
}));

// Mock useQueryState from next-usequerystate
jest.mock('next-usequerystate', () => ({
  useQueryState: jest.fn(() => ['side-by-side', jest.fn()]),
}));

// Mock SaveSessionDialog
jest.mock('@/components/SaveSessionDialog', () => {
  return ({ isOpen, onClose, query, techniques, results }: any) => {
    if (!isOpen) return null;
    return <div data-testid="save-session-dialog">Save Session Dialog Mock</div>;
  };
});

// Mock SessionRestoration
jest.mock('@/components/SessionRestoration', () => {
  return ({ sessionId, onRestore, onError }: any) => {
    if (!sessionId) return null;
    return <div data-testid="session-restoration">Session Restoration Mock for {sessionId}</div>;
  };
});

// Mock ResultsComparisonProvider
jest.mock('@/providers/ResultsComparisonProvider', () => ({
  useResultsComparison: () => ({
    techniques: ['hybrid-search', 'reranking'] as RAGTechnique[],
    results: {
      'hybrid-search': {
        query: 'test query',
        response: 'Hybrid Search response',
        sources: [],
        metadata: { latency: 100, tokensUsed: 50 },
        technique: 'hybrid-search',
      },
      'reranking': {
        query: 'test query',
        response: 'Reranking response',
        sources: [],
        metadata: { latency: 150, tokensUsed: 70 },
        technique: 'reranking',
      },
    },
    query: 'test query',
    isLoading: false,
    isError: false,
    error: null,
    isQuerying: false,
    runComparison: jest.fn(),
    setQuery: jest.fn(),
    setSelectedTechniques: jest.fn(),
    clearResults: jest.fn(),
    selectedTechniques: ['hybrid-search', 'reranking'],
    setComparisonMode: jest.fn(),
    comparisonMode: 'side-by-side',
    availableDomains: [],
    selectedDomain: null,
    setSelectedDomain: jest.fn(),
    isSavingSession: false,
    saveSession: jest.fn(),
  }),
}));

describe('ResultsComparisonLayout Component', () => {
  const mockUser: User = { id: 'test-user', email: 'test@example.com', aud: 'authenticated', role: 'authenticated' };
  const mockSession: Session = {
    access_token: 'mock-token',
    token_type: 'Bearer',
    user: mockUser,
    expires_in: 3600,
    expires_at: Date.now() / 1000 + 3600,
  };

  beforeEach(() => {
    require('@/hooks/useSession').useSession.mockReturnValue({
      data: { session: mockSession },
      status: 'authenticated',
    });
  });

  it('renders technique comparison cards', () => {
    render(<ResultsComparisonLayout />);

    expect(screen.getByText('Hybrid Search')).toBeInTheDocument();
    expect(screen.getByText('Reranking')).toBeInTheDocument();
    expect(screen.getByText('Hybrid Search response')).toBeInTheDocument();
    expect(screen.getByText('Reranking response')).toBeInTheDocument();
  });

  it('shows save session dialog when save button is clicked and user is authenticated', () => {
    render(<ResultsComparisonLayout />);

    const saveButton = screen.getByText('Save Session');
    fireEvent.click(saveButton);

    expect(screen.getByTestId('save-session-dialog')).toBeInTheDocument();
  });

  it('does not show save session dialog when save button is clicked and user is not authenticated', () => {
    require('@/hooks/useSession').useSession.mockReturnValue({
      data: { session: null },
      status: 'unauthenticated',
    });
    render(<ResultsComparisonLayout />);

    const saveButton = screen.getByText('Save Session');
    fireEvent.click(saveButton);

    expect(screen.queryByTestId('save-session-dialog')).not.toBeInTheDocument();
  });
});

