#!/usr/bin/env bash
# Tests for scripts/deploy-check.sh (task 005): `curl` is a stub first on
# PATH that answers from a fake site, one directory per response under
# $SITE (`status`, `headers`, `body`; a path with no directory is a 404 with
# the 404 page). Each case starts from a site that passes, breaks one thing,
# and expects the check to fail naming it.
# Run: bash scripts/deploy-check.test.sh
set -uo pipefail

here=$(cd "$(dirname "$0")" && pwd)
script="$here/deploy-check.sh"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
bin="$work/bin"
mkdir -p "$bin"
ORIGIN=https://dev.example.test
ASSET=/_astro/Base.AbCd1234.css

# curl -sS ... -o <body> -D <headers> -w '%{http_code}' <url>
cat >"$bin/curl" <<'STUB'
#!/usr/bin/env bash
while [ $# -gt 0 ]; do
  case $1 in
    -o) out=$2; shift 2 ;;
    -D) hdr=$2; shift 2 ;;
    -w | --retry | --retry-delay | --max-time) shift 2 ;;
    -*) shift ;;
    *) url=$1; shift ;;
  esac
done
path=/${url#*://*/}
key=$(printf '%s' "$path" | tr '/' '_')
dir="$SITE/$key"
[ -d "$dir" ] || dir="$SITE/missing"
cp "$dir/headers" "$hdr"
cp "$dir/body" "$out"
cat "$dir/status"
STUB
chmod +x "$bin/curl"

# respond <path> <status> <body> [header…]: one response of the fake site.
respond() {
  local dir="$SITE/$(printf '%s' "$1" | tr '/' '_')"
  mkdir -p "$dir"
  printf '%s' "$2" >"$dir/status"
  printf '%s' "$3" >"$dir/body"
  {
    printf 'HTTP/2 %s\r\n' "$2"
    shift 3
    for h in "$@"; do printf '%s\r\n' "$h"; done
    printf '\r\n'
  } >"$dir/headers"
}

SECURITY=(
  'x-frame-options: DENY'
  'strict-transport-security: max-age=31536000'
  'x-content-type-options: nosniff'
  'referrer-policy: strict-origin-when-cross-origin'
  'permissions-policy: camera=(), microphone=(), geolocation=()'
)

# good_site <noindex|index>: a site that passes the check.
good_site() {
  SITE="$work/site-$RANDOM$RANDOM"
  export SITE
  local robots=()
  [ "$1" = noindex ] && robots=('x-robots-tag: noindex')
  local page=(content-type:\ text/html "${SECURITY[@]}" 'cache-control: no-cache' ${robots[@]+"${robots[@]}"})
  local html="<html><link rel=\"stylesheet\" href=\"$ASSET\"></html>"
  respond / 200 "$html" "${page[@]}"
  respond /fr/ 200 "$html" "${page[@]}"
  respond /vi/ 200 "$html" "${page[@]}"
  respond /sitemap.xml 200 "<urlset><url><loc>$ORIGIN/</loc></url></urlset>" \
    'content-type: application/xml' "${SECURITY[@]}" 'cache-control: no-cache' ${robots[@]+"${robots[@]}"}
  respond missing 404 '<html>not found</html>' "${page[@]}"
  respond "$ASSET" 200 'body{}' 'content-type: text/css' "${SECURITY[@]}" \
    'cache-control: public, max-age=31536000, immutable' ${robots[@]+"${robots[@]}"}
}

# The cases run side by side (each one reads the site it was started on,
# so a case never changes a site after its `expect`); the results are
# printed in order at the end.
seq=0
mkdir -p "$work/res"
# expect <name> <exit code> <text the output must hold> -- <args…>
expect() {
  local name=$1 code=$2 text=$3
  shift 4
  seq=$((seq + 1))
  (
    local output status
    output=$(PATH="$bin:$PATH" bash "$script" "$@" 2>&1)
    status=$?
    if [ "$status" = "$code" ] && printf '%s' "$output" | grep -qF -- "$text"; then
      echo "ok   $name"
    else
      echo "FAIL $name: exit $status (want $code), output:"
      printf '%s\n' "$output" | sed 's/^/     /'
    fi >"$work/res/$(printf '%04d' "$seq")"
  ) &
}

good_site noindex
expect 'dev: a good site passes' 0 "deploy-check: OK $ORIGIN" -- "$ORIGIN" noindex

good_site index
expect 'prod: a good site passes' 0 "deploy-check: OK $ORIGIN" -- "$ORIGIN" index

good_site noindex
expect 'a trailing slash on the origin is accepted' 0 "deploy-check: OK $ORIGIN" -- "$ORIGIN/" noindex

expect 'no argument is a usage error' 2 'usage: deploy-check.sh' --
expect 'a wrong robots mode is a usage error' 2 'noindex or index' -- "$ORIGIN" maybe

good_site index
expect 'dev without noindex fails' 1 'x-robots-tag' -- "$ORIGIN" noindex

good_site noindex
expect 'prod with noindex fails' 1 'x-robots-tag' -- "$ORIGIN" index

good_site noindex
respond /fr/ 500 'oops' "${SECURITY[@]}"
expect 'a page that is not 200 fails' 1 '/fr/: status 500' -- "$ORIGIN" noindex

good_site noindex
respond missing 200 '<html>home</html>' "${SECURITY[@]}" 'cache-control: no-cache' 'x-robots-tag: noindex'
expect 'an unknown path that is not 404 fails' 1 'status 200 (want 404)' -- "$ORIGIN" noindex

good_site noindex
respond / 200 "<html>$ASSET</html>" 'cache-control: no-cache' 'x-robots-tag: noindex'
expect 'a missing security header fails' 1 'x-frame-options' -- "$ORIGIN" noindex

good_site noindex
respond "$ASSET" 200 'body{}' "${SECURITY[@]}" 'cache-control: no-cache, public, max-age=31536000, immutable' 'x-robots-tag: noindex'
expect 'an _astro asset also no-cache fails' 1 'cache-control' -- "$ORIGIN" noindex

good_site noindex
respond / 200 '<html>no asset</html>' "${SECURITY[@]}" 'cache-control: no-cache' 'x-robots-tag: noindex'
expect 'a home with no _astro asset fails' 1 'no /_astro/ asset' -- "$ORIGIN" noindex

good_site noindex
respond /sitemap.xml 200 '<urlset><url><loc>https://other.test/</loc></url></urlset>' \
  'content-type: application/xml' "${SECURITY[@]}" 'cache-control: no-cache' 'x-robots-tag: noindex'
expect 'a sitemap built for another origin fails' 1 "sitemap.xml: no <loc>$ORIGIN/" -- "$ORIGIN" noindex

good_site noindex
respond / 403 'challenge' 'cf-mitigated: challenge'
expect 'a challenged response exits 3 and runs no further check' 3 'deploy-check: challenge:' -- "$ORIGIN" noindex

good_site noindex
respond / 302 '' 'location: https://pali-canon.cloudflareaccess.com/cdn-cgi/access/login/dev'
expect 'an Access redirect is named' 1 'cloudflareaccess.com' -- "$ORIGIN" noindex

# without <name> <header…>: the headers that do not start with "<name>:".
without() {
  local name=$1 h
  shift
  for h in "$@"; do
    case $h in "$name:"*) ;; *) printf '%s\n' "$h" ;; esac
  done
}

# Each header taken away alone, from a page, must fail naming that header.
for name in strict-transport-security x-content-type-options referrer-policy \
  permissions-policy x-frame-options cache-control x-robots-tag; do
  good_site noindex
  kept=()
  while IFS= read -r h; do kept+=("$h"); done < <(without "$name" 'content-type: text/html' \
    "${SECURITY[@]}" 'cache-control: no-cache' 'x-robots-tag: noindex')
  respond /fr/ 200 "<html><link href=\"$ASSET\"></html>" "${kept[@]}"
  expect "a page without $name fails naming it" 1 "/fr/: $name" -- "$ORIGIN" noindex
done

# The asset loses its immutable cache-control (absent, then only no-cache).
good_site noindex
respond "$ASSET" 200 'body{}' 'content-type: text/css' "${SECURITY[@]}" 'x-robots-tag: noindex'
expect 'an asset without cache-control fails' 1 "$ASSET: cache-control is ''" -- "$ORIGIN" noindex
good_site noindex
respond "$ASSET" 200 'body{}' 'content-type: text/css' "${SECURITY[@]}" \
  'cache-control: no-cache' 'x-robots-tag: noindex'
expect 'an asset with only no-cache fails' 1 "$ASSET: cache-control is 'no-cache'" -- "$ORIGIN" noindex

# Prod: a stray X-Robots-Tag on any one response fails.
good_site index
respond / 200 "<html><link href=\"$ASSET\"></html>" "${SECURITY[@]}" 'cache-control: no-cache' 'x-robots-tag: noindex'
expect 'prod: a page with x-robots-tag noindex fails' 1 "/: x-robots-tag is 'noindex'" -- "$ORIGIN" index
good_site index
respond "$ASSET" 200 'body{}' "${SECURITY[@]}" 'cache-control: public, max-age=31536000, immutable' 'x-robots-tag: noindex'
expect 'prod: an asset with x-robots-tag noindex fails' 1 "$ASSET: x-robots-tag is 'noindex'" -- "$ORIGIN" index

wait
cat "$work/res/"*
passed=$(cat "$work/res/"* | grep -c '^ok ')
failed=$(cat "$work/res/"* | grep -c '^FAIL ')
failed=$((failed + seq - passed - failed))
echo "deploy-check.test: $passed passed, $failed failed"
[ "$failed" = 0 ]
