/**
 * Scheduler Control Page (DEV ONLY)
 * 
 * Manual trigger for the campaign scheduler/runner.
 * This page is only visible in development environment.
 * 
 * PRODUCTION SAFETY: This page is protected by:
 * 1. Parent layout's environment check (returns 404 in production)
 * 2. Additional dev-only check (renders nothing if not dev)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// Only show in development
const IS_DEV = process.env.NEXT_PUBLIC_APP_ENV === 'dev' || 
               process.env.NEXT_PUBLIC_APP_ENV === 'development' ||
               process.env.NODE_ENV === 'development';

interface RunResult {
  success: boolean;
  processed?: number;
  errors?: number;
  error?: string;
  timestamp: string;
}

export default function SchedulerPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<RunResult[]>([]);
  const [autoRun, setAutoRun] = useState(false);
  const [autoRunInterval, setAutoRunInterval] = useState(60); // seconds

  const runScheduler = useCallback(async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    
    try {
      const response = await fetch('/api/marketing/runner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const data = await response.json();
      
      const result: RunResult = {
        success: response.ok,
        processed: data.processed,
        errors: data.errors,
        error: data.error,
        timestamp: new Date().toLocaleTimeString('bg-BG'),
      };
      
      setResults(prev => [result, ...prev.slice(0, 9)]); // Keep last 10
    } catch (err) {
      const result: RunResult = {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toLocaleTimeString('bg-BG'),
      };
      setResults(prev => [result, ...prev.slice(0, 9)]);
    } finally {
      setIsRunning(false);
    }
  }, [isRunning]);

  // Auto-run effect
  useEffect(() => {
    if (!autoRun) return;
    
    const interval = setInterval(() => {
      runScheduler();
    }, autoRunInterval * 1000);
    
    return () => clearInterval(interval);
  }, [autoRun, autoRunInterval, runScheduler]);

  // Don't render if not in dev
  if (!IS_DEV) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
        <h2 className="text-red-800 font-medium text-lg">Not Available</h2>
        <p className="text-red-600 mt-2">
          The scheduler control panel is only available in development environment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Link 
            href="/internal"
            className="text-gray-500 hover:text-gray-700"
          >
            ← Back to Dashboard
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Scheduler Control</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manual trigger for the campaign scheduler (DEV ONLY)
        </p>
      </div>

      {/* Dev Warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-amber-800 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Development Only
        </h3>
        <p className="mt-2 text-sm text-amber-700">
          This page is only visible in development. In production, use a cron job service 
          (like cron-job.org) to call <code className="bg-amber-100 px-1 rounded">/api/marketing/runner</code> on a schedule.
        </p>
      </div>

      {/* Manual Trigger */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Manual Trigger</h2>
        
        <div className="flex items-center gap-4">
          <button
            onClick={runScheduler}
            disabled={isRunning}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
          >
            {isRunning ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                Running...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Run Scheduler Now
              </>
            )}
          </button>
          
          <p className="text-sm text-gray-500">
            Checks for scheduled campaigns ready to send and processes them.
          </p>
        </div>
      </div>

      {/* Auto-Run (for testing) */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Auto-Run (Testing)</h2>
        
        <div className="flex items-center gap-6">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={autoRun}
              onChange={(e) => setAutoRun(e.target.checked)}
              className="mr-2 w-4 h-4"
            />
            <span className="text-sm text-gray-700">Enable auto-run</span>
          </label>
          
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">Every</label>
            <select
              value={autoRunInterval}
              onChange={(e) => setAutoRunInterval(Number(e.target.value))}
              disabled={autoRun}
              className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-900"
            >
              <option value={30}>30 seconds</option>
              <option value={60}>1 minute</option>
              <option value={120}>2 minutes</option>
              <option value={300}>5 minutes</option>
            </select>
          </div>
          
          {autoRun && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Auto-running
            </span>
          )}
        </div>
      </div>

      {/* Results Log */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Run History</h2>
        
        {results.length === 0 ? (
          <p className="text-sm text-gray-500">No runs yet. Click &quot;Run Scheduler Now&quot; to start.</p>
        ) : (
          <div className="space-y-2">
            {results.map((result, index) => (
              <div 
                key={index}
                className={`p-3 rounded-lg text-sm ${
                  result.success 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={result.success ? 'text-green-700' : 'text-red-700'}>
                    {result.success ? '✓ Success' : '✗ Failed'}
                  </span>
                  <span className="text-gray-500">{result.timestamp}</span>
                </div>
                {result.success ? (
                  <p className="text-green-600 mt-1">
                    Processed: {result.processed || 0}, Errors: {result.errors || 0}
                  </p>
                ) : (
                  <p className="text-red-600 mt-1">{result.error}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800">How the Scheduler Works</h3>
        <ul className="mt-2 text-sm text-blue-700 space-y-1">
          <li>1. Finds campaigns with status &quot;scheduled&quot; and scheduled_start_at ≤ now</li>
          <li>2. Creates send records for recipients matching the campaign filter</li>
          <li>3. Sends emails in batches with rate limiting</li>
          <li>4. Updates campaign status to &quot;completed&quot; when done</li>
        </ul>
      </div>
    </div>
  );
}
