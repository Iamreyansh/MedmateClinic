#!/usr/bin/env bash
#
# Materialise what the delivery published.
#
# Two kinds of entry:
#
#   <sha256>  <target path>  <part> [<part> …]  [gzip]
#       The parts are the file's bytes (or its gzip stream). They are joined
#       and the sha of the ORIGINAL bytes is checked.
#
#   <sha256>  bundle:<branch>  <part> [<part> …]  bundle
#       The parts are base64 chunks of a gzipped `git bundle`. They are
#       concatenated, decoded, gunzipped and verified against the sha; the
#       bundle is then fetched, so the branch it carries — with its commits —
#       lands in the checkout.
#
# A file that does not match its sha is never written: the assembler exits
# non-zero, so a wrong file cannot be committed.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MANIFEST="$ROOT/scripts/assemble-manifest.txt"
CHECK_ONLY=0
[ "${1:-}" = "--check" ] && CHECK_ONLY=1

if [ ! -f "$MANIFEST" ]; then
  echo "· no scripts/assemble-manifest.txt — nothing to assemble"
  exit 0
fi

failed=0
joined=0
entries="$MANIFEST.entries"
: > "$entries"

HEADER="# The large files, and the parts they arrive in.
#
# Written by scripts/assemble-large-files.sh after a verified join: the sha
# below is the one the join produced, and the join is checked against it.
#
# Format, one file per line:
#
#   <sha256>  <target path>  <part> [<part> …]  [gzip]
#   <sha256>  bundle:<branch>  <part> [<part> …]  bundle
#
# With \`gzip\`, the joined parts are a gzip stream and are gunzipped before the
# sha is checked: the sha is of the ORIGINAL bytes.
"

while read -r sha target parts kind; do
  [ -z "${sha:-}" ] && continue
  case "$sha" in \#*) continue ;; esac
  [ -z "${target:-}" ] && continue

  if [ "$CHECK_ONLY" -eq 1 ]; then
    echo "· $target — not checked"
    continue
  fi

  tmp="$(mktemp)"
  missing=""
  for part in $parts; do
    if [ ! -f "$ROOT/$part" ]; then
      missing="$part"
      break
    fi
    cat "$ROOT/$part" >> "$tmp"
  done
  if [ -n "$missing" ]; then
    echo "✗ $target — missing part $missing"
    rm -f "$tmp"
    failed=1
    continue
  fi

  if [ "$kind" = "bundle" ]; then
    # The parts are base64 chunks of a gzipped git bundle.
    gz="$tmp.gz"
    bundle="$tmp.bundle"
    if ! base64 -d < "$tmp" > "$gz" 2>/dev/null; then
      echo "✗ $target — the parts are not base64"
      rm -f "$tmp" "$gz"
      failed=1
      continue
    fi
    actual="$(sha256sum "$gz" | cut -d' ' -f1)"
    if [ "$actual" != "$sha" ]; then
      echo "✗ $target — the joined bundle is $actual, expected $sha"
      rm -f "$tmp" "$gz"
      failed=1
      continue
    fi
    if ! gunzip -c "$gz" > "$bundle" 2>/dev/null; then
      echo "✗ $target — the joined bundle is not a gzip stream"
      rm -f "$tmp" "$gz" "$bundle"
      failed=1
      continue
    fi
    if ! git bundle verify "$bundle" > /dev/null 2>&1; then
      echo "✗ $target — the joined bundle does not verify"
      rm -f "$tmp" "$gz" "$bundle"
      failed=1
      continue
    fi
    branch="${target#bundle:}"
    git fetch "$bundle" "refs/heads/$branch:refs/heads/$branch" || {
      echo "✗ $target — the branch could not be fetched from the bundle"
      rm -f "$tmp" "$gz" "$bundle"
      failed=1
      continue
    }
    git checkout --force "refs/heads/$branch" -- . || {
      echo "✗ $target — the branch could not be checked out"
      rm -f "$tmp" "$gz" "$bundle"
      failed=1
      continue
    }
    echo "✓ $target — the branch $branch is materialised ($(git rev-parse --short "refs/heads/$branch"))"
    rm -f "$tmp" "$gz" "$bundle"
    joined=$((joined + 1))
    echo "$sha  $target  $parts  $kind" >> "$entries"
    continue
  fi

  if [ "$kind" = "gzip" ]; then
    if ! gunzip -c "$tmp" > "$tmp.out" 2>/dev/null; then
      echo "✗ $target — the parts are not a gzip stream"
      rm -f "$tmp" "$tmp.out"
      failed=1
      continue
    fi
    mv "$tmp.out" "$tmp"
  fi

  actual="$(sha256sum "$tmp" | cut -d' ' -f1)"
  if [ "$actual" != "$sha" ]; then
    echo "✗ $target — the parts joined to $actual, expected $sha"
    rm -f "$tmp"
    failed=1
    continue
  fi

  target_path="$ROOT/${target#bundle:}"
  mkdir -p "$(dirname "$target_path")"
  mv "$tmp" "$target_path"
  for part in $parts; do rm -f "$ROOT/$part"; done
  joined=$((joined + 1))
  echo "✓ $target — $(( $(wc -c < "$target_path") )) bytes, sha $actual"
  echo "$actual  $target  $parts  $kind" >> "$entries"
done < "$MANIFEST"

if [ "$CHECK_ONLY" -eq 0 ]; then
  {
    printf '%s\n' "$HEADER"
    cat "$entries"
  } > "$MANIFEST.tmp"
  mv "$MANIFEST.tmp" "$MANIFEST"
  rm -f "$entries"
  if [ "$joined" -gt 0 ]; then
    echo "· $joined item(s) materialised — commit them and the manifest"
  fi
else
  rm -f "$entries"
fi

exit "$failed"
