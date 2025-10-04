# Product Requirements Document (PRD): RAG Technique Showcase (MVP)

## Table of Contents

1. [Introduction and Strategic Alignment](#introduction-and-strategic-alignment)
   1.1 [Document Metadata and Version History](#document-metadata-and-version-history)
   1.2 [Product Vision and Overview](#product-vision-and-overview)
   1.3 [Strategic Goals and Business Objectives](#strategic-goals-and-business-objectives)
   1.4 [Measurable Success Metrics (KPIs)](#measurable-success-metrics-kpis)
   1.5 [Target User Personas](#target-user-personas)
2. [Features and User Experience (UX)](#features-and-user-experience-ux)
   2.1 [Epics and User Stories](#epics-and-user-stories)
   2.2 [Core User Journey Map](#core-user-journey-map)
   2.3 [UX & Design Principles](#ux--design-principles)
   2.4 [UI Design Reference & Application Logic Integration](#ui-design-reference--application-logic-integration)
3. [Technical Requirements & Architecture](#technical-requirements--architecture)
   3.1 [RAG Techniques Implementation Details](#rag-techniques-implementation-details)
   3.2 [System Architecture Overview](#system-architecture-overview)
   3.3 [Backend: Supabase Implementation](#backend-supabase-implementation)
   3.4 [Non-Functional Requirements (NFRs) for MVP](#non-functional-requirements-nfrs-for-mvp)
   3.5 [Assumptions, Constraints, and Dependencies](#assumptions-constraints-and-dependencies)
4. [Go-to-Market and Future Vision](#go-to-market-and-future-vision)
   4.1 [MVP Scope Definition](#mvp-scope-definition)
   4.2 [Future Enhancements / Roadmap](#future-enhancements--roadmap)
   4.3 [Open Questions](#open-questions)
5. [Works Cited](#works-cited)

> **Living Document Notice:** This PRD is a starting point and will evolve through discovery, prototyping, and engineering collaboration. The solution approach may change as we gain deeper technical insights during development.

---

## 1. Introduction and Strategic Alignment

### 1.1. Document Metadata and Version History

**Metadata**

| Field               | Value                                     |
| ------------------- | ----------------------------------------- |
| Project Name        | RAG Technique Showcase                    |
| Document Version    | 0.9 (Draft)                               |
| Status              | For Review                                |
| Author              | Technical Product Management              |
| Stakeholders        | Eng (Web, Backend), Design, DevRel, QA |
| Target Release Date | 2025-11-15 (MVP)                          |

**Change History**

| Version | Date       | Author | Summary of Changes                              |
| ------: | ---------- | ------ | ----------------------------------------------- |
|     0.1 | 2025-10-01 | TPM    | Initial draft outline                           |
|     0.5 | 2025-10-01 | TPM    | Added UX, architecture, schema                  |
|     0.9 | 2025-10-01 | TPM    | Completed KPIs, scope table, roadmap, citations |

### 1.2. Product Vision and Overview

**Elevator Pitch (1–2 paragraphs)**
The **RAG Technique Showcase** is a web-first desktop application for AI/ML researchers and application developers to **directly compare** advanced Retrieval-Augmented Generation (RAG) paradigms—such as **GraphRAG**, **Agentic RAG**, **Hybrid Retrieval**, and **Contextual Processing**—on the same query and domain. It demystifies how each technique retrieves, reasons, and synthesizes answers by surfacing source chunks and technique-specific metadata (e.g., graph traversals, tool calls, re-ranking steps).

The core problem today is the **difficulty of qualitative comparison** across rapidly evolving RAG methods. Evidence-rich comparison benefits from wide screens; mobile devices constrain multi-panel layouts and metadata inspection. This app provides **side-by-side (desktop) or tabbed/accordion (responsive fallback)** views with traceable evidence and reasoning paths, enabling users to quickly assess **faithfulness, grounding, cost/performance tradeoffs**, and implementation suitability for production.

### 1.3. Strategic Goals and Business Objectives

* **Validate User Need:** Confirm demand among practitioners for qualitative RAG technique comparison.
* **Demonstrate Technical Expertise:** Showcase advanced RAG orchestration, explainability, and web-first comparison UX.
* **Foundation for Future Growth:** Establish data model, pipelines, and UX patterns for a future educational platform or enterprise evaluation suite.

### 1.4. Measurable Success Metrics (KPIs)

**Success Metrics for MVP**

| Strategic Goal        | Key Performance Indicator (KPI)            | Target for MVP                             | Measurement Method                                                     |
| --------------------- | ------------------------------------------ | ------------------------------------------ | ---------------------------------------------------------------------- |
| Validate User Need    | Number of saved comparison sessions        | > 100 sessions saved in first month        | Count of records in `saved_sessions` (via `rag_sessions`) in Supabase. |
| Validate User Need    | User Engagement Rate (Queries per Session) | Avg. ≥ 3 queries per active session        | Analytics: queries initiated ÷ sessions created.                       |
| Demonstrate Expertise | Community Feedback/Mentions                | Positive mentions in dev/research channels | Manual tracking + sentiment notes (GitHub, blogs, social).             |
| Foundation for Growth | User Retention Rate                        | ≥ 15% users return within 30 days          | Supabase Auth repeat logins; cohort analysis.                          |

### 1.5. Target User Personas

**Persona 1: Alex, the AI/ML Researcher**

* **Role:** PhD candidate or corporate researcher
* **Goal:** Evaluate qualitative differences between RAG techniques for a paper/report
* **Needs:** Accuracy, explainability, source-chunk inspection, reasoning path transparency (graph traversal, agentic steps), easy citation export

**Persona 2: Priya, the Application Developer**

* **Role:** Senior Software Engineer integrating RAG into a product
* **Goal:** Choose the most suitable RAG technique for a new feature (e.g., support chatbot)
* **Needs:** Ease of implementation, latency/cost insight, structured outputs, robustness to messy data, reliability for production

---

## 2. Features and User Experience (UX)

### 2.1. Epics and User Stories

**Epic 1: Onboarding & Setup**

* *As a new user, I want a simple, optional email/password signup so that I can save my comparison sessions for later review.*
* *As a first-time user, I want to see a brief welcome screen that explains the app's purpose in one sentence, so I can immediately understand its value.*

**Epic 2: Query Configuration**

* *As Alex, I want to select a knowledge domain (pre-loaded dataset or upload a PDF) so that I can test the RAG techniques on data relevant to my field.*
* *As Priya, I want to select one or more RAG techniques (e.g., Hybrid Search, Re-ranking, Contextual Retrieval, Agentic RAG, Advanced Chunking) so that I can compare their outputs for the same query.*
* *As a user, I want a simple text input to type my query so that I can ask the question I want answered.*

**Epic 3: Results Visualization & Comparison**

* *As a user, I want results from each technique in a side-by-side or tabbed view so that I can easily compare them.*
* *As Alex, I want to view the specific source chunks retrieved by each technique so that I can verify grounding and check for hallucinations.*
* *As Priya, I want to see technique-specific metadata (agent steps, re-ranker scores, chunking strategies, context additions) so that I can understand construction and reliability.*

**Epic 4: Session Management**

* *As a logged-in user, I want to save a complete comparison session (domain, techniques, query, and all results) so that I can revisit and analyze it later.*
* *As a logged-in user, I want to view a list of my saved sessions so that I can easily access my past work.*

> **Acceptance Criteria (selected examples)**
>
> * Results view displays: generated answer, list of source chunks (title, snippet, score, link/id), and metadata JSON rendered as readable key-value or step timeline.
> * Save Session persists: user id, domain, techniques selected, query text, all technique responses, source chunks, and metadata.
> * RLS ensures users see **only** their sessions.

### 2.2. Core User Journey Map

1. **Launch & Onboarding:** Minimal home screen with **Start New Comparison** and optional **Login**.
2. **Configuration:** Single screen for:

   * **Domain** selection: "Wikipedia—AI (preloaded)" or **Upload PDF**
   * **Techniques**: checkboxes for Hybrid Search, Re-ranking, Contextual Retrieval, Agentic RAG, Advanced Chunking
   * **Query**: single-line input
3. **Execution & Results:** Submit → loading indicator → results screen.
4. **Comparison:** Side-by-side grid on desktop (≥1024px) or tabs/accordion on smaller screens per technique: **Answer**, **Sources**, **Metadata**.
5. **Action:** **Save Session** (requires login); **View Saved Sessions** list.

### 2.3. UX & Design Principles

* **Web-First & Comparison-First:** Optimize for widescreen desktop/laptop. Progressive disclosure and zero extraneous chrome.
* **Facilitate Comparison:** Prefer side-by-side multi-column layouts on desktop; use tabs/accordion as responsive fallback on smaller screens.
* **Explainability as a Feature:** Always show **evidence** (chunks with scores/ids) and **reasoning path** (agent steps, graph traversals) as first-class.
* **Responsiveness & Accessibility:** Layout scales down gracefully; click targets ≥ 44px; readable at 320px width; meet WCAG 2.1 AA for key flows.

### 2.4. UI Design Reference & Application Logic Integration

**Design Philosophy: Application Logic Drives UI, Not Vice Versa**

The UI examples in the project root `ui/*` directories serve as **reference implementations** that demonstrate the desired visual patterns and user experience. However, the application logic and RAG functionality must drive the UI implementation, ensuring that:

1. **UI Adapts to Data**: Interface components adjust based on actual RAG technique results and metadata
2. **Functionality First**: UI patterns support the core RAG comparison functionality, not constrain it
3. **Progressive Enhancement**: Basic functionality works without advanced UI features
4. **Data-Driven Components**: Visual elements reflect real technique performance and metadata

> Note: Examples are useful primarily for styling, layout, and interaction patterns. They should be updated to follow the code and data contracts (example-driven from code), not the other way around. Do not contort production code to match a static example.

**Reference UI Components (from `UI/` folder):**

#### **Welcome Screen (`ui/Welcome/`)**
- **Reference Elements**: Clean hero section, primary CTA button, minimal navigation
- **Application Integration**: Welcome message adapts based on user authentication status
- **Logic-Driven Features**: "Start New Comparison" button triggers application workflow

#### **Authentication (`ui/Authentication/`)**
- **Reference Elements**: Clean form design, consistent header, responsive layout
- **Application Integration**: Form validation driven by Supabase Auth requirements
- **Logic-Driven Features**: Error states and success flows based on actual auth responses

#### **Query Configuration (`ui/Query Builder/`)**
- **Reference Elements**: Technique selection cards, AI-powered suggestions, form layout
- **Application Integration**: Technique cards populated from actual RAG technique registry
- **Logic-Driven Features**: 
  - AI suggestions generated based on selected domain context
  - Technique selection limited to 2-3 based on performance constraints
  - Form validation ensures required fields before submission

#### **Results Comparison (`ui/Results Comparison/`)**
- **Reference Elements**: Sidebar technique ranking, expandable metrics, response sections
- **Application Integration**: 
  - Technique ranking based on actual performance scores from RAG execution
  - Metrics populated from real technique metadata (faithfulness, relevancy, precision, recall)
  - Response content from actual LLM outputs
- **Logic-Driven Features**:
  - Dynamic grid layout based on selected technique count
  - Expandable sections reveal technique-specific metadata
  - Save session functionality stores actual comparison results

#### **Domain Management (`ui/Domain Management/`)**
- **Reference Elements**: Domain cards, document lists, upload/rebuild actions
- **Application Integration**: 
  - Domain cards reflect actual domain data from database
  - Document lists show real uploaded files and processing status
  - Upload/rebuild actions trigger actual document processing pipeline
- **Logic-Driven Features**:
  - Processing status indicators based on actual background job status
  - Document management actions integrated with Supabase Storage
  - Domain selection affects available RAG techniques

#### **Saved Sessions (`ui/Saved Sessions/`)**
- **Reference Elements**: Table layout, session metadata, action buttons
- **Application Integration**: 
  - Table populated from actual `rag_sessions` database records
  - Session metadata reflects real query, domain, and technique data
  - View actions load actual saved comparison results
- **Logic-Driven Features**:
  - Session filtering and search based on actual session data
  - RLS policies ensure users only see their own sessions
  - Session restoration maintains full comparison state

**Design System Standards (from UI references):**

* **Color Palette**: Primary blue (#1173d4), semantic colors for metrics (high/mid/low), consistent light/dark mode support
* **Typography**: Inter font family, consistent text hierarchy, readable contrast ratios
* **Spacing**: Consistent padding/margins, responsive grid system, proper component spacing
* **Components**: Reusable form elements, consistent button styles, standardized cards and tables
* **Icons**: Material Symbols Outlined for consistency, contextual icon usage
* **States**: Loading states, error handling, success confirmations, disabled states

**Implementation Guidelines:**

1. **Extract Common Patterns**: Identify reusable components from UI references
2. **Data Binding**: Ensure all UI elements bind to actual application data
3. **State Management**: UI state reflects application state, not vice versa
4. **Error Handling**: UI gracefully handles RAG processing errors and edge cases
5. **Performance**: UI optimizations don't compromise RAG functionality
6. **Accessibility**: Maintain accessibility while implementing design patterns
7. **Testing**: UI components tested with real RAG data, not just mock data

---

## 3. Technical Requirements & Architecture

### 3.1. RAG Techniques Implementation Details

**The Winning Combination for Production Systems (MVP):**

The RAG Technique Showcase MVP implements the 5 highest-impact techniques that represent the current state-of-the-art in production RAG systems. These techniques address the fundamental challenges in retrieval-augmented generation and provide measurable improvements in accuracy, relevance, and reliability.

#### **1. Hybrid Search (Dense + Sparse)**
- **Implementation**: Combines semantic search (embeddings via pgvector) with keyword search (BM25/lexical)
- **Why it matters**: Semantic search alone misses exact matches, acronyms, and specific terminology; keyword search alone misses conceptual similarity. Together they cover each other's blind spots.
- **Business impact**: 20-40% improvement in retrieval accuracy with minimal additional complexity
- **Metadata exposed**: Dense scores, sparse scores, combined ranking, retrieval method used per chunk

#### **2. Re-ranking**
- **Implementation**: Uses sophisticated models (Cohere's re-ranker or cross-encoders) to re-score top-k retrieved documents
- **Why it matters**: Initial retrieval models prioritize speed over accuracy. Re-rankers are expensive but much more accurate, and you only pay the cost on a small subset.
- **Business impact**: Often the single highest-ROI improvement - can boost relevance by 30%+ with relatively simple implementation
- **Metadata exposed**: Initial retrieval scores, re-ranking scores, re-ranker model used, confidence metrics

#### **3. Contextual Retrieval**
- **Implementation**: Adds document-level context to each chunk before embedding (e.g., "This chunk is from a Q3 financial report about Product X...")
- **Why it matters**: Solves the "isolated chunk" problem where chunks lose meaning outside their document context
- **Business impact**: Anthropic reported 49% reduction in failed retrievals. Particularly valuable for enterprise knowledge bases with varied content
- **Metadata exposed**: Context additions, document metadata, chunk position within document, context source

#### **4. Agentic RAG / Query Routing**
- **Implementation**: LLM decides which knowledge source(s) to query, can make multiple retrieval calls, and determines when it has enough information
- **Why it matters**: Not all queries need retrieval (some are already in the model's knowledge). Different queries need different sources. Complex questions often need multiple retrieval steps.
- **Business impact**: Reduces unnecessary retrieval costs, enables more complex workflows, and allows RAG systems to scale across multiple knowledge sources
- **Metadata exposed**: Agent reasoning steps, query classification, retrieval decisions, multiple retrieval rounds, confidence in final answer

#### **5. Advanced Chunking Strategies**
- **Implementation**: Moving beyond fixed 512-token chunks to semantic chunking, hierarchical chunking, and context-preserving methods
- **Why it matters**: Poor chunking is the #1 reason RAG systems fail. Different content types need different strategies.
- **Business impact**: Can double retrieval quality with no model changes. Most underrated improvement area.
- **Metadata exposed**: Chunking strategy used, chunk boundaries, hierarchical relationships, overlap information

### 3.2. System Architecture Overview

A native **web client** (React/Next.js recommended) communicates with a **Supabase** backend (Auth, Postgres, Storage, pgvector). The backend orchestrates pluggable **RAG pipelines** exposed via RPC/REST endpoints. Each pipeline encapsulates retrieval, augmentation, and generation, returning **answer + sources + metadata** in a consistent contract for the client.

``  <!-- Placeholder: High-level system diagram showing Web App ↔ Supabase (Auth, Postgres, Storage, Edge Functions) ↔ RAG Pipelines (GraphRAG / Agentic / Hybrid / Contextual) and external LLM APIs. Visuals are critical. -->

**Key Components**

* **Client:** React/Next.js web app with TypeScript; state via TanStack Query/Zustand; analytics events for KPIs.
* **Backend:** Supabase Postgres (with **pgvector**), **Auth** (email/password), **Storage** (PDFs), **Edge Functions** (TypeScript/Node) to invoke pipelines.
* **RAG Pipelines (pluggable):**

  * **Hybrid Search (Dense + Sparse):** Combining semantic search (embeddings) with keyword search (BM25/lexical) to cover each other's blind spots. Reports 20-40% improvement in retrieval accuracy.
  * **Re-ranking:** Using sophisticated models (Cohere's or cross-encoders) to re-score top-k retrieved documents, boosting relevance by 30%+ with high ROI.
  * **Contextual Retrieval:** Adding document-level context to chunks before embedding to solve the "isolated chunk" problem. Reduces failed retrievals by 49%.
  * **Agentic RAG / Query Routing:** LLM decides which knowledge sources to query, makes multiple retrieval calls, and determines when enough information is gathered. Enables complex workflows across multiple sources.
  * **Advanced Chunking Strategies:** Moving beyond fixed chunks to semantic chunking, hierarchical chunking, and context-preserving methods. Can double retrieval quality with no model changes.

**API Contract (response)**

```json
{
  "technique_name": "GraphRAG",
  "response_text": "…final answer…",
  "source_chunks": [
    {"id":"doc:42#p3","title":"…","snippet":"…","score":0.78}
  ],
  "metadata": {
    "reasoning_path": [{"step":"traverse","node":"EntityA","edge":"relates_to"}],
    "latency_ms": 7340,
    "token_usage": {"prompt": 1532, "completion": 412}
  }
}
```

> This solution approach may evolve as we gain deeper technical insights during development.

### 3.3. Backend: Supabase Implementation

**Supabase Services & Configuration**

* **Database (PostgreSQL):** Core data, normalized schema; enable **pgvector** (`CREATE EXTENSION IF NOT EXISTS vector;`).
* **Vector Store (pgvector):** Store embeddings for preloaded/user-uploaded content; `ivfflat` index for cosine distance.
* **Authentication:** Supabase Auth (email/password), session JWT.
* **Storage:** Bucket for PDFs; signed URLs for secure access.
* **Row-Level Security (RLS):** Policies on `rag_sessions`, `rag_results`, user-owned assets.
* **Edge Functions:** Secure server-side orchestration of RAG pipelines and LLM API calls.
* **Deployment (Hosted Supabase):** Use a hosted Supabase project (managed Postgres). Connection keys are stored in a project `.env` file (e.g., `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). Local development mirrors the hosted configuration via Supabase CLI.
* **Migrations & Seed:** Database migrations and seed SQL files live in the project `db/` folder (e.g., `Migration001.sql`, `Migration002.sql`, `Seed001.sql`). Apply these to the hosted instance using the Supabase Dashboard SQL editor or CLI, keeping hosted and local schemas in sync.

**Supabase Database Schema (MVP)**

| Table Name   | Column Name        | Data Type | Constraints/Notes                                       |
| ------------ | ------------------ | --------- | ------------------------------------------------------- |
| users        | id                 | UUID      | PK, references `auth.users`                             |
|              | email              | TEXT      |                                                         |
| domains      | id                 | SERIAL    | PK                                                      |
|              | name               | TEXT      | e.g., "Wikipedia - AI"                                  |
|              | source_type        | TEXT      | `'preloaded'` or `'user_upload'`                        |
|              | storage_path       | TEXT      | Path in Supabase Storage if `source_type='user_upload'` |
| rag_sessions | id                 | SERIAL    | PK                                                      |
|              | user_id            | UUID      | FK → `users.id`                                         |
|              | domain_id          | INT       | FK → `domains.id`                                       |
|              | query_text         | TEXT      |                                                         |
|              | created_at         | TIMESTAMP | default `now()`                                         |
| rag_results  | id                 | SERIAL    | PK                                                      |
|              | session_id         | INT       | FK → `rag_sessions.id`                                  |
|              | technique_name     | TEXT      | e.g., 'GraphRAG', 'Hybrid Retrieval'                    |
|              | response_text      | TEXT      | Final answer                                            |
|              | source_chunks_json | JSONB     | Array of retrieved source text chunks                   |
|              | metadata_json      | JSONB     | Technique-specific metadata (agent steps, graph path)   |

> **Content Tables (preloaded & uploaded):**
>
> * `documents(id, domain_id, title, source_uri, storage_path, hash, created_at)`
> * `document_chunks(id, document_id, chunk_index, text, embedding VECTOR(1536))`
> * Indexes: `GIN` on `metadata_json`, `ivfflat` on `embedding` with cosine distance.
> * Optional: `jobs_ingest(id, status, error, created_at)` for background ingestion status.

**Security (MVP)**

* Enable **RLS** on `rag_sessions`, `rag_results`, `documents` (user-owned uploads).
* Policies: **owner can read/write**, public read for **preloaded** domain content chunks only.
* Signed URLs for Storage; never expose raw public bucket for user uploads.

**Observability**

* Store `latency_ms`, `token_usage`, and `cost_estimate` in `metadata_json`.
* Client analytics events: `session_created`, `query_submitted`, `result_viewed`, `session_saved`.

### 3.4. Non-Functional Requirements (NFRs) for MVP

* **Performance:** For up to **100 documents** in a preloaded domain, **≤ 20s** end-to-end from submission to results.
* **Usability:** A first-time user can configure and view a comparison in **≤ 60s** without external docs.
* **Comparison Surface:** Side-by-side layout supported for viewports ≥ 1024px; tabs/accordion fallback below 768px.
* **Accessibility & Cross-Browser:** Meet WCAG 2.1 AA for core flows; support latest Chrome, Edge, Safari, Firefox.
* **Security (Scope):** Implement **RLS** to restrict access to user-owned sessions and uploaded data. MFA, audit logs, and compliance are **out of scope** for MVP.
* **Development Environment:** **Windows** with **Supabase CLI** and a Docker-compatible runtime to run the local stack.

### 3.5. Assumptions, Constraints, and Dependencies

**Assumptions**

* Users have baseline knowledge of RAG and are technically inclined.
* Chosen techniques exhibit **qualitative differences** visible to users.

**Constraints**

* Backend must use **Supabase** (Postgres, Auth, Storage, pgvector).
* **Web-first desktop** experience; mobile is a responsive fallback.
* Development primarily on **Windows**.

**Dependencies**

* Reliable **LLM APIs** (e.g., OpenAI/Anthropic/Google) for generation.
* **Supabase CLI** and **Docker** available locally.
* Libraries for GraphRAG/Knowledge Graph construction (e.g., `networkx`, `neo4j` optional in future).

---

## 4. Go-to-Market and Future Vision

### 4.1. MVP Scope Definition

**MVP Scope**

| Feature/Requirement                                      | In Scope for MVP? (Yes/No) | Rationale                                         |
| -------------------------------------------------------- | -------------------------- | ------------------------------------------------- |
| Comparison of 5 pre-defined RAG techniques             | Yes                        | Core to validating primary value proposition.     |
| User account creation and session saving                 | Yes                        | Required to measure retention/engagement KPIs.    |
| Support for pre-loaded datasets                          | Yes                        | Controlled environment for reliable comparisons.  |
| Support for user-uploaded PDF documents                  | Yes                        | Domain relevance for users; increases utility.    |
| User-configurable RAG pipeline params (chunk size, etc.) | No                         | Adds complexity; defer to V2 post feedback.       |
| Quantitative evaluation metrics (RAGAs/DeepEval)         | No                         | MVP focuses on qualitative comparison; add in V2. |
| Web-based desktop interface                              | Yes                        | Evidence-rich comparison benefits from widescreen layouts. |
| Native mobile app                                         | No                         | Mobile screens limit side-by-side evidence review; responsive web suffices for MVP. |
| Caching of results                                       | No                         | Performance optimization for post-MVP.            |

### 4.2. Future Enhancements / Roadmap

* **Expanded Technique Library:** Additional RAG variants; parameter configuration (chunking, embed models, re-rankers).
* **Quantitative Evaluation:** Integrate **RAGAs/DeepEval** for faithfulness, answer relevance, grounding.
* **BYOK:** Users provide their own API keys to reduce cost and test multiple LLMs.
* **Collaboration:** Shareable links for saved sessions; public galleries.
* **Platform Expansion:** Desktop web app; advanced graph visualizations; dataset management UI.
* **Cost & Latency Insights:** Per-technique cost/latency dashboards; automatic budget caps.
* **Advanced Security:** MFA, org workspaces, audit logs, SSO.

### 4.3. Open Questions

* Which **5 techniques** best showcase distinct behaviors for MVP (Hybrid Search, Re-ranking, Contextual Retrieval, Agentic RAG, Advanced Chunking)?
* Which **pre-loaded datasets** (finance, legal, scientific) best reveal tradeoffs across techniques?
* Which **default LLM** ensures fair comparison and predictable cost (and what temperature/settings)?
* What is the most intuitive **mobile comparison UI** (Tabs vs. Carousel vs. Accordion) for rich outputs and metadata?

---

## 5. Works Cited

* Atlassian: *What is a Product Requirements Document (PRD)?* (accessed Sept 19, 2025)
* Product School: *The Only Product Requirements Document (PRD) Template You Need* (accessed Sept 19, 2025)
* Perforce: *How to Write a PRD — With Examples* (accessed Sept 19, 2025)
* Nima Torabi (Medium): *The Ultimate Product Requirements Template* (accessed Sept 19, 2025)
* Prompt Engineering Guide: *General Tips for Designing Prompts* (accessed Sept 19, 2025)
* OpenAI Help: *Best practices for prompt engineering with the OpenAI API* (accessed Sept 19, 2025)
* Atlassian Confluence Template: *Product requirements template* (accessed Sept 19, 2025)
* Aha! Software: *4 PRD templates* and *What is a PRD?* (accessed Sept 19, 2025)
* Carlin Yuen: *Writing PRDs and product requirements* (Medium) (accessed Sept 19, 2025)
* GraphRAG articles and guides (Data Science Dojo, Verdantix) (accessed Sept 19, 2025)
* IBM Developer: *Build a RAG application with watsonx.ai flows engine* (accessed Sept 19, 2025)
* Evidently AI: *10 RAG examples* and *7 RAG benchmarks* (accessed Sept 19, 2025)
* Google Cloud: *What is Retrieval-Augmented Generation (RAG)?* (accessed Sept 19, 2025)
* Azure Architecture Center: *RAG solution design & evaluation* (accessed Sept 19, 2025)
* Supabase docs and articles: platform overview, local dev, CLI, migrations (accessed Sept 19, 2025)
* GitHub: *NirDiamant/RAG_Techniques* (accessed Sept 19, 2025)
* UX resources on AI+UX patterns (UX Collective; DEV Community) (accessed Sept 19, 2025)
* Mobile RAG insights (React Native RAG; low/no-code guides; mobile automation) (accessed Sept 19, 2025)

---

### Appendices (Optional but Recommended)

* **A. Data Contracts:**

  * Request: `{ domain_id, techniques[], query_text }`
  * Response: array of technique result objects (see Section 3.1 contract).

* **B. Event Tracking Plan (KPIs):**

  * `session_created`, `query_submitted`, `results_rendered`, `session_saved`, `session_opened`, `technique_tab_viewed`.

* **C. Test Plan (MVP):**

  * **Happy path:** Preloaded domain + two techniques + query + save session.
  * **Upload path:** PDF ingest (≤10MB), chunking/embedding, retrieval success.
  * **Security:** RLS policy tests (only owner can read/write).
  * **Performance:** ≤20s end-to-end on 100-doc preloaded domain.

* **D. Risk Register (Top 3):**

  1. LLM API instability/cost spikes → **Mitigation:** retries, rate limits, daily budget caps.
  2. Inconsistent metadata across techniques → **Mitigation:** normalize to common keys (`reasoning_path`, `latency_ms`, `token_usage`).
  3. Slow PDF ingestion on-device networks → **Mitigation:** chunk server-side; progress UI.

> **Next Steps:**
>
> * Align on the initial **3–4 techniques** and **preloaded datasets**.
> * Finalize **data contracts** and **RLS policies**.
> * Build **Edge Functions** for each pipeline and wire the client tabs/cards.

**End of PRD**
