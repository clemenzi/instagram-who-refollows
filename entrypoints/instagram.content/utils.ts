import type { Profile, Results } from './types';

export const INSTAGRAM_ORIGIN = 'https://www.instagram.com';
export const PROFILE_URL = `${INSTAGRAM_ORIGIN}/`;
export const PAGE_SIZE = 50;
export const PAGE_DELAY_MS = 750;

export const delay = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export async function fetchInstagramJson<T>(
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  const url = new URL(path, INSTAGRAM_ORIGIN);

  if (params) {
    url.search = new URLSearchParams(params).toString();
  }

  const response = await fetch(url, {
    credentials: 'include',
    headers: { 'x-ig-app-id': '936619743392459' },
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }

  return response.json();
}

export function buildResults(followings: Profile[], followers: Profile[]): Results {
  const followerUsernames = new Set(followers.map(({ username }) => username));
  const followingsWhoFollowBack: Profile[] = [];
  const dontFollowMeBack: Profile[] = [];

  for (const profile of followings) {
    if (followerUsernames.has(profile.username)) {
      followingsWhoFollowBack.push(profile);
    } else {
      dontFollowMeBack.push(profile);
    }
  }

  return {
    dontFollowMeBack,
    followingsWhoFollowBack,
    followersCount: followers.length,
    followingsCount: followings.length,
  };
}

export function publishResults(results: Results) {
  Object.assign(globalThis, results, { results });

  console.log('[results]', results);
  console.table(
    results.dontFollowMeBack.map(({ username, full_name }) => ({
      username,
      nome: full_name || '-',
      profilo: `${PROFILE_URL}${username}/`,
    })),
  );
}
