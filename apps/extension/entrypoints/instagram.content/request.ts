import { INSTAGRAM_APP_ID, INSTAGRAM_ORIGIN } from "./instagram";

const DEFAULT_RATE_LIMIT_DELAY_MS = 60_000;

let rateLimitedUntil = 0;

export class InstagramRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "InstagramRequestError";
  }
}

function createRateLimitError() {
  const seconds = Math.max(1, Math.ceil((rateLimitedUntil - Date.now()) / 1000));

  return new InstagramRequestError(
    429,
    `Instagram is temporarily limiting requests (429). Wait at least ${seconds} seconds before starting another scan.`,
  );
}

function getRetryDelay(retryAfter: string | null) {
  if (!retryAfter?.trim()) {
    return DEFAULT_RATE_LIMIT_DELAY_MS;
  }

  const seconds = Number(retryAfter);
  const milliseconds = Number.isFinite(seconds)
    ? seconds * 1000
    : Date.parse(retryAfter) - Date.now();

  return Number.isFinite(milliseconds) && milliseconds > 0
    ? milliseconds
    : DEFAULT_RATE_LIMIT_DELAY_MS;
}

export function delay(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export async function fetchInstagramJson<T>(
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  if (Date.now() < rateLimitedUntil) {
    throw createRateLimitError();
  }

  const url = new URL(path, INSTAGRAM_ORIGIN);
  url.search = new URLSearchParams(params).toString();

  const response = await fetch(url, {
    credentials: "include",
    headers: { "x-ig-app-id": INSTAGRAM_APP_ID },
  });

  if (response.status === 429) {
    rateLimitedUntil = Date.now() + getRetryDelay(response.headers.get("retry-after"));
    throw createRateLimitError();
  }

  if (response.status === 401 || response.status === 403 || response.redirected) {
    throw new InstagramRequestError(
      response.redirected ? 401 : response.status,
      "Instagram requires authentication or has restricted access. Open Instagram, check for any prompts, then reload the tab before trying again.",
    );
  }

  if (!response.ok) {
    throw new InstagramRequestError(
      response.status,
      `Request failed (${response.status}) for ${url}`,
    );
  }

  return response.json();
}
