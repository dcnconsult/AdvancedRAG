/**
 * @fileoverview Performance Ranking Demo Page
 * 
 * Demonstrates the complete performance ranking system with integrated cards.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { ResultsComparisonLayout } from '@/components/ResultsComparisonLayout';
import TechniqueComparisonCard, { TechniqueResult } from '@/components/TechniqueComparisonCard';
import { PerformanceRankingDisplay } from '@/components/PerformanceRankingDisplay';
import { rankTechniques, RankingComparison } from '@/lib/performanceRanking';

// Mock Results with varied performance
const mockResults: TechniqueResult[] = [
  {
    technique: 'agentic-rag',
    technique_display_name: 'Agentic RAG',
    status: 'completed',
    answer: 'Based on comprehensive analysis using multiple retrieval strategies and reasoning chains, artificial intelligence (AI) represents a sophisticated multidisciplinary field that combines computer science, mathematics, and cognitive science to create systems capable of intelligent behavior.',
    confidence_score: 0.94,
    source_chunks: [
      {
        id: 'chunk-1',
        document_id: 'doc-1',
        content: 'Artificial intelligence combines multiple disciplines including computer science, mathematics, psychology, and linguistics to create intelligent systems...',
        chunk_index: 0,
        score: 0.97,
        metadata: { document_title: 'AI Comprehensive Guide', page_number: 1 },
      },
      {
        id: 'chunk-2',
        document_id: 'doc-2',
        content: 'Modern AI systems use machine learning and neural networks to process information and make decisions...',
        chunk_index: 1,
        score: 0.93,
        metadata: { document_title: 'Modern AI Systems', page_number: 3 },
      },
    ],
    metadata: {
      execution_time_ms: 1850,
      resource_usage: {
        api_calls: 4,
        tokens_used: 2540,
        db_queries: 5,
      },
      technique_specific: {
        agent_steps: 3,
        reasoning_depth: 'high',
      },
    },
  },
  {
    technique: 'semantic-search',
    technique_display_name: 'Semantic Search',
    status: 'completed',
    answer: 'Artificial intelligence (AI) is intelligence demonstrated by machines, as opposed to natural intelligence displayed by animals including humans.',
    confidence_score: 0.89,
    source_chunks: [
      {
        id: 'chunk-3',
        document_id: 'doc-3',
        content: 'AI is intelligence demonstrated by machines...',
        chunk_index: 0,
        score: 0.91,
        metadata: { document_title: 'AI Basics', page_number: 1 },
      },
    ],
    metadata: {
      execution_time_ms: 420,
      resource_usage: {
        api_calls: 1,
        tokens_used: 980,
        db_queries: 2,
      },
      technique_specific: {
        embedding_model: 'text-embedding-ada-002',
      },
    },
  },
  {
    technique: 'hybrid-search',
    technique_display_name: 'Hybrid Search',
    status: 'completed',
    answer: 'Artificial Intelligence combines semantic understanding with keyword matching to provide comprehensive answers about machine intelligence and its applications.',
    confidence_score: 0.87,
    source_chunks: [
      {
        id: 'chunk-4',
        document_id: 'doc-4',
        content: 'Hybrid approaches combine the best of semantic and lexical search...',
        chunk_index: 0,
        score: 0.88,
        metadata: { document_title: 'Search Strategies', page_number: 5 },
      },
      {
        id: 'chunk-5',
        document_id: 'doc-5',
        content: 'AI encompasses various subfields including machine learning, natural language processing, and computer vision...',
        chunk_index: 1,
        score: 0.85,
        metadata: { document_title: 'AI Overview', page_number: 2 },
      },
    ],
    metadata: {
      execution_time_ms: 680,
      resource_usage: {
        api_calls: 2,
        tokens_used: 1450,
        db_queries: 3,
      },
      technique_specific: {
        fusion_method: 'rrf',
      },
    },
  },
  {
    technique: 'contextual-retrieval',
    technique_display_name: 'Contextual Retrieval',
    status: 'completed',
    answer: 'Artificial intelligence, when understood in its full context, represents the culmination of decades of research into creating machines that can perceive, reason, learn, and act intelligently.',
    confidence_score: 0.91,
    source_chunks: [
      {
        id: 'chunk-6',
        document_id: 'doc-6',
        content: 'Context-aware retrieval considers the broader context of queries and documents...',
        chunk_index: 0,
        score: 0.94,
        metadata: { document_title: 'Advanced Retrieval', page_number: 7 },
      },
    ],
    metadata: {
      execution_time_ms: 920,
      resource_usage: {
        api_calls: 2,
        tokens_used: 1680,
        db_queries: 3,
      },
      technique_specific: {
        context_window: 4096,
      },
    },
  },
];

export default function PerformanceRankingDemo() {
  const [ranking, setRanking] = useState<RankingComparison | null>(null);
  const [selectedTechnique, setSelectedTechnique] = useState<string | null>(null);

  useEffect(() => {
    // Calculate rankings
    const rankingResults = rankTechniques(mockResults);
    setRanking(rankingResults);
  }, []);

  if (!ranking) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem' }}>⏳</div>
        <p>Calculating performance rankings...</p>
      </div>
    );
  }

  // Sort results by rank
  const sortedResults = [...mockResults].sort((a, b) => {
    const rankA = ranking.results.find((r) => r.technique === a.technique)?.rank || 999;
    const rankB = ranking.results.find((r) => r.technique === b.technique)?.rank || 999;
    return rankA - rankB;
  });

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fa', padding: '2rem 0' }}>
      <div style={{ maxWidth: '1920px', margin: '0 auto', padding: '0 1rem' }}>
        {/* Header */}
        <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.5rem' }}>
            RAG Performance Ranking System
          </h1>
          <p style={{ fontSize: '1.125rem', color: '#6b7280' }}>
            Comprehensive multi-criteria performance evaluation
          </p>
        </header>

        {/* Performance Ranking Display */}
        <div style={{ marginBottom: '2rem' }}>
          <PerformanceRankingDisplay
            ranking={ranking}
            onTechniqueSelect={setSelectedTechnique}
          />
        </div>

        {/* Selection Indicator */}
        {selectedTechnique && (
          <div
            style={{
              padding: '1rem',
              background: '#eef2ff',
              border: '2px solid #6366f1',
              borderRadius: '8px',
              marginBottom: '1rem',
              textAlign: 'center',
            }}
          >
            <strong>Selected:</strong> {selectedTechnique}
            <button
              onClick={() => setSelectedTechnique(null)}
              style={{
                marginLeft: '1rem',
                padding: '0.25rem 0.75rem',
                background: 'white',
                border: '1px solid #6366f1',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          </div>
        )}

        {/* Comparison Cards with Rankings */}
        <div style={{ marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '1rem' }}>
            Detailed Technique Comparison
          </h2>
        </div>

        <ResultsComparisonLayout techniqueCount={sortedResults.length}>
          {sortedResults.map((result) => {
            const rankResult = ranking.results.find((r) => r.technique === result.technique);
            return (
              <TechniqueComparisonCard
                key={result.technique}
                result={result}
                rank={rankResult?.rank}
                isTopPerformer={rankResult?.isTopPerformer}
                onSourceClick={(source) => {
                  console.log('Source clicked:', source);
                }}
              />
            );
          })}
        </ResultsComparisonLayout>

        {/* Footer Info */}
        <div
          style={{
            marginTop: '3rem',
            padding: '1.5rem',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem' }}>
            📊 Ranking Methodology
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <div>
              <strong>Confidence (35%):</strong>
              <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280', fontSize: '0.9375rem' }}>
                Measures the reliability and certainty of the response
              </p>
            </div>
            <div>
              <strong>Execution Speed (25%):</strong>
              <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280', fontSize: '0.9375rem' }}>
                Response time performance (lower is better)
              </p>
            </div>
            <div>
              <strong>Source Quality (25%):</strong>
              <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280', fontSize: '0.9375rem' }}>
                Average relevance score of retrieved sources
              </p>
            </div>
            <div>
              <strong>Cost Efficiency (15%):</strong>
              <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280', fontSize: '0.9375rem' }}>
                Token usage and API costs (lower is better)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

