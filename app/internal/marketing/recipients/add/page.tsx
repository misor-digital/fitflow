/**
 * Add Recipients Page
 * 
 * Form for adding single recipients or bulk importing.
 * 
 * PRODUCTION SAFETY: This page is protected by the parent layout's
 * environment check. It will return 404 in production.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';

type ImportMode = 'single' | 'bulk';

interface SingleRecipientForm {
  email: string;
  name: string;
  tags: string;
  source: string;
}

interface ImportResult {
  success: boolean;
  imported?: number;
  errors?: string[];
  recipient?: {
    id: string;
    email: string;
    name: string | null;
  };
}

export default function AddRecipientsPage() {
  const [mode, setMode] = useState<ImportMode>('single');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Single recipient form
  const [singleForm, setSingleForm] = useState<SingleRecipientForm>({
    email: '',
    name: '',
    tags: '',
    source: 'manual',
  });

  // Bulk import
  const [bulkData, setBulkData] = useState('');
  const [bulkFormat, setBulkFormat] = useState<'csv' | 'json'>('csv');

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const tags = singleForm.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const response = await fetch('/api/marketing/recipients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: singleForm.email,
          name: singleForm.name || null,
          tags,
          source: singleForm.source || 'manual',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add recipient');
      }

      setResult({
        success: true,
        recipient: data.recipient,
      });

      // Reset form
      setSingleForm({
        email: '',
        name: '',
        tags: '',
        source: 'manual',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      let recipients: Array<{ email: string; name?: string; tags?: string[]; source?: string }> = [];

      if (bulkFormat === 'csv') {
        // Parse CSV: email,name,tags (tags comma-separated in quotes)
        const lines = bulkData.trim().split('\n');
        const hasHeader = lines[0]?.toLowerCase().includes('email');
        const dataLines = hasHeader ? lines.slice(1) : lines;

        for (const line of dataLines) {
          if (!line.trim()) continue;
          
          // Simple CSV parsing (handles quoted fields)
          const parts = parseCSVLine(line);
          const email = parts[0]?.trim();
          const name = parts[1]?.trim() || undefined;
          const tagsStr = parts[2]?.trim() || '';
          const source = parts[3]?.trim() || 'import';

          if (email && email.includes('@')) {
            recipients.push({
              email,
              name,
              tags: tagsStr ? tagsStr.split(',').map(t => t.trim()) : [],
              source,
            });
          }
        }
      } else {
        // Parse JSON
        const parsed = JSON.parse(bulkData);
        recipients = Array.isArray(parsed) ? parsed : [parsed];
      }

      if (recipients.length === 0) {
        throw new Error('No valid recipients found in the data');
      }

      const response = await fetch('/api/marketing/recipients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import recipients');
      }

      setResult({
        success: true,
        imported: data.imported,
        errors: data.errors,
      });

      // Clear bulk data on success
      if (data.imported > 0) {
        setBulkData('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Simple CSV line parser that handles quoted fields
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);

    return result;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Link 
            href="/internal/marketing/recipients"
            className="text-gray-500 hover:text-gray-700"
          >
            ← Back to Recipients
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Add Recipients</h1>
        <p className="mt-1 text-sm text-gray-500">
          Add a single recipient or bulk import from CSV/JSON
        </p>
      </div>

      {/* Mode Selector */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setMode('single')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
              mode === 'single'
                ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                : 'bg-gray-50 text-gray-600 border-2 border-transparent hover:bg-gray-100'
            }`}
          >
            <div className="text-lg mb-1">👤</div>
            Single Recipient
          </button>
          <button
            type="button"
            onClick={() => setMode('bulk')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
              mode === 'bulk'
                ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                : 'bg-gray-50 text-gray-600 border-2 border-transparent hover:bg-gray-100'
            }`}
          >
            <div className="text-lg mb-1">📋</div>
            Bulk Import
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">Error</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {result?.success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 font-medium">Success!</p>
          {result.recipient && (
            <p className="text-green-600 text-sm mt-1">
              Added recipient: {result.recipient.email}
              {result.recipient.name && ` (${result.recipient.name})`}
            </p>
          )}
          {result.imported !== undefined && (
            <p className="text-green-600 text-sm mt-1">
              Imported {result.imported} recipient{result.imported !== 1 ? 's' : ''}
            </p>
          )}
          {result.errors && result.errors.length > 0 && (
            <div className="mt-2">
              <p className="text-amber-700 text-sm font-medium">
                {result.errors.length} error{result.errors.length !== 1 ? 's' : ''}:
              </p>
              <ul className="text-amber-600 text-xs mt-1 list-disc list-inside">
                {result.errors.slice(0, 5).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {result.errors.length > 5 && (
                  <li>...and {result.errors.length - 5} more</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Single Recipient Form */}
      {mode === 'single' && (
        <form onSubmit={handleSingleSubmit} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Single Recipient</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                required
                value={singleForm.email}
                onChange={(e) => setSingleForm(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500 text-gray-900"
                placeholder="recipient@example.com"
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                id="name"
                value={singleForm.name}
                onChange={(e) => setSingleForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500 text-gray-900"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <input
                type="text"
                id="tags"
                value={singleForm.tags}
                onChange={(e) => setSingleForm(prev => ({ ...prev, tags: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500 text-gray-900"
                placeholder="newsletter, vip (comma-separated)"
              />
            </div>

            <div>
              <label htmlFor="source" className="block text-sm font-medium text-gray-700 mb-1">
                Source
              </label>
              <select
                id="source"
                value={singleForm.source}
                onChange={(e) => setSingleForm(prev => ({ ...prev, source: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                <option value="manual">Manual Entry</option>
                <option value="preorder">Preorder</option>
                <option value="signup">Website Signup</option>
                <option value="import">Import</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isSubmitting ? 'Adding...' : 'Add Recipient'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Bulk Import Form */}
      {mode === 'bulk' && (
        <form onSubmit={handleBulkSubmit} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Bulk Import</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Format
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="format"
                    value="csv"
                    checked={bulkFormat === 'csv'}
                    onChange={() => setBulkFormat('csv')}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">CSV</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="format"
                    value="json"
                    checked={bulkFormat === 'json'}
                    onChange={() => setBulkFormat('json')}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">JSON</span>
                </label>
              </div>
            </div>

            <div>
              <label htmlFor="bulkData" className="block text-sm font-medium text-gray-700 mb-1">
                Data *
              </label>
              <textarea
                id="bulkData"
                required
                rows={12}
                value={bulkData}
                onChange={(e) => setBulkData(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm placeholder:text-gray-500 text-gray-900"
                placeholder={
                  bulkFormat === 'csv'
                    ? 'email,name,tags,source\njohn@example.com,John Doe,"newsletter,vip",import\njane@example.com,Jane Smith,newsletter,import'
                    : '[\n  { "email": "john@example.com", "name": "John Doe", "tags": ["newsletter", "vip"] },\n  { "email": "jane@example.com", "name": "Jane Smith", "tags": ["newsletter"] }\n]'
                }
              />
              <p className="mt-1 text-xs text-gray-500">
                {bulkFormat === 'csv' ? (
                  <>CSV format: email,name,tags,source (first row can be header)</>
                ) : (
                  <>JSON format: array of objects with email, name, tags, source fields</>
                )}
              </p>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isSubmitting ? 'Importing...' : 'Import Recipients'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Import Notes
        </h3>
        <ul className="mt-2 text-sm text-blue-700 space-y-1">
          <li>• Existing recipients (by email) will be updated, not duplicated</li>
          <li>• New recipients are automatically subscribed</li>
          <li>• Tags help segment recipients for targeted campaigns</li>
          <li>• Source helps track where recipients came from</li>
        </ul>
      </div>
    </div>
  );
}
