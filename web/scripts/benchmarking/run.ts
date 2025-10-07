/**
 * @fileoverview Performance Benchmarking Suite
 *
 * Runs a series of automated tests to measure RAG pipeline performance,
 * track metrics against PRD requirements, and detect regressions.
 *
 * @author RAG Showcase Team
 * @since 1.0.0
 */

import { createClient } from '@supabase/supabase-js';
import { performance } from 'perf_hooks';
import fs from 'fs/promises';
import path from 'path';

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const RAG_ORCHESTRATOR_URL = `${SUPABASE_URL}/functions/v1/rag-orchestrator`;

const BENCHMARK_SUITE = [
  {
    name: 'Simple Hybrid Search',
    config: {
      query: 'What is the impact of climate change on biodiversity?',
      techniques: ['hybrid-search'],
      domain_id: 'some-domain-id', // Replace with a valid domain ID
    },
  },
  {
    name: 'Multi-Technique Comparison',
    config: {
      query: 'Compare the effectiveness of different RAG techniques.',
      techniques: ['hybrid-search', 're-ranking', 'contextual-retrieval'],
      domain_id: 'some-domain-id',
    },
  },
  {
    name: 'Agentic RAG Query',
    config: {
      query: 'Plan a trip to the moon using available documentation.',
      techniques: ['agentic-rag'],
      domain_id: 'some-domain-id',
    },
  },
];

const PERFORMANCE_THRESHOLDS = {
  p95: 20000, // 95th percentile should be under 20s (PRD requirement)
  avg: 15000, // Average should be under 15s
  regression_threshold: 1.2, // 20% increase in latency is a regression
};

const OUTPUT_DIR = path.join(__dirname, '..', '..', '.taskmaster', 'reports', 'benchmarks');

// ============================================================================
// Main Execution
// ============================================================================

async function runBenchmark() {
  console.log('🚀 Starting performance benchmark suite...');

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: { session } } = await supabase.auth.signInWithPassword({
    email: process.env.TEST_USER_EMAIL!,
    password: process.env.TEST_USER_PASSWORD!,
  });
  const authToken = session?.access_token;

  if (!authToken) {
    console.error('❌ Failed to authenticate test user. Set TEST_USER_EMAIL and TEST_USER_PASSWORD.');
    process.exit(1);
  }

  const results = [];
  for (const test of BENCHMARK_SUITE) {
    console.log(`\nRunning test: "${test.name}"...`);
    const result = await executeTest(test, authToken);
    results.push(result);
  }

  const summary = analyzeResults(results);
  console.log('\n--- Benchmark Summary ---');
  console.table(summary.latency);
  console.log(`Overall Status: ${summary.overallStatus}`);
  console.log('-------------------------');

  const report = await saveReport(summary);
  await compareWithPrevious(report.filePath);

  if (summary.overallStatus === 'FAIL') {
    console.error('\n❌ Benchmark failed. Performance thresholds breached.');
    process.exit(1);
  } else {
    console.log('\n✅ Benchmark passed.');
  }
}

// ============================================================================
// Test Execution
// ============================================================================

async function executeTest(test: any, authToken: string) {
  const startTime = performance.now();
  let status: 'pass' | 'fail' = 'pass';
  let error: string | null = null;
  let responseData: any = null;

  try {
    const response = await fetch(RAG_ORCHESTRATOR_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(test.config),
    });

    responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.error?.message || 'Request failed');
    }
  } catch (e) {
    status = 'fail';
    error = e.message;
    console.error(`  - Test failed: ${e.message}`);
  }

  const duration = performance.now() - startTime;
  console.log(`  - Completed in ${duration.toFixed(2)}ms`);

  return {
    name: test.name,
    duration,
    status,
    error,
    timestamp: new Date().toISOString(),
    response: responseData,
  };
}

// ============================================================================
// Analysis and Reporting
// ============================================================================

function analyzeResults(results: any[]) {
  const latencies = results.filter(r => r.status === 'pass').map(r => r.duration);
  const avg = latencies.length > 0 ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length : 0;
  const p95 = latencies.length > 0 ? latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)] : 0;

  let status = 'PASS';
  const alerts = [];

  if (p95 > PERFORMANCE_THRESHOLDS.p95) {
    status = 'FAIL';
    alerts.push(`P95 latency of ${p95.toFixed(2)}ms exceeds threshold of ${PERFORMANCE_THRESHOLDS.p95}ms.`);
  }

  if (avg > PERFORMANCE_THRESHOLDS.avg) {
    status = 'FAIL';
    alerts.push(`Average latency of ${avg.toFixed(2)}ms exceeds threshold of ${PERFORMANCE_THRESHOLDS.avg}ms.`);
  }

  if (alerts.length > 0) {
    console.warn('\n🚨 Performance Alerts:');
    alerts.forEach(alert => console.warn(`  - ${alert}`));
  }

  return {
    timestamp: new Date().toISOString(),
    overallStatus: status,
    latency: {
      avg: avg.toFixed(2),
      p95: p95.toFixed(2),
      min: Math.min(...latencies).toFixed(2),
      max: Math.max(...latencies).toFixed(2),
    },
    thresholds: PERFORMANCE_THRESHOLDS,
    results,
  };
}

async function saveReport(summary: any) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(OUTPUT_DIR, `benchmark-${timestamp}.json`);
  await fs.writeFile(filePath, JSON.stringify(summary, null, 2));
  console.log(`\n💾 Report saved to ${filePath}`);
  return { filePath, summary };
}

async function compareWithPrevious(currentReportPath: string) {
  const files = (await fs.readdir(OUTPUT_DIR))
    .filter(f => f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length < 2) {
    console.log('  - Not enough reports to compare for regression.');
    return;
  }

  const previousReportPath = path.join(OUTPUT_DIR, files[1]);
  
  try {
    const currentReport = JSON.parse(await fs.readFile(currentReportPath, 'utf-8'));
    const previousReport = JSON.parse(await fs.readFile(previousReportPath, 'utf-8'));

    const currentAvg = parseFloat(currentReport.latency.avg);
    const previousAvg = parseFloat(previousReport.latency.avg);
    const ratio = currentAvg / previousAvg;

    console.log(`\n--- Regression Analysis ---`);
    console.log(`  - Current Avg Latency: ${currentAvg.toFixed(2)}ms`);
    console.log(`  - Previous Avg Latency: ${previousAvg.toFixed(2)}ms`);

    if (ratio > PERFORMANCE_THRESHOLDS.regression_threshold) {
      console.error(`  - regression detected! Latency increased by ${((ratio - 1) * 100).toFixed(2)}% (Threshold: ${((PERFORMANCE_THRESHOLDS.regression_threshold - 1) * 100).toFixed(2)}%)`);
      currentReport.overallStatus = 'FAIL'; // Mark as failed due to regression
      await fs.writeFile(currentReportPath, JSON.stringify(currentReport, null, 2));
    } else {
      console.log(`  - ✅ No significant performance regression detected.`);
    }
    console.log('-------------------------');

  } catch (error) {
    console.warn(`  - Could not compare with previous report: ${error.message}`);
  }
}

// ============================================================================
// Run
// ============================================================================

if (require.main === module) {
  runBenchmark().catch(err => {
    console.error('Benchmark suite failed with unexpected error:', err);
    process.exit(1);
  });
}
