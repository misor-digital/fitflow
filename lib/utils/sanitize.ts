/**
 * Escape HTML special characters to prevent XSS in email templates.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitize and truncate a string input.
 */
export function sanitizeInput(value: string, maxLength: number): string {
  return escapeHtml(value.trim().slice(0, maxLength));
}

/**
 * Build a `tel:` href keeping only digits and `+`, so free-text phone values
 * can't inject other URI content.
 */
export function toTelHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}
