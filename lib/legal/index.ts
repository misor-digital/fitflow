import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

/** Legal document types */
export type LegalDocumentSlug = 'terms' | 'privacy' | 'cookies';

/** Mapping from URL slugs to file names */
const SLUG_TO_FILE: Record<LegalDocumentSlug, string> = {
  terms: 'terms.md',
  privacy: 'privacy-policy.md',
  cookies: 'cookie-policy.md',
};

/** Mapping from slugs to page titles */
export const SLUG_TO_TITLE: Record<LegalDocumentSlug, string> = {
  terms: 'Общи условия',
  privacy: 'Политика за поверителност',
  cookies: 'Политика за бисквитки',
};

/** Mapping from slugs to meta descriptions */
export const SLUG_TO_DESCRIPTION: Record<LegalDocumentSlug, string> = {
  terms: 'Общи условия за ползване на FitFlow - спортна абонаментна кутия',
  privacy: 'Политика за защита на личните данни на FitFlow съгласно GDPR',
  cookies: 'Политика за бисквитки на FitFlow - информация за използваните cookies',
};

export interface LegalDocument {
  slug: LegalDocumentSlug;
  title: string;
  description: string;
  contentHtml: string;
}

/**
 * Get the content directory path
 */
function getContentDirectory(): string {
  return path.join(process.cwd(), 'content', 'legal');
}

/**
 * Check if a slug is valid
 */
export function isValidLegalSlug(slug: string): slug is LegalDocumentSlug {
  return slug in SLUG_TO_FILE;
}

/**
 * Get all legal document slugs
 */
export function getAllLegalSlugs(): LegalDocumentSlug[] {
  return Object.keys(SLUG_TO_FILE) as LegalDocumentSlug[];
}

/**
 * Get a legal document by slug
 * Reads from content/legal directory and converts markdown to HTML
 */
export async function getLegalDocument(slug: LegalDocumentSlug): Promise<LegalDocument> {
  const fileName = SLUG_TO_FILE[slug];
  const fullPath = path.join(getContentDirectory(), fileName);
  
  // Read the markdown file
  const fileContents = await fs.readFile(fullPath, 'utf8');
  
  // Parse frontmatter (if any) and content
  const { content } = matter(fileContents);
  
  // Convert markdown to HTML
  const processedContent = await remark()
    .use(html, { sanitize: false })
    .process(content);
  
  const contentHtml = processedContent.toString();
  
  return {
    slug,
    title: SLUG_TO_TITLE[slug],
    description: SLUG_TO_DESCRIPTION[slug],
    contentHtml,
  };
}

/**
 * Get all legal documents
 */
export async function getAllLegalDocuments(): Promise<LegalDocument[]> {
  const slugs = getAllLegalSlugs();
  const documents = await Promise.all(slugs.map(getLegalDocument));
  return documents;
}
