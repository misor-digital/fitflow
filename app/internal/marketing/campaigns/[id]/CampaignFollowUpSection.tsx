/**
 * Campaign Follow-Up Section Component
 * 
 * Wrapper component that shows the "Create Follow-Up" button
 * for primary campaigns that are completed or sending.
 * Redirects to the new campaign page with prefilled follow-up data.
 * 
 * PRODUCTION SAFETY: This component is only rendered in internal pages
 * which are protected by environment checks.
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface CampaignFollowUpSectionProps {
  campaignId: string;
  campaignName: string;
  campaignStatus: string;
}

export function CampaignFollowUpSection({
  campaignId,
  campaignName,
  campaignStatus,
}: CampaignFollowUpSectionProps) {
  const [eligibleCount, setEligibleCount] = useState<number | null>(null);
  const [isLoadingCount, setIsLoadingCount] = useState(false);
  const [windowHours, setWindowHours] = useState(48);

  // Only show for campaigns that have started sending
  const canCreateFollowUp = ['sending', 'completed'].includes(campaignStatus);

  // Fetch eligible count
  useEffect(() => {
    if (!canCreateFollowUp) return;

    const fetchCount = async () => {
      setIsLoadingCount(true);
      try {
        const response = await fetch(
          `/api/marketing/campaigns/${campaignId}/follow-up?windowHours=${windowHours}`
        );
        const data = await response.json();
        if (response.ok) {
          setEligibleCount(data.eligibleCount);
        }
      } catch (err) {
        console.error('Error fetching eligible count:', err);
      } finally {
        setIsLoadingCount(false);
      }
    };

    fetchCount();
  }, [canCreateFollowUp, campaignId, windowHours]);

  if (!canCreateFollowUp) {
    return null;
  }

  // Build URL with prefilled data for new campaign page
  const followUpParams = new URLSearchParams({
    followUp: 'true',
    parentCampaignId: campaignId,
    parentCampaignName: campaignName,
    name: `Follow-up: ${campaignName}`,
    windowHours: windowHours.toString(),
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Follow-Up Campaign</h2>
          <p className="text-sm text-gray-500 mt-1">
            Send a follow-up email to recipients who didn&apos;t convert to a lead
          </p>
        </div>
        <Link
          href={`/internal/marketing/campaigns/new?${followUpParams.toString()}`}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Follow-Up
        </Link>
      </div>

      {/* Eligible Recipients Info */}
      <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-purple-800">Eligible Recipients</h3>
            <p className="text-xs text-purple-600 mt-1">
              Recipients who were sent this campaign but didn&apos;t convert
            </p>
          </div>
          <div className="text-right">
            {isLoadingCount ? (
              <div className="animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full"></div>
            ) : (
              <span className="text-2xl font-bold text-purple-700">
                {eligibleCount ?? '—'}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <label htmlFor="windowHours" className="text-xs text-purple-700">
            Conversion window:
          </label>
          <select
            id="windowHours"
            value={windowHours}
            onChange={(e) => setWindowHours(Number(e.target.value))}
            className="text-xs px-2 py-1 border border-purple-300 rounded bg-white text-purple-800"
          >
            <option value={24}>24 hours</option>
            <option value={48}>48 hours</option>
            <option value={72}>72 hours</option>
            <option value={96}>96 hours</option>
            <option value={168}>7 days</option>
          </select>
        </div>
      </div>

      <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          How Follow-Up Works
        </h3>
        <ul className="mt-2 text-sm text-gray-600 space-y-1">
          <li>• Targets recipients who were sent this campaign but didn&apos;t create a preorder</li>
          <li>• Recipients who unsubscribed are automatically excluded</li>
          <li>• Each recipient can only receive one follow-up per campaign</li>
        </ul>
      </div>
    </div>
  );
}
