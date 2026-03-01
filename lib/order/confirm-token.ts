import 'server-only';
import crypto from 'crypto';

const SECRET = process.env.DELIVERY_CONFIRM_SECRET;
const TOKEN_TTL_SECONDS = 14 * 24 * 60 * 60; // 14 days

function getSecret(): string {
  if (!SECRET) throw new Error('DELIVERY_CONFIRM_SECRET is not configured');
  return SECRET;
}

export function generateConfirmToken(orderId: string, email: string): string {
  const expiry = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const payload = `${orderId}:${email.toLowerCase().trim()}:${expiry}`;
  const signature = crypto
    .createHmac('sha256', getSecret())
    .update(payload)
    .digest('base64url');
  return `${signature}.${expiry}`;
}

export function verifyConfirmToken(
  token: string,
  orderId: string,
  email: string,
): boolean {
  try {
    const dotIndex = token.lastIndexOf('.');
    if (dotIndex === -1) return false;

    const signature = token.slice(0, dotIndex);
    const expiryStr = token.slice(dotIndex + 1);
    const expiry = parseInt(expiryStr, 10);

    if (isNaN(expiry) || expiry < Math.floor(Date.now() / 1000)) return false;

    const payload = `${orderId}:${email.toLowerCase().trim()}:${expiry}`;
    const expected = crypto
      .createHmac('sha256', getSecret())
      .update(payload)
      .digest('base64url');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'utf-8'),
      Buffer.from(expected, 'utf-8'),
    );
  } catch {
    return false;
  }
}

export function buildConfirmUrl(orderId: string, email: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fitflow.bg';
  const token = generateConfirmToken(orderId, email);
  return `${baseUrl}/api/order/confirm-delivery?token=${encodeURIComponent(token)}&orderId=${encodeURIComponent(orderId)}`;
}
