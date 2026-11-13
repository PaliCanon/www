#!/usr/bin/env bash
# Builds the image (or takes one: IMAGE=ref) and runs it, then checks what it
# serves against what Cloudflare Workers static assets served: the pages and
# the 404 page, the trailing-slash redirects, every line of public/_redirects,
# the headers of public/_headers, no _headers/_redirects served, /healthz, and
# the access log (one JSON line per request, the schema's keys, no query
# string, no address, no health probe). Needs docker and node. Run by ci.yml.
# Usage: scripts/container-test.sh
set -euo pipefail

command -v docker >/dev/null || { echo 'container-test: docker is not installed' >&2; exit 2; }
cd "$(dirname "$0")/.."

IMAGE="${IMAGE:-www-container-test}"
NAME="www-container-test-$$"
PORT="${PORT:-18080}"
BASE="http://127.0.0.1:$PORT"
fail=0
[ -n "${SKIP_BUILD:-}" ] || docker build -t "$IMAGE" .

cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker run -d --name "$NAME" -p "127.0.0.1:$PORT:8080" \
  -e WWW_ENV=v9.9.9 -e WWW_SHA=abc1234 -e WWW_DEPLOYMENT_ENV=test "$IMAGE" >/dev/null
for _ in $(seq 1 50); do curl -fs "$BASE/healthz" >/dev/null 2>&1 && break; sleep 0.2; done

ok() { echo "ok   $1"; }
bad() { echo "FAIL $1"; fail=1; }
# check <name> <want> <got>
check() { if [ "$2" = "$3" ]; then ok "$1"; else bad "$1: want [$2] got [$3]"; fi; }
status() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
header() { curl -s -o /dev/null -D - "${@:2}" | tr -d '\r' | awk -v h="$(echo "$1" | tr A-Z a-z)" 'tolower($0) ~ "^" h ":" { sub(/^[^:]*: */, ""); print }'; }
inside() { docker exec "$NAME" "$@"; }

check 'a non-root user' 101 "$(inside id -u)"
check '/ is 200' 200 "$(status "$BASE/")"
check '/ is html' text/html "$(header content-type "$BASE/" | cut -d';' -f1)"
check 'an unknown path is 404' 404 "$(status "$BASE/no-such-page")"
check 'an unknown file is 404' 404 "$(status "$BASE/no-such.js")"
want404="$(inside cat /usr/share/nginx/html/404.html | cksum)"
check 'the 404 body is 404.html' "$want404" "$(curl -s "$BASE/no-such-page" | cksum)"

# html_handling auto-trailing-slash: a directory page is served at /dir/.
dir="$(inside sh -c 'cd /usr/share/nginx/html && ls -d */ | grep -v _astro | head -1' | tr -d '/')"
check "/$dir/ is 200" 200 "$(status "$BASE/$dir/")"
check "/$dir is 307" 307 "$(status "$BASE/$dir")"
check "/$dir goes to /$dir/ (relative)" "/$dir/" "$(header location "$BASE/$dir")"
check "/$dir keeps its query on the redirect" "/$dir/?a=1" "$(header location "$BASE/$dir?a=1")"
check "/$dir/index.html is 307" 307 "$(status "$BASE/$dir/index.html")"
check "/$dir/index.html goes to /$dir/" "/$dir/" "$(header location "$BASE/$dir/index.html")"
check '/index.html goes to /' / "$(header location "$BASE/index.html")"
check "/$dir.html goes to /$dir" "/$dir" "$(header location "$BASE/$dir.html")"
check 'no open redirect through //' 404 "$(status "$BASE//evil.test")"

# Every line of public/_redirects, as written.
while read -r from to code _; do
  case "$from" in ''|'#'*) continue ;; esac
  check "redirect $from" "$code $to" "$(status "$BASE$from") $(header location "$BASE$from")"
done < public/_redirects

# Headers of public/_headers: the page's, and the hashed asset's.
check 'X-Frame-Options on /' DENY "$(header x-frame-options "$BASE/")"
check 'Cache-Control on /' no-cache "$(header cache-control "$BASE/")"
check 'headers on the 404 page too' DENY "$(header x-frame-options "$BASE/no-such-page")"
asset="$(inside sh -c 'ls /usr/share/nginx/html/_astro | head -1')"
check 'Cache-Control on /_astro/ (one header, immutable)' \
  'public, max-age=31536000, immutable' "$(header cache-control "$BASE/_astro/$asset")"
check '_headers is not served' 404 "$(status "$BASE/_headers")"
check '_redirects is not served' 404 "$(status "$BASE/_redirects")"

check '/healthz is 200' 200 "$(status "$BASE/healthz")"
check '/healthz says ok' ok "$(curl -s "$BASE/healthz")"

# The access log: one JSON line per request, no query, no probe.
curl -s -o /dev/null -A 'agent-secret' -e 'https://ref-secret.test/' "$BASE/?token=query-secret"
curl -s -o /dev/null "$BASE/no-such-page?x=1"
sleep 0.5
docker logs "$NAME" >${TMPDIR:-/tmp}/www-container-test.$$.log 2>&1
if node scripts/container-test-log.mjs ${TMPDIR:-/tmp}/www-container-test.$$.log; then ok 'the access log'; else bad 'the access log'; fi
rm -f ${TMPDIR:-/tmp}/www-container-test.$$.log

[ "$fail" = 0 ] && echo 'container-test: all green' || { echo 'container-test: FAILED'; exit 1; }
