import type { ProgressUpdate, Results } from "../entrypoints/instagram.content/types";

export const ANALYSIS_PORT_NAME = "instagram-analysis";
export const RUN_ANALYSIS_MESSAGE = { type: "run" } as const;

export type AnalysisPortRequest = typeof RUN_ANALYSIS_MESSAGE;

export type AnalysisPortResponse =
  | { type: "progress"; progress: ProgressUpdate }
  | { type: "results"; results: Results }
  | { type: "error"; message: string };
