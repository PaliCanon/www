#!/usr/bin/env bash
# The check after a deploy of the showcase, run by deploy.yml against the
# public host: the three homes, the sitemap (built for this origin), an
# unknown path (404), and one /_astro/ asset found in the home page, each
# with the headers of public/_headers. `noindex` (dev) requires
# X-Robots-Tag: noindex on every response, `index` (prod) refuses it.
# Both forms check the old site's URLs (task 006): /terms, /privacy and
# /acknowledgements answer 301 to the same path on search.palicanon.app,
# and their redirects, followed (at most 5), end at a 200 on that host.
# `index` also checks the rest of the cutover: /support and /legal end at
# a 200 on exactly <origin>/support/ and <origin>/legal/ once redirects are
# followed, www.<host>/x?a=1 is a 301 to <host>/x?a=1, /daily.json is a 404, and the
# IndexNow key file is served unchanged (the bytes of
# public/ea61cff5ec8386a25c60f8d2ea079010.txt).
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

here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
failures=0
fail() {
  echo "FAIL $*" >&2
  failures=$((failures + 1))
}

# fetch <path> [origin]: the status in $status, the headers and body in
# $work/h, $work/b. The origin is this check's unless given.
fetch() {
  status=$(curl -sS --retry 3 --retry-delay 2 --max-time 20 \
    -o "$work/b" -D "$work/h" -w '%{http_code}' "${2:-$origin}$1") || status=000
}

# fetch_final <path>: follow the redirects, at most 5 (a loop ends as curl's
# exit 47, status 000); $status and $final are where it ends.
fetch_final() {
  local out
  out=$(curl -sS -L --max-redirs 5 --retry 3 --retry-delay 2 --max-time 20 \
    -o /dev/null -w '%{http_code} %{url_effective}' "$origin$1") || out='000 -'
  status=${out%% *}
  final=${out#* }
}

# header <name>: the response's value of that header ('' when absent).
header() {
  local line value
  shopt -s nocasematch
  while IFS= read -r line; do
    if [[ $line == "$1":* ]]; then
      value=${line#*:}
      value=${value#"${value%%[! ]*}"}
      printf '%s\n' "${value%$'\r'}"
      return 0
    fi
  done <"$work/h"
  printf '\n'
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

# is_301 <label> <path> [origin]: a 301, its location in $got; when it is not
# one, the failure is listed and the return is 1.
is_301() {
  fetch "$2" "${3:-}"
  if [ "$status" != 301 ]; then
    blocked "$1" || fail "$1: status $status (want 301)"
    return 1
  fi
  got=$(header location)
}

# moved <path>: a 301 to the search, same path, whose redirects end at a
# 200 on the search's host.
moved() {
  is_301 "$1" "$1" || return 0
  if [ "$got" != "$search$1" ]; then
    fail "$1: location is '$got' (want '$search$1')"
    return 0
  fi
  fetch_final "$1"
  if [ "$status" != 200 ]; then
    fail "$1: redirect target answers $status (want 200)"
  elif [[ $final != "$search"/* ]]; then
    fail "$1: ends at $final (want $search$1)"
  fi
}


# www_to_apex: www.<host>/x?a=1 is a 301 to <host>/x?a=1, path and query kept.
www_to_apex() {
  local www=${origin/\/\//\/\/www.}
  is_301 "$www/x?a=1" '/x?a=1' "$www" || return 0
  [ "$got" = "$origin/x?a=1" ] || fail "$www/x?a=1: location is '$got' (want '$origin/x?a=1')"
}

# stays <path>: a page of this host, ending at exactly <origin><path>/ (html_handling's 307).
stays() {
  fetch_final "$1"
  if [ "$status" != 200 ]; then
    fail "$1: ends at $status (want 200)"
  elif [ "$final" != "$origin$1/" ]; then
    fail "$1: ends at $final (want $origin$1/)"
  fi
}

# gone <path>: a 404.
gone() {
  fetch "$1"
  [ "$status" = 404 ] || blocked "$1" || fail "$1: status $status (want 404)"
}

# key: the old site's IndexNow key, 200 and the bytes of public/<name>.
key() {
  local name=ea61cff5ec8386a25c60f8d2ea079010.txt
  fetch "/$name"
  if [ "$status" != 200 ]; then
    blocked "/$name" || fail "/$name: status $status (want 200)"
  elif ! cmp -s "$work/b" "$here/../public/$name"; then
    fail "/$name: the body is not the key ($(wc -c <"$work/b" | tr -d ' ') bytes, want $(wc -c <"$here/../public/$name" | tr -d ' '))"
  fi
}

search=https://search.palicanon.app
for old in /acknowledgements /terms /privacy; do moved "$old"; done
if [ "$robots" = index ]; then
  for page in /support /legal; do stays "$page"; done
  www_to_apex
  gone /daily.json
  key
fi

if [ "$failures" -gt 0 ]; then
  echo "deploy-check: $failures failure(s) on $origin" >&2
  exit 1
fi
echo "deploy-check: OK $origin ($robots)"
