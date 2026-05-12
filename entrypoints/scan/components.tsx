import type { Profile, ProgressUpdate, Results } from "../instagram.content/types";
import { PROFILE_URL } from "../instagram.content/utils";
import { getProgressValue } from "./progress";

export type ProfileActionState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done" }
  | { status: "error"; message: string };

const IDLE_PROFILE_ACTION = { status: "idle" } satisfies ProfileActionState;

export function ProgressPanel({ progress }: { progress: ProgressUpdate[] }) {
  const currentProgress = progress.at(-1);
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

export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm leading-5 text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300">
      {message}
    </div>
  );
}

export function MissingTabMessage() {
  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-5 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
      <section className="mx-auto max-w-xl rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm leading-5 text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300">
        Open the extension popup from an Instagram tab to start a scan.
      </section>
    </main>
  );
}

export function ResultsSummary({ results }: { results: Results }) {
  const metrics = [
    {
      label: "Not following back",
      value: results.dontFollowMeBack.length,
    },
    {
      label: "Following",
      value: results.followingsCount,
    },
    {
      label: "Followers",
      value: results.followersCount,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 text-center">
      {metrics.map(({ label, value }) => (
        <div
          className="rounded-md border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900"
          key={label}
        >
          <p className="text-lg font-semibold">{value}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
        </div>
      ))}
    </div>
  );
}

export function ResultsList({
  actionStates,
  onUnfollow,
  profiles,
}: {
  actionStates: Record<string, ProfileActionState>;
  onUnfollow: (profile: Profile) => void;
  profiles: Profile[];
}) {
  return (
    <div className="overflow-hidden rounded-md border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      {profiles.length === 0 ? (
        <p className="px-3 py-4 text-sm leading-5 text-neutral-500 dark:text-neutral-400">
          No accounts found.
        </p>
      ) : (
        <ul className="max-h-[calc(100vh-260px)] min-h-52 divide-y divide-neutral-200 overflow-y-auto dark:divide-neutral-800">
          {profiles.map((profile) => (
            <ProfileRow
              actionState={actionStates[profile.username] ?? IDLE_PROFILE_ACTION}
              key={profile.username}
              profile={profile}
              onUnfollow={onUnfollow}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ProfileRow({
  actionState,
  onUnfollow,
  profile,
}: {
  actionState: ProfileActionState;
  onUnfollow: (profile: Profile) => void;
  profile: Profile;
}) {
  const isBusy = actionState.status === "loading";
  const isDone = actionState.status === "done";
  const buttonLabel = isBusy ? "Unfollowing..." : isDone ? "Unfollowed" : "Unfollow";

  return (
    <li className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-neutral-50 dark:hover:bg-neutral-900">
      <Avatar profile={profile} />
      <div className="min-w-0 flex-1">
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
        {actionState.status === "error" && (
          <p className="truncate text-xs leading-4 text-red-600 dark:text-red-400">
            {actionState.message}
          </p>
        )}
      </div>
      <button
        className="min-h-9 shrink-0 rounded-md border border-neutral-300 px-3 text-xs font-semibold text-neutral-800 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-neutral-400 disabled:cursor-default disabled:border-neutral-200 disabled:bg-neutral-100 disabled:text-neutral-400 dark:border-neutral-700 dark:text-neutral-100 dark:hover:border-red-800 dark:hover:bg-red-950/30 dark:hover:text-red-300 dark:focus:ring-neutral-500 dark:disabled:border-neutral-800 dark:disabled:bg-neutral-900 dark:disabled:text-neutral-500"
        type="button"
        disabled={isBusy || isDone}
        onClick={() => onUnfollow(profile)}
      >
        {buttonLabel}
      </button>
    </li>
  );
}

function Avatar({ profile }: { profile: Profile }) {
  const initial = profile.username.charAt(0).toUpperCase();

  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-neutral-200 text-sm font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
      <span>{initial}</span>
    </div>
  );
}
