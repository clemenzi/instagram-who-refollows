import type { Profile, ProgressUpdate } from "./types";
import { delay, fetchInstagramJson, PAGE_DELAY_MS, PAGE_SIZE } from "./utils.ts";

type Connection = "followers" | "following";
type FetchOptions = { onProgress?: (progress: ProgressUpdate) => void };
type FriendshipPage = {
  users: unknown[];
  next_max_id?: unknown;
  has_more?: boolean;
};

const ID_PATTERN = /^\d+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parsePage(data: unknown, connection: Connection): FriendshipPage {
  if (!isRecord(data) || data.status !== "ok" || !Array.isArray(data.users)) {
    throw new Error(`Instagram did not return a valid ${connection} list. Try again later.`);
  }
  const limitFlag =
    connection === "followers"
      ? data.should_limit_list_of_followers
      : data.should_limit_list_of_followings;
  if (limitFlag === true) {
    throw new Error(`Instagram is limiting access to this ${connection} list. Scan incomplete.`);
  }
  return data as FriendshipPage;
}

function validId(value: unknown): value is string | number {
  return (
    (typeof value === "string" && ID_PATTERN.test(value)) ||
    (typeof value === "number" && Number.isSafeInteger(value) && value > 0)
  );
}

function parseProfile(value: unknown): Profile & { id: string } {
  if (!isRecord(value) || typeof value.username !== "string" || !value.username.trim()) {
    throw new Error("Instagram returned an invalid profile. Scan incomplete.");
  }
  const id = [value.pk_id, value.pk, value.id].find(validId);
  if (id === undefined) {
    throw new Error("Instagram returned a profile without a valid ID. Scan incomplete.");
  }
  return {
    id: String(id),
    username: value.username,
    full_name: typeof value.full_name === "string" ? value.full_name : "",
    profile_pic_url: typeof value.profile_pic_url === "string" ? value.profile_pic_url : undefined,
  };
}

function nextCursor(page: FriendshipPage): string {
  const value = page.next_max_id;
  if (value !== undefined && value !== null && typeof value !== "string" && !validId(value)) {
    throw new Error("Instagram returned an invalid pagination cursor. Scan incomplete.");
  }
  const cursor = String(value ?? "");
  if (page.has_more === true && !cursor) {
    throw new Error("Instagram omitted the next page of profiles. Scan incomplete.");
  }
  return cursor;
}

export async function fetchProfiles(
  userId: string,
  connection: Connection,
  { onProgress }: FetchOptions = {},
): Promise<Profile[]> {
  if (!validId(userId)) throw new Error("Invalid Instagram user ID.");
  const profiles = new Map<string, Profile>();
  const cursors = new Set<string>();
  let cursor = "";
  let pageNumber = 0;

  do {
    const params: Record<string, string> = {
      count: String(PAGE_SIZE),
      search_surface: "follow_list_page",
    };
    if (cursor) params.max_id = cursor;
    const data = await fetchInstagramJson<unknown>(
      `/api/v1/friendships/${userId}/${connection}/`,
      params,
    );
    const page = parsePage(data, connection);
    const previousCount = profiles.size;
    for (const value of page.users) {
      const profile = parseProfile(value);
      profiles.set(profile.id, profile);
    }
    cursor = nextCursor(page);
    if (cursor && (cursors.has(cursor) || profiles.size === previousCount)) {
      throw new Error("Instagram stopped advancing through the profiles. Scan incomplete.");
    }
    pageNumber += 1;
    onProgress?.({
      phase: connection === "following" ? "followings" : "followers",
      message: `Read ${profiles.size} ${connection === "following" ? "profiles you follow" : "followers"}.`,
      collected: profiles.size,
      page: pageNumber,
    });
    if (cursor) {
      cursors.add(cursor);
      await delay(PAGE_DELAY_MS);
    }
  } while (cursor);

  return [...profiles.values()];
}
