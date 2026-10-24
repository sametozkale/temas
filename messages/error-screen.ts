/**
 * Copy for the root error boundaries. These render when the intl provider
 * is unavailable, so they cannot import `messages/en.json` (that file is
 * ~100KB and was landing in the shared client bundle).
 * `messages/error-screen.test.ts` keeps this in lockstep with `en.json`.
 */
export const errorScreen = {
  title: "Something went wrong",
  description: "The page could not be loaded. Try again.",
  retry: "Try again",
} as const;
