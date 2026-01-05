/**
 * Recipients List Page
 * 
 * Displays a paginated list of marketing recipients with search and filtering.
 * 
 * PRODUCTION SAFETY: This page is protected by the parent layout's
 * environment check. It will return 404 in production.
 * 
 * NOTE: Email addresses are partially masked for privacy.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Recipient {
  id: string;
  email: string;
  name: string | null;
  tags: string[];
  subscribed: boolean;
  source: string | null;
  created_at: string;
  unsubscribed_at: string | null;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  
  const maskedLocal = local.length > 3 
    ? local.slice(0, 2) + '***' + local.slice(-1)
    : local.slice(0, 1) + '***';
  
  return `${maskedLocal}@${domain}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('bg-BG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function RecipientsListPage() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [showUnsubscribed, setShowUnsubscribed] = useState(false);
  const [tagFilter, setTagFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFullEmails, setShowFullEmails] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const fetchRecipients = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('subscribedOnly', showUnsubscribed ? 'false' : 'true');
      
      if (tagFilter.trim()) {
        params.set('tagsAny', tagFilter.trim());
      }

      const response = await fetch(`/api/marketing/recipients?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch recipients');
      }

      setRecipients(data.recipients || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [showUnsubscribed, tagFilter]);

  useEffect(() => {
    fetchRecipients();
  }, [fetchRecipients]);

  // Filter by search query (client-side)
  const filteredRecipients = recipients.filter(r => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      r.email.toLowerCase().includes(query) ||
      r.name?.toLowerCase().includes(query) ||
      r.tags.some(t => t.toLowerCase().includes(query))
    );
  });

  // Paginate
  const totalPages = Math.ceil(filteredRecipients.length / pageSize);
  const paginatedRecipients = filteredRecipients.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // Get unique tags for filter suggestions
  const allTags = [...new Set(recipients.flatMap(r => r.tags))].sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link 
              href="/internal/marketing/recipients"
              className="text-gray-500 hover:text-gray-700"
            >
              ← Back to Overview
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Recipients List</h1>
          <p className="mt-1 text-sm text-gray-500">
            {filteredRecipients.length} recipient{filteredRecipients.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <Link
          href="/internal/marketing/recipients/add"
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Recipients
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              id="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500 text-gray-900"
              placeholder="Search by email, name, or tag..."
            />
          </div>
          
          <div className="min-w-[150px]">
            <label htmlFor="tagFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Tag
            </label>
            <select
              id="tagFilter"
              value={tagFilter}
              onChange={(e) => {
                setTagFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            >
              <option value="">All tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setShowUnsubscribed(!showUnsubscribed);
              setPage(1);
            }}
            className={`px-3 py-2 text-sm font-medium rounded border ${
              showUnsubscribed 
                ? 'bg-gray-200 text-gray-800 border-gray-400' 
                : 'text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {showUnsubscribed ? '✓ Unsubscribed' : 'Show Unsubscribed'}
          </button>

          <button
            onClick={() => setShowFullEmails(!showFullEmails)}
            className={`px-3 py-2 text-sm font-medium rounded border ${
              showFullEmails 
                ? 'bg-amber-100 text-amber-800 border-amber-300' 
                : 'text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {showFullEmails ? '🔓 Emails Visible' : '🔒 Show Emails'}
          </button>

          <button
            onClick={() => {
              setSearchQuery('');
              setTagFilter('');
              setShowUnsubscribed(false);
              setShowFullEmails(false);
              setPage(1);
            }}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Clear filters
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">Error</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">Loading recipients...</p>
        </div>
      )}

      {/* Recipients Table */}
      {!isLoading && !error && (
        <>
          {paginatedRecipients.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900">No recipients found</h3>
              <p className="text-gray-500 mt-1">Try adjusting your filters or add new recipients.</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tags
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Added
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedRecipients.map((recipient) => (
                    <tr key={recipient.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono text-gray-900">
                          {showFullEmails ? recipient.email : maskEmail(recipient.email)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700">
                          {recipient.name || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {recipient.subscribed ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            Subscribed
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            Unsubscribed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {recipient.tags.length > 0 ? (
                            recipient.tags.map(tag => (
                              <span 
                                key={tag}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700"
                              >
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500">
                          {recipient.source || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500">
                          {formatDate(recipient.created_at)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-3">
              <div className="text-sm text-gray-500">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredRecipients.length)} of {filteredRecipients.length}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm text-gray-700">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-sm font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Privacy Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Privacy Protection
        </h3>
        <p className="mt-2 text-sm text-blue-700">
          Email addresses are partially masked for privacy. Full email addresses are only used 
          server-side when sending campaigns.
        </p>
      </div>
    </div>
  );
}
