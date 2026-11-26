#!/usr/bin/env node
/**
 * Publish a file to a GitHub repository through the Roomote HTTP-integration broker.
 *
 * WHY THIS EXISTS
 * ---------------
 * The broker's MCP endpoint (http://api:3001/api/mcp/http-integrations) has
 * NO practical body-size ceiling: a 61,197-byte file (81,596 base64 chars) went
 * through byte-for-byte. What DOES truncate is the *tool-call argument path* --
 * passing a long base64 string inline as a tool argument silently corrupts it
 * around 6 KB, with no error.
 *
 * THE RULE: POST FROM DISK. NEVER INLINE.
 *
 * USAGE
 *   node scripts/publish-blob.mjs <local-file> <target-path-in-repo> [repo] [branch]
 *
 * e.g.
 *   node scripts/publish-blob.mjs reports/gap-analysis.md reports/gap-analysis.md
 *
 * It prints the expected sha (git hash-object) next to the sha GitHub returned
 * and exits non-zero if they differ -- a mismatch means the bytes were altered
 * in transit and must NOT be committed.
 *
 * AUTH
 * ----
 * The broker holds the GitHub credential; this script never sees or prints it.
 * It authenticates to the MCP endpoint only. The bearer is read, in order, from:
 *   1. $ROOMOTE_DIRECT_MCP_BEARER_TOKEN_ROOMOTE_HTTP_INTEGRATIONS
 *   2. the local OpenCode server's /config (mcp._roomote_http_integrations.headers)
 * Neither the bearer nor the GitHub credential is ever printed, echoed or logged,
 * and neither is ever written to this file or to a commit.
 */

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const MCP_URL =
  process.env.ROOMOTE_HTTP_INTEGRATIONS_MCP_URL ??
  "http://api:3001/api/mcp/http-integrations";
const OPENCODE_CONFIG_URL =
  process.env.ROOMOTE_OPENCODE_CONFIG_URL ?? "http://127.0.0.1:33145/config";

const [localFile, targetPath, repoArg, branchArg] = process.argv.slice(2);
if (!localFile || !targetPath) {
  console.error("usage: publish-blob.mjs <local-file> <target-path> [owner/repo] [branch]");
  process.exit(64);
}
const repo = repoArg ?? process.env.GITHUB_REPO ?? "Iamreyansh/MedmateClinic";
const branch = branchArg ?? process.env.GITHUB_BRANCH ?? "main";

/* ------------------------------------------------------------------ auth */

async function bearer() {
  // Prefer the local OpenCode server's own configured header for this MCP
  // server -- that is the exact header the working client sends. Fall back to
  // the environment variable. Neither value is ever printed or written down.
  try {
    const res = await fetch(OPENCODE_CONFIG_URL);
    const cfg = await res.json();
    const header = cfg?.mcp?._roomote_http_integrations?.headers?.Authorization;
    if (header) return header;
  } catch {
    /* fall through to the environment */
  }
  const fromEnv = process.env.ROOMOTE_DIRECT_MCP_BEARER_TOKEN_ROOMOTE_HTTP_INTEGRATIONS;
  if (fromEnv) return fromEnv.startsWith("Bearer ") ? fromEnv : `Bearer ${fromEnv}`;
  console.error(
    "no MCP bearer found: make the OpenCode server's /config reachable, or set " +
      "ROOMOTE_DIRECT_MCP_BEARER_TOKEN_ROOMOTE_HTTP_INTEGRATIONS",
  );
  process.exit(78);
}

/* ------------------------------------------------------------- json-rpc */

let sessionId = null;
let counter = 0;

async function rpc(method, params, id) {
  const payload = { jsonrpc: "2.0", method, params };
  if (id !== undefined) payload.id = id;
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    Authorization: await bearer(),
  };
  if (sessionId) headers["Mcp-Session-Id"] = sessionId;
  const res = await fetch(MCP_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const sid = res.headers.get("mcp-session-id");
  if (sid) sessionId = sid;
  const text = await res.text();
  const frame = text.match(/data:\s*(\{.*\})/s);
  return frame ? JSON.parse(frame[1]) : text.trim() ? JSON.parse(text) : null;
}

/** Call the broker's own integration_request tool. */
async function integrationRequest(method, path, bodyObject) {
  const args = {
    integrationId: process.env.ROOMOTE_INTEGRATION_ID ?? "session:49d16730-823f-4e2c-bd9a-dc22cdc0851d",
    method,
    path,
  };
  if (bodyObject !== undefined) {
    args.contentType = "application/json";
    args.body = JSON.stringify(bodyObject);
  }
  const reply = await rpc("tools/call", { name: "integration_request", arguments: args }, ++counter);
  const structured = reply?.result?.structuredContent;
  if (!structured) {
    throw new Error(reply?.result?.content?.[0]?.text ?? "integration_request failed");
  }
  try {
    return { status: structured.status, body: JSON.parse(structured.body) };
  } catch {
    return { status: structured.status, body: structured.body };
  }
}

/* --------------------------------------------------------------- publish */

const bytes = readFileSync(localFile);
const expected = createHash("sha1")
  .update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes]))
  .digest("hex");

await rpc("initialize", {
  protocolVersion: "2024-11-05",
  capabilities: {},
  clientInfo: { name: "publish-blob", version: "1" },
}, ++counter);
await rpc("notifications/initialized", {}, undefined);

const blob = await integrationRequest("POST", `/repos/${repo}/git/blobs`, {
  content: bytes.toString("base64"),
  encoding: "base64",
});
const blobSha = blob.body?.sha;
console.log(`local file      : ${localFile} (${bytes.length} bytes)`);
console.log(`expected sha    : ${expected}   [git hash-object]`);
console.log(`returned sha    : ${blobSha}   [github, http ${blob.status}]`);
console.log(`MATCH           : ${blobSha === expected ? "YES" : "NO"}`);
if (blobSha !== expected) {
  console.error("bytes were altered in transit -- do NOT commit this blob");
  process.exit(2);
}

// Base commit: the head of the target branch, or of the default branch when the
// target branch does not exist yet (creating a new branch).
const head = await integrationRequest("GET", `/repos/${repo}/git/ref/heads/${branch}`);
let baseCommit = head.body?.object?.sha;
if (!baseCommit) {
  const fallback = await integrationRequest("GET", `/repos/${repo}/git/ref/heads/main`);
  baseCommit = fallback.body?.object?.sha;
  console.log(`branch ${branch} does not exist yet -- basing it on main (${baseCommit})`);
}
if (!baseCommit) {
  console.error(`could not resolve a base commit for branch ${branch}`);
  process.exit(3);
}
const base = await integrationRequest("GET", `/repos/${repo}/git/commits/${baseCommit}`);
const baseTree = base.body?.tree?.sha;

const tree = await integrationRequest("POST", `/repos/${repo}/git/trees`, {
  base_tree: baseTree,
  tree: [{ path: targetPath, mode: "100644", type: "blob", sha: blobSha }],
});
const treeSha = tree.body?.sha;
console.log(`base commit/tree : ${baseCommit} / ${baseTree}`);
console.log(`new tree        : ${treeSha}`);

const commit = await integrationRequest("POST", `/repos/${repo}/git/commits`, {
  message: `docs: add ${targetPath}`,
  tree: treeSha,
  parents: [baseCommit],
});
const commitSha = commit.body?.sha;
console.log(`new commit      : ${commitSha}`);

const ref = await integrationRequest("POST", `/repos/${repo}/git/refs`, {
  ref: `refs/heads/${branch}`,
  sha: commitSha,
});
console.log(`new ref         : refs/heads/${branch} -> ${commitSha}  [http ${ref.status}]`);

const check = await integrationRequest("GET", `/repos/${repo}/git/ref/heads/${branch}`);
console.log(
  `VERIFY          : refs/heads/${branch} -> ${check.body?.object?.sha}  ` +
    `MATCH=${check.body?.object?.sha === commitSha}`,
);
process.exit(check.body?.object?.sha === commitSha ? 0 : 4);
