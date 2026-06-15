import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'crypto';

// The util reads TOKEN_ENC_KEY at call time, so set it before importing.
process.env.TOKEN_ENC_KEY = randomBytes(32).toString('base64');

// eslint-disable-next-line @typescript-eslint/no-var-requires
import { encryptSecret, decryptSecret, sha256 } from './crypto.util';

test('encrypt → decrypt round-trips a Spotify token', () => {
  const secret = 'BQA...some-spotify-access-token...xyz';
  const enc = encryptSecret(secret);
  assert.notEqual(enc, secret); // actually encrypted
  assert.equal(decryptSecret(enc), secret);
});

test('each encryption uses a fresh IV (ciphertexts differ)', () => {
  const a = encryptSecret('same');
  const b = encryptSecret('same');
  assert.notEqual(a, b);
  assert.equal(decryptSecret(a), 'same');
  assert.equal(decryptSecret(b), 'same');
});

test('tampered ciphertext fails authentication', () => {
  const enc = Buffer.from(encryptSecret('secret'), 'base64');
  enc[enc.length - 1] ^= 0xff; // flip a byte in the ciphertext
  assert.throws(() => decryptSecret(enc.toString('base64')));
});

test('sha256 is deterministic and 64 hex chars', () => {
  const h = sha256('refresh-token');
  assert.equal(h, sha256('refresh-token'));
  assert.match(h, /^[0-9a-f]{64}$/);
});
