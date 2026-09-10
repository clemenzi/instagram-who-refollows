export const INSTAGRAM_ORIGIN = "https://www.instagram.com";
export const INSTAGRAM_PROFILE_URL = `${INSTAGRAM_ORIGIN}/`;
export const INSTAGRAM_APP_ID = "936619743392459";
export const PROFILE_PAGE_SIZE = 50;
export const REQUEST_DELAY_MS = 750;

const INSTAGRAM_ID_PATTERN = /^[1-9]\d*$/;

export function isInstagramId(value: unknown): value is string | number {
  return (
    (typeof value === "string" && INSTAGRAM_ID_PATTERN.test(value)) ||
    (typeof value === "number" && Number.isSafeInteger(value) && value > 0)
  );
}
