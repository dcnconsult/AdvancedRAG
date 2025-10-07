import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import QueryConfiguration from '@/components/QueryConfiguration';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

// Mock the useQueryPreprocessing hook if it's used in QueryConfiguration
jest.mock('@/hooks/useQueryPreprocessing', () => ({
  useQueryPreprocessing: () => ({
    preprocessingRules: [],
    isLoading: false,
    isError: false,
    error: null,
  }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => ({
    get: (param: string) => {
      if (param === 'query') return 'initial query';
      if (param === 'techniques') return 'hybrid-search,reranking';
      return null;
    },
  }),
}));

// Mock the useSession hook
jest.mock('@/hooks/useSession', () => ({
  useSession: () => ({ data: { session: { user: { id: 'test-user' } } }, status: 'authenticated' }),
}));

// Mock SaveSessionDialog
jest.mock('@/components/SaveSessionDialog', () => {
  return ({ isOpen, onClose, query, techniques, results }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="save-session-dialog">
        Save Session Dialog Mock
        <button onClick={onClose}>Close</button>
      </div>
    );
  };
});

describe('QueryConfiguration Component', () => {
  it('renders the query input and technique selections', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <QueryConfiguration />
      </QueryClientProvider>
    );

    expect(screen.getByPlaceholderText('Enter your query...')).toBeInTheDocument();
    expect(screen.getByLabelText('Hybrid Search')).toBeInTheDocument();
    expect(screen.getByLabelText('Reranking')).toBeInTheDocument();
    expect(screen.getByLabelText('Contextual Retrieval')).toBeInTheDocument();
    expect(screen.getByText('Submit Query')).toBeInTheDocument();
  });

  it('updates query input value on change', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <QueryConfiguration />
      </QueryClientProvider>
    );

    const queryInput = screen.getByPlaceholderText('Enter your query...');
    fireEvent.change(queryInput, { target: { value: 'New test query' } });
    expect(queryInput).toHaveValue('New test query');
  });

  it('toggles technique selection on checkbox click', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <QueryConfiguration />
      </QueryClientProvider>
    );

    const hybridSearchCheckbox = screen.getByLabelText('Hybrid Search');
    fireEvent.click(hybridSearchCheckbox);
    expect(hybridSearchCheckbox).not.toBeChecked(); // Initially checked due to mockSearchParams

    fireEvent.click(hybridSearchCheckbox);
    expect(hybridSearchCheckbox).toBeChecked();
  });

  it('shows validation error for empty query on submit', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <QueryConfiguration />
      </QueryClientProvider>
    );

    const queryInput = screen.getByPlaceholderText('Enter your query...');
    fireEvent.change(queryInput, { target: { value: '' } });

    const submitButton = screen.getByText('Submit Query');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Query text cannot be empty.')).toBeInTheDocument();
    });
  });

  it('shows validation error for no techniques selected on submit', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <QueryConfiguration />
      </QueryClientProvider>
    );

    const queryInput = screen.getByPlaceholderText('Enter your query...');
    fireEvent.change(queryInput, { target: { value: 'Valid query' } });

    // Deselect all techniques
    fireEvent.click(screen.getByLabelText('Hybrid Search'));
    fireEvent.click(screen.getByLabelText('Reranking'));

    const submitButton = screen.getByText('Submit Query');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please select at least one technique.')).toBeInTheDocument();
    });
  });
});

