import { getUserId } from "../instagram.content/api";
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
