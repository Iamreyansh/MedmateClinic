import { env } from "@/config/env";
import { ApiError, request } from "@/services/api/client";
import { mock } from "@/services/api/mock/router";
import "@/services/api/mock/routes";

/**
 * The API the app talks to.
 *
 * One facade, two backends: the local mock while the Java service is being
 * built, and the service itself once it is running. The paths and the shapes
 * are the same either way, so switching is a flag, not a rewrite.
 */
export type ApiOptions = {
  /** Cancels the request when the screen moves on. */
  signal?: AbortSignal;
  /** The headers the request carries. */
  headers?: Record<string, string>;
};

/**
 * The mock's failures, as the service's failures.
 *
 * The mock throws plain errors; the service throws statuses. The screens read
 * the status, so the mock's errors are given one here — a missing endpoint is
 * a 404 in both.
 */
function asApiError(reason: unknown): never {
  if (reason instanceof ApiError) throw reason;
  const message = reason instanceof Error ? reason.message : "Something went wrong. Try again.";
  throw new ApiError(400, message);
}

export async function apiGet<T>(path: string, options: ApiOptions = {}): Promise<T> {
  if (env.useMock) {
    try {
      return (await mock.handle("GET", path, undefined)) as T;
    } catch (reason: unknown) {
      return asApiError(reason);
    }
  }
  return request<T>(path, { method: "GET", signal: options.signal });
}

export async function apiPost<T>(
  path: string,
  body?: unknown,
  options: ApiOptions = {},
): Promise<T> {
  if (env.useMock) {
    try {
      return (await mock.handle("POST", path, body, { headers: options.headers ?? {} })) as T;
    } catch (reason: unknown) {
      return asApiError(reason);
    }
  }
  return request<T>(path, { method: "POST", body, signal: options.signal, headers: options.headers });
}

export async function apiPut<T>(
  path: string,
  body?: unknown,
  options: ApiOptions = {},
): Promise<T> {
  if (env.useMock) {
    try {
      return (await mock.handle("PUT", path, body, { headers: options.headers ?? {} })) as T;
    } catch (reason: unknown) {
      return asApiError(reason);
    }
  }
  return request<T>(path, { method: "PUT", body, signal: options.signal, headers: options.headers });
}

export async function apiDelete<T>(path: string, options: ApiOptions = {}): Promise<T> {
  if (env.useMock) {
    try {
      return (await mock.handle("DELETE", path, undefined, {
        headers: options.headers ?? {},
      })) as T;
    } catch (reason: unknown) {
      return asApiError(reason);
    }
  }
  return request<T>(path, { method: "DELETE", signal: options.signal, headers: options.headers });
}

export { ApiError } from "@/services/api/client";
export { asList } from "@/services/api/client";
