#!/usr/bin/env python3
"""Check the files this delivery changed, from disk.

Each changed file is read as bytes and checked three ways:

  1. no redaction marker anywhere in it;
  2. every string that must be there is there;
  3. every string that must not be there is not there.

Only PASS and FAIL are printed, one line per file and one line for the
sweep.

WHY THE MARKER IS CHECKED AT ALL
-------------------------------
A platform defect was confirmed in this session: the console-output
redaction filter rewrites a trigger word inside tool-call ARGUMENTS, so a
string literal was silently replaced with the literal text "[redacted]" on
its way to disk and broke a TypeScript parse. The defect is path-specific,
not universal:

  SAFE    writing a file with bash printf, or with the file-write tool —
          the bytes on disk were verified to be intact;
  RISKY   a string literal inside an EDIT tool's old/new-string arguments —
          that is where the corruption was seen.

How it is detected:

  * the fixed-string sweep below, `grep -rnF "[redacted]"`, over the whole
    worktree. The `-F` matters: without it the bracket is a CHARACTER
    CLASS and the pattern matches the bare word "redacted" anywhere, which
    is how the first sweep reported a false positive in its own check
    rather than in the worktree;
  * the bare-word sweep as well, which is the stronger of the two — it
    catches a corruption that lost its brackets;
  * a parse check: `tsc --noEmit` and the build fail loudly on a file that
    was corrupted, and a brace-balance or base64 round-trip tells you
    whether the bytes on disk are what you meant to write.

A check that reports problems it does not have is how people learn to
ignore checks, so the sweep is the fixed-string form and the bare-word
form is run beside it.
"""
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

MARKER = "[redacted]"
BARE_WORD = "redacted"

# --- the files this delivery changed, and what each one must hold ----------
# The strings are the claims the delivery makes. A string that must not be
# there is a claim that a drift has been closed.
SPEC = {
    "eslint.config.mjs": {
        "contains": ['["feature", { feature: "${from.feature}" }]'],
        "absent": ['store", "${to.feature}"'],
        "why": "the boundaries rule compares the captured values, not the type",
    },
    "src/services/api/mock/patientWebRoutes.ts": {
        "contains": ["prescription.verifyToken", "verifyUrlFor(prescription)"],
        "absent": ["verifyTokenFor", "visit?.token ?? linkKey"],
        "why": "the mock keeps a stored secret and never leaks the link key",
    },
    "src/services/api/mock/contract.test.ts": {
        "contains": [
            "Slot no longer available",
            '["waiting", "in_consult", "done", "no_show"]',
            "a rebook never carries the link key",
        ],
        "absent": [],
        "why": "the contract pins the service's own vocabulary",
    },
    "src/services/api/contract.test.ts": {
        "contains": ["every path the service declares", "/clinic/admin/members"],
        "absent": [],
        "why": "the service's controllers are read out of the tree",
    },
    "src/services/api/mock/billingRoutes.ts": {
        "contains": ['"to_collect", "unpaid", "paid", "refunded"', "That is not a bill status."],
        "absent": [],
        "why": "the till takes the statuses the service takes",
    },
    "src/services/api/mock/clinicClock.ts": {
        "contains": ["export function clinicInstant", "export function clinicLocal"],
        "absent": [],
        "why": "the mock's instants are true instants",
    },
    "backend/src/main/resources/db/demo/V303__demo_lab_and_templates.sql": {
        "contains": ["'Room 2'", "'Room 3'", "'Room 1'"],
        "absent": ["do $$"],
        "why": "the demo rooms live in the demo script, as plain statements",
    },
    "backend/src/main/java/com/medmate/clinic/admin/pharmacy/AdminPharmacyController.java": {
        "contains": ['@RequestMapping("/api/clinic/admin/pharmacies")'],
        "absent": [],
        "why": "the service declares the paths the mock answered",
    },
    "src/features/patients/types.ts": {
        "contains": ["joinedOn?: string"],
        "absent": ["joinedOn: string"],
        "why": "no screen reads it and the service need not send it",
    },
    "src/features/queue/types.ts": {
        "contains": ['"waiting" | "in_consult" | "done" | "no_show"'],
        "absent": [],
        "why": "the console's tabs slice on the service's own words",
    },
    "src/features/lab/types.ts": {
        "contains": ['"ordered"'],
        "absent": [],
        "why": "the bench counts the orders that are not collected yet",
    },
    "src/app/routes/index.tsx": {
        "contains": ["...patientRoutes", "...mobileRoutes", 'path: "/legal/:document"'],
        "absent": ["PlaceholderScreen"],
        "why": "one registration per wave, and a public legal document",
    },
}


def sweep() -> list[str]:
    """The whole worktree, twice: the marker as a fixed string, and the word."""
    exclude = ["--exclude-dir=node_modules", "--exclude-dir=.git", "--exclude-dir=dist",
               "--exclude-dir=target", "--exclude-dir=.roomote-runtime-home",
               # The checkers name the marker to look for it, so they are the
               # one thing the sweep cannot sweep. Every other file in the
               # worktree is.
               "--exclude=verify-writes.py", "--exclude=verify-docs.py"]
    fixed = subprocess.run(
        ["grep", "-rnF", MARKER, *exclude, "."],
        cwd=ROOT, capture_output=True, text=True,
    )
    bare = subprocess.run(
        ["grep", "-rn", BARE_WORD, *exclude, "."],
        cwd=ROOT, capture_output=True, text=True,
    )
    return [line for line in (fixed.stdout + bare.stdout).split("\n") if line.strip()]


def main() -> int:
    failures = 0

    for name, rules in SPEC.items():
        path = ROOT / name
        if not path.exists():
            print(f"FAIL {name} — the file is not there")
            failures += 1
            continue
        text = path.read_bytes().decode("utf-8", errors="replace")
        problems = []
        if MARKER in text or BARE_WORD in text:
            problems.append("the redaction marker is in it")
        for needle in rules.get("contains", []):
            if needle not in text:
                problems.append(f"missing: {needle}")
        for needle in rules.get("absent", []):
            if needle in text:
                problems.append(f"should not be there: {needle}")
        if problems:
            failures += 1
            print(f"FAIL {name} — {rules['why']}")
            for problem in problems:
                print(f"     {problem}")
        else:
            print(f"PASS {name} — {rules['why']}")

    hits = sweep()
    if hits:
        failures += 1
        print(f"FAIL the worktree sweep — {len(hits)} hit(s)")
        for hit in hits[:20]:
            print(f"     {hit}")
    else:
        print("PASS the worktree sweep — no marker, and not the bare word either")

    print("FAIL" if failures else "PASS")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
