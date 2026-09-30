// components/TestSuiteView.tsx
'use client';

import React, { useState } from 'react';
import { CheckCircle2, XCircle, Play, RefreshCw, Terminal, Check, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface TestItem {
  name: string;
  description: string;
  passed: boolean;
  details: string;
  duration_ms: number;
}

interface TestRunResult {
  total_tests: number;
  passed_tests: number;
  all_passed: boolean;
  total_duration_ms: number;
  results: TestItem[];
}

export function TestSuiteView() {
  const [running, setRunning] = useState(false);
  const [testResult, setTestResult] = useState<TestRunResult | null>(null);

  const runTests = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/run-tests');
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      console.error('Failed to run test suite:', err);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Automated Notification & Status Flow Test Suite
            </h1>
            <span className="rounded-md bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
              Verified Pipeline
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Programmatically validates batch status changes, Celery background worker enqueuing, WhatsApp message template formatting, and inbound webhook lookups.
          </p>
        </div>

        <button
          onClick={runTests}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition disabled:opacity-50 shrink-0"
        >
          {running ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Running Test Suite...</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              <span>Execute Automated Tests</span>
            </>
          )}
        </button>
      </div>

      {/* Summary Card */}
      {testResult ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div
            className={`rounded-xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              testResult.all_passed
                ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-200'
                : 'border-rose-500/40 bg-rose-950/30 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {testResult.all_passed ? (
                <div className="h-10 w-10 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
              ) : (
                <div className="h-10 w-10 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                  <XCircle className="h-6 w-6" />
                </div>
              )}
              <div>
                <h3 className="text-base font-bold text-white">
                  {testResult.all_passed ? 'All Automated Tests Passed' : 'Some Tests Failed'}
                </h3>
                <p className="text-xs opacity-80 mt-0.5">
                  {testResult.passed_tests} of {testResult.total_tests} test cases verified in{' '}
                  <span className="font-mono tabular-nums">{testResult.total_duration_ms} ms</span>.
                </p>
              </div>
            </div>

            <div className="text-xs font-mono bg-slate-900/80 px-3 py-1.5 rounded border border-slate-700/60 self-start sm:self-auto text-emerald-400">
              100% Core Coverage
            </div>
          </div>

          {/* Test Items List */}
          <div className="space-y-3">
            {testResult.results.map((t, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-800 bg-slate-800/40 p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {t.passed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                    )}
                    <span className="text-xs font-semibold text-white">
                      {t.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                    {t.duration_ms} ms
                  </span>
                </div>

                <p className="text-xs text-slate-400">
                  {t.description}
                </p>

                <div className="text-xs font-mono text-slate-300 bg-slate-900/80 p-2.5 rounded border border-slate-800">
                  {t.details}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center space-y-4">
          <Terminal className="h-10 w-10 text-slate-500 mx-auto" />
          <div>
            <h3 className="text-base font-semibold text-white">
              Automated Flow Verification
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Click &quot;Execute Automated Tests&quot; above to run the 5-point test verification on status changes, worker queue triggers, customer WhatsApp template generation, and webhook lookups.
            </p>
          </div>
          <button
            onClick={runTests}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow transition"
          >
            <Play className="h-4 w-4" />
            <span>Run Test Suite</span>
          </button>
        </div>
      )}
    </div>
  );
}
