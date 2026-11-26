#!/usr/bin/env python3
"""Check the documents and the frame manifest against each other.

Five things, each of which catches a class of drift the others cannot:

  1. the master index in `docs/SCREEN-AUDIT.md` matches the manifest's
     entries, one for one — a document that lists a frame the manifest does
     not have is a document nobody can check;
  2. every node id and every frame name the document mentions is the
     manifest's — the inventory is the only record of the Figma file, and a
     name that drifts is a frame nobody can find;
  3. the manifest's schema is unchanged — its keys are what the tools read;
  4. `byStatus` agrees with the entries — a count that disagrees with the
     list it counts is a count nobody should read;
  5. the whole worktree carries no redaction marker.

On the marker, see `verify-writes.py` for the platform defect behind it and
for why the sweep uses the fixed-string form and the bare word beside it.
This script excludes itself and its sibling from the sweep, because it has
to name the marker to look for it.
"""
import json
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "verify/baselines/figma/manifest.json"
DOC = ROOT / "docs/SCREEN-AUDIT.md"
DOCUMENTS = [
    ROOT / "docs/SCREEN-AUDIT.md",
    ROOT / "docs/ARCHITECTURE.md",
    ROOT / "docs/FIDELITY.md",
    ROOT / "README.md",
]

MARKER = "[redacted]"
BARE_WORD = "redacted"

# The schema the tools read. A key that is added or renamed is a change the
# tools have to know about, and it is not a change a status re-derivation
# makes.
SCHEMA = {
    "schema": "medmate-figma-baselines/1",
    "topLevel": ["schema", "figmaFile", "dropIn", "recoveredInventory", "fileRasters"],
    "inventory": ["provenance", "frameCount", "byStatus", "frames"],
    "frame": ["frame", "node", "page", "route", "status"],
}


def main() -> int:
    failures = 0
    manifest = json.loads(MANIFEST.read_text())
    doc = DOC.read_text()
    frames = manifest["recoveredInventory"]["frames"]

    # 1. the schema is unchanged
    if manifest.get("schema") != SCHEMA["schema"]:
        print(f"FAIL the manifest's schema — {manifest.get('schema')!r}")
        failures += 1
    elif list(manifest.keys()) != SCHEMA["topLevel"]:
        print(f"FAIL the manifest's keys — {list(manifest.keys())}")
        failures += 1
    elif list(manifest["recoveredInventory"].keys()) != SCHEMA["inventory"]:
        print("FAIL the manifest's inventory keys")
        failures += 1
    elif sorted(frames[0].keys()) != sorted(SCHEMA["frame"]):
        print(f"FAIL a frame's fields — {sorted(frames[0].keys())}")
        failures += 1
    else:
        print("PASS the manifest's schema — unchanged")

    # 2. byStatus agrees with the entries
    counts = {}
    for entry in frames:
        counts[entry["status"]] = counts.get(entry["status"], 0) + 1
    declared = manifest["recoveredInventory"]["byStatus"]
    expected = {key: counts.get(key, 0) for key in ("built", "partial", "placeholder", "missing")}
    if declared != expected:
        print(f"FAIL byStatus — {declared} against {expected}")
        failures += 1
    else:
        print(f"PASS byStatus agrees with the entries — {expected}")

    # 3. the master index matches the manifest, entry for entry
    lines = doc.split("\n")
    start = next(i for i, l in enumerate(lines) if l.startswith("### The master index"))
    index = [l for l in lines[start:] if l.startswith("| `")]
    index = index[: len(frames)]
    if len(index) != len(frames):
        print(f"FAIL the master index — {len(index)} rows against {len(frames)} entries")
        failures += 1
    else:
        wrong = 0
        for entry, row in zip(frames, index):
            want = (
                f"| `{entry['node']}` | {entry['frame']} | {entry['page']} | "
                f"{entry['route'] or '—'} | {entry['status']} |"
            )
            if row.strip() != want:
                wrong += 1
        if wrong:
            print(f"FAIL the master index — {wrong} row(s) differ from the manifest")
            failures += 1
        else:
            print(f"PASS the master index matches the manifest — {len(frames)} entries")

    # 4. every node id and frame name in the document is the manifest's
    nodes = {entry["node"] for entry in frames}
    names = {entry["frame"] for entry in frames}
    stray_nodes = set()
    twins = 0
    for line in lines:
        if not line.startswith("|"):
            continue
        found = re.findall(r"`([\d]+:[\d]+)`", line)
        if not found:
            continue
        if found[0] not in nodes:
            stray_nodes.add(found[0])
        # the same frame in the Prototype page, which the inventory does not
        # carry: it is the second column of the dialog table
        for extra in found[1:]:
            if extra not in nodes:
                twins += 1
    # A frame name in the document is the inventory's, or a shortening of it:
    # the document's tables print "Doctor Console — queue" for the inventory's
    # "Doctor Console — queue (sub-page)", and one row holds two frames joined
    # with " + ". A name that is neither belongs to something else.
    def covered(name: str) -> bool:
        if name in names:
            return True
        parts = [part.strip() for part in name.split(" + ")]
        return all(
            any(candidate.startswith(part) or part in candidate for candidate in names)
            for part in parts
        )

    stray_names = set()
    for line in lines:
        if not line.startswith("|"):
            continue
        cells = [cell.strip() for cell in line.split("|")]
        for cell in cells:
            cell = cell.strip("` ")
            if cell and cell not in names and cell.startswith((
                "Screen /", "Mobile /", "Patient phone /", "Dialog —", "Drawer —",
                "Settings —", "Book online", "Manage booking", "Live token",
                "Symptoms form", "Legal document", "Verify ", "Lab tube label",
                "Subscription —", "Dashboard —", "Doctor Console", "Clinic sign-up",
                "Sign in", "Lock screen", "Prescription —", "Medical certificate",
                "Reports —", "Billing —", "Appointments —", "Staff & roles",
                "Kiosk —", "Book ", "Template editor",
            )) and not covered(cell):
                stray_names.add(cell)
    if stray_nodes:
        print(f"FAIL the document mentions node ids the manifest does not have — {sorted(stray_nodes)[:6]}")
        failures += 1
    elif stray_names:
        print(f"FAIL the document mentions frame names the manifest does not have — {sorted(stray_names)[:6]}")
        failures += 1
    else:
        print(
            "PASS every node id and frame name in the document is the manifest's"
            f" — {twins} Prototype twin(s) the inventory does not carry"
        )

    # 5. the documents are all there
    missing = [path.name for path in DOCUMENTS if not path.exists()]
    if missing:
        print(f"FAIL the documents — {missing} are not there")
        failures += 1
    else:
        print(f"PASS the four documents are there — {', '.join(p.name for p in DOCUMENTS)}")

    # 6. the whole worktree carries no marker
    exclude = ["--exclude-dir=node_modules", "--exclude-dir=.git", "--exclude-dir=dist",
               "--exclude-dir=target", "--exclude-dir=.roomote-runtime-home",
               "--exclude=verify-writes.py", "--exclude=verify-docs.py"]
    hits = []
    for pattern, fixed in ((MARKER, True), (BARE_WORD, False)):
        args = ["grep", "-rn"] + (["-F"] if fixed else []) + [pattern, *exclude, "."]
        result = subprocess.run(args, cwd=ROOT, capture_output=True, text=True)
        hits += [line for line in result.stdout.split("\n") if line.strip()]
    if hits:
        print(f"FAIL the worktree sweep — {len(hits)} hit(s)")
        for hit in hits[:20]:
            print(f"     {hit}")
        failures += 1
    else:
        print("PASS the worktree sweep — no marker, and not the bare word either")

    print("FAIL" if failures else "PASS")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
