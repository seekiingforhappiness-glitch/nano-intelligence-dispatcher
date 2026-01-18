import crypto from 'crypto';

export interface AdminSessionPayload {
  userId: string;
  username: string;
  organizationId: string;
  role: 'admin' | 'operator' | 'viewer';
  iat: number;
  exp: number;
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64urlToBuffer(input: string): Buffer {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + pad, 'base64');
}

function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (!secret) {
    throw new Error('缺少环境变量 ADMIN_SESSION_SECRET');
  }
  return secret;
}

export function signAdminSession(payload: Omit<AdminSessionPayload, 'iat' | 'exp'>, ttlSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: AdminSessionPayload = {
    ...payload,
    iat: now,
    exp: now + ttlSeconds,
  };
  const payloadStr = JSON.stringify(fullPayload);
  const payloadPart = base64url(payloadStr);
  const sig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(payloadPart)
    .digest();
  const sigPart = base64url(sig);
  return `${payloadPart}.${sigPart}`;
}

export function verifyAdminSession(token: string | undefined | null): AdminSessionPayload | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadPart, sigPart] = parts;
  if (!payloadPart || !sigPart) return null;
  const expectedSig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(payloadPart)
    .digest();
  const actualSig = base64urlToBuffer(sigPart);
  if (actualSig.length !== expectedSig.length) return null;
  if (!crypto.timingSafeEqual(actualSig, expectedSig)) return null;
  try {
    const payloadRaw = base64urlToBuffer(payloadPart).toString('utf8');
    const parsed = JSON.parse(payloadRaw) as AdminSessionPayload;
    const now = Math.floor(Date.now() / 1000);
    if (!parsed.userId || !parsed.username || !parsed.role) return null;
    if (!parsed.exp || parsed.exp <= now) return null;
    return parsed;
  } catch {
    return null;
  }
}


