import { CONNECTIONS, fetchProfiles, getTargetUsername, getUserId } from "./api";
import type { ProgressUpdate, Results } from "./types";
import { buildResults, delay, PAGE_DELAY_MS, publishResults } from "./utils";

const RUN_MESSAGE = "run";
const ANALYSIS_PORT = "instagram-analysis";
type ProgressListener = (progress: ProgressUpdate) => void;

type AnalysisPortMessage = { type: "run" };
type AnalysisPortResponse =
  | { type: "progress"; progress: ProgressUpdate }
  | { type: "results"; results: Results }
  | { type: "error"; message: string };

async function runInstagramAnalysis(onProgress: ProgressListener): Promise<Results> {
  onProgress({
    phase: "target",
    message: "Identifying the profile to analyze...",
  });
  const username = await getTargetUsername();

  console.log(`[progress] target username: ${username}`);
  onProgress({
    phase: "user-id",
    message: `Found @${username}. Resolving the Instagram user ID...`,
  });

  const userId = await getUserId(username);
  console.log("[progress] user id resolved");
  onProgress({
    phase: "followings",
    message: "Reading the profiles you follow...",
  });

  const followings = await fetchProfiles(userId, CONNECTIONS.followings, {
    phase: "followings",
    onProgress,
  });
  await delay(PAGE_DELAY_MS);
  onProgress({
    phase: "followers",
    message: "Reading the profiles that follow you...",
  });

  const followers = await fetchProfiles(userId, CONNECTIONS.followers, {
    phase: "followers",
    onProgress,
  });
  const results = buildResults(followings, followers);

  publishResults(results);
  console.log("[progress] done");
  onProgress({
    phase: "results",
    message: `Scan complete: ${results.dontFollowMeBack.length} profiles do not follow you back.`,
  });

  return results;
}

export default defineContentScript({
  matches: ["*://*.instagram.com/*"],
  main() {
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
      if (port.name !== ANALYSIS_PORT) {
        return;
      }

      const onProgress = (progress: ProgressUpdate) => {
        port.postMessage({ type: "progress", progress } satisfies AnalysisPortResponse);
      };

      const onMessage = (message: AnalysisPortMessage) => {
        if (message.type !== RUN_MESSAGE) {
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
