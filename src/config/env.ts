/**
 * Where the API lives, and whether the app talks to it or to the local mock.
 *
 * In production the SPA is served by the same host as the API, so the default
 * base is a relative "/api". Set VITE_API_URL to point somewhere else.
 */

/** The mode the bundle was built in. */
export const buildMode = import.meta.env.MODE;

export const env = {
  apiBaseUrl: import.meta.env.VITE_API_URL ?? "/api",
  /** The mock answers the API locally until the Java service is running. */
  useMock: import.meta.env.VITE_USE_MOCK !== "false",
  /**
   * Whether the clinic is in test mode.
   *
   * Test mode means the signatures, the ABDM links and the payments are not
   * real, so the app says so in a strip at the top rather than letting a
   * person believe a prescription was signed for money. It is on whenever
   * the mock is answering, and otherwise it is the deployment's word — set
   * VITE_TEST_MODE=true when the service behind the app is a test one.
   */
  testMode:
    import.meta.env.VITE_TEST_MODE === "true" || import.meta.env.VITE_USE_MOCK !== "false",
} as const;

/**
 * The mock must never ship.
 *
 * The mock answers with fixture data and a sign-in that accepts any code, so a
 * production bundle built with it on would show fake patients and let anyone
 * in. The Java service refuses to start with its own test mode on outside
 * development; this is the same guard on this side.
 */
export function assertMockIsSafeToBuild(): void {
  if (buildMode === "production" && env.useMock) {
    throw new Error(
      "VITE_USE_MOCK is on in a production build. The mock answers with fixture data and a " +
        "sign-in that accepts any code, so it must never ship. Build with VITE_USE_MOCK=false.",
    );
  }
}
