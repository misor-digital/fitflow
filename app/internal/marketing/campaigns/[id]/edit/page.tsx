/**
 * Edit Campaign Page
 * 
 * Form for editing existing marketing campaigns (draft or scheduled only).
 * 
 * PRODUCTION SAFETY: This page is protected by the parent layout's
 * environment check. It will return 404 in production.
 */

'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  template: string;
  preview_text: string | null;
  scheduled_start_at: string | null;
  status: string;
  recipient_filter: {
    tags?: string[];
    tagsAny?: string[];
    excludeTags?: string[];
    subscribedOnly?: boolean;
  } | null;
}

interface CampaignFormData {
  name: string;
  subject: string;
  template: string;
  previewText: string;
  scheduledStartAt: string;
  status: 'draft' | 'scheduled';
  recipientFilter: {
    tags: string[];
    tagsAny: string[];
    excludeTags: string[];
    subscribedOnly: boolean;
  };
}

export default function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [formData, setFormData] = useState<CampaignFormData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Tag inputs
  const [tagsInput, setTagsInput] = useState('');
  const [tagsAnyInput, setTagsAnyInput] = useState('');
  const [excludeTagsInput, setExcludeTagsInput] = useState('');

  useEffect(() => {
    async function fetchCampaign() {
      try {
        const response = await fetch(`/api/marketing/campaigns/${id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch campaign');
        }

        const c = data.campaign;
        
        // Check if editable
        if (c.status !== 'draft' && c.status !== 'scheduled') {
          setError(`Cannot edit campaign with status: ${c.status}. Only draft and scheduled campaigns can be edited.`);
          setCampaign(c);
          setIsLoading(false);
          return;
        }

        setCampaign(c);
        
        // Convert scheduled_start_at to local datetime format
        let scheduledStartAt = '';
        if (c.scheduled_start_at) {
          const date = new Date(c.scheduled_start_at);
          scheduledStartAt = date.toISOString().slice(0, 16);
        }

        const filter = c.recipient_filter || {};
        
        setFormData({
          name: c.name,
          subject: c.subject,
          template: c.template,
          previewText: c.preview_text || '',
          scheduledStartAt,
          status: c.status as 'draft' | 'scheduled',
          recipientFilter: {
            tags: filter.tags || [],
            tagsAny: filter.tagsAny || [],
            excludeTags: filter.excludeTags || [],
            subscribedOnly: filter.subscribedOnly !== false,
          },
        });

        setTagsInput((filter.tags || []).join(', '));
        setTagsAnyInput((filter.tagsAny || []).join(', '));
        setExcludeTagsInput((filter.excludeTags || []).join(', '));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    }

    fetchCampaign();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    
    setIsSubmitting(true);
    setError(null);

    try {
      // Build recipient filter
      const recipientFilter: Record<string, unknown> = {};
      if (formData.recipientFilter.tags.length > 0) {
        recipientFilter.tags = formData.recipientFilter.tags;
      }
      if (formData.recipientFilter.tagsAny.length > 0) {
        recipientFilter.tagsAny = formData.recipientFilter.tagsAny;
      }
      if (formData.recipientFilter.excludeTags.length > 0) {
        recipientFilter.excludeTags = formData.recipientFilter.excludeTags;
      }
      recipientFilter.subscribedOnly = formData.recipientFilter.subscribedOnly;

      const response = await fetch(`/api/marketing/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          subject: formData.subject,
          template: formData.template,
          previewText: formData.previewText || null,
          scheduledStartAt: formData.scheduledStartAt 
            ? new Date(formData.scheduledStartAt).toISOString() 
            : null,
          status: formData.status,
          recipientFilter: Object.keys(recipientFilter).length > 1 ? recipientFilter : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update campaign');
      }

      router.push(`/internal/marketing/campaigns/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTagsChange = (field: 'tags' | 'tagsAny' | 'excludeTags', value: string) => {
    const tags = value.split(',').map(t => t.trim()).filter(t => t.length > 0);
    setFormData(prev => prev ? {
      ...prev,
      recipientFilter: {
        ...prev.recipientFilter,
        [field]: tags,
      },
    } : null);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-500">Loading campaign...</p>
      </div>
    );
  }

  if (error && !formData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link 
            href={`/internal/marketing/campaigns/${id}`}
            className="text-gray-500 hover:text-gray-700"
          >
            ← Back to Campaign
          </Link>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-medium">Cannot Edit Campaign</h2>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!formData || !campaign) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link 
              href={`/internal/marketing/campaigns/${id}`}
              className="text-gray-500 hover:text-gray-700"
            >
              ← Back to Campaign
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Campaign</h1>
          <p className="mt-1 text-sm text-gray-500">
            Editing: {campaign.name}
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">Error</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Campaign Details</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Campaign Name *
              </label>
              <input
                type="text"
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => prev ? { ...prev, name: e.target.value } : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500 text-gray-900"
                placeholder="e.g., January Newsletter"
              />
            </div>

            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                Email Subject *
              </label>
              <input
                type="text"
                id="subject"
                required
                value={formData.subject}
                onChange={(e) => setFormData(prev => prev ? { ...prev, subject: e.target.value } : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500 text-gray-900"
                placeholder="e.g., 🎉 Специална оферта само за теб!"
              />
            </div>

            <div>
              <label htmlFor="previewText" className="block text-sm font-medium text-gray-700 mb-1">
                Preview Text
              </label>
              <input
                type="text"
                id="previewText"
                value={formData.previewText}
                onChange={(e) => setFormData(prev => prev ? { ...prev, previewText: e.target.value } : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500 text-gray-900"
                placeholder="Text shown in email preview (optional)"
              />
            </div>
          </div>
        </div>

        {/* Template */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Email Template</h2>
          
          <div>
            <label htmlFor="template" className="block text-sm font-medium text-gray-700 mb-1">
              HTML Content *
            </label>
            <textarea
              id="template"
              required
              rows={15}
              value={formData.template}
              onChange={(e) => setFormData(prev => prev ? { ...prev, template: e.target.value } : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm placeholder:text-gray-500 text-gray-900"
            />
          </div>
        </div>

        {/* Scheduling */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Scheduling</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campaign Status
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="status"
                    value="draft"
                    checked={formData.status === 'draft'}
                    onChange={() => setFormData(prev => prev ? { ...prev, status: 'draft' } : null)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Draft</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="status"
                    value="scheduled"
                    checked={formData.status === 'scheduled'}
                    onChange={() => setFormData(prev => prev ? { ...prev, status: 'scheduled' } : null)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Scheduled</span>
                </label>
              </div>
            </div>

            {formData.status === 'scheduled' && (
              <div>
                <label htmlFor="scheduledStartAt" className="block text-sm font-medium text-gray-700 mb-1">
                  Scheduled Start Time *
                </label>
                <input
                  type="datetime-local"
                  id="scheduledStartAt"
                  required={formData.status === 'scheduled'}
                  value={formData.scheduledStartAt}
                  onChange={(e) => setFormData(prev => prev ? { ...prev, scheduledStartAt: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>
            )}
          </div>
        </div>

        {/* Recipient Filter */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recipient Filter</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                Required Tags (must have ALL)
              </label>
              <input
                type="text"
                id="tags"
                value={tagsInput}
                onChange={(e) => {
                  setTagsInput(e.target.value);
                  handleTagsChange('tags', e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500 text-gray-900"
                placeholder="e.g., preorder, vip (comma-separated)"
              />
            </div>

            <div>
              <label htmlFor="tagsAny" className="block text-sm font-medium text-gray-700 mb-1">
                Any Tags (must have ANY)
              </label>
              <input
                type="text"
                id="tagsAny"
                value={tagsAnyInput}
                onChange={(e) => {
                  setTagsAnyInput(e.target.value);
                  handleTagsChange('tagsAny', e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500 text-gray-900"
                placeholder="e.g., newsletter, updates (comma-separated)"
              />
            </div>

            <div>
              <label htmlFor="excludeTags" className="block text-sm font-medium text-gray-700 mb-1">
                Exclude Tags (must NOT have)
              </label>
              <input
                type="text"
                id="excludeTags"
                value={excludeTagsInput}
                onChange={(e) => {
                  setExcludeTagsInput(e.target.value);
                  handleTagsChange('excludeTags', e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500 text-gray-900"
                placeholder="e.g., bounced, complained (comma-separated)"
              />
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.recipientFilter.subscribedOnly}
                  onChange={(e) => setFormData(prev => prev ? {
                    ...prev,
                    recipientFilter: {
                      ...prev.recipientFilter,
                      subscribedOnly: e.target.checked,
                    },
                  } : null)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Only send to subscribed recipients</span>
              </label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href={`/internal/marketing/campaigns/${id}`}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
