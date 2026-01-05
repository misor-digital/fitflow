/**
 * Create Campaign Page
 * 
 * Form for creating new marketing campaigns.
 * 
 * PRODUCTION SAFETY: This page is protected by the parent layout's
 * environment check. It will return 404 in production.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

const INITIAL_FORM_DATA: CampaignFormData = {
  name: '',
  subject: '',
  template: '',
  previewText: '',
  scheduledStartAt: '',
  status: 'draft',
  recipientFilter: {
    tags: [],
    tagsAny: [],
    excludeTags: [],
    subscribedOnly: true,
  },
};

// Sample template for quick start
const SAMPLE_TEMPLATE = `<h2 style="color: #333; margin: 0 0 20px 0;">Здравей{{name}}!</h2>

<p style="color: #555; font-size: 16px; line-height: 1.6;">
  Тук напиши съдържанието на имейла...
</p>

<p style="color: #555; font-size: 16px; line-height: 1.6;">
  Можеш да използваш следните променливи:
</p>

<ul style="color: #555; font-size: 14px; line-height: 1.8;">
  <li><code>{{name}}</code> - Име на получателя</li>
  <li><code>{{email}}</code> - Имейл на получателя</li>
  <li><code>{{unsubscribe_url}}</code> - Линк за отписване</li>
</ul>

<p style="margin: 30px 0;">
  <a href="https://fitflow.bg" style="display: inline-block; background: linear-gradient(135deg, #9c3b00 0%, #ff6a00 100%); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">
    Виж повече
  </a>
</p>`;

export default function CreateCampaignPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<CampaignFormData>(INITIAL_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagsInput, setTagsInput] = useState('');
  const [tagsAnyInput, setTagsAnyInput] = useState('');
  const [excludeTagsInput, setExcludeTagsInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Build recipient filter (only include non-empty values)
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

      const response = await fetch('/api/marketing/campaigns', {
        method: 'POST',
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
        throw new Error(data.error || 'Failed to create campaign');
      }

      // Redirect to the new campaign
      router.push(`/internal/marketing/campaigns/${data.campaign.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTagsChange = (field: 'tags' | 'tagsAny' | 'excludeTags', value: string) => {
    const tags = value.split(',').map(t => t.trim()).filter(t => t.length > 0);
    setFormData(prev => ({
      ...prev,
      recipientFilter: {
        ...prev.recipientFilter,
        [field]: tags,
      },
    }));
  };

  const loadSampleTemplate = () => {
    setFormData(prev => ({
      ...prev,
      template: SAMPLE_TEMPLATE,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link 
              href="/internal/marketing/campaigns"
              className="text-gray-500 hover:text-gray-700"
            >
              ← Back to Campaigns
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Campaign</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create a new marketing email campaign
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
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
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
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
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
                onChange={(e) => setFormData(prev => ({ ...prev, previewText: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500 text-gray-900"
                placeholder="Text shown in email preview (optional)"
              />
              <p className="mt-1 text-xs text-gray-500">
                This text appears in the inbox preview, after the subject line
              </p>
            </div>
          </div>
        </div>

        {/* Template */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Email Template</h2>
            <button
              type="button"
              onClick={loadSampleTemplate}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Load Sample Template
            </button>
          </div>
          
          <div>
            <label htmlFor="template" className="block text-sm font-medium text-gray-700 mb-1">
              HTML Content *
            </label>
            <textarea
              id="template"
              required
              rows={15}
              value={formData.template}
              onChange={(e) => setFormData(prev => ({ ...prev, template: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm placeholder:text-gray-500 text-gray-900"
              placeholder="<h2>Hello {{name}}!</h2>..."
            />
            <p className="mt-1 text-xs text-gray-500">
              Use {'{{name}}'}, {'{{email}}'}, {'{{unsubscribe_url}}'} for dynamic content. 
              The template will be wrapped in the FitFlow email layout.
            </p>
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
                    onChange={() => setFormData(prev => ({ ...prev, status: 'draft' }))}
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
                    onChange={() => setFormData(prev => ({ ...prev, status: 'scheduled' }))}
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
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduledStartAt: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Campaign will start sending at this time (server timezone)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Recipient Filter */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recipient Filter</h2>
          <p className="text-sm text-gray-500 mb-4">
            Define which recipients should receive this campaign. Leave empty to send to all subscribed recipients.
          </p>
          
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
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    recipientFilter: {
                      ...prev.recipientFilter,
                      subscribedOnly: e.target.checked,
                    },
                  }))}
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
            href="/internal/marketing/campaigns"
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isSubmitting ? 'Creating...' : 'Create Campaign'}
          </button>
        </div>
      </form>
    </div>
  );
}
