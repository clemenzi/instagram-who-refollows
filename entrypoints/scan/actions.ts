import type { Profile } from "../instagram.content/types";
import { INSTAGRAM_ORIGIN } from "../instagram.content/utils";

const INSTAGRAM_APP_ID = "936619743392459";
const INSTAGRAM_CSRF_COOKIE = "csrftoken";

async function getCsrfToken() {
  const cookie = await browser.cookies.get({
    name: INSTAGRAM_CSRF_COOKIE,
    url: INSTAGRAM_ORIGIN,
  });

  if (!cookie?.value) {
    throw new Error("Could not read Instagram session token. Reload Instagram and try again.");
  }

  return cookie.value;
}

async function fetchInstagramJson<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(path, INSTAGRAM_ORIGIN);

  if (params) {
    url.search = new URLSearchParams(params).toString();
  }

  const response = await fetch(url, {
    credentials: "include",
    headers: {
      "x-ig-app-id": INSTAGRAM_APP_ID,
    },
  });

  if (!response.ok) {
    throw new Error(`Instagram rejected the lookup request (${response.status}).`);
  }

  return response.json();
}

async function getUserId(username: string) {
  const profileData = await fetchInstagramJson<{
    data?: { user?: { id?: string } };
  }>("/api/v1/users/web_profile_info/", { username });

  const userId = profileData.data?.user?.id;

  if (!userId) {
    throw new Error(`Could not resolve Instagram user "${username}".`);
  }

  return userId;
}

export async function unfollowFromScan(profile: Profile) {
  const userId = profile.id ?? (await getUserId(profile.username));
  const csrfToken = await getCsrfToken();
  const response = await fetch(
    new URL(`/api/v1/friendships/destroy/${userId}/`, INSTAGRAM_ORIGIN),
    {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "x-csrftoken": decodeURIComponent(csrfToken),
        "x-ig-app-id": INSTAGRAM_APP_ID,
        "x-requested-with": "XMLHttpRequest",
      },
      body: new URLSearchParams({ user_id: userId }).toString(),
    },
  );

  if (!response.ok) {
    throw new Error(`Instagram rejected the unfollow request (${response.status}).`);
  }
}
