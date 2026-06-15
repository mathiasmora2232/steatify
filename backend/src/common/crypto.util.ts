import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

/**
 * AES-256-GCM authenticated encryption for secrets at rest (Spotify tokens).
 * Format: base64( iv[12] | authTag[16] | ciphertext ).
 *
 * The key is TOKEN_ENC_KEY (base64 of 32 random bytes). Rotating it invalidates
 * stored tokens (users re-auth) — acceptable and safe.
 */
const ALGO = 'aes-256-gcm';
const IV_LEN = 12;

function getKey(): Buffer {
  const raw = process.env.TOKEN_ENC_KEY ?? '';
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('TOKEN_ENC_KEY must decode to 32 bytes (base64 of 32 random bytes).');
  }
  return key;
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptSecret(payload: string): string {
  const buf = Buffer.from(payload, 'base64');
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + 16);
  const enc = buf.subarray(IV_LEN + 16);
  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

/** SHA-256 hex — used to store refresh tokens without keeping the plaintext. */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
