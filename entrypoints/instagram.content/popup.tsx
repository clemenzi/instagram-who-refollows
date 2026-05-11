import { useCallback, useEffect, useRef, useState } from "react";

import type { Profile, ProgressUpdate, Results } from "./types";
import { PROFILE_URL } from "./utils";

type PopupProps = {
  isOpen: boolean;
  runSignal: number;
  onClose: () => void;
  onRun: (onProgress: (progress: ProgressUpdate) => void) => Promise<Results>;
};

type Status = "idle" | "loading" | "success" | "error";

const MAX_PROGRESS_ITEMS = 5;
const PHASE_PROGRESS: Record<ProgressUpdate["phase"], number> = {
  target: 8,
  "user-id": 18,
  followings: 28,
  followers: 64,
  results: 100,
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error during the scan.";
}

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

function ProgressPanel({ progress }: { progress: ProgressUpdate[] }) {
  const currentProgress = progress[progress.length - 1];
  const progressValue = getProgressValue(progress);

  return (
    <div className="space-y-3 px-1 py-6">
      <div className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
        <div
          className="h-full rounded-full bg-neutral-950 transition-all duration-500 ease-out dark:bg-neutral-50"
          style={{ width: `${progressValue}%` }}
        />
      </div>
      <p className="truncate text-center text-xs leading-4 text-neutral-500 dark:text-neutral-400">
        {currentProgress?.message ?? "Starting scan..."}
      </p>
      {typeof currentProgress?.collected === "number" && (
        <p className="text-center text-[11px] leading-4 text-neutral-400 dark:text-neutral-500">
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
    <div className="max-h-[min(520px,calc(100vh-128px))] overflow-y-auto rounded-md border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      {profiles.length === 0 ? (
        <p className="px-3 py-4 text-sm leading-5 text-neutral-500 dark:text-neutral-400">
          No accounts found.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {profiles.map((profile) => (
            <ProfileRow key={profile.username} profile={profile} />
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Popup({ isOpen, runSignal, onClose, onRun }: PopupProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressUpdate[]>([]);
  const handledRunSignal = useRef(0);

  const handleRun = useCallback(async () => {
    setStatus("loading");
    setError(null);
    setResults(null);
    setProgress([]);

    try {
      const nextResults = await onRun((nextProgress) => {
        setProgress((previousProgress) => [
          ...previousProgress.slice(1 - MAX_PROGRESS_ITEMS),
          nextProgress,
        ]);
      });

      setResults(nextResults);
      setStatus("success");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
      setStatus("error");
    }
  }, [onRun]);

  useEffect(() => {
    if (!isOpen || runSignal === 0 || handledRunSignal.current === runSignal) {
      return;
    }

    handledRunSignal.current = runSignal;
    void handleRun();
  }, [handleRun, isOpen, runSignal]);

  if (!isOpen) {
    return null;
  }

  return (
    <section className="fixed inset-x-3 bottom-3 z-[2147483647] max-h-[calc(100vh-24px)] overflow-hidden rounded-lg border border-neutral-200 bg-white text-neutral-950 shadow-2xl shadow-neutral-950/20 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50 dark:shadow-black/50 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[380px]">
      <button
        aria-label="Close popup"
        className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-md text-sm font-semibold leading-none text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-950 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:hover:bg-neutral-900 dark:hover:text-neutral-50 dark:focus:ring-neutral-700"
        type="button"
        onClick={onClose}
      >
        X
      </button>

      <div className="space-y-3 p-3 pt-12">
        {status === "loading" && <ProgressPanel progress={progress} />}

        {status === "error" && error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm leading-5 text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        {results && (
          <>
            <button
              className="flex min-h-11 w-full items-center justify-center rounded-md bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-wait disabled:bg-neutral-400 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 dark:focus:ring-neutral-500 dark:focus:ring-offset-neutral-950 dark:disabled:bg-neutral-600 dark:disabled:text-neutral-300"
              type="button"
              disabled={status === "loading"}
              onClick={handleRun}
            >
              Check again
            </button>
            <ResultsList profiles={results.dontFollowMeBack} />
          </>
        )}
      </div>
    </section>
  );
}
