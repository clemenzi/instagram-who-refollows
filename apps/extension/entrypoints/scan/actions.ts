import { INSTAGRAM_APP_ID, INSTAGRAM_ORIGIN } from "../instagram.content/instagram";
import type { Profile } from "../instagram.content/types";

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
  const csrfToken = await getCsrfToken();
  const response = await fetch(
    new URL(`/api/v1/friendships/destroy/${profile.id}/`, INSTAGRAM_ORIGIN),
    {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "x-csrftoken": decodeURIComponent(csrfToken),
        "x-ig-app-id": INSTAGRAM_APP_ID,
        "x-requested-with": "XMLHttpRequest",
      },
      body: new URLSearchParams({ user_id: profile.id }).toString(),
    },
  );

  if (!response.ok) {
    throw new Error(`Instagram rejected the unfollow request (${response.status}).`);
  }
}
