'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface DocNavItem {
  slug: string;
  title: string;
  icon: string;
}

interface AdminDocsNavProps {
  items: DocNavItem[];
  activeSlug: string;
}

export function AdminDocsNav({ items, activeSlug }: AdminDocsNavProps) {
  return (
    <nav className="w-full lg:w-64 shrink-0">
      <ul className="space-y-1">
        {items.map(item => {
          const isActive = item.slug === activeSlug;
          return (
            <li key={item.slug}>
              <Link
                href={`/admin/docs?section=${item.slug}`}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-[var(--color-brand-navy)] text-white font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.title}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

interface AdminDocsContentProps {
  contentHtml: string;
}

export function AdminDocsContent({ contentHtml }: AdminDocsContentProps) {
  return (
    <article
      className="admin-docs-content prose prose-lg max-w-none
        prose-headings:text-[#023047] prose-headings:font-bold
        prose-h1:text-2xl prose-h1:md:text-3xl prose-h1:mb-6 prose-h1:mt-0
        prose-h2:text-xl prose-h2:md:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:border-b prose-h2:border-gray-200 prose-h2:pb-2
        prose-h3:text-lg prose-h3:md:text-xl prose-h3:mt-6 prose-h3:mb-3
        prose-h4:text-base prose-h4:md:text-lg prose-h4:mt-4 prose-h4:mb-2
        prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-4
        prose-ul:my-4 prose-ul:pl-6
        prose-ol:my-4 prose-ol:pl-6
        prose-li:text-gray-700 prose-li:mb-2
        prose-a:text-[#FB7D00] prose-a:font-medium prose-a:no-underline hover:prose-a:underline
        prose-strong:text-[#023047] prose-strong:font-semibold
        prose-hr:my-8 prose-hr:border-gray-200
        prose-table:border-collapse prose-table:w-full prose-table:text-sm
        prose-th:bg-gray-50 prose-th:border prose-th:border-gray-200 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-semibold
        prose-td:border prose-td:border-gray-200 prose-td:px-3 prose-td:py-2
        prose-blockquote:border-l-4 prose-blockquote:border-[#FB7D00] prose-blockquote:bg-orange-50 prose-blockquote:rounded-r-lg prose-blockquote:px-4 prose-blockquote:py-3 prose-blockquote:not-italic
        prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono
        prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-lg prose-pre:p-4"
      dangerouslySetInnerHTML={{ __html: contentHtml }}
    />
  );
}
