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

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TiptapEditor } from '@/components/TiptapEditor';
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

interface Recipient {
  id: string;
  email: string;
  name: string | null;
  tags: string[];
  subscribed: boolean;
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

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  
  const maskedLocal = local.length > 3 
    ? local.slice(0, 2) + '***' + local.slice(-1)
    : local.slice(0, 1) + '***';
  
  return `${maskedLocal}@${domain}`;
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

export default function CreateCampaignPage() {
  const router = useRouter();
  const templates = getAllTemplates();
  
  const [formData, setFormData] = useState<CampaignFormData>(() => {
    const initial = { ...INITIAL_FORM_DATA };
    const defaultTemplate = getTemplate('discount');
    if (defaultTemplate) {
      initial.templateVariables = getDefaultVariables(defaultTemplate);
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
  
  // Recipient list state
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false);
  const [recipientsError, setRecipientsError] = useState<string | null>(null);
  const [showRecipientList, setShowRecipientList] = useState(false);
  const [recipientPage, setRecipientPage] = useState(1);
  const recipientPageSize = 50;

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

      const response = await fetch('/api/marketing/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          subject: formData.subject,
          template: templateData,
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

  // Fetch recipients based on current filter
  const fetchRecipients = useCallback(async () => {
    setIsLoadingRecipients(true);
    setRecipientsError(null);

    try {
      const params = new URLSearchParams();
      params.set('subscribedOnly', formData.recipientFilter.subscribedOnly ? 'true' : 'false');
      
      if (formData.recipientFilter.tags.length > 0) {
        params.set('tags', formData.recipientFilter.tags.join(','));
      }
      
      if (formData.recipientFilter.tagsAny.length > 0) {
        params.set('tagsAny', formData.recipientFilter.tagsAny.join(','));
      }
      
      if (formData.recipientFilter.excludeTags.length > 0) {
        params.set('excludeTags', formData.recipientFilter.excludeTags.join(','));
      }

      const response = await fetch(`/api/marketing/recipients?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch recipients');
      }

      setRecipients(data.recipients || []);
    } catch (err) {
      setRecipientsError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoadingRecipients(false);
    }
  }, [formData.recipientFilter]);

  // Fetch recipients when filter changes and list is shown
  useEffect(() => {
    if (showRecipientList) {
      fetchRecipients();
    }
  }, [showRecipientList, fetchRecipients]);

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
            Create a new marketing email campaign using templates
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
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Matching Recipients
                  {!isLoadingRecipients && (
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      ({recipients.length} recipient{recipients.length !== 1 ? 's' : ''})
                    </span>
                  )}
                </h2>
                <button
                  type="button"
                  onClick={fetchRecipients}
                  disabled={isLoadingRecipients}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 disabled:opacity-50 flex items-center gap-1"
                >
                  <svg className={`w-4 h-4 ${isLoadingRecipients ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>

              {recipientsError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-red-600 text-sm">{recipientsError}</p>
                </div>
              )}

              {isLoadingRecipients ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  <span className="ml-2 text-gray-500">Loading recipients...</span>
                </div>
              ) : recipients.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p>No recipients match the current filter criteria.</p>
                </div>
              ) : (
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
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {recipients.slice((recipientPage - 1) * recipientPageSize, recipientPage * recipientPageSize).map((recipient) => (
                        <tr key={recipient.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 whitespace-nowrap">
                            <span className="text-sm font-mono text-gray-900">
                              {maskEmail(recipient.email)}
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {recipients.length > recipientPageSize && (
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        Showing {(recipientPage - 1) * recipientPageSize + 1} to {Math.min(recipientPage * recipientPageSize, recipients.length)} of {recipients.length} recipients
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setRecipientPage(p => Math.max(1, p - 1))}
                          disabled={recipientPage === 1}
                          className="px-3 py-1 text-sm font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <span className="px-3 py-1 text-sm text-gray-700">
                          Page {recipientPage} of {Math.ceil(recipients.length / recipientPageSize)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setRecipientPage(p => Math.min(Math.ceil(recipients.length / recipientPageSize), p + 1))}
                          disabled={recipientPage >= Math.ceil(recipients.length / recipientPageSize)}
                          className="px-3 py-1 text-sm font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
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
