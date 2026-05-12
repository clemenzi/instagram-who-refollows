import { useCallback, useEffect, useRef, useState } from "react";

import type { Profile, ProgressUpdate, Results } from "../instagram.content/types";
import { PROFILE_URL } from "../instagram.content/utils";

type ScanStatus = "loading" | "success" | "error";

type AnalysisPortResponse =
  | { type: "progress"; progress: ProgressUpdate }
  | { type: "results"; results: Results }
  | { type: "error"; message: string };

const ANALYSIS_PORT = "instagram-analysis";
const MAX_PROGRESS_ITEMS = 5;
const PHASE_PROGRESS: Record<ProgressUpdate["phase"], number> = {
  target: 8,
  "user-id": 18,
  followings: 28,
  followers: 64,
  results: 100,
};

function getProgressValue(progress: ProgressUpdate[]) {
  const currentProgress = progress[progress.length - 1];

  if (!currentProgress) {
    return 6;
  }

  const phaseStart = PHASE_PROGRESS[currentProgress.phase];

  if (currentProgress.phase === "followings") {
    return Math.min(58, phaseStart + (currentProgress.page ?? 0) * 6);
  }

  if (currentProgress.phase === "followers") {
    return Math.min(94, phaseStart + (currentProgress.page ?? 0) * 6);
  }

  return phaseStart;
}

function getTabIdFromUrl() {
  const tabId = new URLSearchParams(window.location.search).get("tabId");
  const parsedTabId = Number(tabId);

  return Number.isInteger(parsedTabId) ? parsedTabId : null;
}

function ProgressPanel({ progress }: { progress: ProgressUpdate[] }) {
  const currentProgress = progress[progress.length - 1];
  const progressValue = getProgressValue(progress);

  return (
    <div className="space-y-3">
      <div className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
        <div
          className="h-full rounded-full bg-neutral-950 transition-all duration-500 ease-out dark:bg-neutral-50"
          style={{ width: `${progressValue}%` }}
        />
      </div>
      <p className="truncate text-sm leading-5 text-neutral-600 dark:text-neutral-300">
        {currentProgress?.message ?? "Starting scan..."}
      </p>
      {typeof currentProgress?.collected === "number" && (
        <p className="text-xs leading-4 text-neutral-400 dark:text-neutral-500">
          {currentProgress.collected} profiles read
        </p>
      )}
    </div>
  );
}

function Avatar({ profile }: { profile: Profile }) {
  const initial = profile.username.charAt(0).toUpperCase();

  return (
    <div className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-neutral-200 text-sm font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
      <span>{initial}</span>
      {profile.profile_pic_url && (
        <img
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          referrerPolicy="no-referrer"
          src={profile.profile_pic_url}
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      )}
    </div>
  );
}

function ProfileRow({ profile }: { profile: Profile }) {
  return (
    <li className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-neutral-50 dark:hover:bg-neutral-900">
      <Avatar profile={profile} />
      <div className="min-w-0">
        <a
          className="block truncate text-sm font-semibold leading-5 text-neutral-950 transition hover:text-sky-600 dark:text-neutral-50 dark:hover:text-sky-400"
          href={`${PROFILE_URL}${profile.username}/`}
          rel="noreferrer"
          target="_blank"
        >
          @{profile.username}
        </a>
        <p className="truncate text-xs leading-4 text-neutral-500 dark:text-neutral-400">
          {profile.full_name || "-"}
        </p>
      </div>
    </li>
  );
}

function ResultsList({ profiles }: { profiles: Profile[] }) {
  return (
    <div className="overflow-hidden rounded-md border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      {profiles.length === 0 ? (
        <p className="px-3 py-4 text-sm leading-5 text-neutral-500 dark:text-neutral-400">
          No accounts found.
        </p>
      ) : (
        <ul className="max-h-[calc(100vh-260px)] min-h-52 divide-y divide-neutral-200 overflow-y-auto dark:divide-neutral-800">
          {profiles.map((profile) => (
            <ProfileRow key={profile.username} profile={profile} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ScanPage({ tabId }: { tabId: number }) {
  const [status, setStatus] = useState<ScanStatus>("loading");
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressUpdate[]>([]);
  const portRef = useRef<Browser.runtime.Port | null>(null);

  const startScan = useCallback(() => {
    portRef.current?.disconnect();
    setStatus("loading");
    setError(null);
    setResults(null);
    setProgress([]);

    let port: Browser.runtime.Port;

    try {
      port = browser.tabs.connect(tabId, { name: ANALYSIS_PORT });
    } catch {
      setError("Could not connect to Instagram. Reload Instagram and start again.");
      setStatus("error");
      return;
    }

    portRef.current = port;

    port.onMessage.addListener((message: AnalysisPortResponse) => {
      if (message.type === "progress") {
        setProgress((previousProgress) => [
          ...previousProgress.slice(1 - MAX_PROGRESS_ITEMS),
          message.progress,
        ]);
        return;
      }

      if (message.type === "results") {
        setResults(message.results);
        setStatus("success");
        port.disconnect();
        return;
      }

      setError(message.message);
      setStatus("error");
      port.disconnect();
    });

    port.onDisconnect.addListener(() => {
      if (browser.runtime.lastError) {
        setError("Could not connect to Instagram. Reload Instagram and start again.");
        setStatus("error");
      }
    });

    port.postMessage({ type: "run" });
  }, [tabId]);

  useEffect(() => {
    startScan();

    return () => {
      portRef.current?.disconnect();
    };
  }, [startScan]);

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-5 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50 sm:px-6">
      <section className="mx-auto flex max-w-3xl flex-col gap-4">
        <header className="flex flex-col gap-3 border-b border-neutral-200 pb-4 dark:border-neutral-800 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase text-neutral-500 dark:text-neutral-400">
              Instagram Refollows
            </p>
            <h1 className="text-2xl font-semibold leading-8">
              Accounts that do not follow you back
            </h1>
          </div>
          <button
            className="flex min-h-10 items-center justify-center rounded-md bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2 focus:ring-offset-neutral-50 disabled:cursor-wait disabled:bg-neutral-400 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 dark:focus:ring-neutral-500 dark:focus:ring-offset-neutral-950 dark:disabled:bg-neutral-600 dark:disabled:text-neutral-300"
            type="button"
            disabled={status === "loading"}
            onClick={startScan}
          >
            {status === "loading" ? "Scanning..." : "Check again"}
          </button>
        </header>

        {status === "loading" && <ProgressPanel progress={progress} />}

        {status === "error" && error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm leading-5 text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        {results && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900">
                <p className="text-lg font-semibold">{results.dontFollowMeBack.length}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Not following back</p>
              </div>
              <div className="rounded-md border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900">
                <p className="text-lg font-semibold">{results.followingsCount}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Following</p>
              </div>
              <div className="rounded-md border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900">
                <p className="text-lg font-semibold">{results.followersCount}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Followers</p>
              </div>
            </div>
            <ResultsList profiles={results.dontFollowMeBack} />
          </div>
        )}
      </section>
    </main>
  );
}

function App() {
  const tabId = getTabIdFromUrl();

  if (tabId === null) {
    return (
      <main className="min-h-screen bg-neutral-50 px-4 py-5 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
        <section className="mx-auto max-w-xl rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm leading-5 text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300">
          Open the extension popup from an Instagram tab to start a scan.
        </section>
      </main>
    );
  }

  return <ScanPage tabId={tabId} />;
}

export default App;
