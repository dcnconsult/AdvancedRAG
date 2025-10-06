/**
 * @fileoverview Embedding generation utilities
 * @module documentProcessing/utils/embeddingUtils
 */

import { OpenAI } from 'openai';

/**
 * Generates embeddings for a batch of texts
 */
export async function generateEmbeddings(
  texts: string[],
  openai: OpenAI
): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  try {
    // Process in batches to avoid rate limits
    const batchSize = 20;
    const embeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: batch,
      });

      embeddings.push(...response.data.map(item => item.embedding));
    }

    return embeddings;
  } catch (error) {
    console.error('Failed to generate embeddings:', error);
    throw new Error('Embedding generation failed');
  }
}

/**
 * Generates a single embedding
 */
export async function generateEmbedding(
  text: string,
  openai: OpenAI
): Promise<number[]> {
  const embeddings = await generateEmbeddings([text], openai);
  return embeddings[0];
}

/**
 * Calculates the average of multiple embeddings
 */
export function averageEmbeddings(embeddings: number[][]): number[] {
  if (embeddings.length === 0) {
    return [];
  }

  const dimension = embeddings[0].length;
  const average = new Array(dimension).fill(0);

  for (const embedding of embeddings) {
    for (let i = 0; i < dimension; i++) {
      average[i] += embedding[i];
    }
  }

  return average.map(val => val / embeddings.length);
}

/**
 * Finds the most similar embedding to a target
 */
export function findMostSimilarEmbedding(
  target: number[],
  candidates: number[][],
  cosineSimilarity: (a: number[], b: number[]) => number
): { index: number; similarity: number } {
  let maxSimilarity = -1;
  let bestIndex = -1;

  for (let i = 0; i < candidates.length; i++) {
    const similarity = cosineSimilarity(target, candidates[i]);
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
      bestIndex = i;
    }
  }

  return { index: bestIndex, similarity: maxSimilarity };
}

/**
 * Clusters embeddings based on similarity
 */
export function clusterEmbeddings(
  embeddings: number[][],
  threshold: number,
  cosineSimilarity: (a: number[], b: number[]) => number
): number[][] {
  const clusters: number[][] = [];
  const assigned = new Set<number>();

  for (let i = 0; i < embeddings.length; i++) {
    if (assigned.has(i)) continue;

    const cluster = [i];
    assigned.add(i);

    for (let j = i + 1; j < embeddings.length; j++) {
      if (assigned.has(j)) continue;

      const similarity = cosineSimilarity(embeddings[i], embeddings[j]);
      if (similarity >= threshold) {
        cluster.push(j);
        assigned.add(j);
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}

/**
 * Calculates embedding diversity in a set
 */
export function calculateEmbeddingDiversity(
  embeddings: number[][],
  cosineSimilarity: (a: number[], b: number[]) => number
): number {
  if (embeddings.length < 2) return 1;

  let totalSimilarity = 0;
  let comparisons = 0;

  for (let i = 0; i < embeddings.length - 1; i++) {
    for (let j = i + 1; j < embeddings.length; j++) {
      totalSimilarity += cosineSimilarity(embeddings[i], embeddings[j]);
      comparisons++;
    }
  }

  // Lower average similarity = higher diversity
  return 1 - (totalSimilarity / comparisons);
}
