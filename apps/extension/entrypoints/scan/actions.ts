import { UNFOLLOW_MESSAGE_TYPE, type UnfollowResponse } from "../../lib/unfollowProtocol";
import type { Profile } from "../instagram.content/types";

export async function unfollowFromScan(tabId: number, profile: Profile) {
  let response: UnfollowResponse;
  try {
    response = await browser.tabs.sendMessage(tabId, {
      type: UNFOLLOW_MESSAGE_TYPE,
      userId: profile.id,
    });
  } catch {
    throw new Error("Could not connect to Instagram. Reload Instagram and start again.");
  }

  if (!response?.success) {
    throw new Error(response?.message ?? "Instagram did not confirm the unfollow.");
  }
}
