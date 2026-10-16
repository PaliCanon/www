#!/usr/bin/env bash
# The check after a deploy of the showcase, run by deploy.yml against the
# public host: the three homes, the sitemap (built for this origin), an
# unknown path (404), and one /_astro/ asset found in the home page, each
# with the headers of public/_headers. `noindex` (dev) requires
# X-Robots-Tag: noindex on every response, `index` (prod) refuses it.
# Every failure is listed; the exit code is 1 if there was one.
# Usage: scripts/deploy-check.sh <origin> <noindex|index>
# Tests: bash scripts/deploy-check.test.sh
set -euo pipefail

usage='usage: deploy-check.sh <origin> <noindex|index>'
[ $# -eq 2 ] || { echo "$usage" >&2; exit 2; }
origin=${1%/}
robots=$2
case $robots in
  noindex | index) ;;
  *) echo "deploy-check: the second argument is noindex or index, not '$robots'" >&2; exit 2 ;;
esac

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
failures=0
fail() {
  echo "FAIL $*" >&2
  failures=$((failures + 1))
}

# fetch <path>: the status in $status, the headers and body in $work/h, $work/b.
fetch() {
  status=$(curl -sS --retry 3 --retry-delay 2 --max-time 20 \
    -o "$work/b" -D "$work/h" -w '%{http_code}' "$origin$1") || status=000
}

# header <name>: the response's value of that header ('' when absent).
header() {
  { grep -i "^$1:" "$work/h" || true; } | head -n 1 | cut -d: -f2- | sed 's/^ *//; s/\r$//'
}

# expect_header <path> <name> <value>
expect_header() {
  local got
  got=$(header "$2")
  [ "$got" = "$3" ] || fail "$1: $2 is '$got' (want '$3')"
}

# When a Cloudflare challenge stops the check: exit 3, not 1.
challenged() {
  echo "deploy-check: challenge: Cloudflare challenged this runner (cf-mitigated); re-run scripts/deploy-check.sh $origin noindex …  by hand" >&2
  exit 3
}

# Why a response is not the site's own: a Cloudflare challenge or Access.
blocked() {
  if [ -n "$(header cf-mitigated)" ]; then
    challenged
  elif header location | grep -q 'cloudflareaccess.com'; then
    fail "$1: redirected to $(header location | cut -d/ -f3) (Cloudflare Access still gates this host)"
  else
    return 1
  fi
}

# check <path> <status> <cache-control>: one response and its headers.
check() {
  fetch "$1"
  if [ "$status" != "$2" ]; then
    blocked "$1" || fail "$1: status $status (want $2)"
    return 1
  fi
  expect_header "$1" x-frame-options DENY
  expect_header "$1" strict-transport-security 'max-age=31536000'
  expect_header "$1" x-content-type-options nosniff
  expect_header "$1" referrer-policy strict-origin-when-cross-origin
  [ -n "$(header permissions-policy)" ] || fail "$1: permissions-policy is '' (want a value)"
  expect_header "$1" cache-control "$3"
  if [ "$robots" = noindex ]; then
    expect_header "$1" x-robots-tag noindex
  else
    expect_header "$1" x-robots-tag ''
  fi
}

revalidated='no-cache'
immutable='public, max-age=31536000, immutable'

asset=''
if check / 200 "$revalidated"; then
  asset=$({ grep -o '/_astro/[^"'\'' )>]*' "$work/b" || true; } | head -n 1)
fi
check /fr/ 200 "$revalidated" || true
check /vi/ 200 "$revalidated" || true
if check /sitemap.xml 200 "$revalidated"; then
  grep -qF "<loc>$origin/" "$work/b" || fail "/sitemap.xml: no <loc>$origin/ (built for another SITE_URL?)"
fi
check /deploy-check-missing-page/ 404 "$revalidated" || true
if [ -n "$asset" ]; then
  check "$asset" 200 "$immutable" || true
else
  fail "/: no /_astro/ asset in the home page"
fi

if [ "$failures" -gt 0 ]; then
  echo "deploy-check: $failures failure(s) on $origin" >&2
  exit 1
fi
echo "deploy-check: OK $origin ($robots)"
