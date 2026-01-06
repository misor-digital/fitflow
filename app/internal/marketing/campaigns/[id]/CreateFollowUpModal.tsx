/**
 * Create Follow-Up Campaign Modal
 * 
 * Modal for creating a follow-up campaign targeting non-converted recipients.
 * 
 * PRODUCTION SAFETY: This component is only rendered in internal pages
 * which are protected by environment checks.
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { TiptapEditor } from '@/components/TiptapEditor';
import {
  getAllTemplates,
  getTemplate,
  generateEmailPreview,
  type TemplateDefinition,
  type VariableDefinition,
} from '@/lib/marketing/templates';

interface CreateFollowUpModalProps {
  parentCampaignId: string;
  parentCampaignName: string;
  isOpen: boolean;
  onClose: () => void;
}

interface FollowUpFormData {
  name: string;
  subject: string;
  templateId: string;
  templateVariables: Record<string, string | number | boolean>;
  previewText: string;
  scheduledStartAt: string;
  followUpWindowHours: number;
  populateSends: boolean;
}

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
          {helpText && <p className="mt-1 text-xs text-gray-500">{helpText}</p>}
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
          {helpText && <p className="mt-1 text-xs text-gray-500">{helpText}</p>}
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
          {helpText && <p className="mt-1 text-xs text-gray-500 ml-6">{helpText}</p>}
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
          {helpText && <p className="mt-1 text-xs text-gray-500">{helpText}</p>}
        </div>
      );
  }
}

export function CreateFollowUpModal({
  parentCampaignId,
  parentCampaignName,
  isOpen,
  onClose,
}: CreateFollowUpModalProps) {
  const router = useRouter();
  const templates = getAllTemplates();
  const defaultTemplate = getTemplate('discount');

  const [formData, setFormData] = useState<FollowUpFormData>({
    name: `Follow-up: ${parentCampaignName}`,
    subject: '',
    templateId: 'discount',
    templateVariables: defaultTemplate ? getDefaultVariables(defaultTemplate) : {},
    previewText: '',
    scheduledStartAt: '',
    followUpWindowHours: 48,
    populateSends: true,
  });

  const [eligibleCount, setEligibleCount] = useState<number | null>(null);
  const [isLoadingCount, setIsLoadingCount] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentTemplate = useMemo(() => {
    return getTemplate(formData.templateId);
  }, [formData.templateId]);

  const previewHtml = useMemo(() => {
    if (!currentTemplate) return '';
    try {
      const previewVars = {
        email: 'preview@example.com',
        name: 'Иван Иванов',
        ...formData.templateVariables,
      };
      return generateEmailPreview(formData.templateId, previewVars);
    } catch {
      return '<p>Error generating preview</p>';
    }
  }, [formData.templateId, formData.templateVariables, currentTemplate]);

  // Fetch eligible count when window hours changes
  useEffect(() => {
    if (!isOpen) return;

    const fetchCount = async () => {
      setIsLoadingCount(true);
      try {
        const response = await fetch(
          `/api/marketing/campaigns/${parentCampaignId}/follow-up?windowHours=${formData.followUpWindowHours}`
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
  }, [isOpen, parentCampaignId, formData.followUpWindowHours]);

  const handleTemplateChange = (templateId: string) => {
    const template = getTemplate(templateId);
    if (template) {
      setFormData((prev) => ({
        ...prev,
        templateId,
        templateVariables: getDefaultVariables(template),
      }));
    }
  };

  const handleVariableChange = (key: string, value: string | number | boolean) => {
    setFormData((prev) => ({
      ...prev,
      templateVariables: { ...prev.templateVariables, [key]: value },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const templateData = JSON.stringify({
        templateId: formData.templateId,
        ...formData.templateVariables,
      });

      const response = await fetch(`/api/marketing/campaigns/${parentCampaignId}/follow-up`, {
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
          followUpWindowHours: formData.followUpWindowHours,
          populateSends: formData.populateSends,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create follow-up campaign');
      }

      // Navigate to the new campaign
      router.push(`/internal/marketing/campaigns/${data.campaign.id}`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        {/* Modal */}
        <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-purple-50 border-b border-purple-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Create Follow-Up Campaign</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Target recipients who didn&apos;t convert from: <strong>{parentCampaignName}</strong>
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-180px)]">
            <div className="p-6 space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 font-medium">Error</p>
                  <p className="text-red-600 text-sm mt-1">{error}</p>
                </div>
              )}

              {/* Eligible Recipients Info */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-purple-800">Eligible Recipients</h3>
                    <p className="text-xs text-purple-600 mt-1">
                      Recipients who were sent the original campaign but didn&apos;t convert within the window
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
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Campaign Settings */}
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
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500 text-gray-900"
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
                      onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500 text-gray-900"
                      placeholder="e.g., Все още мислиш? 🤔"
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
                      onChange={(e) => setFormData((prev) => ({ ...prev, previewText: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500 text-gray-900"
                      placeholder="Text shown in email preview"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="followUpWindowHours" className="block text-sm font-medium text-gray-700 mb-1">
                        Conversion Window
                      </label>
                      <select
                        id="followUpWindowHours"
                        value={formData.followUpWindowHours}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            followUpWindowHours: Number(e.target.value),
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      >
                        <option value={24}>24 hours</option>
                        <option value={48}>48 hours</option>
                        <option value={72}>72 hours</option>
                        <option value={96}>96 hours</option>
                        <option value={168}>7 days</option>
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        Exclude recipients who converted within this time
                      </p>
                    </div>

                    <div>
                      <label htmlFor="scheduledStartAt" className="block text-sm font-medium text-gray-700 mb-1">
                        Schedule (optional)
                      </label>
                      <input
                        type="datetime-local"
                        id="scheduledStartAt"
                        value={formData.scheduledStartAt}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, scheduledStartAt: e.target.value }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="template" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Template *
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
                  </div>

                  {/* Template Variables */}
                  {currentTemplate && currentTemplate.variables.length > 0 && (
                    <div className="space-y-4 pt-4 border-t border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-700">Template Content</h3>
                      {currentTemplate.variables.map((variable) => (
                        <VariableField
                          key={variable.key}
                          variable={variable}
                          value={formData.templateVariables[variable.key] ?? variable.defaultValue ?? ''}
                          onChange={handleVariableChange}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Column - Preview */}
                <div className="lg:sticky lg:top-0">
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                      <span className="text-sm font-medium text-gray-700">Email Preview</span>
                    </div>
                    <div className="bg-gray-50 overflow-auto" style={{ maxHeight: '400px' }}>
                      <iframe
                        srcDoc={previewHtml}
                        className="w-full border-0 bg-white"
                        style={{ minHeight: '350px', transform: 'scale(0.75)', transformOrigin: 'top left', width: '133%' }}
                        title="Email Preview"
                        sandbox="allow-same-origin"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="border-t border-gray-200 pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.populateSends}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, populateSends: e.target.checked }))
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    Create send records immediately (recommended)
                  </span>
                </label>
                <p className="mt-1 text-xs text-gray-500 ml-6">
                  If unchecked, you&apos;ll need to manually populate sends before scheduling
                </p>
              </div>

              {/* Warning */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-amber-800 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Important
                </h3>
                <ul className="mt-2 text-sm text-amber-700 space-y-1">
                  <li>• Follow-up campaigns target recipients who did NOT convert to a lead</li>
                  <li>• Recipients who unsubscribed will be excluded</li>
                  <li>• Each recipient can only receive one follow-up per parent campaign</li>
                  <li>• You can pause or cancel the campaign at any time</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || eligibleCount === 0}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Follow-Up Campaign
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
