import {
  ANALYSIS_PORT_NAME,
  type AnalysisPortRequest,
  type AnalysisPortResponse,
} from "../../lib/analysisProtocol";
import { UNFOLLOW_MESSAGE_TYPE, type UnfollowResponse } from "../../lib/unfollowProtocol";
import { getTargetUsername, getUserId } from "./api";
import { fetchProfiles } from "./friendships";
import { REQUEST_DELAY_MS } from "./instagram";
import { delay } from "./request";
import { buildResults, publishResults } from "./results";
import type { ProgressUpdate, Results } from "./types";
import { unfollowProfile } from "./unfollow";

type ProgressListener = (progress: ProgressUpdate) => void;

async function runInstagramAnalysis(onProgress: ProgressListener): Promise<Results> {
  onProgress({
    phase: "target",
    message: "Identifying the profile to analyze...",
  });
  const username = await getTargetUsername();

  onProgress({
    phase: "user-id",
    message: `Found @${username}. Resolving the Instagram user ID...`,
  });

  const userId = await getUserId(username);
  onProgress({
    phase: "followings",
    message: "Reading the profiles you follow...",
  });

  const followings = await fetchProfiles(userId, "following", {
    onProgress,
  });
  await delay(REQUEST_DELAY_MS);
  onProgress({
    phase: "followers",
    message: "Reading the profiles that follow you...",
  });

  const followers = await fetchProfiles(userId, "followers", {
    onProgress,
  });
  const results = buildResults(followings, followers);

  publishResults(results);
  onProgress({
    phase: "results",
    message: `Scan complete: ${results.dontFollowMeBack.length} profiles do not follow you back.`,
  });

  return results;
}

export default defineContentScript({
  matches: ["*://*.instagram.com/*"],
  main() {
    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type !== UNFOLLOW_MESSAGE_TYPE) {
        return;
      }
      void unfollowProfile(message.userId).then(
        () => sendResponse({ success: true } satisfies UnfollowResponse),
        (error: unknown) =>
          sendResponse({
            success: false,
            message: error instanceof Error ? error.message : "Could not unfollow this profile.",
          } satisfies UnfollowResponse),
      );
      return true;
    });

    let activeRun: Promise<Results> | null = null;
    const progressListeners = new Set<ProgressListener>();

    const emitProgress = (progress: ProgressUpdate) => {
      for (const listener of progressListeners) {
        listener(progress);
      }
    };

    const runOnce = (onProgress: ProgressListener) => {
      progressListeners.add(onProgress);

      activeRun ??= runInstagramAnalysis(emitProgress).finally(() => {
        activeRun = null;
        progressListeners.clear();
      });

      return activeRun.finally(() => {
        progressListeners.delete(onProgress);
      });
    };

    browser.runtime.onConnect.addListener((port) => {
      if (port.name !== ANALYSIS_PORT_NAME) {
        return;
      }

      const onProgress = (progress: ProgressUpdate) => {
        port.postMessage({ type: "progress", progress } satisfies AnalysisPortResponse);
      };

      const onMessage = (message: AnalysisPortRequest) => {
        if (message.type !== "run") {
          return;
        }

        void runOnce(onProgress)
          .then((results) => {
            port.postMessage({ type: "results", results } satisfies AnalysisPortResponse);
          })
          .catch((error: unknown) => {
            const errorMessage =
              error instanceof Error ? error.message : "Unexpected error during the scan.";

            port.postMessage({
              type: "error",
              message: errorMessage,
            } satisfies AnalysisPortResponse);
          });
      };

      port.onMessage.addListener(onMessage);
      port.onDisconnect.addListener(() => {
        progressListeners.delete(onProgress);
        port.onMessage.removeListener(onMessage);
      });
    });
  },
});
