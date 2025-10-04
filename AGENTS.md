# AGENTS.md - Best Practices for RAG Technique Showcase Development

## Table of Contents
1. [Project Overview & Source of Truth](#project-overview--source-of-truth)
2. [Task Master Methodology](#task-master-methodology)
3. [Development Environment Setup](#development-environment-setup)
4. [Code Architecture & Patterns](#code-architecture--patterns)
5. [Cursor AI Integration](#cursor-ai-integration)
6. [Task Management Workflow](#task-management-workflow)
7. [Windows-Specific Considerations](#windows-specific-considerations)
8. [Best Practices & Guidelines](#best-practices--guidelines)
9. [Common Patterns & Solutions](#common-patterns--solutions)
10. [Testing & Quality Assurance](#testing--quality-assurance)
11. [Deployment & Production](#deployment--production)

---

## Project Overview & Source of Truth

### Master Source of Truth
- **PRD Document**: `RagShowcasePRD.md` is the authoritative specification for all development decisions
- **Task Management**: `tasks/tasks.json` contains the structured development plan derived from the PRD
- **Development Methodology**: Task Master AI workflow for organized, dependency-aware development

### Project Context
The **RAG Technique Showcase** is a React Native application that allows users to compare different Retrieval-Augmented Generation (RAG) techniques side-by-side. The application is built with:

- **Frontend**: React Native with TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Storage, pgvector)
- **AI Integration**: 5 Production RAG techniques (Hybrid Search, Re-ranking, Contextual Retrieval, Agentic RAG, Advanced Chunking)
- **Development**: Windows-based development environment with Cursor AI integration
- **Task Management**: Task Master AI for structured development workflow
- **Project Location**: `C:\Users\novot\DCN Python\AdvancedRAG`

### Key Features (from PRD)
- Mobile-first responsive design
- Real-time RAG technique comparison
- Document upload and processing
- Session management and history
- Advanced metadata visualization
- Side-by-side technique comparison with traceable evidence

---

## Task Master Methodology

### Philosophy
Task Master AI provides a structured, dependency-aware development workflow that ensures organized progression through complex projects. It transforms the PRD into actionable tasks and maintains project coherence throughout development.

### Core Principles
1. **PRD as Source of Truth**: All tasks derive from and reference the PRD
2. **Dependency Management**: Tasks respect logical dependencies and prerequisites
3. **Structured Progression**: Development follows a logical, testable sequence
4. **Implementation Drift Handling**: Tasks adapt to real-world implementation changes
5. **Progress Tracking**: Clear status tracking and progress visibility

### Task Master Workflow Integration

#### 1. Project Initialization
```bash
# Initialize Task Master project
npx task-master-ai init

# Parse PRD and generate initial tasks
npx task-master-ai parse-prd RagShowcasePRD.md

# Generate individual task files
npx task-master-ai generate
```

#### 2. Daily Development Cycle
```bash
# Check current project status
task-master list

# Get next task to work on (respects dependencies)
task-master next

# View specific task details
task-master show <id>

# Mark task as in progress
task-master set-status --id=<id> --status=in-progress

# Mark task as complete
task-master set-status --id=<id> --status=done
```

#### 3. Task Complexity Management
```bash
# Analyze task complexity
task-master analyze-complexity --research

# View complexity report
task-master complexity-report

# Expand complex tasks into subtasks
task-master expand --id=<id> --research
```

#### 4. Implementation Drift Handling
```bash
# Update tasks based on implementation changes
task-master update --from=<id> --prompt="Changed from Express to Fastify for better performance"

# Update specific task with new context
task-master update-task --id=<id> --prompt="Added authentication requirements"
```

### Task Structure & Dependencies

#### Task Dependencies (from PRD Analysis)
Based on the PRD, tasks follow this logical dependency chain:

1. **Foundation Tasks** (Tasks 1-2): Project setup and database schema
2. **Core Infrastructure** (Tasks 3-5): Authentication, document processing, RAG pipeline
3. **Feature Implementation** (Tasks 6-8): RAG techniques, UI components, results visualization
4. **Enhancement & Polish** (Tasks 9-10): Session management, testing, documentation

#### Dependency Management
```bash
# Add dependencies between tasks
task-master add-dependency --id=<id> --depends-on=<id>

# Validate dependency structure
task-master validate-dependencies

# Fix invalid dependencies
task-master fix-dependencies
```

### Cursor AI Integration with Task Master

#### Context-Aware Development
When working with Cursor AI, always provide task context:

```
I'm working on Task 3: "Develop User Authentication and Session Management"
Task details: Create signup and login screens with email/password, implement session persistence using Supabase Auth, add user profile storage in the users table.

Please help me implement the authentication screens following the PRD specifications.
```

#### Progress Updates
```
I've completed the authentication screens for Task 3. The implementation includes:
- Login and signup forms with validation
- Supabase Auth integration  
- Session persistence
- Error handling

Please update the task status and show me what to work on next.
```

#### Implementation Drift Handling
```
We've decided to use a different approach for Task 5. Instead of implementing all RAG techniques in a single pipeline, we're creating separate Edge Functions for each technique. This provides better scalability and allows for technique-specific optimizations.

Please update Task 5 and all dependent tasks to reflect this architectural change.
```

### Task Master Best Practices

#### 1. Always Reference the PRD
- Before starting any task, review the PRD section it addresses
- Ensure implementation aligns with PRD specifications
- Update tasks if PRD requirements change

#### 2. Respect Dependencies
- Never work on tasks with unsatisfied dependencies
- Use `task-master next` to find the next appropriate task
- Update dependent tasks when implementation changes

#### 3. Log Implementation Progress
- Use `task-master update-task` to log implementation details
- Document decisions and challenges encountered
- Provide context for future developers

#### 4. Handle Complexity Appropriately
- Use complexity analysis to identify tasks needing breakdown
- Expand complex tasks into manageable subtasks
- Use research-backed expansion for informed subtask generation

#### 5. Maintain Task Quality
- Validate dependencies regularly
- Fix invalid dependencies promptly
- Regenerate task files after updates

---

## Development Environment Setup

### Prerequisites
```bash
# Node.js (v18+ recommended)
node --version

# npm or yarn
npm --version

# Git
git --version

# Docker Desktop (for Supabase local development)
docker --version

# Supabase CLI
npm install -g supabase
supabase --version
```

### Windows-Specific Setup

#### 1. PowerShell Configuration
```powershell
# Set execution policy for npm scripts
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Enable long path support (Windows 10/11)
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```

#### 2. Environment Variables
Create `.env` file in project root:
```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI API Keys
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key

# Development Settings
DEBUG=true
LOG_LEVEL=info
```

#### 3. Supabase Local Development
```bash
# Initialize Supabase project
supabase init

# Start local Supabase stack
supabase start

# Generate TypeScript types
supabase gen types typescript --local > src/types/supabase.ts
```

---

## Code Architecture & Patterns

### Project Structure
```
src/
├── components/          # Reusable UI components
│   ├── common/         # Generic components
│   ├── forms/          # Form components
│   └── visualization/  # RAG result visualizations
├── screens/            # Screen components
│   ├── auth/          # Authentication screens
│   ├── query/         # Query configuration
│   └── results/       # Results comparison
├── services/          # API and business logic
│   ├── supabase/      # Supabase client configuration
│   ├── rag/           # RAG pipeline implementations
│   └── analytics/     # Analytics tracking
├── hooks/             # Custom React hooks
├── utils/             # Utility functions
├── types/             # TypeScript type definitions
└── constants/         # Application constants
```

### Component Patterns

#### 1. Functional Components with TypeScript
```typescript
interface QueryConfigProps {
  onQuerySubmit: (config: QueryConfig) => void;
  loading: boolean;
}

export const QueryConfigScreen: React.FC<QueryConfigProps> = ({
  onQuerySubmit,
  loading
}) => {
  const [query, setQuery] = useState('');
  const [selectedTechniques, setSelectedTechniques] = useState<string[]>([]);
  
  return (
    <View style={styles.container}>
      {/* Component implementation */}
    </View>
  );
};
```

#### 2. Custom Hooks for Business Logic
```typescript
export const useRAGQuery = () => {
  const [results, setResults] = useState<RAGResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeQuery = async (config: QueryConfig) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await supabase.functions.invoke('rag-query', {
        body: config
      });
      
      if (response.error) throw response.error;
      setResults(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { results, loading, error, executeQuery };
};
```

#### 3. Service Layer Pattern
```typescript
export class RAGService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async executeQuery(config: QueryConfig): Promise<RAGResult[]> {
    const { data, error } = await this.supabase.functions.invoke('rag-query', {
      body: config
    });

    if (error) throw new Error(`RAG query failed: ${error.message}`);
    return data;
  }

  async saveSession(session: RAGSession): Promise<void> {
    const { error } = await this.supabase
      .from('rag_sessions')
      .insert(session);

    if (error) throw new Error(`Failed to save session: ${error.message}`);
  }
}
```

### State Management

#### 1. Context + useReducer Pattern
```typescript
interface AppState {
  user: User | null;
  currentSession: RAGSession | null;
  queryResults: RAGResult[];
  loading: boolean;
}

type AppAction = 
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_SESSION'; payload: RAGSession | null }
  | { type: 'SET_RESULTS'; payload: RAGResult[] }
  | { type: 'SET_LOADING'; payload: boolean };

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};
```

---

## Cursor AI Integration

### 1. Cursor Configuration for Windows Environment

The project is configured for optimal Cursor AI usage in a Windows environment:

#### **Primary Configuration Files:**
- **`.cursorrules`** - Main Cursor configuration with project context and development rules
- **`.cursor/rules/`** - Detailed rule files for specific development patterns
- **`AGENTS.md`** - Comprehensive development guide (this file)

#### **Windows-Specific Cursor Setup:**
```powershell
# Project location
$projectPath = "C:\Users\novot\DCN Python\AdvancedRAG"

# Cursor should automatically detect these configuration files:
# - .cursorrules (root level)
# - .cursor/rules/*.mdc (detailed rules)
# - AGENTS.md (development guide)
```

#### **Cursor AI Context Integration:**
When working with Cursor AI, always provide context from:
1. **Current Task**: Reference task-master tasks and PRD sections
2. **Project Structure**: Use absolute paths for Windows compatibility
3. **Development Rules**: Follow patterns defined in .cursorrules and .cursor/rules/

#### **Using AGENTS.md with Cursor AI:**
- **Reference this file** when asking Cursor AI for development guidance
- **Copy relevant sections** when requesting specific implementations
- **Use the patterns and examples** provided in this guide
- **Follow the Windows-specific considerations** for path handling and PowerShell usage
- **Integrate with Task Master workflow** as outlined in this document

#### **Example Cursor AI Prompts:**
```
"Based on AGENTS.md Section 4.1 (Component Patterns), help me create a React Native component for displaying RAG query results. Use the patterns from the guide and ensure Windows compatibility."

"Following AGENTS.md Section 6.1 (PRD-Driven Task Management), I'm working on Task 3. Please help me implement the authentication screens according to the PRD requirements and the patterns outlined in the guide."

"Using the error handling patterns from AGENTS.md Section 8.3, help me implement proper error boundaries for RAG operations in React Native."
```

### 2. Cursor Rules Configuration

The `.cursor/rules/` directory contains these rule files:

#### `rag-development.mdc`
```markdown
---
description: RAG application development patterns and best practices
globs: src/**/*.{ts,tsx,js,jsx}
alwaysApply: true
---

# RAG Application Development Rules

## Component Structure
- Use functional components with TypeScript interfaces
- Implement proper error boundaries for RAG operations
- Use loading states for all async operations
- Implement progressive disclosure for complex metadata

## State Management
- Use Context + useReducer for global state
- Implement optimistic updates for better UX
- Cache RAG results to avoid redundant API calls
- Use proper loading and error states

## RAG-Specific Patterns
- Always validate query inputs before processing
- Implement retry logic for failed RAG operations
- Use proper TypeScript types for RAG responses
- Implement metadata visualization components

## Performance
- Implement virtual scrolling for large result sets
- Use React.memo for expensive components
- Implement proper cleanup in useEffect hooks
- Use lazy loading for heavy components
```

#### `supabase-patterns.mdc`
```markdown
---
description: Supabase integration patterns and best practices
globs: src/services/supabase/**/*.{ts,tsx}
alwaysApply: true
---

# Supabase Integration Rules

## Client Configuration
- Always use environment variables for configuration
- Implement proper error handling for Supabase operations
- Use TypeScript types generated from Supabase schema
- Implement Row-Level Security (RLS) policies

## Database Operations
- Use transactions for multi-table operations
- Implement proper indexing for vector operations
- Use prepared statements for complex queries
- Implement proper pagination for large datasets

## Authentication
- Implement proper session management
- Use Supabase Auth for user authentication
- Implement proper logout and token refresh
- Use RLS policies for data access control
```

### 2. Cursor AI Prompts

#### For Component Development
```
Create a React Native component for displaying RAG query results with the following requirements:
- Display results from multiple RAG techniques side-by-side
- Show source chunks with confidence scores
- Implement tabbed interface for technique comparison
- Use TypeScript with proper interfaces
- Include loading and error states
- Follow the existing design system patterns
```

#### For Service Implementation
```
Implement a service class for RAG query execution with:
- Integration with Supabase Edge Functions
- Proper error handling and retry logic
- TypeScript interfaces for request/response
- Performance tracking (latency, token usage)
- Caching mechanism for repeated queries
```

### 3. Code Generation Templates

#### Component Template
```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ComponentNameProps {
  // Define props interface
}

export const ComponentName: React.FC<ComponentNameProps> = ({
  // Destructure props
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Component initialization logic
  }, []);

  if (loading) {
    return <LoadingComponent />;
  }

  if (error) {
    return <ErrorComponent error={error} />;
  }

  return (
    <View style={styles.container}>
      {/* Component implementation */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Styles
  },
});
```

---

## Task Management Workflow

### PRD-Driven Task Management

#### Establishing PRD as Source of Truth
The `RagShowcasePRD.md` serves as the authoritative specification for all development decisions. Tasks are generated directly from the PRD and must align with its requirements.

#### Task Generation from PRD
```bash
# Parse PRD and generate tasks (this creates tasks.json)
npx task-master-ai parse-prd RagShowcasePRD.md

# Review generated tasks against PRD requirements
npx task-master-ai list

# Generate individual task files for easy reference
npx task-master-ai generate
```

### Daily Development Workflow

#### 1. Start of Development Session
```bash
# Check current project status
npx task-master-ai list

# Get next task based on dependencies and PRD requirements
npx task-master-ai next

# Review task details and PRD alignment
npx task-master-ai show <id>
```

#### 2. During Development
```bash
# Mark task as in progress
npx task-master-ai set-status --id=<id> --status=in-progress

# Update task with implementation details
npx task-master-ai update-task --id=<id> --prompt="Implementation details..."

# Check if complexity analysis is needed
npx task-master-ai analyze-complexity --research
```

#### 3. Task Completion
```bash
# Mark task as complete
npx task-master-ai set-status --id=<id> --status=done

# Check next available task
npx task-master-ai next

# Update dependent tasks if implementation changed
npx task-master-ai update --from=<id> --prompt="Implementation changes..."
```

### PRD-Task Alignment Workflow

#### 1. Task Validation Against PRD
Before starting any task:
1. Review the PRD section the task addresses
2. Ensure task details align with PRD requirements
3. Verify acceptance criteria match PRD specifications

#### 2. Implementation Drift Handling
When implementation differs from PRD:
```bash
# Update tasks to reflect new approach
npx task-master-ai update --from=<id> --prompt="Changed approach based on PRD Section X.Y requirements"

# Update specific task with new context
npx task-master-ai update-task --id=<id> --prompt="Updated to match PRD Section Z specifications"
```

#### 3. PRD Updates
If PRD requirements change:
1. Update the PRD document
2. Regenerate tasks from updated PRD
3. Review and adjust existing tasks
4. Update task dependencies as needed

### Cursor AI Integration with PRD-Task Workflow

#### Context-Aware Development with PRD Reference
```
I'm working on Task 3: "Develop User Authentication and Session Management"
This task addresses PRD Section 2.1 (Epic 1: Onboarding & Setup) and Section 3.2 (Supabase Implementation).

PRD Requirements:
- Optional email/password signup for session saving
- Session persistence using Supabase Auth
- User profile storage in users table
- Analytics events for KPIs (session_created)

Please help me implement this following the PRD specifications exactly.
```

#### PRD-Compliant Progress Updates
```
I've completed the authentication screens for Task 3, implementing PRD Section 2.1 requirements:
- ✅ Optional email/password signup (Epic 1, User Story 1)
- ✅ Session persistence using Supabase Auth (Section 3.2)
- ✅ User profile storage in users table (Section 3.2)
- ✅ Analytics events for session_created (Section 3.2)

The implementation aligns with PRD Section 3.3 NFRs (≤60s for first-time user setup).

Please update the task status and show me the next task that addresses PRD requirements.
```

#### PRD-Based Implementation Drift Handling
```
We need to update our approach for Task 6 (RAG Techniques Implementation) based on PRD Section 3.1 requirements.

PRD specifies these techniques must be implemented:
- Hybrid Retrieval (dense vector + keyword re-ranking)
- GraphRAG (knowledge graph construction and traversal)
- Agentic RAG (tool-using agent steps)
- Contextual Processing (query rewriting and context window packing)

We're implementing each as separate Edge Functions to meet the PRD's performance requirements (≤20s end-to-end).

Please update Task 6 and dependent tasks to reflect this PRD-compliant architecture.
```

---

## Windows-Specific Considerations

### 1. File Path Handling
```typescript
import path from 'path';

// Use path.join for cross-platform compatibility
const filePath = path.join(__dirname, '..', 'assets', 'documents');

// Handle Windows-specific path separators
const normalizedPath = path.normalize(filePath);
```

### 2. PowerShell Scripts
```powershell
# Create development scripts
New-Item -Path "scripts" -ItemType Directory -Force

# PowerShell script for Supabase operations
@"
# Start Supabase local development
supabase start

# Generate types
supabase gen types typescript --local > src/types/supabase.ts

# Run migrations
supabase db reset
"@ | Out-File -FilePath "scripts/dev.ps1" -Encoding UTF8
```

### 3. Environment Variables
```powershell
# Set environment variables in PowerShell
$env:SUPABASE_URL = "your_url"
$env:SUPABASE_ANON_KEY = "your_key"

# Or use .env file with dotenv
```

### 4. Windows Terminal Configuration
```json
// settings.json for Windows Terminal
{
  "profiles": {
    "PowerShell": {
      "commandline": "powershell.exe -ExecutionPolicy Bypass",
      "startingDirectory": "C:\\Users\\novot\\DCN Python\\AdvancedRAG"
    }
  }
}
```

### 5. Current Project Structure (Windows)
```
C:\Users\novot\DCN Python\AdvancedRAG\
├── .cursorrules                    # Main Cursor configuration
├── .cursor/
│   └── rules/                     # Detailed development rules
│       ├── prd_development.mdc    # PRD compliance rules
│       ├── dev_workflow.mdc       # Task Master workflow rules
│       ├── minimal_coding.mdc     # Minimal coding standards
│       ├── code_reuse.mdc         # Code reuse guidelines
│       ├── utility_scripts.mdc    # Utility script guidelines
│       └── self_improve.mdc       # Rule improvement patterns
├── AGENTS.md                      # This comprehensive guide
├── RagShowcasePRD.md             # Master source of truth
├── tasks/
│   ├── tasks.json                # Task Master structured plan
│   └── task_*.txt                # Individual task files
├── src/                          # React Native source code
│   ├── components/               # Reusable UI components
│   ├── screens/                  # Screen components
│   ├── services/                 # API and business logic
│   ├── hooks/                    # Custom React hooks
│   ├── utils/                    # Utility functions
│   ├── types/                    # TypeScript definitions
│   ├── constants/                # Application constants
│   └── navigation/               # Navigation structure
├── UI/                           # UI design references
├── scripts/                      # Development scripts
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
└── babel.config.js              # Babel configuration
```

---

## Best Practices & Guidelines

### 1. PRD Compliance & Validation

#### PRD as Development Guide
- **Always reference the PRD** before starting any task
- **Validate implementation** against PRD specifications
- **Update tasks** when PRD requirements change
- **Maintain traceability** between PRD sections and tasks

#### PRD Validation Checklist
Before marking any task complete:
- [ ] Implementation matches PRD requirements
- [ ] Acceptance criteria align with PRD specifications
- [ ] Performance requirements (NFRs) are met
- [ ] User stories and epics are satisfied
- [ ] Technical architecture follows PRD design

#### PRD-Task Traceability
```bash
# When starting a task, always reference PRD sections
task-master show <id>  # Review task details
# Cross-reference with PRD sections mentioned in task

# When updating tasks, reference PRD changes
task-master update-task --id=<id> --prompt="Updated per PRD Section 3.2.3 requirements"
```

### 2. Code Organization

#### File Naming Conventions
```
components/
├── QueryConfigScreen.tsx      # PascalCase for components
├── useRAGQuery.ts            # camelCase for hooks
└── ragService.ts             # camelCase for services

types/
├── rag.types.ts              # kebab-case for type files
└── supabase.types.ts

utils/
├── validation.ts             # camelCase for utilities
└── formatting.ts
```

#### Import Organization
```typescript
// 1. React and React Native imports
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

// 2. Third-party library imports
import { SupabaseClient } from '@supabase/supabase-js';

// 3. Internal imports (absolute paths)
import { RAGService } from '@/services/rag';
import { useRAGQuery } from '@/hooks/useRAGQuery';

// 4. Relative imports
import './styles.css';
```

### 2. TypeScript Best Practices

#### Interface Definitions
```typescript
// Use interfaces for object shapes
interface RAGResult {
  technique_name: string;
  response_text: string;
  source_chunks: SourceChunk[];
  metadata: RAGMetadata;
}

// Use types for unions and computed types
type RAGTechnique = 'GraphRAG' | 'AgenticRAG' | 'HybridRetrieval' | 'ContextualProcessing';

// Use enums for constants
enum QueryStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error'
}
```

#### Generic Types
```typescript
interface ApiResponse<T> {
  data: T;
  error: string | null;
  loading: boolean;
}

interface RAGService {
  executeQuery<T extends RAGTechnique>(
    technique: T,
    config: QueryConfig
  ): Promise<ApiResponse<RAGResult>>;
}
```

### 3. Error Handling

#### Service Layer Error Handling
```typescript
export class RAGService {
  async executeQuery(config: QueryConfig): Promise<RAGResult[]> {
    try {
      const response = await this.supabase.functions.invoke('rag-query', {
        body: config
      });

      if (response.error) {
        throw new RAGQueryError(`Query failed: ${response.error.message}`);
      }

      return response.data;
    } catch (error) {
      if (error instanceof RAGQueryError) {
        throw error;
      }
      
      // Log unexpected errors
      console.error('Unexpected error in RAG query:', error);
      throw new RAGQueryError('An unexpected error occurred');
    }
  }
}

// Custom error classes
export class RAGQueryError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'RAGQueryError';
  }
}
```

#### Component Error Boundaries
```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class RAGErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('RAG Error Boundary caught an error:', error, errorInfo);
    // Log to analytics service
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}
```

### 4. Performance Optimization

#### React.memo and useMemo
```typescript
export const RAGResultCard = React.memo<{
  result: RAGResult;
  onSourceClick: (source: SourceChunk) => void;
}>(({ result, onSourceClick }) => {
  const formattedMetadata = useMemo(() => {
    return formatRAGMetadata(result.metadata);
  }, [result.metadata]);

  const handleSourceClick = useCallback((source: SourceChunk) => {
    onSourceClick(source);
  }, [onSourceClick]);

  return (
    <View style={styles.card}>
      {/* Component implementation */}
    </View>
  );
});
```

#### Virtual Scrolling for Large Lists
```typescript
import { FlatList } from 'react-native';

export const RAGResultsList: React.FC<{
  results: RAGResult[];
}> = ({ results }) => {
  const renderItem = useCallback(({ item }: { item: RAGResult }) => (
    <RAGResultCard result={item} />
  ), []);

  const keyExtractor = useCallback((item: RAGResult) => 
    `${item.technique_name}-${item.response_text.slice(0, 10)}`
  , []);

  return (
    <FlatList
      data={results}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      removeClippedSubviews
      maxToRenderPerBatch={10}
      windowSize={10}
    />
  );
};
```

---

## Common Patterns & Solutions

### 1. RAG Query Execution Pattern
```typescript
export const useRAGQuery = () => {
  const [state, setState] = useState<{
    results: RAGResult[];
    loading: boolean;
    error: string | null;
  }>({
    results: [],
    loading: false,
    error: null
  });

  const executeQuery = useCallback(async (config: QueryConfig) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const results = await ragService.executeQuery(config);
      setState(prev => ({ ...prev, results, loading: false }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error.message, 
        loading: false 
      }));
    }
  }, []);

  return { ...state, executeQuery };
};
```

### 2. Session Management Pattern
```typescript
export const useSession = () => {
  const [session, setSession] = useState<RAGSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setSession(data.session as RAGSession);
        }
      } catch (error) {
        console.error('Error loading session:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session as RAGSession);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { session, loading };
};
```

### 3. Document Upload Pattern
```typescript
export const useDocumentUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadDocument = useCallback(async (file: File) => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from('documents')
        .upload(`${Date.now()}-${file.name}`, file, {
          onUploadProgress: (progress) => {
            setProgress(progress.loaded / progress.total * 100);
          }
        });

      if (error) throw error;

      // Process document (chunking, embedding)
      await ragService.processDocument(data.path);
      
      return data.path;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setUploading(false);
    }
  }, []);

  return { uploadDocument, uploading, progress, error };
};
```

---

## Testing & Quality Assurance

### 1. Unit Testing Setup
```typescript
// __tests__/services/ragService.test.ts
import { RAGService } from '@/services/rag';
import { createMockSupabaseClient } from '@/utils/test-utils';

describe('RAGService', () => {
  let ragService: RAGService;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    ragService = new RAGService(mockSupabase);
  });

  describe('executeQuery', () => {
    it('should execute RAG query successfully', async () => {
      const mockResult = {
        technique_name: 'GraphRAG',
        response_text: 'Test response',
        source_chunks: [],
        metadata: {}
      };

      mockSupabase.functions.invoke.mockResolvedValue({
        data: mockResult,
        error: null
      });

      const result = await ragService.executeQuery({
        query: 'Test query',
        techniques: ['GraphRAG']
      });

      expect(result).toEqual(mockResult);
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        'rag-query',
        expect.objectContaining({
          body: expect.objectContaining({
            query: 'Test query'
          })
        })
      );
    });

    it('should handle RAG query errors', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Query failed' }
      });

      await expect(ragService.executeQuery({
        query: 'Test query',
        techniques: ['GraphRAG']
      })).rejects.toThrow('Query failed');
    });
  });
});
```

### 2. Component Testing
```typescript
// __tests__/components/QueryConfigScreen.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryConfigScreen } from '@/components/QueryConfigScreen';

describe('QueryConfigScreen', () => {
  const mockOnQuerySubmit = jest.fn();

  beforeEach(() => {
    mockOnQuerySubmit.mockClear();
  });

  it('should submit query with selected techniques', async () => {
    const { getByPlaceholderText, getByText } = render(
      <QueryConfigScreen onQuerySubmit={mockOnQuerySubmit} loading={false} />
    );

    const queryInput = getByPlaceholderText('Enter your query...');
    const graphRAGCheckbox = getByText('GraphRAG');
    const submitButton = getByText('Submit Query');

    fireEvent.changeText(queryInput, 'Test query');
    fireEvent.press(graphRAGCheckbox);
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockOnQuerySubmit).toHaveBeenCalledWith({
        query: 'Test query',
        techniques: ['GraphRAG']
      });
    });
  });
});
```

### 3. Integration Testing
```typescript
// __tests__/integration/ragWorkflow.test.ts
import { RAGService } from '@/services/rag';
import { createTestSupabaseClient } from '@/utils/test-utils';

describe('RAG Workflow Integration', () => {
  let ragService: RAGService;
  let testSupabase: ReturnType<typeof createTestSupabaseClient>;

  beforeAll(async () => {
    testSupabase = createTestSupabaseClient();
    ragService = new RAGService(testSupabase);
    
    // Set up test data
    await testSupabase.from('domains').insert({
      name: 'Test Domain',
      source_type: 'preloaded'
    });
  });

  afterAll(async () => {
    // Clean up test data
    await testSupabase.from('domains').delete().eq('name', 'Test Domain');
  });

  it('should complete full RAG workflow', async () => {
    const queryConfig = {
      query: 'What is artificial intelligence?',
      techniques: ['GraphRAG', 'HybridRetrieval'],
      domain_id: 1
    };

    const results = await ragService.executeQuery(queryConfig);

    expect(results).toHaveLength(2);
    expect(results[0].technique_name).toBe('GraphRAG');
    expect(results[1].technique_name).toBe('HybridRetrieval');
    
    // Verify each result has required fields
    results.forEach(result => {
      expect(result.response_text).toBeDefined();
      expect(result.source_chunks).toBeInstanceOf(Array);
      expect(result.metadata).toBeDefined();
    });
  });
});
```

---

## Deployment & Production

### 1. Environment Configuration
```typescript
// config/environment.ts
interface EnvironmentConfig {
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };
  ai: {
    openaiApiKey: string;
    anthropicApiKey: string;
  };
  analytics: {
    enabled: boolean;
    apiKey: string;
  };
}

export const getEnvironmentConfig = (): EnvironmentConfig => {
  const env = process.env.NODE_ENV;
  
  if (env === 'production') {
    return {
      supabase: {
        url: process.env.SUPABASE_URL!,
        anonKey: process.env.SUPABASE_ANON_KEY!,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!
      },
      ai: {
        openaiApiKey: process.env.OPENAI_API_KEY!,
        anthropicApiKey: process.env.ANTHROPIC_API_KEY!
      },
      analytics: {
        enabled: true,
        apiKey: process.env.ANALYTICS_API_KEY!
      }
    };
  }
  
  // Development configuration
  return {
    supabase: {
      url: process.env.SUPABASE_URL || 'http://localhost:54321',
      anonKey: process.env.SUPABASE_ANON_KEY || 'dev-key',
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev-service-key'
    },
    ai: {
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      anthropicApiKey: process.env.ANTHROPIC_API_KEY || ''
    },
    analytics: {
      enabled: false,
      apiKey: ''
    }
  };
};
```

### 2. Production Build Configuration
```json
// package.json
{
  "scripts": {
    "build": "expo build",
    "build:android": "expo build:android",
    "build:ios": "expo build:ios",
    "deploy:supabase": "supabase db push",
    "deploy:functions": "supabase functions deploy"
  }
}
```

### 3. CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Run linting
        run: npm run lint

  deploy:
    needs: test
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy Supabase
        run: supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      
      - name: Deploy Edge Functions
        run: supabase functions deploy
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

---

## Conclusion

This guide provides comprehensive best practices for developing the RAG Technique Showcase application using a PRD-driven, Task Master methodology in a Cursor AI environment on Windows.

### Key Principles

1. **PRD as Source of Truth**: `RagShowcasePRD.md` is the authoritative specification for all development decisions
2. **Task Master Methodology**: Structured, dependency-aware development workflow that transforms PRD into actionable tasks
3. **Cursor AI Integration**: Context-aware development with PRD and task references
4. **Windows-Optimized**: Development environment tailored for Windows with PowerShell and proper path handling
5. **Type-Safe Development**: TypeScript throughout with proper interfaces and error handling
6. **Performance-First**: Mobile-optimized with proper caching and loading states

### Development Workflow Summary

1. **Start with PRD**: Reference `RagShowcasePRD.md` for all requirements
2. **Use Task Master**: Follow structured task progression with dependency management
3. **Cursor AI Context**: Provide PRD and task context when asking for assistance
4. **Validate Against PRD**: Ensure all implementations meet PRD specifications
5. **Track Progress**: Use Task Master for organized progress tracking and updates

### Essential Commands

```bash
# Daily workflow
task-master list                    # Check project status
task-master next                    # Get next task
task-master show <id>              # Review task details
task-master set-status --id=<id> --status=done

# PRD alignment
task-master update-task --id=<id> --prompt="Updated per PRD Section X.Y"
task-master update --from=<id> --prompt="PRD requirements changed"
```

### Remember to:
- **Always reference the PRD** before starting any task
- **Validate implementations** against PRD specifications
- **Use Task Master workflow** for organized development
- **Provide context** when working with Cursor AI
- **Maintain PRD-task traceability** throughout development
- **Handle implementation drift** by updating tasks and PRD alignment

This methodology ensures that the RAG Technique Showcase is built according to specification, with organized progress tracking, and optimal developer experience in a Windows Cursor environment.

### **Windows Cursor Environment Status:**
✅ **AGENTS.md** - Comprehensive development guide (this file)  
✅ **.cursorrules** - Main Cursor configuration  
✅ **.cursor/rules/** - Detailed development rule files  
✅ **Project Structure** - Complete React Native setup  
✅ **Task Master Integration** - PRD-driven development workflow  
✅ **Windows Compatibility** - PowerShell scripts and path handling  

### **Quick Start for Cursor AI:**
1. **Open Cursor AI** in the project directory: `C:\Users\novot\DCN Python\AdvancedRAG`
2. **Reference AGENTS.md** when asking for development guidance
3. **Use Task Master commands** for structured development
4. **Follow PRD specifications** for all implementation decisions
5. **Apply Windows-specific patterns** for path handling and PowerShell usage

For additional resources and updates, refer to:
- `RagShowcasePRD.md` - Master specification
- `tasks/tasks.json` - Structured development plan
- `.cursorrules` - Cursor AI configuration
- `.cursor/rules/` - Detailed development patterns
- Task Master documentation for advanced features
