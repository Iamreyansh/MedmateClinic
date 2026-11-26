import "@testing-library/jest-dom/vitest";
import { env } from "@/config/env";

/**
 * The mock has to be on for these tests.
 *
 * The screens are written against the mock — it is the contract — and the
 * build's environment says VITE_USE_MOCK=false in CI, because a bundle with
 * the mock on would answer with fixture patients. That must not reach the
 * unit tests: without the mock they would be talking to a service that is
 * not there, and five render tests would fail for no reason a person could
 * read. The test environment turns the mock on for itself (test.env in
 * vite.config.ts); this is the guard that says so out loud when it is not.
 */
if (!env.useMock) {
  throw new Error(
    "the unit tests need the mock: VITE_USE_MOCK must be true for vitest (test.env in vite.config.ts)",
  );
}
