import type { InstagramCurrentUserResponse } from "./types";
import { fetchInstagramJson, InstagramRequestError } from "./utils.ts";

const USER_ID_PATTERN = /^\d+$/;

const CURRENT_USER_ENDPOINTS = [
  "/api/v1/accounts/edit/web_form_data/",
  "/api/v1/accounts/current_user/",
];

const RESERVED_PATH_SEGMENTS = new Set([
  "accounts",
  "api",
  "challenge",
  "direct",
  "explore",
  "graphql",
  "p",
  "reel",
  "reels",
  "stories",
  "tv",
  "web",
]);

function getUsernameFromPath(pathname = window.location.pathname) {
  const firstPathSegment = pathname.split("/").filter(Boolean)[0];

  if (!firstPathSegment || RESERVED_PATH_SEGMENTS.has(firstPathSegment)) {
    return null;
  }

  return firstPathSegment;
}

async function getLoggedInUsername(): Promise<string> {
  for (const endpoint of CURRENT_USER_ENDPOINTS) {
    try {
      const username = await fetchLoggedInUsername(endpoint);

      if (username) {
        return username;
      }
    } catch (error) {
      if (error instanceof InstagramRequestError && [401, 403, 429].includes(error.status)) {
        throw error;
      }

      console.warn(`[progress] could not resolve logged-in user from ${endpoint}`);
      console.error(error);
    }
  }

  throw new Error("Could not resolve the logged-in Instagram username.");
}

async function fetchLoggedInUsername(endpoint: string) {
  const data = await fetchInstagramJson<InstagramCurrentUserResponse>(endpoint, {
    edit: "true",
  });

  return data.form_data?.username ?? data.user?.username;
}

export async function getTargetUsername() {
  const usernameFromPath = getUsernameFromPath();

  if (usernameFromPath) {
    return usernameFromPath;
  }

  console.log("[progress] no profile username in URL, resolving logged-in user");
  return getLoggedInUsername();
}

export async function getUserId(username: string): Promise<string> {
  const searchData = await fetchInstagramJson<{
    users?: Array<{ user?: { pk?: string | number; username?: string } }>;
  }>("/web/search/topsearch/", { query: username });
  const normalizedUsername = username.toLowerCase();

  const searchId = searchData.users
    ?.map(({ user }) => user)
    .find((user) => user?.username?.toLowerCase() === normalizedUsername)?.pk;

  if (
    !searchId ||
    !USER_ID_PATTERN.test(String(searchId)) ||
    (typeof searchId === "number" && !Number.isSafeInteger(searchId))
  ) {
    throw new Error(`Could not find Instagram user "${username}"`);
  }

  return String(searchId);
}
