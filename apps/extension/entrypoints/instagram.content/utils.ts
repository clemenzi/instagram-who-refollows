import type { Profile, Results } from "./types";

export const INSTAGRAM_ORIGIN = "https://www.instagram.com";
export const PROFILE_URL = `${INSTAGRAM_ORIGIN}/`;
export const PAGE_SIZE = 50;
export const PAGE_DELAY_MS = 750;
const DEFAULT_RATE_LIMIT_DELAY_MS = 60_000;
let rateLimitedUntil = 0;

export class InstagramRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "InstagramRequestError";
    this.status = status;
  }
}

function rateLimitError() {
  const seconds = Math.max(1, Math.ceil((rateLimitedUntil - Date.now()) / 1000));
  return new InstagramRequestError(
    429,
    `Instagram is temporarily limiting requests (429). Wait at least ${seconds} seconds before starting another scan.`,
  );
}

function getRetryDelay(retryAfter: string | null) {
  if (!retryAfter?.trim()) return DEFAULT_RATE_LIMIT_DELAY_MS;

  const seconds = Number(retryAfter);
  const milliseconds = Number.isFinite(seconds)
    ? seconds * 1000
    : Date.parse(retryAfter) - Date.now();

  return Number.isFinite(milliseconds) && milliseconds > 0
    ? milliseconds
    : DEFAULT_RATE_LIMIT_DELAY_MS;
}

export const delay = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export async function fetchInstagramJson<T>(
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  if (Date.now() < rateLimitedUntil) {
    throw rateLimitError();
  }

  const url = new URL(path, INSTAGRAM_ORIGIN);

  if (params) {
    url.search = new URLSearchParams(params).toString();
  }

  const response = await fetch(url, {
    credentials: "include",
    headers: { "x-ig-app-id": "936619743392459" },
  });

  if (response.status === 429) {
    rateLimitedUntil = Date.now() + getRetryDelay(response.headers.get("retry-after"));
    throw rateLimitError();
  }

  if (response.status === 401 || response.status === 403 || response.redirected) {
    throw new InstagramRequestError(
      response.redirected ? 401 : response.status,
      "Instagram requires authentication or has restricted access. Open Instagram, check for any prompts, then reload the tab before trying again.",
    );
  }

  if (!response.ok) {
    throw new InstagramRequestError(
      response.status,
      `Request failed (${response.status}) for ${url}`,
    );
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

  console.log("[results]", results);
  console.table(
    results.dontFollowMeBack.map(({ username, full_name }) => ({
      username,
      nome: full_name || "-",
      profilo: `${PROFILE_URL}${username}/`,
    })),
  );
}
