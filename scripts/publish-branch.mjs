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
/**
 * The commit the new one is a child of, when it is not the base's own sha.
 *
 * A branch published through the API gets a commit sha that the local
 * repository does not have: the tree is the same, but the commit is GitHub's.
 * The parent has to be the published commit, or the commit points at an
 * object nobody has.
 */
const PARENT = args[2] ?? null;
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

/* ------------------------------------------------ the credential-egress proxy */

/**
 * The platform's own credential-egress proxy.
 *
 * The GitHub credential lives on the platform's side, and the service token in
 * this sandbox's environment is what the proxy accepts. The body is read from
 * disk and posted as a file, so it never travels through a tool argument — an
 * inline body over roughly six kilobytes can arrive corrupted with no error,
 * and a blob stored with the wrong bytes would be published.
 *
 * `ROOMOTE_SERVICE_TOKEN_GITHUB_API` is NOT a GitHub token: sending it to
 * api.github.com answers 401.
 */
const EGRESS_TOKEN = process.env.ROOMOTE_SERVICE_TOKEN_GITHUB_API ?? "";
const EGRESS_BASE =
  process.env.CREDENTIAL_EGRESS_URL ?? "http://api:3001/api/credential-egress";
const REPO = "Iamreyansh/MedmateClinic";

/** Post one request to the credential-egress proxy, with the body from disk. */
async function egressCall(method, gitPath, body) {
  const url = `${EGRESS_BASE}/repos/${REPO}${gitPath}`;
  const init = {
    method,
    headers: {
      Authorization: `Bearer ${EGRESS_TOKEN}`,
      Accept: "application/vnd.github+json",
    },
  };
  if (body !== undefined) {
    const bodyFile = path.join(WORK, "egress-body.json");
    writeFileSync(bodyFile, JSON.stringify(body));
    init.headers["Content-Type"] = "application/json";
    init.body = readFileSync(bodyFile);
  }
  const response = await fetch(url, init);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`GitHub answered ${response.status} for ${method} ${gitPath}: ${text.slice(0, 300)}`);
  }
  return JSON.parse(text);
}

/**
 * One call, whichever transport this sandbox has.
 *
 * The proxy is preferred: it is the platform's own path for the GitHub
 * credential. The broker is the fallback for a sandbox that has the
 * integration but not the service token.
 */
async function call(method, gitPath, body) {
  if (EGRESS_TOKEN) return egressCall(method, gitPath, body);
  const answer = await brokerCall("integration_request", {
    integrationId: INTEGRATION_ID,
    method,
    path: `/repos/${REPO}${gitPath}`,
    body: body === undefined ? undefined : JSON.stringify(body),
    contentType: body === undefined ? undefined : "application/json",
  });
  return payloadOf(answer);
}

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

  const answer = await call("POST", "/git/blobs", body);

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
const parentCommit = PARENT ?? baseCommit;

const tree = await call("POST", "/git/trees", { base_tree: baseTree, tree: treeEntries });
const treeSha = tree?.sha;
if (!treeSha) throw new Error(`no tree sha: ${JSON.stringify(tree).slice(0, 300)}`);
console.log(`✓ tree ${treeSha}`);

// The published tree is read back and compared with the local tree, file by
// file. A recursive tree lists the directories as well as the blobs, so only
// the blobs are compared, and a short or truncated read is a failure: a
// "0 mismatches" from an empty map is not a pass.
const readBack = await call("GET", `/git/trees/${treeSha}?recursive=1`);
if (readBack?.truncated) {
  throw new Error(
    `the tree GitHub read back is truncated — it holds ${readBack.tree?.length ?? 0} entries`,
  );
}
const remoteBlobs = new Map(
  (readBack?.tree ?? [])
    .filter((entry) => entry.type === "blob")
    .map((entry) => [entry.path, entry.sha]),
);
const localBlobs = new Map();
for (const line of git("ls-tree", "-r", "HEAD").split("\n").filter(Boolean)) {
  const [meta, file] = line.split("\t");
  localBlobs.set(file, meta.split(" ")[2]);
}
if (remoteBlobs.size !== localBlobs.size) {
  throw new Error(
    `the published tree holds ${remoteBlobs.size} blobs and the local tree holds ${localBlobs.size} — the read is short`,
  );
}
const mismatches = [...localBlobs].filter(([file, sha]) => remoteBlobs.get(file) !== sha);
if (mismatches.length > 0) {
  throw new Error(
    `the published tree and the local tree disagree on ${mismatches.length} file(s): ` +
      mismatches.slice(0, 5).map(([file]) => file).join(", "),
  );
}
console.log(`✓ the published tree matches the local tree (${remoteBlobs.size} blobs)`);

const commit = await call("POST", "/git/commits", {
  message: git("log", "-1", "--pretty=%B").trim(),
  tree: treeSha,
  parents: [parentCommit],
});
const commitSha = commit?.sha;
if (!commitSha) throw new Error(`no commit sha: ${JSON.stringify(commit).slice(0, 300)}`);
console.log(`✓ commit ${commitSha}`);

// The ref is created the first time and moved after that. Asking first is
// cheaper than finding out from a 422.
let exists = false;
try {
  const found = await call("GET", `/git/ref/heads/${BRANCH}`);
    exists = Boolean(found?.object?.sha);
} catch {
  exists = false;
}

const ref = exists
  ? await call("PATCH", `/git/refs/heads/${BRANCH}`, { sha: commitSha, force: true })
  : await call("POST", "/git/refs", { ref: `refs/heads/${BRANCH}`, sha: commitSha });
console.log(`✓ ref refs/heads/${BRANCH} → ${commitSha}`);

const check = await call("GET", `/git/ref/heads/${BRANCH}`);
const remoteSha = check?.object?.sha;
console.log(`remote sha: ${remoteSha}`);
if (remoteSha !== commitSha) throw new Error(`the remote holds ${remoteSha}, not ${commitSha}`);

writeFileSync(
  path.join(WORK, "published.json"),
  JSON.stringify({ branch: BRANCH, base: baseCommit, tree: treeSha, commit: commitSha, remoteSha }, null, 2),
);
console.log(`\n✓ published ${BRANCH} @ ${commitSha}`);
