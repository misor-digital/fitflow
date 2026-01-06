/**
 * Recipients View Component
 * 
 * A reusable component for displaying recipients with search, filtering, and pagination.
 * Used in both the recipients list page and campaign pages (new, edit, view).
 * 
 * Features:
 * - Search by email, name, or tag (client-side filtering)
 * - Tag-based filtering (include/exclude)
 * - Pagination
 * - Email masking for privacy
 * - Configurable display options
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface Recipient {
  id: string;
  email: string;
  name: string | null;
  tags: string[];
  subscribed: boolean;
  source?: string | null;
  created_at?: string;
  unsubscribed_at?: string | null;
}

export interface RecipientFilter {
  tags?: string[];
  tagsAny?: string[];
  excludeTags?: string[];
  subscribedOnly?: boolean;
}

export interface RecipientsViewProps {
  /** The filter to apply when fetching recipients */
  filter: RecipientFilter | null;
  /** Whether to show the search input */
  showSearch?: boolean;
  /** Whether to show the "Show Unsubscribed" toggle button */
  showUnsubscribedToggle?: boolean;
  /** Whether to show the "Show Emails" toggle button */
  showEmailsToggle?: boolean;
  /** Whether to show the tag filter UI (for interactive filtering) */
  showTagFilters?: boolean;
  /** Whether to show the source column */
  showSourceColumn?: boolean;
  /** Whether to show the added date column */
  showAddedColumn?: boolean;
  /** Title for the section */
  title?: string;
  /** Whether to start with the list expanded (visible) */
  defaultExpanded?: boolean;
  /** Whether the component is collapsible */
  collapsible?: boolean;
  /** Page size for pagination */
  pageSize?: number;
  /** Callback when recipient count changes */
  onCountChange?: (count: number) => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

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

// ============================================================================
// Main Component
// ============================================================================

export function RecipientsView({
  filter,
  showSearch = true,
  showUnsubscribedToggle = false,
  showEmailsToggle = false,
  showTagFilters = false,
  showSourceColumn = false,
  showAddedColumn = false,
  title = 'Recipients',
  defaultExpanded = false,
  collapsible = true,
  pageSize = 50,
  onCountChange,
}: RecipientsViewProps) {
  // State
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [page, setPage] = useState(1);
  
  // Filter state (for interactive filtering mode)
  const [searchQuery, setSearchQuery] = useState('');
  const [showUnsubscribed, setShowUnsubscribed] = useState(filter?.subscribedOnly === false);
  const [showFullEmails, setShowFullEmails] = useState(false);
  const [includeTags, setIncludeTags] = useState<string[]>(filter?.tagsAny || []);
  const [excludeTags, setExcludeTags] = useState<string[]>(filter?.excludeTags || []);

  // Fetch recipients
  const fetchRecipients = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      
      // Use interactive filter state if tag filters are shown, otherwise use prop filter
      if (showTagFilters) {
        params.set('subscribedOnly', showUnsubscribed ? 'false' : 'true');
        if (includeTags.length > 0) {
          params.set('tagsAny', includeTags.join(','));
        }
        if (excludeTags.length > 0) {
          params.set('excludeTags', excludeTags.join(','));
        }
      } else {
        // Use the filter prop directly
        const subscribedOnly = filter?.subscribedOnly !== false;
        params.set('subscribedOnly', subscribedOnly ? 'true' : 'false');
        
        if (filter?.tags && filter.tags.length > 0) {
          params.set('tags', filter.tags.join(','));
        }
        
        if (filter?.tagsAny && filter.tagsAny.length > 0) {
          params.set('tagsAny', filter.tagsAny.join(','));
        }
        
        if (filter?.excludeTags && filter.excludeTags.length > 0) {
          params.set('excludeTags', filter.excludeTags.join(','));
        }
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
  }, [filter, showTagFilters, showUnsubscribed, includeTags, excludeTags]);

  // Fetch when expanded or filter changes
  useEffect(() => {
    if (isExpanded || !collapsible) {
      fetchRecipients();
    }
  }, [isExpanded, collapsible, fetchRecipients]);

  // Filter by search query (client-side)
  const filteredRecipients = useMemo(() => {
    if (!searchQuery.trim()) return recipients;
    const query = searchQuery.toLowerCase();
    return recipients.filter(r => 
      r.email.toLowerCase().includes(query) ||
      r.name?.toLowerCase().includes(query) ||
      r.tags.some(t => t.toLowerCase().includes(query))
    );
  }, [recipients, searchQuery]);

  // Notify parent of count changes
  useEffect(() => {
    onCountChange?.(filteredRecipients.length);
  }, [filteredRecipients.length, onCountChange]);

  // Paginate
  const totalPages = Math.ceil(filteredRecipients.length / pageSize);
  const paginatedRecipients = filteredRecipients.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // Get unique tags for filter suggestions
  const allTags = useMemo(() => {
    return [...new Set(recipients.flatMap(r => r.tags))].sort();
  }, [recipients]);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  // Display the active filter from props (for campaign pages)
  const activeFilterDisplay = useMemo(() => {
    if (!filter || showTagFilters) return null;
    
    const parts: React.ReactNode[] = [];
    
    if (filter.tags && filter.tags.length > 0) {
      parts.push(
        <div key="tags" className="flex flex-wrap items-center gap-1">
          <span className="text-xs text-gray-500">Must have ALL:</span>
          {filter.tags.map(tag => (
            <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
              {tag}
            </span>
          ))}
        </div>
      );
    }
    
    if (filter.tagsAny && filter.tagsAny.length > 0) {
      parts.push(
        <div key="tagsAny" className="flex flex-wrap items-center gap-1">
          <span className="text-xs text-gray-500">Must have ANY:</span>
          {filter.tagsAny.map(tag => (
            <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
              {tag}
            </span>
          ))}
        </div>
      );
    }
    
    if (filter.excludeTags && filter.excludeTags.length > 0) {
      parts.push(
        <div key="excludeTags" className="flex flex-wrap items-center gap-1">
          <span className="text-xs text-gray-500">Exclude:</span>
          {filter.excludeTags.map(tag => (
            <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
              ✗ {tag}
            </span>
          ))}
        </div>
      );
    }
    
    return parts.length > 0 ? (
      <div className="flex flex-wrap gap-3 text-sm">
        {parts}
      </div>
    ) : null;
  }, [filter, showTagFilters]);

  // Render header with toggle button
  const renderHeader = () => (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {!isLoading && (isExpanded || !collapsible) && (
          <span className="text-sm text-gray-500">
            ({filteredRecipients.length} recipient{filteredRecipients.length !== 1 ? 's' : ''})
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {(isExpanded || !collapsible) && (
          <button
            onClick={fetchRecipients}
            disabled={isLoading}
            className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 disabled:opacity-50 flex items-center gap-1"
          >
            <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        )}
        {collapsible && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {isExpanded ? 'Hide Recipients' : 'Show Recipients'}
          </button>
        )}
      </div>
    </div>
  );

  // Render filters
  const renderFilters = () => {
    if (!isExpanded && collapsible) return null;
    
    return (
      <div className="space-y-4 mb-4">
        {/* Active filter display (for campaign pages) */}
        {activeFilterDisplay && (
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="text-xs font-medium text-gray-500 mb-2">Active Filters:</div>
            {activeFilterDisplay}
          </div>
        )}
        
        {/* Search and toggle buttons */}
        {(showSearch || showUnsubscribedToggle || showEmailsToggle) && (
          <div className="flex flex-wrap gap-4 items-end">
            {showSearch && (
              <div className="flex-1 min-w-[200px]">
                <label htmlFor="recipient-search" className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  id="recipient-search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500 text-gray-900"
                  placeholder="Search by email, name, or tag..."
                />
              </div>
            )}
            
            {showUnsubscribedToggle && (
              <button
                type="button"
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
            )}

            {showEmailsToggle && (
              <button
                type="button"
                onClick={() => setShowFullEmails(!showFullEmails)}
                className={`px-3 py-2 text-sm font-medium rounded border ${
                  showFullEmails 
                    ? 'bg-amber-100 text-amber-800 border-amber-300' 
                    : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {showFullEmails ? '🔓 Emails Visible' : '🔒 Show Emails'}
              </button>
            )}

            {showTagFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setIncludeTags([]);
                  setExcludeTags([]);
                  setShowUnsubscribed(false);
                  setShowFullEmails(false);
                  setPage(1);
                }}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Tag Filters (interactive mode) */}
        {showTagFilters && allTags.length > 0 && (
          <div className="pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Include Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Include Tags <span className="text-gray-400 font-normal">(match any)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {allTags.map(tag => {
                    const isSelected = includeTags.includes(tag);
                    const isExcluded = excludeTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setIncludeTags(includeTags.filter(t => t !== tag));
                          } else {
                            setIncludeTags([...includeTags, tag]);
                            if (isExcluded) {
                              setExcludeTags(excludeTags.filter(t => t !== tag));
                            }
                          }
                          setPage(1);
                        }}
                        className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                          isSelected
                            ? 'bg-green-100 text-green-700 border border-green-300'
                            : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        {isSelected && '✓ '}{tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Exclude Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exclude Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {allTags.map(tag => {
                    const isSelected = excludeTags.includes(tag);
                    const isIncluded = includeTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setExcludeTags(excludeTags.filter(t => t !== tag));
                          } else {
                            setExcludeTags([...excludeTags, tag]);
                            if (isIncluded) {
                              setIncludeTags(includeTags.filter(t => t !== tag));
                            }
                          }
                          setPage(1);
                        }}
                        className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                          isSelected
                            ? 'bg-red-100 text-red-700 border border-red-300'
                            : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        {isSelected && '✗ '}{tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Active Filters Summary */}
            {(includeTags.length > 0 || excludeTags.length > 0) && (
              <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-600">
                <span className="font-medium">Active filters: </span>
                {includeTags.length > 0 && (
                  <span className="text-green-700">
                    Include: {includeTags.join(', ')}
                  </span>
                )}
                {includeTags.length > 0 && excludeTags.length > 0 && ' | '}
                {excludeTags.length > 0 && (
                  <span className="text-red-700">
                    Exclude: {excludeTags.join(', ')}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render table
  const renderTable = () => {
    if (!isExpanded && collapsible) return null;

    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <span className="ml-2 text-gray-500">Loading recipients...</span>
        </div>
      );
    }

    if (paginatedRecipients.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p>No recipients match the current filter criteria.</p>
        </div>
      );
    }

    return (
      <>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tags
                </th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                {showSourceColumn && (
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                )}
                {showAddedColumn && (
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Added
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedRecipients.map((recipient) => (
                <tr key={recipient.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className="text-sm font-mono text-gray-900">
                      {showFullEmails ? recipient.email : maskEmail(recipient.email)}
                    </span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className="text-sm text-gray-700">
                      {recipient.name || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2">
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
                  <td className="px-4 py-2 whitespace-nowrap">
                    {recipient.subscribed ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Subscribed
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        Unsubscribed
                      </span>
                    )}
                  </td>
                  {showSourceColumn && (
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className="text-sm text-gray-500">
                        {recipient.source || '—'}
                      </span>
                    </td>
                  )}
                  {showAddedColumn && recipient.created_at && (
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className="text-sm text-gray-500">
                        {formatDate(recipient.created_at)}
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredRecipients.length)} of {filteredRecipients.length}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm text-gray-700">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-sm font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      {renderHeader()}
      {renderFilters()}
      {renderTable()}
    </div>
  );
}
