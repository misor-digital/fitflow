'use client';

import { useState } from 'react';

export default function CopyLinkBox({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex items-center gap-2 bg-white border border-amber-200 rounded px-3 py-2">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 text-xs text-blue-600 hover:text-blue-800 underline break-all"
      >
        {url}
      </a>
      <button
        type="button"
        onClick={handleCopy}
        className="shrink-0 px-2.5 py-1 text-xs font-medium rounded border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 cursor-pointer transition-colors"
      >
        {copied ? '✓ Копирано' : 'Копирай'}
      </button>
    </div>
  );
}
