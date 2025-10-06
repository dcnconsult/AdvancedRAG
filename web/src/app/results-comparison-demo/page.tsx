/**
 * @fileoverview Results Comparison Demo Page
 * 
 * Demonstrates the responsive grid layout with technique comparison cards.
 */

'use client';

import React from 'react';
import { ResultsComparisonLayout } from '@/components/ResultsComparisonLayout';
import TechniqueComparisonCard, { TechniqueResult } from '@/components/TechniqueComparisonCard';

// Mock Data
const mockResults: TechniqueResult[] = [
  {
    technique: 'semantic-search',
    technique_display_name: 'Semantic Search',
    status: 'completed',
    answer: 'Artificial intelligence (AI) is intelligence demonstrated by machines, as opposed to natural intelligence displayed by animals including humans. AI research has been defined as the field of study of intelligent agents, which refers to any system that perceives its environment and takes actions that maximize its chance of achieving its goals.',
    confidence_score: 0.92,
    source_chunks: [
      {
        id: 'chunk-1',
        document_id: 'doc-ai-101',
        content: 'Artificial intelligence (AI) is intelligence demonstrated by machines, as opposed to natural intelligence displayed by animals including humans. Leading AI textbooks define the field as the study of "intelligent agents": any device that perceives its environment and takes actions that maximize its chance of achieving its goals.',
        chunk_index: 0,
        score: 0.95,
        metadata: {
          document_title: 'Introduction to Artificial Intelligence',
          page_number: 1,
          section_title: 'What is AI?',
        },
        highlights: ['intelligent agents', 'perceives environment'],
      },
      {
        id: 'chunk-2',
        document_id: 'doc-ai-101',
        content: 'The term "artificial intelligence" was coined in 1956 by John McCarthy, who is widely recognized as one of the founding fathers of AI. AI research includes reasoning, knowledge representation, planning, learning, natural language processing, perception, and the ability to move and manipulate objects.',
        chunk_index: 1,
        score: 0.88,
        metadata: {
          document_title: 'Introduction to Artificial Intelligence',
          page_number: 2,
          section_title: 'History of AI',
        },
      },
    ],
    metadata: {
      execution_time_ms: 450,
      resource_usage: {
        api_calls: 1,
        tokens_used: 1250,
        db_queries: 2,
      },
      technique_specific: {
        embedding_model: 'text-embedding-ada-002',
        vector_dimensions: 1536,
        similarity_metric: 'cosine',
        search_threshold: 0.7,
      },
    },
  },
  {
    technique: 'hybrid-search',
    technique_display_name: 'Hybrid Search',
    status: 'completed',
    answer: 'Artificial Intelligence (AI) refers to the simulation of human intelligence processes by machines, especially computer systems. These processes include learning, reasoning, and self-correction. AI has evolved from simple rule-based systems to sophisticated neural networks capable of processing vast amounts of data.',
    confidence_score: 0.89,
    source_chunks: [
      {
        id: 'chunk-3',
        document_id: 'doc-ai-modern',
        content: 'Artificial Intelligence (AI) refers to the simulation of human intelligence processes by machines, especially computer systems. These processes include learning (the acquisition of information and rules for using the information), reasoning (using rules to reach approximate or definite conclusions), and self-correction.',
        chunk_index: 0,
        score: 0.93,
        metadata: {
          document_title: 'Modern AI Systems',
          page_number: 5,
        },
      },
      {
        id: 'chunk-4',
        document_id: 'doc-ai-history',
        content: 'The field of AI has evolved significantly since its inception. Early AI systems were rule-based and symbolic, while modern AI relies heavily on machine learning, particularly deep learning with neural networks. This evolution has enabled AI to tackle increasingly complex tasks.',
        chunk_index: 2,
        score: 0.85,
        metadata: {
          document_title: 'AI History and Evolution',
          page_number: 12,
        },
        highlights: ['neural networks', 'deep learning'],
      },
    ],
    metadata: {
      execution_time_ms: 680,
      resource_usage: {
        api_calls: 2,
        tokens_used: 1580,
        db_queries: 3,
      },
      technique_specific: {
        semantic_weight: 0.7,
        lexical_weight: 0.3,
        fusion_method: 'reciprocal_rank_fusion',
        total_candidates: 50,
      },
    },
  },
  {
    technique: 'agentic-rag',
    technique_display_name: 'Agentic RAG',
    status: 'completed',
    answer: 'Based on my analysis of multiple authoritative sources, artificial intelligence (AI) is a multidisciplinary field focused on creating intelligent systems. It encompasses machine learning, neural networks, natural language processing, and computer vision. AI systems can learn from data, adapt to new situations, and perform tasks that typically require human intelligence, such as visual perception, speech recognition, decision-making, and language translation.',
    confidence_score: 0.94,
    source_chunks: [
      {
        id: 'chunk-5',
        document_id: 'doc-ai-comprehensive',
        content: 'Artificial intelligence represents a multidisciplinary field at the intersection of computer science, mathematics, psychology, and linguistics. It encompasses various subfields including machine learning, neural networks, natural language processing, computer vision, and robotics. The goal of AI is to create systems that can perform tasks requiring human-like intelligence.',
        chunk_index: 0,
        score: 0.97,
        metadata: {
          document_title: 'Comprehensive AI Overview',
          page_number: 3,
          section_title: 'Understanding AI',
        },
        highlights: ['multidisciplinary field', 'human-like intelligence'],
      },
    ],
    metadata: {
      execution_time_ms: 1250,
      resource_usage: {
        api_calls: 4,
        tokens_used: 2340,
        db_queries: 5,
      },
      technique_specific: {
        agent_steps: 3,
        tool_calls: ['search', 'retrieve', 'synthesize'],
        reasoning_chains: 2,
        confidence_calibration: 'high',
      },
    },
  },
];

export default function ResultsComparisonDemo() {
  const handleSourceClick = (source: any) => {
    console.log('Source clicked:', source);
    alert(`Clicked source: ${source.metadata.document_title || 'Unknown'}`);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fa', padding: '2rem 0' }}>
      <div style={{ maxWidth: '1920px', margin: '0 auto', padding: '0 1rem' }}>
        <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.5rem' }}>
            RAG Results Comparison
          </h1>
          <p style={{ fontSize: '1.125rem', color: '#6b7280' }}>
            Compare different RAG techniques side-by-side
          </p>
        </header>

        <ResultsComparisonLayout techniqueCount={mockResults.length}>
          {mockResults.map((result, index) => (
            <TechniqueComparisonCard
              key={result.technique}
              result={result}
              rank={index + 1}
              isTopPerformer={index === 0}
              onSourceClick={handleSourceClick}
            />
          ))}
        </ResultsComparisonLayout>
      </div>
    </div>
  );
}

