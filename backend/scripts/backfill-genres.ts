/* One-off backfill: enrich existing artists (genres/popularity/image) via the
 * single-artist endpoint, which works where the batch one is 403. */
import { readFileSync } from 'fs';
import { join } from 'path';
import { createDecipheriv } from 'crypto';
import { PrismaClient } from '@prisma/client';

const env: Record<string, string> = {};
for (const line of readFileSync(join(__dirname, '../../.env'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}
process.env.DATABASE_URL = env.DATABASE_URL;

function decrypt(payload: string): string {
  const key = Buffer.from(env.TOKEN_ENC_KEY, 'base64');
  const buf = Buffer.from(payload, 'base64');
  const d = createDecipheriv('aes-256-gcm', key, buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString('utf8');
}

interface ArtistFull {
  id: string;
  genres: string[];
  popularity: number;
  followers: { total: number };
  images: { url: string }[];
}

async function main() {
  const prisma = new PrismaClient();
  const acct = await prisma.spotifyAccount.findFirst();
  if (!acct) return console.log('no account');

  const basic = Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString('base64');
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${basic}` },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: decrypt(acct.refreshTokenEnc) }),
  });
  const token = ((await r.json()) as { access_token?: string }).access_token!;

  const artists = await prisma.artist.findMany({ where: { popularity: null }, select: { id: true, spotifyId: true } });
  console.log(`enriching ${artists.length} artists…`);

  let ok = 0;
  for (const a of artists) {
    const res = await fetch(`https://api.spotify.com/v1/artists/${a.spotifyId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) continue;
    const full = (await res.json()) as ArtistFull;
    await prisma.artist.update({
      where: { id: a.id },
      data: { popularity: full.popularity, followers: full.followers?.total, imageUrl: full.images?.[0]?.url },
    });
    for (const name of full.genres ?? []) {
      const g = await prisma.genre.upsert({ where: { name }, create: { name }, update: {}, select: { id: true } });
      await prisma.artistGenre.upsert({
        where: { artistId_genreId: { artistId: a.id, genreId: g.id } },
        create: { artistId: a.id, genreId: g.id },
        update: {},
      });
    }
    ok += 1;
  }
  console.log(`enriched ${ok}/${artists.length}`);
  console.log('genres total:', await prisma.genre.count());
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
