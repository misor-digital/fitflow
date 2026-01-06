'use client';

import { useState, useMemo } from 'react';
import { generateEmailPreview, getTemplate } from '@/lib/marketing/templates';

interface EmailPreviewSectionProps {
  templateData: string;
}

/**
 * Client component for rendering email preview with zoom controls
 * Parses the stored template JSON and generates a preview
 */
export function EmailPreviewSection({ templateData }: EmailPreviewSectionProps) {
  const [previewZoom, setPreviewZoom] = useState(100);
  const [useSampleData, setUseSampleData] = useState(true);
  const [showSource, setShowSource] = useState(false);

  // Parse template data and generate preview
  const { previewHtml, templateId, templateName, parseError } = useMemo(() => {
    try {
      const parsed = JSON.parse(templateData);
      const { templateId: tId, ...variables } = parsed;
      
      const template = getTemplate(tId);
      if (!template) {
        return {
          previewHtml: '',
          templateId: tId,
          templateName: 'Unknown Template',
          parseError: `Template "${tId}" not found`,
        };
      }

      const previewVars = useSampleData
        ? {
            email: 'preview@example.com',
            name: 'Иван Иванов',
            ...variables,
          }
        : {
            email: '',
            name: '',
            ...variables,
          };

      const html = generateEmailPreview(tId, previewVars);
      
      return {
        previewHtml: html,
        templateId: tId,
        templateName: template.name,
        parseError: null,
      };
    } catch {
      // If template is not JSON (legacy raw HTML), show it directly
      return {
        previewHtml: templateData,
        templateId: null,
        templateName: 'Raw HTML',
        parseError: null,
      };
    }
  }, [templateData, useSampleData]);

  if (parseError) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Email Preview</h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">Error loading preview</p>
          <p className="text-red-600 text-sm mt-1">{parseError}</p>
        </div>
        <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <span className="text-xs font-medium text-gray-500">Raw Template Data</span>
          </div>
          <pre className="p-4 text-xs text-gray-700 overflow-x-auto max-h-96 bg-gray-50">
            {templateData}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Email Preview</h2>
          {templateId && (
            <p className="text-sm text-gray-500 mt-1">
              Template: <span className="font-medium">{templateName}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSource(!showSource)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
              showSource
                ? 'bg-gray-200 text-gray-800 border-gray-300'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {showSource ? 'Hide Source' : 'View Source'}
          </button>
        </div>
      </div>

      {/* Preview Controls */}
      <div className="bg-gray-100 px-4 py-2 rounded-t-lg border border-gray-200 border-b-0 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="font-medium text-gray-700 text-sm">Preview</span>
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

      {/* Email Preview iframe */}
      <div className="border border-gray-200 rounded-b-lg overflow-hidden bg-gray-50">
        <div 
          className="overflow-auto"
          style={{ maxHeight: '600px' }}
        >
          <div 
            style={{ 
              transform: `scale(${previewZoom / 100})`,
              transformOrigin: 'top left',
              width: `${100 / (previewZoom / 100)}%`,
            }}
          >
            <iframe
              srcDoc={previewHtml}
              className="w-full border-0 bg-white"
              style={{ minHeight: '500px', height: '100%' }}
              title="Email Preview"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </div>

      {/* Source Code (collapsible) */}
      {showSource && (
        <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <span className="text-xs font-medium text-gray-500">Template Source (JSON)</span>
          </div>
          <pre className="p-4 text-xs text-gray-700 overflow-x-auto max-h-96 bg-gray-50">
            {templateData}
          </pre>
        </div>
      )}
    </div>
  );
}
