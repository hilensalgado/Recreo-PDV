import crypto from 'crypto';
import { Cashier, CashierPermissions } from '../src/types/pos';

// Persistent or environment secret for HMAC-SHA256 signatures
const SERVER_AUTH_SECRET =
  process.env.POS_AUTH_SECRET ||
  process.env.SERVER_SECRET ||
  'recreo_pos_secure_hmac_secret_2026_salt_883921';

export interface TokenPayload {
  cashierId: string;
  cashierName: string;
  role: 'ADMIN' | 'CASHIER';
  permissions: CashierPermissions;
  deviceId?: string;
  registerId?: string;
  exp: number; // Unix timestamp ms
}

/**
 * Computes a secure PBKDF2 salt:hash from a raw PIN string.
 */
export function hashPin(pin: string): string {
  const clean = String(pin || '').trim();
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(clean, salt, 10000, 32, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Determines whether a given string is already in salt:hash format.
 */
export function isHashedPin(val?: string): boolean {
  if (!val || typeof val !== 'string') return false;
  const parts = val.split(':');
  return parts.length === 2 && parts[0].length === 32 && parts[1].length === 64;
}

/**
 * Validates a user-supplied PIN against a stored hash (or legacy plain text during migration).
 */
export function verifyPin(inputPin: string, storedHashOrPlain?: string): boolean {
  if (!storedHashOrPlain) return false;
  const clean = String(inputPin || '').trim();
  if (!clean) return false;

  if (isHashedPin(storedHashOrPlain)) {
    const [salt, hash] = storedHashOrPlain.split(':');
    const computed = crypto.pbkdf2Sync(clean, salt, 10000, 32, 'sha256').toString('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computed, 'hex'));
    } catch {
      return false;
    }
  }

  // Graceful fallback during transparent database migration
  return clean === storedHashOrPlain.trim();
}

/**
 * Generates an HMAC-SHA256 cryptographically verifiable token.
 */
export function createToken(payload: Omit<TokenPayload, 'exp'>): string {
  const fullPayload: TokenPayload = {
    ...payload,
    exp: Date.now() + 24 * 60 * 60 * 1000, // Valid for 24 hours
  };
  const body = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SERVER_AUTH_SECRET)
    .update(body)
    .digest('base64url');
  return `${body}.${signature}`;
}

/**
 * Verifies the integrity and expiration of a bearer token.
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [body, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', SERVER_AUTH_SECRET)
      .update(body)
      .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const payload: TokenPayload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Date.now()) {
      return null; // Expired session
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Strips out sensitive PIN / credentials from cashier object.
 * Guarantees that the frontend NEVER receives any raw or hashed PIN.
 */
export function sanitizeCashier(c: Cashier): Omit<Cashier, 'pin'> & { hasPin: boolean } {
  const { pin, ...safeFields } = c;
  return {
    ...safeFields,
    hasPin: Boolean(pin && pin.trim().length > 0),
  };
}

/**
 * Sanitizes an array of cashiers.
 */
export function sanitizeCashiers(cashiers: Cashier[]): Array<Omit<Cashier, 'pin'> & { hasPin: boolean }> {
  return cashiers.map(sanitizeCashier);
}
