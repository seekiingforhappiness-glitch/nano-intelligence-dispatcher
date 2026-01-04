import crypto from 'crypto';

export interface PasswordHash {
  algo: 'pbkdf2_sha256';
  iterations: number;
  saltBase64: string;
  hashBase64: string;
}

const DEFAULT_ITERATIONS = 210_000;

export function hashPassword(plain: string, iterations: number = DEFAULT_ITERATIONS): PasswordHash {
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(plain, salt, iterations, 32, 'sha256');
  return {
    algo: 'pbkdf2_sha256',
    iterations,
    saltBase64: salt.toString('base64'),
    hashBase64: hash.toString('base64'),
  };
}

export function verifyPassword(plain: string, stored: PasswordHash): boolean {
  if (!plain) return false;
  if (stored.algo !== 'pbkdf2_sha256') return false;
  const salt = Buffer.from(stored.saltBase64, 'base64');
  const expected = Buffer.from(stored.hashBase64, 'base64');
  const actual = crypto.pbkdf2Sync(plain, salt, stored.iterations, expected.length, 'sha256');
  return crypto.timingSafeEqual(expected, actual);
}


