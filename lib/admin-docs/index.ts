import fs from 'fs/promises';
import path from 'path';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import html from 'remark-html';

export type AdminDocSlug =
  | 'getting-started'
  | 'roles-and-permissions'
  | 'orders'
  | 'subscriptions'
  | 'customers'
  | 'delivery-cycles'
  | 'promo-codes'
  | 'emails-and-campaigns'
  | 'staff-management'
  | 'feedback-forms'
  | 'settings';

interface AdminDocMeta {
  file: string;
  title: string;
  icon: string;
}

const DOCS: Record<AdminDocSlug, AdminDocMeta> = {
  'getting-started': { file: 'getting-started.md', title: 'Първи стъпки', icon: '🚀' },
  'roles-and-permissions': { file: 'roles-and-permissions.md', title: 'Роли и права', icon: '🔐' },
  orders: { file: 'orders.md', title: 'Поръчки', icon: '📦' },
  subscriptions: { file: 'subscriptions.md', title: 'Абонаменти', icon: '🔄' },
  customers: { file: 'customers.md', title: 'Клиенти', icon: '👥' },
  'delivery-cycles': { file: 'delivery-cycles.md', title: 'Цикли на доставка', icon: '📅' },
  'promo-codes': { file: 'promo-codes.md', title: 'Промо кодове', icon: '🏷️' },
  'emails-and-campaigns': { file: 'emails-and-campaigns.md', title: 'Имейли и кампании', icon: '📧' },
  'staff-management': { file: 'staff-management.md', title: 'Управление на служители', icon: '👤' },
  'feedback-forms': { file: 'feedback-forms.md', title: 'Форми за обратна връзка', icon: '💬' },
  settings: { file: 'settings.md', title: 'Настройки', icon: '⚙️' },
};

export interface AdminDoc {
  slug: AdminDocSlug;
  title: string;
  icon: string;
  contentHtml: string;
}

function getContentDirectory(): string {
  return path.join(process.cwd(), 'content', 'admin-docs');
}

export function isValidAdminDocSlug(slug: string): slug is AdminDocSlug {
  return slug in DOCS;
}

export function getAllAdminDocSlugs(): AdminDocSlug[] {
  return Object.keys(DOCS) as AdminDocSlug[];
}

export function getAdminDocMeta(slug: AdminDocSlug): { title: string; icon: string } {
  return { title: DOCS[slug].title, icon: DOCS[slug].icon };
}

export function getAllAdminDocsMeta(): Array<{ slug: AdminDocSlug; title: string; icon: string }> {
  return getAllAdminDocSlugs().map(slug => ({ slug, ...getAdminDocMeta(slug) }));
}

export async function getAdminDoc(slug: AdminDocSlug): Promise<AdminDoc> {
  const meta = DOCS[slug];
  const fullPath = path.join(getContentDirectory(), meta.file);
  const fileContents = await fs.readFile(fullPath, 'utf8');

  const processedContent = await remark()
    .use(remarkGfm)
    .use(html, { sanitize: false })
    .process(fileContents);

  return {
    slug,
    title: meta.title,
    icon: meta.icon,
    contentHtml: processedContent.toString(),
  };
}
