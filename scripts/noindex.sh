#!/usr/bin/env bash
# Dev only: makes every response of the built site answer
# `X-Robots-Tag: noindex`, by adding that header to the `/*` rule of
# <dist>/_headers (Cloudflare keys rules by path, so a second `/*` rule
# would not add to the first). public/_headers stays the one source of the
# common headers; prod deploys it as written. Run by deploy.yml after the
# build and before wrangler. Running it twice changes nothing.
# Usage: scripts/noindex.sh <dist>
# Tests: test/deploy-scripts.test.ts
set -euo pipefail

[ $# -eq 1 ] || { echo 'usage: noindex.sh <dist>' >&2; exit 2; }
file="$1/_headers"
[ -f "$file" ] || { echo "noindex: $file is missing (run the build first)" >&2; exit 1; }
grep -qx '/\*' "$file" || { echo "noindex: $file has no /* rule to carry the header" >&2; exit 1; }
grep -qix '  X-Robots-Tag: noindex' "$file" && exit 0

awk '{ print } $0 == "/*" && !done { print "  X-Robots-Tag: noindex"; done = 1 }' "$file" >"$file.tmp"
mv "$file.tmp" "$file"
