export type SteamIdInput =
  | { kind: 'id'; steamId: string }
  | { kind: 'vanity'; vanity: string };

/**
 * Pure interpreter for whatever the user pastes: a SteamID64, a profile URL
 * (/profiles/<id> or /id/<vanity>), or a bare vanity name. Returns either a
 * resolved SteamID64 or the vanity to resolve via the API. Unit-testable.
 */
export function parseSteamIdInput(raw: string): SteamIdInput {
  const input = raw.trim();
  if (/^\d{17}$/.test(input)) return { kind: 'id', steamId: input };

  const profiles = input.match(/steamcommunity\.com\/profiles\/(\d{17})/);
  if (profiles) return { kind: 'id', steamId: profiles[1] };

  const idUrl = input.match(/steamcommunity\.com\/id\/([^/?#]+)/);
  const vanity = idUrl ? idUrl[1] : input.replace(/^@/, '');
  return { kind: 'vanity', vanity };
}
