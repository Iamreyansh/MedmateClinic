import { env } from "@/config/env";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** The machine-readable code, when the server sent one. */
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** True when the endpoint is simply not there — a missing route, not a fault. */
  get isNotFound(): boolean {
    return this.status === 404;
  }

  /** True when the person signed in may not open this. */
  get isForbidden(): boolean {
    return this.status === 403;
  }
}

export type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  /** Extra headers the request carries. */
  headers?: Record<string, string>;
};

/**
 * The token, in memory.
 *
 * It lives in a module variable, so a page that never signs in never holds
 * one, and a script that reads the page's storage cannot take it. The session
 * storage is the fallback for a refresh — a person signing in on a shared
 * device should not stay signed in after the tab closes.
 */
let token: string | null = null;

/** Where the token is kept between reloads. */
const TOKEN_KEY = "medmate.token";

/** The legacy key the local storage used to hold it in. */
const LEGACY_TOKEN_KEY = "medmate.token.legacy";

/**
 * The token for the signed-in session.
 *
 * It is kept in memory and mirrored into the session storage, so a refresh
 * does not sign the person out but a closed tab does.
 */
export const auth = {
  get: () => {
    if (typeof window === "undefined") return token;
    if (token) return token;
    // A refresh loses the module variable — the session storage has it.
    const kept = window.sessionStorage.getItem(TOKEN_KEY);
    if (kept) {
      token = kept;
      return kept;
    }
    // The local storage used to hold it. It is read once and moved across,
    // so the token stops sitting in the store that survives the tab.
    const legacy = window.localStorage.getItem(LEGACY_TOKEN_KEY) ?? window.localStorage.getItem(TOKEN_KEY);
    if (legacy) {
      token = legacy;
      window.sessionStorage.setItem(TOKEN_KEY, legacy);
      window.localStorage.removeItem(LEGACY_TOKEN_KEY);
      if (window.localStorage.getItem(TOKEN_KEY) === legacy) window.localStorage.removeItem(TOKEN_KEY);
    }
    return token;
  },
  set: (next: string | null) => {
    token = next;
    if (typeof window === "undefined") return;
    if (next) {
      window.sessionStorage.setItem(TOKEN_KEY, next);
      return;
    }
    window.sessionStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(LEGACY_TOKEN_KEY);
    window.localStorage.removeItem(TOKEN_KEY);
  },
};

/**
 * What the server said, when the server said something.
 *
 * Only `detail` is treated as a message. Spring's own `message` is the
 * server's internals in a sentence — "No static resource api/clinic/inbox." —
 * and that must never reach a person.
 */
type Problem = { detail?: unknown; title?: unknown; code?: unknown };

/** The messages that are safe to show for each status. */
const FRIENDLY: Record<number, string> = {
  400: "That could not be read. Check the details and try again.",
  401: "Your session has ended. Sign in again to carry on.",
  403: "Your role does not have access to this part of the clinic.",
  404: "This part of the clinic is not available yet.",
  409: "Someone else changed this a moment ago. Refresh and try again.",
  422: "Some of the details are missing or wrong. Check and try again.",
  500: "The clinic service had a problem. Try again in a moment.",
  502: "The clinic service could not be reached. Try again in a moment.",
  503: "The clinic service is busy. Try again in a moment.",
};

/** The fallback when the status is one we do not know. */
const UNKNOWN = "Something went wrong. Try again.";

/**
 * Is this string the server's internals rather than a message for a person?
 *
 * A `detail` is meant for people, but a stack trace or a framework message
 * sometimes arrives there. Those never get shown.
 */
function looksLikeServerText(text: string): boolean {
  const lower = text.toLowerCase();
  // the framework's own words, and its class names
  if (lower.includes("no static resource")) return true;
  if (lower.includes("java.lang") || lower.includes("javax.")) return true;
  if (lower.includes("org.springframework") || lower.includes("com.fasterxml.")) return true;
  // a stack trace
  if (/\bat [a-z0-9_$]+\.[a-z0-9_$]+\(/.test(lower)) return true;
  if (lower.includes("caused by:")) return true;
  if (lower.includes("traceback (most recent call last)")) return true;
  return false;
}

/** The message a person may see for this failure. */
function safeMessage(status: number, problem: unknown): string {
  const body = (problem ?? {}) as Problem;
  const detail = typeof body.detail === "string" ? body.detail.trim() : "";
  if (detail && !looksLikeServerText(detail)) return detail;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (title && !looksLikeServerText(title)) return title;
  // `message` is never shown: Spring's own message is the server's internals
  // in a sentence, and the harness has seen it reach a person.
  return FRIENDLY[status] ?? UNKNOWN;
}

/** The machine-readable code, when there is one. */
function safeCode(problem: unknown): string | undefined {
  const code = (problem as Problem | null)?.code;
  return typeof code === "string" && code ? code : undefined;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, signal, headers: extra } = options;

  let response: Response;
  try {
    response = await fetch(`${env.apiBaseUrl}${path}`, {
      method,
      signal,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(auth.get() ? { Authorization: `Bearer ${auth.get()}` } : {}),
        ...(extra ?? {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (reason: unknown) {
    // A cancelled request is not a failure to report — the caller moved on.
    if (reason instanceof DOMException && reason.name === "AbortError") throw reason;
    if (reason instanceof Error && reason.name === "AbortError") throw reason;
    throw new ApiError(0, "Could not reach the clinic service. Check the connection and try again.");
  }

  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    throw new ApiError(response.status, safeMessage(response.status, problem), safeCode(problem));
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/**
 * The list in a payload, whatever the server wrapped it in.
 *
 * The contract says a list is a bare array, but a server that wraps one in
 * `list` or `items` is still answering the question. The app asks for the
 * array and never for the wrapper, so the two cannot drift apart.
 */
export function asList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  const body = payload as { list?: unknown; items?: unknown; data?: unknown } | null;
  if (Array.isArray(body?.list)) return body.list as T[];
  if (Array.isArray(body?.items)) return body.items as T[];
  if (Array.isArray(body?.data)) return body.data as T[];
  return [];
}
