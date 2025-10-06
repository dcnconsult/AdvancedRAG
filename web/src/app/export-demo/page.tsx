/**
 * @fileoverview Export Functionality Demo Page
 * 
 * Demonstrates comprehensive export and copy features.
 */

'use client';

import React from 'react';
import { TechniqueResult } from '@/components/TechniqueComparisonCard';
import { ExportPanel } from '@/components/ExportPanel';
import { rankTechniques } from '@/lib/performanceRanking';

// Mock Results
const mockResults: TechniqueResult[] = [
  {
    technique: 'semantic-search',
    technique_display_name: 'Semantic Search',
    status: 'completed',
    answer: 'Semantic search leverages vector embeddings to understand the meaning and context of a query, retrieving documents that are semantically similar even if they don\'t share exact keywords.',
    confidence_score: 0.89,
    source_chunks: [
      {
        id: 'src1',
        document_id: 'docA',
        content: 'Vector embeddings capture semantic meaning by representing text as high-dimensional vectors.',
        chunk_index: 0,
        score: 0.93,
        metadata: { document_title: 'Intro to Embeddings', page_number: 1 },
        highlights: ['semantic meaning', 'vector embeddings'],
      },
    ],
    metadata: {
      execution_time_ms: 420,
      resource_usage: { tokens_used: 980, api_calls: 1 },
    },
  },
  {
    technique: 'hybrid-search',
    technique_display_name: 'Hybrid Search',
    status: 'completed',
    answer: 'Hybrid search combines lexical (keyword-based) and semantic (meaning-based) search to provide highly relevant results covering both exact matches and conceptual understanding.',
    confidence_score: 0.87,
    source_chunks: [
      {
        id: 'src2',
        document_id: 'docB',
        content: 'BM25 is a popular lexical search algorithm that ranks documents based on keyword frequency and distribution.',
        chunk_index: 0,
        score: 0.89,
        metadata: { document_title: 'Lexical Search', page_number: 2 },
      },
    ],
    metadata: {
      execution_time_ms: 680,
      resource_usage: { tokens_used: 1450, api_calls: 2 },
    },
  },
  {
    technique: 'agentic-rag',
    technique_display_name: 'Agentic RAG',
    status: 'completed',
    answer: 'Agentic RAG systems employ AI agents to dynamically plan and execute retrieval and generation steps, performing complex reasoning and iteratively refining their approach.',
    confidence_score: 0.94,
    source_chunks: [
      {
        id: 'src3',
        document_id: 'docC',
        content: 'AI agents can decompose complex queries into multiple steps, using tools and external knowledge sources to provide comprehensive answers.',
        chunk_index: 0,
        score: 0.98,
        metadata: { document_title: 'Agentic Systems', page_number: 1 },
      },
    ],
    metadata: {
      execution_time_ms: 1850,
      resource_usage: { tokens_used: 2540, api_calls: 4 },
    },
  },
];

export default function ExportDemo() {
  const ranking = rankTechniques(mockResults);

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fa', padding: '2rem 0' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
        {/* Header */}
        <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.5rem' }}>
            Export & Copy Functionality
          </h1>
          <p style={{ fontSize: '1.125rem', color: '#6b7280', maxWidth: '800px', margin: '0 auto' }}>
            Download or copy comparison results in multiple formats with flexible configuration options.
          </p>
        </header>

        {/* Feature Overview */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
          }}
        >
          <FeatureCard
            icon="📥"
            title="Multiple Formats"
            description="Export as JSON, CSV, Markdown, or Plain Text"
          />
          <FeatureCard
            icon="⚙️"
            title="Flexible Options"
            description="Include/exclude sources, metadata, and rankings"
          />
          <FeatureCard
            icon="💾"
            title="Download"
            description="Save results as files for offline analysis"
          />
          <FeatureCard
            icon="📋"
            title="Clipboard"
            description="Quick copy for sharing and documentation"
          />
        </div>

        {/* Export Panel */}
        <ExportPanel results={mockResults} ranking={ranking} />

        {/* Format Examples */}
        <div
          style={{
            marginTop: '3rem',
            padding: '2rem',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem' }}>
            📝 Format Examples
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {/* JSON Example */}
            <FormatExample
              title="JSON Format"
              description="Structured data perfect for programmatic access"
              example={`{
  "exportDate": "2025-10-06T...",
  "results": [
    {
      "technique": "semantic-search",
      "confidence_score": 0.89,
      "answer": "...",
      "source_chunks": [...]
    }
  ]
}`}
            />

            {/* CSV Example */}
            <FormatExample
              title="CSV Format"
              description="Spreadsheet-compatible for data analysis"
              example={`Technique,Status,Confidence,Sources
semantic-search,completed,0.89,1
hybrid-search,completed,0.87,1
agentic-rag,completed,0.94,1`}
            />

            {/* Markdown Example */}
            <FormatExample
              title="Markdown Format"
              description="Human-readable with formatting preserved"
              example={`# RAG Comparison Report

## Semantic Search

**Confidence:** 89.0%

Semantic search leverages...`}
            />

            {/* Text Example */}
            <FormatExample
              title="Plain Text Format"
              description="Simple format for universal compatibility"
              example={`RAG COMPARISON REPORT
Generated: 2025-10-06

1. Semantic Search
Status: completed
Confidence: 89.0%`}
            />
          </div>
        </div>

        {/* Usage Guide */}
        <div
          style={{
            marginTop: '2rem',
            padding: '2rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
            color: 'white',
          }}
        >
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem' }}>
            📖 Usage Guide
          </h3>
          <div style={{ lineHeight: '1.8' }}>
            <p style={{ marginBottom: '1rem' }}>
              <strong>1. Select Format:</strong> Choose the export format that best suits your needs:
            </p>
            <ul style={{ marginBottom: '1rem', paddingLeft: '1.5rem' }}>
              <li><strong>JSON</strong> - For integration with other tools and programmatic access</li>
              <li><strong>CSV</strong> - For spreadsheet analysis in Excel, Google Sheets, etc.</li>
              <li><strong>Markdown</strong> - For documentation and human-readable reports</li>
              <li><strong>Plain Text</strong> - For maximum compatibility and simple viewing</li>
            </ul>
            <p style={{ marginBottom: '1rem' }}>
              <strong>2. Configure Options:</strong> Check or uncheck options to customize your export:
            </p>
            <ul style={{ marginBottom: '1rem', paddingLeft: '1.5rem' }}>
              <li><strong>Source Chunks</strong> - Include retrieved document excerpts</li>
              <li><strong>Metadata</strong> - Include execution metrics (time, tokens, etc.)</li>
              <li><strong>Performance Rankings</strong> - Include scoring and comparisons</li>
            </ul>
            <p style={{ marginBottom: '1rem' }}>
              <strong>3. Export:</strong> Choose your export method:
            </p>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li><strong>Download File</strong> - Save to your computer for offline use</li>
              <li><strong>Copy to Clipboard</strong> - Paste directly into documents or tools</li>
            </ul>
          </div>
        </div>

        {/* Print Instructions */}
        <div
          style={{
            marginTop: '2rem',
            padding: '1.5rem',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            border: '2px solid #6366f1',
          }}
        >
          <h3 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '0.75rem', color: '#6366f1' }}>
            🖨️ Print Support
          </h3>
          <p style={{ color: '#6b7280', lineHeight: '1.6', margin: 0 }}>
            Use your browser's Print function (Ctrl+P or Cmd+P) to generate a printer-friendly version
            of the comparison results. The print layout is optimized for readability with proper page breaks
            and formatting.
          </p>
        </div>
      </div>
    </div>
  );
}

// Feature Card Component
function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div
      style={{
        padding: '1.5rem',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{icon}</div>
      <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.5rem' }}>
        {title}
      </h3>
      <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9375rem', lineHeight: '1.6' }}>
        {description}
      </p>
    </div>
  );
}

// Format Example Component
function FormatExample({ title, description, example }: { title: string; description: string; example: string }) {
  return (
    <div>
      <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.5rem' }}>
        {title}
      </h4>
      <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.75rem' }}>
        {description}
      </p>
      <pre
        style={{
          padding: '1rem',
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          fontSize: '0.8125rem',
          overflow: 'auto',
          margin: 0,
          lineHeight: '1.5',
        }}
      >
        {example}
      </pre>
    </div>
  );
}

