import { ANALYSIS_PORT_NAME } from "../../lib/analysisProtocol.ts";
import type { ProgressUpdate } from "../instagram.content/types";

const TAB_ID_PATTERN = /^\d+$/;

export const MAX_PROGRESS_ITEMS = 5;

export function connectToAnalysisPort(tabId: number) {
  return browser.tabs.connect(tabId, { name: ANALYSIS_PORT_NAME });
}

export function keepRecentProgress(progress: ProgressUpdate[], latestProgress: ProgressUpdate) {
  return [...progress.slice(1 - MAX_PROGRESS_ITEMS), latestProgress];
}

export function parseTabId(value: string | null) {
  if (!value || !TAB_ID_PATTERN.test(value)) {
    return null;
  }

  const tabId = Number(value);
  return Number.isSafeInteger(tabId) && tabId >= 0 ? tabId : null;
}
