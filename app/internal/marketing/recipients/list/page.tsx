/**
 * Recipients List Page
 * 
 * Displays a paginated list of marketing recipients with search and filtering.
 * Uses the shared RecipientsView component with full filtering capabilities.
 * 
 * PRODUCTION SAFETY: This page is protected by the parent layout's
 * environment check. It will return 404 in production.
 * 
 * NOTE: Email addresses are partially masked for privacy.
 */

'use client';

import Link from 'next/link';
import { RecipientsView } from '@/components/RecipientsView';

export default function RecipientsListPage() {
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

      {/* Recipients View with full filtering */}
      <RecipientsView
        filter={null}
        title="All Recipients"
        showSearch={true}
        showUnsubscribedToggle={true}
        showEmailsToggle={true}
        showTagFilters={true}
        showSourceColumn={true}
        showAddedColumn={true}
        collapsible={false}
        defaultExpanded={true}
      />

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
