/**
 * Internal Tools Dashboard
 * 
 * Landing page for internal-only tools.
 * Provides quick access to marketing campaigns, recipients, and other ops tools.
 * 
 * PRODUCTION SAFETY: This page is protected by the parent layout's
 * environment check. It will return 404 in production.
 */

import Link from 'next/link';

export default function InternalDashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Internal Tools Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Quick access to marketing, ops, and QA tools.
        </p>
      </div>

      {/* Tool Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Marketing Campaigns */}
        <Link 
          href="/internal/marketing/campaigns"
          className="block p-6 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Campaigns</h2>
              <p className="text-sm text-gray-500">Manage email marketing campaigns</p>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <ul className="space-y-1">
              <li>• View campaign list and status</li>
              <li>• Monitor send progress</li>
              <li>• Pause/resume campaigns</li>
              <li>• Trigger dry-runs</li>
            </ul>
          </div>
        </Link>

        {/* Recipients */}
        <Link 
          href="/internal/marketing/recipients"
          className="block p-6 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-green-300 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Recipients</h2>
              <p className="text-sm text-gray-500">View recipient statistics</p>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <ul className="space-y-1">
              <li>• Total recipient count</li>
              <li>• Subscription status breakdown</li>
              <li>• Tag/group statistics</li>
              <li>• Source distribution</li>
            </ul>
          </div>
        </Link>

        {/* Runner Status */}
        <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm opacity-75">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Runner Status</h2>
              <p className="text-sm text-gray-500">Campaign processor status</p>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            <p>View runner status from the campaign detail page.</p>
          </div>
        </div>
      </div>

      {/* Quick Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          About Internal Tools
        </h3>
        <p className="mt-2 text-sm text-blue-700">
          These tools are for internal use by QA, ops, and marketing teams. 
          They are <strong>not accessible in production</strong> and are gated by environment variables.
          All data access goes through protected server-side APIs.
        </p>
      </div>
    </div>
  );
}
