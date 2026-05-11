import { useState } from "react";

type RunState = "idle" | "starting" | "sent" | "error";

function App() {
  const [runState, setRunState] = useState<RunState>("idle");

  const handleButtonClick = async () => {
    setRunState("starting");

    try {
      const tabs = await browser.tabs.query({
        url: "*://*.instagram.com/*",
      });
      const instagramTab = tabs.find((tab) => typeof tab.id === "number");

      if (instagramTab?.id) {
        await browser.tabs.update(instagramTab.id, { active: true });
        await browser.tabs.sendMessage(instagramTab.id, "run");
      } else {
        await browser.tabs.create({
          url: "https://www.instagram.com",
        });
      }

      setRunState("sent");
    } catch {
      setRunState("error");
    }
  };

  const statusCopy = {
    idle: "Ready.",
    starting: "Connecting to Instagram...",
    sent: "Scan window opened on Instagram.",
    error: "Open Instagram and try again.",
  } satisfies Record<RunState, string>;

  return (
    <main className="w-80 bg-white p-4 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
      <section className="space-y-4">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase text-neutral-500 dark:text-neutral-400">
            Instagram Refollows
          </p>
          <h1 className="text-lg font-semibold leading-6">
            Find accounts that do not follow you back.
          </h1>
        </div>

        <button
          className="flex min-h-11 w-full items-center justify-center rounded-md bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-wait disabled:bg-neutral-400 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 dark:focus:ring-neutral-500 dark:focus:ring-offset-neutral-950 dark:disabled:bg-neutral-600 dark:disabled:text-neutral-300"
          type="button"
          disabled={runState === "starting"}
          onClick={handleButtonClick}
        >
          {runState === "starting" ? "Starting..." : "Start scan"}
        </button>

        <p
          className={`rounded-md border px-3 py-2 text-xs leading-5 ${
            runState === "error"
              ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300"
              : "border-neutral-200 bg-neutral-50 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
          }`}
        >
          {statusCopy[runState]}
        </p>
      </section>
    </main>
  );
}

export default App;
