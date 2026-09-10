import type { Profile, Results } from "./types";

const normalizeUsername = (username: string) => username.toLowerCase();

export function buildResults(followings: Profile[], followers: Profile[]): Results {
  const followerUsernames = new Set(followers.map(({ username }) => normalizeUsername(username)));
  const followingsWhoFollowBack: Profile[] = [];
  const dontFollowMeBack: Profile[] = [];

  for (const profile of followings) {
    const destination = followerUsernames.has(normalizeUsername(profile.username))
      ? followingsWhoFollowBack
      : dontFollowMeBack;

    destination.push(profile);
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
}
