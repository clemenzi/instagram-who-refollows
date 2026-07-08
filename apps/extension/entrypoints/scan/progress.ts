import type { ProgressUpdate } from "../instagram.content/types";

const INITIAL_PROGRESS = 6;
const PAGE_PROGRESS_STEP = 6;

const PHASE_PROGRESS: Record<ProgressUpdate["phase"], number> = {
  target: 8,
  "user-id": 18,
  followings: 28,
  followers: 64,
  results: 100,
};

const PAGE_PROGRESS_LIMITS: Partial<Record<ProgressUpdate["phase"], number>> = {
  followings: 58,
  followers: 94,
};

export function getProgressValue(progress: ProgressUpdate[]) {
  const currentProgress = progress.at(-1);

  if (!currentProgress) {
    return INITIAL_PROGRESS;
  }

  const phaseStart = PHASE_PROGRESS[currentProgress.phase];
  const pageProgressLimit = PAGE_PROGRESS_LIMITS[currentProgress.phase];

  if (!pageProgressLimit) {
    return phaseStart;
  }

  return Math.min(pageProgressLimit, phaseStart + (currentProgress.page ?? 0) * PAGE_PROGRESS_STEP);
}
