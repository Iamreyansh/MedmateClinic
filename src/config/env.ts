/**
 * Where the API lives, and whether the app talks to it or to the local mock.
 *
 * In production the SPA is served by the same host as the API, so the default
 * base is a relative "/api". Set VITE_API_URL to point somewhere else.
 */
export const env = {
  apiBaseUrl: import.meta.env.VITE_API_URL ?? "/api",
  /** The mock answers the API locally until the Java service is running. */
  useMock: import.meta.env.VITE_USE_MOCK !== "false",
} as const;
