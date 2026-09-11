import { INSTAGRAM_APP_ID, isInstagramId } from "./instagram";

// Observed in Instagram's usePolarisUnfollowMutation request.
const UNFOLLOW_DOCUMENT_ID = "27789106940691111";
const UNFOLLOW_OPERATION = "usePolarisUnfollowMutation";

function getPageToken(moduleName: string): string {
  for (const script of document.querySelectorAll('script[type="application/json"]')) {
    const match = script.textContent?.match(new RegExp(`\\["${moduleName}",\\[\\],(\\{[^}]+\\})`));
    if (match) {
      const data = JSON.parse(match[1]);
      if (typeof data.token === "string" && data.token) return data.token;
    }
  }
  throw new Error("Could not read Instagram session data. Reload Instagram and try again.");
}

export async function unfollowProfile(userId: unknown) {
  if (!isInstagramId(userId)) {
    throw new Error("Invalid Instagram profile ID.");
  }

  const csrfToken = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("csrftoken="))
    ?.slice("csrftoken=".length);

  if (!csrfToken) {
    throw new Error("Could not read Instagram session token. Reload Instagram and try again.");
  }

  const dtsg = getPageToken("DTSGInitialData");
  const lsd = getPageToken("LSD");
  const body = new URLSearchParams({
    __a: "1",
    __d: "www",
    __user: "0",
    __comet_req: "7",
    fb_dtsg: dtsg,
    jazoest: `2${Array.from(dtsg).reduce((sum, character) => sum + character.charCodeAt(0), 0)}`,
    lsd,
    fb_api_caller_class: "RelayModern",
    fb_api_req_friendly_name: UNFOLLOW_OPERATION,
    server_timestamps: "true",
    doc_id: UNFOLLOW_DOCUMENT_ID,
    variables: JSON.stringify({
      target_user_id: String(userId),
      container_module: "profile",
      nav_chain: "PolarisProfilePostsTabRoot:profilePage:1:via_cold_start",
    }),
  });

  const response = await fetch("/api/graphql", {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-csrftoken": decodeURIComponent(csrfToken),
      "x-ig-app-id": INSTAGRAM_APP_ID,
      "x-fb-friendly-name": UNFOLLOW_OPERATION,
      "x-fb-lsd": lsd,
    },
    body: body.toString(),
  });

  if (response.redirected || response.status === 401 || response.status === 403) {
    throw new Error(
      "Instagram requires authentication or has restricted access. Open Instagram and check for any prompts.",
    );
  }
  if (!response.ok) {
    throw new Error(`Instagram rejected the unfollow request (${response.status}).`);
  }

  const result = await response.json();
  const friendship = result?.data?.xdt_destroy_friendship;
  if (
    result?.errors?.length ||
    String(friendship?.id) !== String(userId) ||
    friendship?.friendship_status?.following !== false
  ) {
    throw new Error(
      "Instagram did not confirm the unfollow. Check the profile before trying again.",
    );
  }
}
