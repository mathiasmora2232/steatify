export interface SteamPlayer {
  steamid: string;
  personaname: string;
  avatarfull: string;
  profileurl: string;
  loccountrycode?: string;
  timecreated?: number; // unix seconds — account creation
}

export interface SteamOwnedGame {
  appid: number;
  name?: string;
  playtime_forever: number; // minutes
  playtime_2weeks?: number; // minutes
  img_icon_url?: string; // hash → media url
  rtime_last_played?: number; // unix seconds
}
