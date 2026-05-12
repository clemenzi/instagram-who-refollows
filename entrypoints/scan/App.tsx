import { useCallback, useEffect, useRef, useState } from "react";

import type { ProgressUpdate, Results } from "../instagram.content/types";
import {
  connectToAnalysisPort,
  keepRecentProgress,
  RUN_ANALYSIS_MESSAGE,
  type AnalysisPortResponse,
} from "./analysisPort";
import {
  ErrorMessage,
  MissingTabMessage,
  ProgressPanel,
  ResultsList,
  ResultsSummary,
} from "./components";

type ScanStatus = "loading" | "success" | "error";

function getTabIdFromUrl() {
  const tabId = new URLSearchParams(window.location.search).get("tabId");
  const parsedTabId = Number(tabId);

  return Number.isInteger(parsedTabId) ? parsedTabId : null;
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
      port = connectToAnalysisPort(tabId);
    } catch {
      setError("Could not connect to Instagram. Reload Instagram and start again.");
      setStatus("error");
      return;
    }

    portRef.current = port;

    port.onMessage.addListener((message: AnalysisPortResponse) => {
      if (message.type === "progress") {
        setProgress((previousProgress) => keepRecentProgress(previousProgress, message.progress));
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

    port.postMessage(RUN_ANALYSIS_MESSAGE);
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

        {status === "error" && error && <ErrorMessage message={error} />}

        {results && (
          <div className="space-y-3">
            <ResultsSummary results={results} />
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
    return <MissingTabMessage />;
  }

  return <ScanPage tabId={tabId} />;
}

export default App;
