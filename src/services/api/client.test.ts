import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, request } from "@/services/api/client";

/**
 * The client's failure handling.
 *
 * The service answers in JSON, and when it does not — a dev server's
 * fallback, a proxy's page — the body must not be parsed as JSON. A clinician
 * reads what the app says, and what the app says is never a parser's
 * complaint.
 */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const html = (status = 200) =>
  new Response("<!doctype html><html><body>Vite</body></html>", {
    status,
    headers: { "content-type": "text/html" },
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the API client", () => {
  it("reads a JSON answer", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ sent: true })));
    await expect(request<{ sent: boolean }>("/auth/otp")).resolves.toEqual({ sent: true });
  });

  it("writes the written line for a 404 from the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json({ title: "Not found", detail: "That route is not here." }, 404)),
    );

    await expect(request("/clinic/nothing")).rejects.toMatchObject({
      status: 404,
      kind: "api",
      message: "That route is not here.",
    });
  });

  it("never shows a parser's complaint when the body is not JSON", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => html(404)));

    const failure = await request("/clinic/nothing").catch((reason: unknown) => reason);
    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as ApiError).kind).toBe("service");
    expect((failure as ApiError).message).not.toMatch(/JSON|Unexpected token/i);
    expect((failure as ApiError).message).toMatch(/Could not reach the clinic service/i);
  });

  it("says the service is missing when a successful answer is not JSON", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => html(200)));

    const failure = await request("/clinic/desk").catch((reason: unknown) => reason);
    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as ApiError).kind).toBe("service");
  });

  it("does not show the framework's own words", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        json(
          {
            title: "Not Found",
            detail: "No static resource api/clinic/inbox.",
          },
          404,
        ),
      ),
    );

    const failure = await request("/clinic/inbox").catch((reason: unknown) => reason);
    expect((failure as ApiError).message).not.toMatch(/No static resource/i);
    expect((failure as ApiError).message).toMatch(/not available yet/i);
  });

  it("still shows a sentence that happens to contain the word exception", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        json({ title: "Check", detail: "The allergy exception noted in 2024 needs a review." }, 422),
      ),
    );

    const failure = await request("/clinic/visits/vs_kavya/consult").catch(
      (reason: unknown) => reason,
    );
    expect((failure as ApiError).message).toMatch(/exception noted/i);
  });

  it("reports a service that cannot be reached at all", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );

    const failure = await request("/clinic/desk").catch((reason: unknown) => reason);
    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as ApiError).kind).toBe("service");
    expect((failure as ApiError).message).not.toMatch(/Failed to fetch/i);
  });
});
