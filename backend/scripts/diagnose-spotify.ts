/* One-off diagnostic: uses the stored (encrypted) token to probe the Spotify
 * endpoints the enrichment relies on, printing real HTTP statuses. */
import { readFileSync } from 'fs';
import { join } from 'path';
import { createDecipheriv } from 'crypto';
import { PrismaClient } from '@prisma/client';

// load ../.env
const env: Record<string, string> = {};
for (const line of readFileSync(join(__dirname, '../../.env'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}
process.env.DATABASE_URL = env.DATABASE_URL;

function decrypt(payload: string): string {
  const key = Buffer.from(env.TOKEN_ENC_KEY, 'base64');
  const buf = Buffer.from(payload, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const d = createDecipheriv('aes-256-gcm', key, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString('utf8');
}

async function main() {
  const prisma = new PrismaClient();
  const acct = await prisma.spotifyAccount.findFirst();
  if (!acct) return console.log('No spotify account');

  // refresh to be safe
  const basic = Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString('base64');
  const refreshRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${basic}` },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: decrypt(acct.refreshTokenEnc) }),
  });
  const refreshed = (await refreshRes.json()) as { access_token?: string };
  console.log('token refresh status:', refreshRes.status);
  const token = refreshed.access_token ?? decrypt(acct.accessTokenEnc);

  const probe = async (path: string) => {
    const res = await fetch(`https://api.spotify.com/v1${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.text();
    console.log(`\nGET ${path}\n  -> ${res.status} ${res.statusText}\n  ${body.slice(0, 240)}`);
  };

  await probe('/me');
  await probe('/artists?ids=1mcTU81TzQhprhouKaTkpq,3VsmiWWtAHSrkgF2forgVI');
  await probe('/artists/1mcTU81TzQhprhouKaTkpq');
  await probe('/audio-features?ids=1cNJ9ODOJF8b6AjhzoYdkv,21cBIFpuYb5IEOm1BltCk3');
  await probe('/me/top/artists?limit=3');
  await probe('/me/top/tracks?limit=3');
  await probe('/tracks?ids=1cNJ9ODOJF8b6AjhzoYdkv,21cBIFpuYb5IEOm1BltCk3');
  await probe('/tracks/1cNJ9ODOJF8b6AjhzoYdkv');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
