/**
 * The contract between the service and the app.
 *
 * The service's own controllers are the truth about which paths exist, so
 * this file reads them out of the tree rather than out of a table somebody
 * wrote down and forgot. Every path the service declares must be answered
 * by the mock, and with the envelope the service uses: a screen that works
 * against the mock and breaks against the service is a screen that was
 * built against a fiction.
 *
 * The mock's own behaviour is pinned in `mock/contract.test.ts`. This file
 * is the service's side of the same contract.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mock } from "@/services/api/mock/router";
import "@/services/api/mock/routes";

/** The repository root — the Java service lives beside the app. */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

/** Where the service's controllers are. */
const serviceRoot = path.join(root, "backend/src/main/java/com/medmate/clinic");

/** Every controller the service has, by path. */
function controllers(): string[] {
  const found: string[] = [];
  const walk = (directory: string) => {
    for (const entry of readdirSync(directory)) {
      const full = path.join(directory, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry.endsWith("Controller.java")) found.push(full);
    }
  };
  walk(serviceRoot);
  return found.sort();
}

/**
 * The paths a controller declares, with the method each one answers.
 *
 * The path is the controller's own base with the method's own suffix, and
 * the placeholders are named `:id` — the way the mock's router names them,
 * so a path that exists on one side exists on the other.
 */
function pathsOf(source: string): Array<{ method: string; path: string }> {
  const base = source.match(/@RequestMapping\("([^"]+)"\)/)?.[1] ?? "";
  const paths: Array<{ method: string; path: string }> = [];
  for (const match of source.matchAll(/@(Get|Post|Patch|Delete|Put)Mapping(?:\("([^"]*)"\))?/g)) {
    const method = {
      Get: "GET",
      Post: "POST",
      Patch: "PATCH",
      Delete: "DELETE",
      Put: "PUT",
    }[match[1] as "Get"];
    const suffix = match[2] ?? "";
    const full = `${base}${suffix}`.replace(/^\/api/, "");
    paths.push({ method, path: full.replace(/\{[^}]+\}/g, ":id") });
  }
  return paths;
}

/** Every path the service declares. */
function declared(): Array<{ file: string; method: string; path: string }> {
  const paths: Array<{ file: string; method: string; path: string }> = [];
  for (const file of controllers()) {
    for (const entry of pathsOf(readFileSync(file, "utf8"))) {
      paths.push({ file: path.relative(serviceRoot, file), ...entry });
    }
  }
  return paths;
}

/** The lists that answer with a bare array — the only three. */
const BARE_ARRAYS = ["/clinic/doctors", "/clinic/nurse/doctors", "/clinic/nurse/patients"];

/** The lists that answer under a name, and the name. */
const NAMED_ARRAYS: Array<{ path: string; key: string }> = [
  { path: "/clinic/admin/members", key: "items" },
  { path: "/clinic/admin/profiles", key: "items" },
  { path: "/clinic/admin/locations", key: "items" },
  { path: "/clinic/admin/pharmacies", key: "items" },
  { path: "/clinic/admin/doctors/schedules", key: "items" },
  { path: "/clinic/admin/activity", key: "items" },
  { path: "/clinic/admin/roles", key: "items" },
  { path: "/clinic/admin/account", key: "items" },
  { path: "/clinic/admin/settings", key: "items" },
  { path: "/clinic/admin/settings/device", key: "items" },
  { path: "/clinic/admin/settings/agreements", key: "items" },
  { path: "/clinic/admin/settings/readiness", key: "items" },
  { path: "/clinic/patients", key: "items" },
  { path: "/clinic/inbox", key: "items" },
  { path: "/clinic/activity", key: "events" },
  { path: "/clinic/messages", key: "items" },
  { path: "/clinic/templates", key: "items" },
  { path: "/clinic/queue", key: "items" },
  { path: "/clinic/billing", key: "bills" },
  { path: "/clinic/appointments", key: "appointments" },
  { path: "/clinic/appointments/summary", key: "days" },
  { path: "/clinic/lab", key: "open" },
  { path: "/clinic/teleconsult", key: "waiting" },
  { path: "/clinic/nurse", key: "items" },
  { path: "/clinic/dashboard", key: "stations" },
  { path: "/clinic/reports", key: "tabs" },
  { path: "/clinic/subscription", key: "usage" },
  { path: "/clinic/settings", key: "locations" },
];

describe("the paths the service declares", () => {
  it("finds the service's controllers", () => {
    expect(controllers().length).toBeGreaterThan(20);
    expect(declared().length).toBeGreaterThan(80);
  });

  it("is answered by the mock, every one", () => {
    const missing = declared()
      .filter((entry) => !mock.has(entry.method, entry.path))
      .map((entry) => `${entry.method} ${entry.path} (${entry.file})`);
    expect(missing, "the mock answers every path the service declares").toEqual([]);
  });
});

describe("the envelope the service uses", () => {
  it("answers the three bare arrays bare, and nothing else", async () => {
    for (const path of BARE_ARRAYS) {
      const answer = await mock.handle("GET", path, undefined);
      expect(Array.isArray(answer), `${path} answers a bare array`).toBe(true);
    }
  });

  it("answers a write with the same shape its list reads", async () => {
    // A write that answers with a list is a list the screen can read the
    // same way — and the count under it is the count of the whole list, not
    // of the row that was written.
    const answer = (await mock.handle("PUT", "/clinic/admin/settings/pin", {
      pin: "4821",
    })) as { items: unknown[]; meta: { total: number } };
    expect(Array.isArray(answer.items)).toBe(true);
    expect(answer.meta.total).toBe(answer.items.length);
  });

  it("answers every other list under its own name, with the count of it", async () => {
    for (const entry of NAMED_ARRAYS) {
      const answer = (await mock.handle("GET", entry.path, undefined)) as {
        [key: string]: unknown;
      };
      const list = answer[entry.key];
      expect(Array.isArray(list), `${entry.path} answers a list under ${entry.key}`).toBe(true);
      if (entry.path.startsWith("/clinic/admin/")) {
        expect(
          (answer.meta as { total: number }).total,
          `${entry.path} counts its own list`,
        ).toBe((list as unknown[]).length);
      }
    }
  });
});
