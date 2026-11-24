import { env } from "@/config/env";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
};

let currentToken: string | null = null;

/** The bearer token for the signed-in session. */
export const auth = {
  get: () => currentToken,
  set: (token: string | null) => {
    currentToken = token;
  },
};

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, signal } = options;

  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    method,
    signal,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    throw new ApiError(response.status, problem?.detail ?? problem?.message ?? response.statusText);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
