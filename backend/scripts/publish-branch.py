#!/usr/bin/env python3
"""Publish the branch through the GitHub REST API, reading every body from disk.

The body of each request is assembled into a file and posted from that file, so
it never passes through a tool argument. Every blob's returned sha is compared
with git hash-object before the tree is built.
"""

import base64
import json
import os
import pathlib
import subprocess
import sys
import urllib.request

MCP = os.environ.get("ROOMOTE_MCP_URL", "http://api:3001/api/mcp/http-integrations")
TOKEN = os.environ["ROOMOTE_DIRECT_MCP_BEARER_TOKEN_ROOMOTE_HTTP_INTEGRATIONS"]
INTEGRATION = "session:49d16730-823f-4e2c-bd9a-dc22cdc0851d"
REPO = "Iamreyansh/MedmateClinic"
BASE = "1d3d0292b3bd6bf83da769618f8e4672cc428172"
BASE_TREE = None

ROOT = pathlib.Path("/home/medmate/roomote-apps/MedmateClinic")
WORK = pathlib.Path("/tmp/publish")


def call(payload):
    """One MCP tool call. The request is written to disk and posted from disk."""
    WORK.mkdir(parents=True, exist_ok=True)
    req = WORK / "request.json"
    req.write_text(json.dumps(payload))
    data = req.read_bytes()
    request = urllib.request.Request(
        MCP,
        data=data,
        method="POST",
        headers={
            "Authorization": "Bearer " + TOKEN,
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
        },
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        raw = response.read().decode("utf-8")
    raw = raw.strip()
    if raw.startswith("event:") or raw.startswith("data:"):
        for line in raw.splitlines():
            if line.startswith("data:"):
                raw = line[5:].strip()
                break
    return json.loads(raw)


def integration(method, path, body=None, content_type=None):
    args = {
        "integrationId": INTEGRATION,
        "method": method,
        "path": path,
    }
    if body is not None:
        args["body"] = body
    if content_type is not None:
        args["contentType"] = content_type
    answer = call(
        {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {"name": "integration_request", "arguments": args},
        }
    )
    if "error" in answer:
        raise RuntimeError("mcp error: " + json.dumps(answer["error"])[:300])
    text = answer["result"]["content"][0]["text"]
    payload = json.loads(text)
    return payload


def blob(path, content):
    return integration(
        "POST",
        "/repos/" + REPO + "/git/blobs",
        json.dumps({"content": content, "encoding": "base64"}),
        "application/json",
    )


def git(*args):
    return subprocess.run(
        ["git", "-C", str(ROOT), *args], capture_output=True, text=True, check=True
    ).stdout.strip()


def main():
    changed = [
        line
        for line in git("diff", "--name-only", BASE + "..HEAD").splitlines()
        if line.strip()
    ]
    print("changed files:", len(changed))

    entries = []
    for name in changed:
        local = ROOT / name
        if not local.exists():
            print("  deleted:", name)
            entries.append({"path": name, "mode": "100644", "type": "blob", "sha": None})
            continue
        expected = git("hash-object", name)
        raw = local.read_bytes()
        content = base64.b64encode(raw).decode("ascii")
        for attempt in range(1, 4):
            answer = blob(name, content)
            got = json.loads(answer["body"])["sha"]
            if got == expected:
                print("  ok  ", name, got[:12])
                break
            print("  retry", name, "want", expected[:12], "got", got[:12])
        else:
            raise SystemExit("could not publish " + name)
        entries.append({"path": name, "mode": "100644", "type": "blob", "sha": expected})

    tree = integration(
        "POST",
        "/repos/" + REPO + "/git/trees",
        json.dumps({"base_tree": git("rev-parse", BASE + "^{tree}"), "tree": entries}),
        "application/json",
    )
    tree_sha = json.loads(tree["body"])["sha"]
    print("tree:", tree_sha)

    message = "MedMate Clinic: fix the backend contract, the crashes and the missing routes\n\n" + "\n".join(
        "  " + line
        for line in git("log", "--format=%h %s", BASE + "..HEAD").splitlines()
    )
    commit = integration(
        "POST",
        "/repos/" + REPO + "/git/commits",
        json.dumps(
            {
                "message": message,
                "tree": tree_sha,
                "parents": [BASE],
            }
        ),
        "application/json",
    )
    commit_sha = json.loads(commit["body"])["sha"]
    print("commit:", commit_sha)

    ref = integration(
        "POST",
        "/repos/" + REPO + "/git/refs",
        json.dumps({"ref": "refs/heads/fix/backend", "sha": commit_sha}),
        "application/json",
    )
    print("ref:", json.loads(ref["body"])["ref"], commit_sha)

    verify = integration("GET", "/repos/" + REPO + "/git/ref/heads/fix/backend")
    print("verify ref:", verify["body"])
    pathlib.Path("/tmp/publish/result.json").write_text(
        json.dumps({"commit": commit_sha, "tree": tree_sha, "files": len(entries)}, indent=1)
    )


if __name__ == "__main__":
    main()
