/**
 * Campaign Actions Component
 * 
 * Provides action buttons for campaign management:
 * - Start (dry-run or live)
 * - Pause (for sending campaigns)
 * - Resume (for paused campaigns)
 * - Cancel (for non-completed campaigns)
 * 
 * Actions are conditionally enabled based on campaign status.
 * Includes confirmation dialogs for destructive actions.
 * 
 * PRODUCTION SAFETY: This component is only rendered within the
 * internal layout which is gated by environment checks.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MarketingCampaignRow, CampaignStatus } from '@/lib/marketing';

interface CampaignActionsProps {
  campaign: MarketingCampaignRow;
}

// Define which actions are available for each status
const AVAILABLE_ACTIONS: Record<CampaignStatus, string[]> = {
  draft: ['start', 'start-dry-run'],
  scheduled: ['start', 'start-dry-run', 'cancel'],
  sending: ['pause', 'cancel'],
  paused: ['resume', 'cancel'],
  completed: [],
  cancelled: [],
};

export function CampaignActions({ campaign }: CampaignActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState<string | null>(null);

  const availableActions = AVAILABLE_ACTIONS[campaign.status] || [];

  const executeAction = async (action: string) => {
    setIsLoading(action);
    setError(null);

    try {
      const response = await fetch(`/api/marketing/campaigns/${campaign.id}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Action failed');
      }

      // Refresh the page to show updated status
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(null);
      setShowConfirm(null);
    }
  };

  const handleAction = (action: string) => {
    // Actions that require confirmation
    const requiresConfirmation = ['start', 'cancel'];
    
    if (requiresConfirmation.includes(action)) {
      setShowConfirm(action);
    } else {
      executeAction(action);
    }
  };

  if (availableActions.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Actions</h2>
        <p className="text-sm text-gray-500">
          No actions available for campaigns with status: <strong>{campaign.status}</strong>
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>

      {/* Error Display */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-amber-800">
                {showConfirm === 'start' && 'Confirm Start Campaign'}
                {showConfirm === 'cancel' && 'Confirm Cancel Campaign'}
              </h3>
              <p className="mt-1 text-sm text-amber-700">
                {showConfirm === 'start' && (
                  <>
                    This will start sending emails to all matching recipients.
                    <strong className="block mt-1">This action cannot be undone.</strong>
                  </>
                )}
                {showConfirm === 'cancel' && (
                  <>
                    This will permanently cancel the campaign. Unsent emails will not be delivered.
                    <strong className="block mt-1">This action cannot be undone.</strong>
                  </>
                )}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => executeAction(showConfirm)}
                  disabled={isLoading !== null}
                  className="px-3 py-1.5 bg-amber-600 text-white text-sm font-medium rounded hover:bg-amber-700 disabled:opacity-50"
                >
                  {isLoading === showConfirm ? 'Processing...' : 'Confirm'}
                </button>
                <button
                  onClick={() => setShowConfirm(null)}
                  disabled={isLoading !== null}
                  className="px-3 py-1.5 bg-white text-gray-700 text-sm font-medium rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {/* Start Campaign (Live) */}
        {availableActions.includes('start') && (
          <button
            onClick={() => handleAction('start')}
            disabled={isLoading !== null}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading === 'start' ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Starting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Start Campaign
              </>
            )}
          </button>
        )}

        {/* Start Dry-Run */}
        {availableActions.includes('start-dry-run') && (
          <button
            onClick={() => executeAction('start-dry-run')}
            disabled={isLoading !== null}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading === 'start-dry-run' ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Running...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Dry-Run (No Emails)
              </>
            )}
          </button>
        )}

        {/* Pause Campaign */}
        {availableActions.includes('pause') && (
          <button
            onClick={() => executeAction('pause')}
            disabled={isLoading !== null}
            className="inline-flex items-center px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading === 'pause' ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Pausing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Pause Campaign
              </>
            )}
          </button>
        )}

        {/* Resume Campaign */}
        {availableActions.includes('resume') && (
          <button
            onClick={() => executeAction('resume')}
            disabled={isLoading !== null}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading === 'resume' ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Resuming...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Resume Campaign
              </>
            )}
          </button>
        )}

        {/* Cancel Campaign */}
        {availableActions.includes('cancel') && (
          <button
            onClick={() => handleAction('cancel')}
            disabled={isLoading !== null}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading === 'cancel' ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Cancelling...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel Campaign
              </>
            )}
          </button>
        )}
      </div>

      {/* Action Descriptions */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Action Descriptions</h3>
        <ul className="text-xs text-gray-500 space-y-1">
          {availableActions.includes('start') && (
            <li><strong>Start Campaign:</strong> Begin sending emails to all matching recipients.</li>
          )}
          {availableActions.includes('start-dry-run') && (
            <li><strong>Dry-Run:</strong> Simulate the campaign without sending actual emails. Sends will be marked as skipped.</li>
          )}
          {availableActions.includes('pause') && (
            <li><strong>Pause:</strong> Temporarily stop sending. Can be resumed later.</li>
          )}
          {availableActions.includes('resume') && (
            <li><strong>Resume:</strong> Continue sending from where it was paused.</li>
          )}
          {availableActions.includes('cancel') && (
            <li><strong>Cancel:</strong> Permanently stop the campaign. Cannot be undone.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
