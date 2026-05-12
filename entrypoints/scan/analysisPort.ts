import type { ProgressUpdate, Results } from "../instagram.content/types";

export const ANALYSIS_PORT = "instagram-analysis";
export const RUN_ANALYSIS_MESSAGE = { type: "run" } as const;
export const MAX_PROGRESS_ITEMS = 5;

export type AnalysisPortResponse =
  | { type: "progress"; progress: ProgressUpdate }
  | { type: "results"; results: Results }
  | { type: "error"; message: string };

export function connectToAnalysisPort(tabId: number) {
  return browser.tabs.connect(tabId, { name: ANALYSIS_PORT });
}

export function keepRecentProgress(progress: ProgressUpdate[], latestProgress: ProgressUpdate) {
  return [...progress.slice(1 - MAX_PROGRESS_ITEMS), latestProgress];
}
