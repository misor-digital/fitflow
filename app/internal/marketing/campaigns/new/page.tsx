/**
 * Create Campaign Page
 * 
 * Form for creating new marketing campaigns with template-based system.
 * Features side-by-side form and live preview layout.
 * 
 * PRODUCTION SAFETY: This page is protected by the parent layout's
 * environment check. It will return 404 in production.
 */

'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { TiptapEditor } from '@/components/TiptapEditor';
import { RecipientsView } from '@/components/RecipientsView';
import {
  getAllTemplates,
  getTemplate,
  generateEmailPreview,
  type TemplateDefinition,
  type VariableDefinition,
} from '@/lib/marketing/templates';

// ============================================================================
// Types
// ============================================================================

interface CampaignFormData {
  name: string;
  subject: string;
  templateId: string;
  templateVariables: Record<string, string | number | boolean>;
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
  templateId: 'discount',
  templateVariables: {},
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

// ============================================================================
// Helper Functions
// ============================================================================

function getDefaultVariables(template: TemplateDefinition): Record<string, string | number | boolean> {
  const defaults: Record<string, string | number | boolean> = {};
  for (const variable of template.variables) {
    if (variable.defaultValue !== undefined) {
      defaults[variable.key] = variable.defaultValue;
    } else if (variable.type === 'checkbox') {
      defaults[variable.key] = false;
    } else if (variable.type === 'number') {
      defaults[variable.key] = 0;
    } else {
      defaults[variable.key] = '';
    }
  }
  return defaults;
}

// ============================================================================
// Variable Field Component
// ============================================================================

interface VariableFieldProps {
  variable: VariableDefinition;
  value: string | number | boolean;
  onChange: (key: string, value: string | number | boolean) => void;
}

function VariableField({ variable, value, onChange }: VariableFieldProps) {
  const { key, label, type, placeholder, helpText, maxLength, required } = variable;

  switch (type) {
    case 'richtext':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label} {required && '*'}
          </label>
          <TiptapEditor
            content={String(value || '')}
            onChange={(html) => onChange(key, html)}
            placeholder={placeholder}
          />
          {helpText && (
            <p className="mt-1 text-xs text-gray-500">{helpText}</p>
          )}
        </div>
      );

    case 'number':
      return (
        <div>
          <label htmlFor={key} className="block text-sm font-medium text-gray-700 mb-1">
            {label} {required && '*'}
          </label>
          <input
            type="number"
            id={key}
            value={Number(value) || 0}
            onChange={(e) => onChange(key, Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            placeholder={placeholder}
          />
          {helpText && (
            <p className="mt-1 text-xs text-gray-500">{helpText}</p>
          )}
        </div>
      );

    case 'checkbox':
      return (
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => onChange(key, e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">{label}</span>
          </label>
          {helpText && (
            <p className="mt-1 text-xs text-gray-500 ml-6">{helpText}</p>
          )}
        </div>
      );

    case 'url':
    case 'text':
    default:
      return (
        <div>
          <label htmlFor={key} className="block text-sm font-medium text-gray-700 mb-1">
            {label} {required && '*'}
          </label>
          <input
            type={type === 'url' ? 'url' : 'text'}
            id={key}
            value={String(value || '')}
            onChange={(e) => onChange(key, e.target.value)}
            maxLength={maxLength}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500 text-gray-900"
            placeholder={placeholder}
          />
          {helpText && (
            <p className="mt-1 text-xs text-gray-500">{helpText}</p>
          )}
        </div>
      );
  }
}

// ============================================================================
// Main Component
// ============================================================================

// Follow-up campaign state
interface FollowUpState {
  isFollowUp: boolean;
  parentCampaignId: string | null;
  parentCampaignName: string | null;
  windowHours: number;
}

// Inner component that uses useSearchParams
function CreateCampaignContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templates = getAllTemplates();
  
  // Parse follow-up params from URL
  const followUpState: FollowUpState = useMemo(() => ({
    isFollowUp: searchParams.get('followUp') === 'true',
    parentCampaignId: searchParams.get('parentCampaignId'),
    parentCampaignName: searchParams.get('parentCampaignName'),
    windowHours: parseInt(searchParams.get('windowHours') || '48', 10),
  }), [searchParams]);
  
  const [formData, setFormData] = useState<CampaignFormData>(() => {
    const initial = { ...INITIAL_FORM_DATA };
    const defaultTemplate = getTemplate('discount');
    if (defaultTemplate) {
      initial.templateVariables = getDefaultVariables(defaultTemplate);
    }
    // Prefill name from URL params (for follow-up)
    const nameFromUrl = searchParams.get('name');
    if (nameFromUrl) {
      initial.name = nameFromUrl;
    }
    return initial;
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagsInput, setTagsInput] = useState('');
  const [tagsAnyInput, setTagsAnyInput] = useState('');
  const [excludeTagsInput, setExcludeTagsInput] = useState('');
  const [previewZoom, setPreviewZoom] = useState(100);
  const [useSampleData, setUseSampleData] = useState(true);
  const [showRecipientList, setShowRecipientList] = useState(false);

  // Get current template
  const currentTemplate = useMemo(() => {
    return getTemplate(formData.templateId);
  }, [formData.templateId]);

  // Generate preview HTML
  const previewHtml = useMemo(() => {
    if (!currentTemplate) return '';
    try {
      const previewVars = useSampleData 
        ? {
            email: 'preview@example.com',
            name: 'Иван Иванов',
            ...formData.templateVariables,
          }
        : {
            email: '',
            name: '',
            ...formData.templateVariables,
          };
      return generateEmailPreview(formData.templateId, previewVars);
    } catch {
      return '<p>Error generating preview</p>';
    }
  }, [formData.templateId, formData.templateVariables, currentTemplate, useSampleData]);

  // Handle template change
  const handleTemplateChange = (templateId: string) => {
    const template = getTemplate(templateId);
    if (template) {
      setFormData(prev => ({
        ...prev,
        templateId,
        templateVariables: getDefaultVariables(template),
      }));
    }
  };

  // Handle variable change
  const handleVariableChange = (key: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      templateVariables: {
        ...prev.templateVariables,
        [key]: value,
      },
    }));
  };

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

      // Store template variables as JSON in the template field
      const templateData = JSON.stringify({
        templateId: formData.templateId,
        ...formData.templateVariables,
      });

      // Build request body - include follow-up fields if applicable
      const requestBody: Record<string, unknown> = {
        name: formData.name,
        subject: formData.subject,
        template: templateData,
        previewText: formData.previewText || null,
        scheduledStartAt: formData.scheduledStartAt 
          ? new Date(formData.scheduledStartAt).toISOString() 
          : null,
        status: formData.status,
        recipientFilter: Object.keys(recipientFilter).length > 1 ? recipientFilter : null,
      };

      // Add follow-up fields if this is a follow-up campaign
      if (followUpState.isFollowUp && followUpState.parentCampaignId) {
        requestBody.parentCampaignId = followUpState.parentCampaignId;
        requestBody.campaignType = 'follow_up';
        requestBody.followUpWindowHours = followUpState.windowHours;
      }

      const response = await fetch('/api/marketing/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
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

  // Build the current filter for the RecipientsView
  const currentFilter = useMemo(() => ({
    tags: formData.recipientFilter.tags,
    tagsAny: formData.recipientFilter.tagsAny,
    excludeTags: formData.recipientFilter.excludeTags,
    subscribedOnly: formData.recipientFilter.subscribedOnly,
  }), [formData.recipientFilter]);

  // Reset recipient list visibility when filter changes
  useEffect(() => {
    // Keep the list open if it was already open
  }, [currentFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link 
              href={followUpState.isFollowUp && followUpState.parentCampaignId 
                ? `/internal/marketing/campaigns/${followUpState.parentCampaignId}`
                : "/internal/marketing/campaigns"
              }
              className="text-gray-500 hover:text-gray-700"
            >
              ← {followUpState.isFollowUp ? 'Back to Parent Campaign' : 'Back to Campaigns'}
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {followUpState.isFollowUp ? 'Create Follow-Up Campaign' : 'Create Campaign'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {followUpState.isFollowUp 
              ? `Follow-up for: ${followUpState.parentCampaignName}`
              : 'Create a new marketing email campaign using templates'
            }
          </p>
        </div>
      </div>

      {/* Follow-Up Info Banner */}
      {followUpState.isFollowUp && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-purple-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-semibold text-purple-800">Follow-Up Campaign</h3>
              <p className="text-sm text-purple-700 mt-1">
                This campaign will target recipients from <strong>{followUpState.parentCampaignName}</strong> who 
                did not convert to a lead within {followUpState.windowHours} hours.
              </p>
              <p className="text-xs text-purple-600 mt-2">
                Recipients who unsubscribed or already received a follow-up will be excluded.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">Error</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        {/* Campaign Settings Section (Full Width) */}
        <div className="space-y-6 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Campaign Details Card */}
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

            {/* Scheduling Card */}
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

            {/* Recipient Filter Card */}
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
                    placeholder="e.g., preorder, vip"
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
                    placeholder="e.g., newsletter, updates"
                  />
                </div>

                <div>
                  <label htmlFor="excludeTags" className="block text-sm font-medium text-gray-700 mb-1">
                    Exclude Tags
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
                    placeholder="e.g., bounced, complained"
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
                    <span className="text-sm text-gray-700">Only subscribed recipients</span>
                  </label>
                </div>

                {/* Show Recipients Button */}
                <div className="pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowRecipientList(!showRecipientList)}
                    className="w-full px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {showRecipientList ? 'Hide Recipients' : 'Show Recipients'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Recipient List Section */}
          {showRecipientList && (
            <RecipientsView
              filter={currentFilter}
              title="Matching Recipients"
              showSearch={true}
              showUnsubscribedToggle={false}
              showEmailsToggle={false}
              showTagFilters={false}
              collapsible={false}
              defaultExpanded={true}
            />
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 mb-8"></div>

        {/* Email Content Section (Side-by-Side: 33% form, 66% preview) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Email Template & Content */}
          <div className="space-y-6">
            {/* Template Selection Card */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Email Template</h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="template" className="block text-sm font-medium text-gray-700 mb-1">
                    Select Template *
                  </label>
                  <select
                    id="template"
                    value={formData.templateId}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  >
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                  {currentTemplate && (
                    <p className="mt-1 text-xs text-gray-500">{currentTemplate.description}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Template Variables Card */}
            {currentTemplate && currentTemplate.variables.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Template Content</h2>
                
                <div className="space-y-4">
                  {currentTemplate.variables.map((variable) => (
                    <VariableField
                      key={variable.key}
                      variable={variable}
                      value={formData.templateVariables[variable.key] ?? variable.defaultValue ?? ''}
                      onChange={handleVariableChange}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Live Preview (sticky) - spans 2 columns for 66% width on desktop */}
          <div className="lg:col-span-2 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden h-[500px] lg:h-full flex flex-col">
              <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex-shrink-0 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-700">Email Preview</span>
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useSampleData}
                      onChange={(e) => setUseSampleData(e.target.checked)}
                      className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-600">Sample data</span>
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewZoom(Math.max(50, previewZoom - 25))}
                    disabled={previewZoom <= 50}
                    className="px-2.5 py-1 text-sm font-medium bg-gray-200 text-gray-700 border border-gray-400 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Zoom out"
                  >
                    −
                  </button>
                  <span className="text-sm font-medium text-gray-700 min-w-[3rem] text-center">{previewZoom}%</span>
                  <button
                    type="button"
                    onClick={() => setPreviewZoom(Math.min(150, previewZoom + 25))}
                    disabled={previewZoom >= 150}
                    className="px-2.5 py-1 text-sm font-medium bg-gray-200 text-gray-700 border border-gray-400 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Zoom in"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewZoom(100)}
                    className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-700 border border-gray-400 rounded hover:bg-gray-300"
                    title="Reset zoom"
                  >
                    Reset
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto bg-gray-50">
                <div 
                  style={{ 
                    transform: `scale(${previewZoom / 100})`,
                    transformOrigin: 'top left',
                    width: `${100 / (previewZoom / 100)}%`,
                    height: `${100 / (previewZoom / 100)}%`,
                  }}
                >
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full h-full min-h-[450px] border-0 bg-white"
                    title="Email Preview"
                    sandbox="allow-same-origin"
                    style={{ minWidth: '100%', maxWidth: '100%' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
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

// Loading fallback for Suspense
function CreateCampaignLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-4 w-64 bg-gray-200 rounded animate-pulse mt-2"></div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 h-64 animate-pulse"></div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 h-64 animate-pulse"></div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 h-64 animate-pulse"></div>
      </div>
    </div>
  );
}

// Default export wraps content in Suspense for useSearchParams
export default function CreateCampaignPage() {
  return (
    <Suspense fallback={<CreateCampaignLoading />}>
      <CreateCampaignContent />
    </Suspense>
  );
}
