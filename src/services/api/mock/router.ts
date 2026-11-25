/**
 * The local mock.
 *
 * It answers the same paths the Java API answers, with the same shapes, so a
 * screen can be built and reviewed before the service exists — and so the
 * switch to the real API is one flag (`VITE_USE_MOCK=false`), not a rewrite.
 *
 * Paths are matched as templates: `/clinic/visits/:id` matches
 * `/clinic/visits/vs_kavya`, and the query string is handed to the handler as
 * `query`. A handler that is not registered is a loud error, not a silent
 * empty response — a screen that asks for something the mock cannot answer is
 * a bug, and the contract test asserts every path the app calls is covered.
 */

/** The handler receives the request body and the route's own context. */
export type MockContext = {
  /** The path parameters, by name: `/visits/:id` → `{ id: "vs_kavya" }`. */
  params: Record<string, string>;
  /** The query string, parsed. */
  query: URLSearchParams;
};

export type Handler = (body: unknown, context: MockContext) => unknown;

type Route = {
  method: string;
  /** The path template, split into segments. */
  segments: string[];
  handler: Handler;
};

const routes: Route[] = [];

/** Split a path into its segments, ignoring empty ones. */
function segmentsOf(path: string): string[] {
  return path.split("/").filter(Boolean);
}

/** Does this path template match this path? */
function matches(route: Route, path: string): Record<string, string> | null {
  const parts = segmentsOf(path);
  if (parts.length !== route.segments.length) return null;

  const params: Record<string, string> = {};
  for (let index = 0; index < parts.length; index += 1) {
    const expected = route.segments[index];
    const actual = parts[index];
    if (expected.startsWith(":")) {
      params[expected.slice(1)] = decodeURIComponent(actual);
      continue;
    }
    if (expected !== actual) return null;
  }
  return params;
}

/** The path and the query string, apart. */
function split(target: string): { path: string; query: URLSearchParams } {
  const index = target.indexOf("?");
  if (index === -1) return { path: target, query: new URLSearchParams() };
  return {
    path: target.slice(0, index),
    query: new URLSearchParams(target.slice(index + 1)),
  };
}

export const mock = {
  /** Register a handler. The path may hold `:name` parameters. */
  on: (method: string, path: string, handler: Handler) => {
    routes.push({ method: method.toUpperCase(), segments: segmentsOf(path), handler });
  },

  /**
   * Answer a request. Throws when nothing is registered — the mock is not
   * allowed to pretend it knows an endpoint it does not.
   */
  handle: async (
    method: string,
    target: string,
    body: unknown,
    context?: MockContext,
  ): Promise<unknown> => {
    const { path, query } = split(target);
    const wanted = method.toUpperCase();
    const route = routes.find(
      (candidate) => candidate.method === wanted && matches(candidate, path) !== null,
    );
    if (!route) {
      throw new Error(`no mock for ${wanted} ${path}`);
    }
    const params = matches(route, path) ?? {};
    return route.handler(body, { params, query, ...context });
  },

  /** Whether a path is answered. Used by the contract test. */
  has: (method: string, target: string): boolean => {
    const { path } = split(target);
    const wanted = method.toUpperCase();
    return routes.some((route) => route.method === wanted && matches(route, path) !== null);
  },

  /** Every path the mock answers, for the contract test and the dev tools. */
  paths: (): Array<{ method: string; path: string }> =>
    routes.map((route) => ({
      method: route.method,
      path: "/" + route.segments.join("/"),
    })),
};
