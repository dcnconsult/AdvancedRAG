/**
 * Type definitions for the RAG Showcase App
 * 
 * Based on the PRD requirements and Supabase schema
 */

// RAG Technique Types
export type RAGTechnique = 
  | 'Hybrid Search'
  | 'Re-ranking'
  | 'Contextual Retrieval'
  | 'Agentic RAG'
  | 'Advanced Chunking';

// Source Chunk Interface
export interface SourceChunk {
  id: string;
  title: string;
  snippet: string;
  score: number;
  metadata: {
    document_id?: string;
    chunk_index?: number;
    page_number?: number;
    entity_types?: string[];
    graph_connections?: string[];
    retrieval_method?: string;
    relevance_score?: number;
    chunking_strategy?: string;
    context_added?: string;
  };
}

// RAG Result Interface
export interface RAGResult {
  technique_name: RAGTechnique;
  response_text: string;
  source_chunks: SourceChunk[];
  metadata: {
    reasoning_path?: Array<{
      step: string;
      entities?: string[];
      path?: string[];
      confidence?: number;
      node?: string;
      edge?: string;
    }>;
    agent_steps?: Array<{
      step: string;
      action: string;
      result: string;
    }>;
    reranker_scores?: Array<{
      chunk_id: string;
      original_score: number;
      reranked_score: number;
      improvement: number;
    }>;
    chunking_metadata?: {
      strategy: string;
      total_chunks: number;
      avg_chunk_size: number;
      overlap_percentage: number;
    }>;
    context_additions?: Array<{
      chunk_id: string;
      context_type: string;
      context_content: string;
    }>;
    latency_ms: number;
    token_usage: {
      prompt: number;
      completion: number;
    };
    performance_metrics?: {
      retrieval_time: number;
      processing_time: number;
      total_time: number;
    };
  };
}

// Query Configuration Interface
export interface QueryConfig {
  query_text: string;
  techniques: RAGTechnique[];
  domain_id: number;
  parameters?: {
    max_results?: number;
    similarity_threshold?: number;
    reranker_top_k?: number;
    context_window_size?: number;
    [key: string]: any;
  };
}

// Domain Interface
export interface Domain {
  id: number;
  name: string;
  description?: string;
  source_type: 'preloaded' | 'uploaded';
  document_count: number;
  created_at: string;
  updated_at: string;
  user_id?: string;
}

// Session Interface
export interface RAGSession {
  id: string;
  user_id?: string;
  domain_id: number;
  query_text: string;
  results: RAGResult[];
  created_at: string;
  updated_at: string;
  session_name?: string;
  is_favorite?: boolean;
}

// User Interface
export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

// Authentication Types
export interface AuthState {
  user: User | null;
  session: any | null;
  loading: boolean;
}

// Navigation Types
export type RootStackParamList = {
  Welcome: undefined;
  Authentication: undefined;
  Main: undefined;
  QueryConfig: {domainId?: number};
  ResultsComparison: {sessionId: string};
  DomainManagement: undefined;
  SavedSessions: undefined;
  Settings: undefined;
};

// API Response Types
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

// Error Types
export class RAGQueryError extends Error {
  constructor(
    message: string,
    public code?: string,
    public technique?: RAGTechnique,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'RAGQueryError';
  }
}

export class SupabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'SupabaseError';
  }
}

// Form Types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface SignupFormData {
  email: string;
  password: string;
  fullName?: string;
}

export interface QueryFormData {
  query: string;
  techniques: RAGTechnique[];
  domainId: number;
  parameters?: QueryConfig['parameters'];
}

// Component Props Types
export interface TechniqueCardProps {
  technique: RAGTechnique;
  selected: boolean;
  onToggle: (technique: RAGTechnique) => void;
  disabled?: boolean;
}

export interface ResultCardProps {
  result: RAGResult;
  onSourceClick: (source: SourceChunk) => void;
  expanded?: boolean;
  onToggleExpanded?: () => void;
}

export interface DomainCardProps {
  domain: Domain;
  onSelect: (domain: Domain) => void;
  onUpload?: (domain: Domain) => void;
  selected?: boolean;
}

// Store Types (Zustand)
export interface AppState {
  // Auth state
  user: User | null;
  session: any | null;
  authLoading: boolean;
  
  // Query state
  currentQuery: QueryConfig | null;
  queryResults: RAGResult[];
  queryLoading: boolean;
  queryError: string | null;
  
  // Domain state
  domains: Domain[];
  selectedDomain: Domain | null;
  domainsLoading: boolean;
  
  // Session state
  sessions: RAGSession[];
  currentSession: RAGSession | null;
  sessionsLoading: boolean;
  
  // UI state
  theme: 'light' | 'dark';
  sidebarExpanded: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setSession: (session: any | null) => void;
  setAuthLoading: (loading: boolean) => void;
  setQueryResults: (results: RAGResult[]) => void;
  setQueryLoading: (loading: boolean) => void;
  setQueryError: (error: string | null) => void;
  setDomains: (domains: Domain[]) => void;
  setSelectedDomain: (domain: Domain | null) => void;
  setSessions: (sessions: RAGSession[]) => void;
  setCurrentSession: (session: RAGSession | null) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
}
