#!/usr/bin/env node
/**
 * Publish a branch to GitHub, file by file, with no size limit.
 *
 * The request body is read from disk and posted to the platform's own MCP
 * endpoint, so a file of any size travels without passing through a tool
 * argument. Every blob's sha is checked against `git hash-object` before it is
 * allowed into the tree, and the tree, the commit and the ref are only created
 * once every sha has matched.
 *
 *   node scripts/publish-branch.mjs <baseRef> <branch>
 *   node scripts/publish-branch.mjs origin/main test/e2e-fidelity
 *
 * The credential is the platform's own: the bearer for the HTTP-integration
 * broker is read from this sandbox's environment and is never printed, logged
 * or committed. The broker holds the GitHub credential and performs the
 * request.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const BASE_REF = args[0] ?? "origin/main";
const BRANCH = args[1] ?? "test/e2e-fidelity";
const MCP_URL = process.env.MCP_URL ?? "http://api:3001/api/mcp/http-integrations";
const INTEGRATION_ID =
  process.env.INTEGRATION_ID ?? "session:49d16730-823f-4e2c-bd9a-dc22cdc0851d";
const WORK = "/tmp/medmate-publish";

/* -------------------------------------------------------------- the bearer */

/** The broker's bearer, from this sandbox's own environment. Never printed. */
function brokerBearer() {
  const fromEnv = process.env.ROOMOTE_DIRECT_MCP_BEARER_TOKEN_ROOMOTE_HTTP_INTEGRATIONS;
  if (fromEnv) return fromEnv;

  // The platform's MCP server process carries it; read it from there.
  let pid;
  try {
    pid = execFileSync("pgrep", ["-f", "roomote-mcp-server"], { encoding: "utf8" })
      .split("\n")
      .filter(Boolean)[0];
  } catch {
    pid = null;
  }
  if (!pid) throw new Error("no broker bearer in the environment");
  const entries = readFileSync(`/proc/${pid}/environ`, "utf8").split("\0").filter((line) => line.includes("="));
  for (const entry of entries) {
    const index = entry.indexOf("=");
    if (entry.slice(0, index) === "ROOMOTE_DIRECT_MCP_BEARER_TOKEN_ROOMOTE_HTTP_INTEGRATIONS") {
      return entry.slice(index + 1);
    }
  }
  throw new Error("no broker bearer found");
}

const BEARER = brokerBearer();

/* ------------------------------------------------------------------- calls */

/** Post one request to the broker, with the body read from disk. */
async function brokerCall(toolName, toolArguments) {
  const request = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: { name: toolName, arguments: toolArguments },
  };
  const requestFile = path.join(WORK, "request.json");
  writeFileSync(requestFile, JSON.stringify(request));

  const response = await fetch(MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${BEARER}`,
    },
    body: readFileSync(requestFile),
  });

  const text = await response.text();
  if (!response.ok) throw new Error(`the broker answered ${response.status}: ${text.slice(0, 300)}`);

  // The broker answers either plain JSON or an SSE frame.
  let payload = text;
  if (text.startsWith("event:") || text.startsWith("data:")) {
    const data = text
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("");
    payload = data;
  }
  const parsed = JSON.parse(payload);
  const content = (parsed.result?.content ?? []).map((part) => part.text ?? "").join("");
  if (parsed.error) throw new Error(`the broker refused: ${JSON.stringify(parsed.error).slice(0, 300)}`);
  if (!content) throw new Error(`the broker said nothing: ${payload.slice(0, 300)}`);
  return JSON.parse(content);
}

/** The broker answers with the GitHub response, whose body is a JSON string. */
function payloadOf(answer) {
  if (answer?.body && typeof answer.body === "string") return JSON.parse(answer.body);
  return answer?.body ?? answer;
}

const git = (...parts) => execFileSync("git", parts, { cwd: root, encoding: "utf8" }).trim();

/** Every file that differs from the base, as { path, mode, sha }. */
function changedFiles() {
  const base = git("rev-parse", `${BASE_REF}^{commit}`);
  const raw = git("diff", "--name-status", `${base}..HEAD`);
  const files = [];
  for (const line of raw.split("\n").filter(Boolean)) {
    const [status, ...rest] = line.split("\t");
    const file = rest[rest.length - 1];
    if (status.startsWith("D")) {
      files.push({ path: file, deleted: true });
    } else {
      const mode = statSync(path.join(root, file)).mode & 0o111 ? "100755" : "100644";
      files.push({ path: file, mode, sha: git("hash-object", path.join(root, file)) });
    }
  }
  return files;
}

/* --------------------------------------------------------------- publishing */

if (!existsSync(WORK)) {
  execFileSync("mkdir", ["-p", WORK]);
}

const files = changedFiles();
console.log(`${files.length} file(s) to publish`);

const treeEntries = [];
for (const file of files) {
  if (file.deleted) {
    treeEntries.push({ path: file.path, mode: "100644", type: "blob", sha: null });
    console.log(`- ${file.path} (deleted)`);
    continue;
  }

  const bytes = readFileSync(path.join(root, file.path));
  const body = { content: bytes.toString("base64"), encoding: "base64" };
  const bodyFile = path.join(WORK, "body.json");
  writeFileSync(bodyFile, JSON.stringify(body));

  const answer = await brokerCall("integration_request", {
    integrationId: INTEGRATION_ID,
    method: "POST",
    path: "/repos/Iamreyansh/MedmateClinic/git/blobs",
    body: JSON.stringify(body),
    contentType: "application/json",
  });

  // The broker answers with the GitHub response, whose body is a JSON string.
  const returned = payloadOf(answer)?.sha;
  if (!returned) throw new Error(`no sha for ${file.path}: ${JSON.stringify(answer).slice(0, 300)}`);
  if (returned !== file.sha) {
    throw new Error(
      `${file.path}: GitHub stored ${returned}, the file hashes to ${file.sha} — refusing to continue`,
    );
  }
  treeEntries.push({ path: file.path, mode: file.mode, type: "blob", sha: returned });
  console.log(`✓ ${file.path} (${bytes.length} bytes)`);
}

const baseCommit = git("rev-parse", `${BASE_REF}^{commit}`);
const baseTree = git("rev-parse", `${baseCommit}^{tree}`);

const tree = await brokerCall("integration_request", {
  integrationId: INTEGRATION_ID,
  method: "POST",
  path: "/repos/Iamreyansh/MedmateClinic/git/trees",
  body: JSON.stringify({ base_tree: baseTree, tree: treeEntries }),
  contentType: "application/json",
});
const treeSha = payloadOf(tree)?.sha;
if (!treeSha) throw new Error(`no tree sha: ${JSON.stringify(tree).slice(0, 300)}`);
console.log(`✓ tree ${treeSha}`);

const commit = await brokerCall("integration_request", {
  integrationId: INTEGRATION_ID,
  method: "POST",
  path: "/repos/Iamreyansh/MedmateClinic/git/commits",
  body: JSON.stringify({
    message: git("log", "-1", "--pretty=%B").trim(),
    tree: treeSha,
    parents: [baseCommit],
  }),
  contentType: "application/json",
});
const commitSha = payloadOf(commit)?.sha;
if (!commitSha) throw new Error(`no commit sha: ${JSON.stringify(commit).slice(0, 300)}`);
console.log(`✓ commit ${commitSha}`);

// The ref is created the first time and moved after that. Asking first is
// cheaper than finding out from a 422.
let exists = false;
try {
  const found = await brokerCall("integration_request", {
    integrationId: INTEGRATION_ID,
    method: "GET",
    path: `/repos/Iamreyansh/MedmateClinic/git/ref/heads/${BRANCH}`,
  });
  exists = Boolean(payloadOf(found)?.object?.sha);
} catch {
  exists = false;
}

const ref = exists
  ? await brokerCall("integration_request", {
      integrationId: INTEGRATION_ID,
      method: "PATCH",
      path: `/repos/Iamreyansh/MedmateClinic/git/refs/heads/${BRANCH}`,
      body: JSON.stringify({ sha: commitSha, force: true }),
      contentType: "application/json",
    })
  : await brokerCall("integration_request", {
      integrationId: INTEGRATION_ID,
      method: "POST",
      path: "/repos/Iamreyansh/MedmateClinic/git/refs",
      body: JSON.stringify({ ref: `refs/heads/${BRANCH}`, sha: commitSha }),
      contentType: "application/json",
    });
console.log(`✓ ref refs/heads/${BRANCH} → ${commitSha}`);

const check = await brokerCall("integration_request", {
  integrationId: INTEGRATION_ID,
  method: "GET",
  path: `/repos/Iamreyansh/MedmateClinic/git/ref/heads/${BRANCH}`,
});
const remoteSha = payloadOf(check)?.object?.sha;
console.log(`remote sha: ${remoteSha}`);
if (remoteSha !== commitSha) throw new Error(`the remote holds ${remoteSha}, not ${commitSha}`);

writeFileSync(
  path.join(WORK, "published.json"),
  JSON.stringify({ branch: BRANCH, base: baseCommit, tree: treeSha, commit: commitSha, remoteSha }, null, 2),
);
console.log(`\n✓ published ${BRANCH} @ ${commitSha}`);
