/**
 * @fileoverview Text processing utilities
 * @module documentProcessing/utils/textUtils
 */

import { STOP_WORDS } from '../constants';

/**
 * Splits text into sentences with improved handling of edge cases
 */
export function splitIntoSentences(text: string): string[] {
  // Handle abbreviations and decimal numbers
  const preprocessed = text
    .replace(/([A-Z][a-z]{1,}[.])\s*([A-Z])/g, '$1|SENT|$2') // Handle names like "Dr. Smith"
    .replace(/([0-9]+[.])\s*([0-9]+)/g, '$1$2') // Handle decimals
    .replace(/([.!?])\s+/g, '$1|SENT|'); // Mark sentence boundaries

  return preprocessed
    .split('|SENT|')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * Estimates the number of tokens in a text
 */
export function estimateTokens(text: string): number {
  // Rough estimation: ~0.75 tokens per word for English text
  return Math.ceil(text.split(/\s+/).length * 0.75);
}

/**
 * Calculates cosine similarity between two vectors
 */
export function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Extracts keywords from text
 */
export function extractKeywords(text: string, maxKeywords: number = 10): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !STOP_WORDS.has(word));

  const wordFreq = new Map<string, number>();
  words.forEach(word => {
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
  });

  return Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

/**
 * Calculates text complexity score
 */
export function calculateTextComplexity(text: string): number {
  const sentences = splitIntoSentences(text);
  const words = text.split(/\s+/);
  
  if (sentences.length === 0 || words.length === 0) return 0;

  const avgSentenceLength = words.length / sentences.length;
  const avgWordLength = text.replace(/\s+/g, '').length / words.length;
  const uniqueWords = new Set(words.map(w => w.toLowerCase())).size;
  const lexicalDiversity = uniqueWords / words.length;

  // Normalize scores
  const sentenceLengthScore = Math.min(avgSentenceLength / 30, 1);
  const wordLengthScore = Math.min(avgWordLength / 8, 1);
  
  return (sentenceLengthScore + wordLengthScore + lexicalDiversity) / 3;
}

/**
 * Finds the overlap between two text chunks
 */
export function findTextOverlap(text1: string, text2: string): string {
  const sentences1 = splitIntoSentences(text1);
  const sentences2 = splitIntoSentences(text2);
  
  const overlap: string[] = [];
  const set2 = new Set(sentences2);
  
  for (const sentence of sentences1) {
    if (set2.has(sentence)) {
      overlap.push(sentence);
    }
  }
  
  return overlap.join(' ');
}

/**
 * Calculates semantic coherence between sentences
 */
export function calculateSemanticCoherence(sentences: string[]): number {
  if (sentences.length < 2) return 1;

  const keywords = sentences.map(s => new Set(extractKeywords(s, 5)));
  let totalSimilarity = 0;
  let comparisons = 0;

  for (let i = 0; i < keywords.length - 1; i++) {
    const intersection = new Set([...keywords[i]].filter(x => keywords[i + 1].has(x)));
    const union = new Set([...keywords[i], ...keywords[i + 1]]);
    
    if (union.size > 0) {
      totalSimilarity += intersection.size / union.size;
      comparisons++;
    }
  }

  return comparisons > 0 ? totalSimilarity / comparisons : 0;
}

/**
 * Cleans and normalizes text
 */
export function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\t/g, '    ') // Convert tabs to spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/^\s+|\s+$/g, ''); // Trim
}

/**
 * Splits text into paragraphs
 */
export function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
}

/**
 * Extracts headers from markdown-style text
 */
export function extractHeaders(text: string): Array<{ level: number; title: string; position: number }> {
  const headers: Array<{ level: number; title: string; position: number }> = [];
  const lines = text.split('\n');
  let position = 0;

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      headers.push({
        level: match[1].length,
        title: match[2].trim(),
        position
      });
    }
    position += line.length + 1; // +1 for newline
  }

  return headers;
}

/**
 * Detects if text contains code blocks
 */
export function hasCodeBlocks(text: string): boolean {
  return /```[\s\S]*?```|`[^`]+`/.test(text);
}

/**
 * Extracts code blocks from text
 */
export function extractCodeBlocks(text: string): Array<{ code: string; language?: string; position: number }> {
  const blocks: Array<{ code: string; language?: string; position: number }> = [];
  const regex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    blocks.push({
      code: match[2],
      language: match[1],
      position: match.index
    });
  }

  return blocks;
}
