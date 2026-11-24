import { env } from "@/config/env";
import { request } from "@/services/api/client";
import { mock } from "@/services/api/mock/router";
import "@/services/api/mock/routes";

/**
 * The API the app talks to.
 *
 * One facade, two backends: the local mock while the Java service is being
 * built, and the service itself once it is running. The paths and the shapes
 * are the same either way, so switching is a flag, not a rewrite.
 */
export async function apiGet<T>(path: string): Promise<T> {
  if (env.useMock) return (await mock.handle("GET", path, undefined)) as T;
  return request<T>(path);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  if (env.useMock) return (await mock.handle("POST", path, body)) as T;
  return request<T>(path, { method: "POST", body });
}

export { ApiError } from "@/services/api/client";
