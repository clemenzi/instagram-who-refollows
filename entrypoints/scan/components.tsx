import type { Profile, ProgressUpdate, Results } from "../instagram.content/types";
import { PROFILE_URL } from "../instagram.content/utils";
import { getProgressValue } from "./progress";

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

export function ResultsList({ profiles }: { profiles: Profile[] }) {
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
