import type {
  Connection,
  InstagramCurrentUserResponse,
  InstagramGraphqlResponse,
  InstagramProfilesResponse,
  Profile,
  ProgressUpdate,
} from "./types";
import { delay, fetchInstagramJson, PAGE_DELAY_MS, PAGE_SIZE } from "./utils";

type FetchProfilesOptions = {
  phase: ProgressUpdate["phase"];
  onProgress?: (progress: ProgressUpdate) => void;
};

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

export const CONNECTIONS = {
  followers: {
    queryHash: "c76146de99bb02f6415203be841dd25a",
    edge: "edge_followed_by",
  },
  followings: {
    queryHash: "d04b0a864b4b54837c0d870b0e77e076",
    edge: "edge_follow",
  },
} satisfies Record<string, Connection>;

function getUsernameFromPath(pathname = window.location.pathname) {
  const firstPathSegment = pathname.split("/").filter(Boolean)[0];

  if (!firstPathSegment || RESERVED_PATH_SEGMENTS.has(firstPathSegment)) {
    return null;
  }

  return firstPathSegment;
}

async function getLoggedInUsername(): Promise<string> {
  const endpoints = ["/api/v1/accounts/edit/web_form_data/", "/api/v1/accounts/current_user/"];

  for (const endpoint of endpoints) {
    try {
      const data = await fetchInstagramJson<InstagramCurrentUserResponse>(endpoint, {
        edit: "true",
      });
      const username = data.form_data?.username ?? data.user?.username;

      if (username) {
        return username;
      }
    } catch (error) {
      console.warn(`[progress] could not resolve logged-in user from ${endpoint}`);
      console.error(error);
    }
  }

  throw new Error("Could not resolve the logged-in Instagram username.");
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
  const profileData = await fetchInstagramJson<{
    data?: { user?: { id?: string } };
  }>("/api/v1/users/web_profile_info/", { username });
  const profileId = profileData.data?.user?.id;

  if (profileId) {
    return profileId;
  }

  const searchData = await fetchInstagramJson<{
    users?: Array<{ user?: { pk?: string; username?: string } }>;
  }>("/web/search/topsearch/", { query: username });
  const normalizedUsername = username.toLowerCase();

  const searchId = searchData.users
    ?.map(({ user }) => user)
    .find((user) => user?.username?.toLowerCase() === normalizedUsername)?.pk;

  if (!searchId) {
    throw new Error(`Could not find Instagram user "${username}"`);
  }

  return searchId;
}

export async function fetchProfiles(
  userId: string,
  connection: Connection,
  options: FetchProfilesOptions,
): Promise<Profile[]> {
  const profiles: Profile[] = [];
  let after: string | null = null;
  let page = 0;

  console.log(`[progress] fetching ${connection.edge}...`);

  while (true) {
    page += 1;

    const data: InstagramGraphqlResponse = await fetchInstagramJson("/graphql/query/", {
      query_hash: connection.queryHash,
      variables: JSON.stringify({
        id: userId,
        include_reel: true,
        fetch_mutual: true,
        first: PAGE_SIZE,
        after,
      }),
    });

    const result: InstagramProfilesResponse | undefined = data.data?.user?.[connection.edge];

    if (!result) {
      throw new Error(`Instagram response did not include "${connection.edge}"`);
    }

    profiles.push(
      ...result.edges.map(({ node }) => ({
        username: node.username,
        full_name: node.full_name,
        profile_pic_url: node.profile_pic_url,
      })),
    );

    options.onProgress?.({
      phase: options.phase,
      message:
        options.phase === "followings"
          ? `Read ${profiles.length} profiles you follow.`
          : `Read ${profiles.length} followers.`,
      collected: profiles.length,
      page,
    });

    console.log(`[progress] ${connection.edge}: page ${page}, total collected ${profiles.length}`);

    if (!result.page_info.has_next_page) {
      console.log(`[progress] completed ${connection.edge}: ${profiles.length}`);
      return profiles;
    }

    after = result.page_info.end_cursor;
    await delay(PAGE_DELAY_MS);
  }
}
