/**
 * @fileoverview Source Inspection Demo Page
 * 
 * Demonstrates source inspection modal and cross-technique comparison.
 */

'use client';

import React from 'react';
import { TechniqueResult } from '@/components/TechniqueComparisonCard';
import { SourceComparison } from '@/components/SourceComparison';

// Mock Data with Overlapping Sources
const mockResults: TechniqueResult[] = [
  {
    technique: 'semantic-search',
    technique_display_name: 'Semantic Search',
    status: 'completed',
    answer: 'Artificial intelligence is intelligence demonstrated by machines...',
    confidence_score: 0.89,
    source_chunks: [
      {
        id: 'common-source-1',
        document_id: 'doc-1',
        content: 'Artificial intelligence (AI) is intelligence demonstrated by machines, as opposed to natural intelligence displayed by animals including humans. AI research focuses on creating systems capable of performing tasks that typically require human intelligence.',
        chunk_index: 0,
        score: 0.93,
        metadata: {
          document_title: 'Introduction to Artificial Intelligence',
          page_number: 1,
          section_title: 'What is AI?',
        },
        highlights: ['artificial intelligence', 'intelligence demonstrated by machines'],
      },
      {
        id: 'unique-semantic-1',
        document_id: 'doc-2',
        content: 'Machine learning is a subset of AI that enables systems to learn and improve from experience without being explicitly programmed.',
        chunk_index: 1,
        score: 0.85,
        metadata: {
          document_title: 'Machine Learning Fundamentals',
          page_number: 5,
        },
      },
    ],
    metadata: {
      execution_time_ms: 420,
      resource_usage: {
        api_calls: 1,
        tokens_used: 980,
      },
    },
  },
  {
    technique: 'hybrid-search',
    technique_display_name: 'Hybrid Search',
    status: 'completed',
    answer: 'AI combines semantic understanding with keyword matching...',
    confidence_score: 0.87,
    source_chunks: [
      {
        id: 'common-source-1', // Same source as semantic search
        document_id: 'doc-1',
        content: 'Artificial intelligence (AI) is intelligence demonstrated by machines, as opposed to natural intelligence displayed by animals including humans. AI research focuses on creating systems capable of performing tasks that typically require human intelligence.',
        chunk_index: 0,
        score: 0.91,
        metadata: {
          document_title: 'Introduction to Artificial Intelligence',
          page_number: 1,
          section_title: 'What is AI?',
        },
        highlights: ['artificial intelligence', 'machines'],
      },
      {
        id: 'common-source-2', // Will be shared with agentic
        document_id: 'doc-3',
        content: 'Deep learning networks use multiple layers to progressively extract higher-level features from raw input, revolutionizing fields like computer vision and natural language processing.',
        chunk_index: 0,
        score: 0.88,
        metadata: {
          document_title: 'Deep Learning Revolution',
          page_number: 12,
        },
        highlights: ['deep learning', 'multiple layers'],
      },
      {
        id: 'unique-hybrid-1',
        document_id: 'doc-4',
        content: 'Natural language processing enables computers to understand, interpret, and generate human language in a valuable way.',
        chunk_index: 0,
        score: 0.82,
        metadata: {
          document_title: 'NLP Applications',
          page_number: 7,
        },
      },
    ],
    metadata: {
      execution_time_ms: 680,
      resource_usage: {
        api_calls: 2,
        tokens_used: 1450,
      },
    },
  },
  {
    technique: 'agentic-rag',
    technique_display_name: 'Agentic RAG',
    status: 'completed',
    answer: 'Through multi-step reasoning and tool use, AI represents...',
    confidence_score: 0.94,
    source_chunks: [
      {
        id: 'common-source-2', // Shared with hybrid
        document_id: 'doc-3',
        content: 'Deep learning networks use multiple layers to progressively extract higher-level features from raw input, revolutionizing fields like computer vision and natural language processing.',
        chunk_index: 0,
        score: 0.95,
        metadata: {
          document_title: 'Deep Learning Revolution',
          page_number: 12,
        },
        highlights: ['deep learning', 'computer vision'],
      },
      {
        id: 'common-source-1', // Used by all three techniques
        document_id: 'doc-1',
        content: 'Artificial intelligence (AI) is intelligence demonstrated by machines, as opposed to natural intelligence displayed by animals including humans. AI research focuses on creating systems capable of performing tasks that typically require human intelligence.',
        chunk_index: 0,
        score: 0.96,
        metadata: {
          document_title: 'Introduction to Artificial Intelligence',
          page_number: 1,
          section_title: 'What is AI?',
        },
        highlights: ['artificial intelligence', 'human intelligence'],
      },
      {
        id: 'unique-agentic-1',
        document_id: 'doc-5',
        content: 'Reinforcement learning enables agents to learn optimal behavior through interaction with an environment, receiving rewards or penalties based on their actions.',
        chunk_index: 0,
        score: 0.89,
        metadata: {
          document_title: 'Reinforcement Learning Basics',
          page_number: 15,
        },
      },
    ],
    metadata: {
      execution_time_ms: 1850,
      resource_usage: {
        api_calls: 4,
        tokens_used: 2540,
      },
    },
  },
];

export default function SourceInspectionDemo() {
  const handleSourceInspect = (source: any) => {
    console.log('Source inspected:', source);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fa', padding: '2rem 0' }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 1rem' }}>
        {/* Header */}
        <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.5rem' }}>
            Source Inspection & Comparison
          </h1>
          <p style={{ fontSize: '1.125rem', color: '#6b7280', maxWidth: '800px', margin: '0 auto' }}>
            Analyze and compare source chunks across RAG techniques. Identify common sources,
            unique retrievals, and quality metrics.
          </p>
        </header>

        {/* Feature Highlights */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
          }}
        >
          <FeatureCard
            icon="🔍"
            title="Detailed Inspection"
            description="View full source content with document context and metadata"
          />
          <FeatureCard
            icon="🔗"
            title="Cross-Technique Analysis"
            description="Identify sources used by multiple RAG techniques"
          />
          <FeatureCard
            icon="📊"
            title="Quality Metrics"
            description="Compare relevance scores and source quality across techniques"
          />
          <FeatureCard
            icon="✨"
            title="Highlighting"
            description="Key phrases and relevant passages automatically highlighted"
          />
        </div>

        {/* Source Comparison Component */}
        <SourceComparison
          results={mockResults}
          onSourceInspect={handleSourceInspect}
        />

        {/* Info Panel */}
        <div
          style={{
            marginTop: '3rem',
            padding: '2rem',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem' }}>
            💡 Demo Features
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.5rem',
            }}
          >
            <div>
              <strong>Common Sources:</strong>
              <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280', fontSize: '0.9375rem' }}>
                Sources retrieved by 2+ techniques (highlighted in green). These indicate
                high-quality, relevant content.
              </p>
            </div>
            <div>
              <strong>Unique Sources:</strong>
              <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280', fontSize: '0.9375rem' }}>
                Sources found by only one technique (highlighted in orange). These may
                represent specialized retrieval capabilities.
              </p>
            </div>
            <div>
              <strong>Relevance Scores:</strong>
              <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280', fontSize: '0.9375rem' }}>
                Average relevance across all techniques that retrieved the source.
                Higher scores indicate better semantic match.
              </p>
            </div>
            <div>
              <strong>Click Any Source:</strong>
              <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280', fontSize: '0.9375rem' }}>
                Open the detailed inspection modal to view full content, highlights,
                metadata, and cross-technique usage.
              </p>
            </div>
          </div>
        </div>

        {/* Analysis Insights */}
        <div
          style={{
            marginTop: '2rem',
            padding: '1.5rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
            color: 'white',
          }}
        >
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem' }}>
            📈 Analysis Insights
          </h3>
          <ul style={{ margin: 0, paddingLeft: '1.5rem', lineHeight: '1.8' }}>
            <li>
              <strong>Source Overlap:</strong> High overlap indicates strong consensus across
              techniques on relevant content
            </li>
            <li>
              <strong>Unique Retrievals:</strong> Each technique's unique sources showcase
              its specialized retrieval strategy
            </li>
            <li>
              <strong>Quality Distribution:</strong> Compare average scores to identify
              most effective retrieval techniques
            </li>
            <li>
              <strong>Document Coverage:</strong> Track which documents and sections are
              most frequently cited
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// Feature Card Component
function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        padding: '1.5rem',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        transition: 'transform 0.2s ease',
      }}
    >
      <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{icon}</div>
      <h3
        style={{
          fontSize: '1.125rem',
          fontWeight: '700',
          color: '#1f2937',
          marginBottom: '0.5rem',
        }}
      >
        {title}
      </h3>
      <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9375rem', lineHeight: '1.6' }}>
        {description}
      </p>
    </div>
  );
}

