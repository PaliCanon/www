#!/usr/bin/env bash
# Tests for scripts/deploy-check.sh (task 005): `curl` is a stub first on
# PATH that answers from a fake site, one directory per response under
# $SITE (`status`, `headers`, `body`; a path with no directory is a 404 with
# the 404 page). With -L the stub follows a 3xx `location` to the next
# directory and, like curl, fails with exit 47 and "Maximum (N) redirects
# followed" past --max-redirs N (curl's default, 50, when not given). The
# host picks the directories: search.palicanon.app reads the `search…`
# ones, www.<host> the `www…` ones, the first request's host the bare
# ones, and any other host the ones named after it (`elsewhere.test…`).
# Each case starts from a site that passes, breaks one thing, and expects
# the check to fail naming it.
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
SEARCH=https://search.palicanon.app
KEY=ea61cff5ec8386a25c60f8d2ea079010.txt
KEYFILE="$here/../public/$KEY"

# curl -sS ... -o <body> -D <headers> -w '%{http_code}' <url>
cat >"$bin/curl" <<'STUB'
#!/usr/bin/env bash
out=/dev/null
hdr=/dev/null
while [ $# -gt 0 ]; do
  case $1 in
    -o) out=$2; shift 2 ;;
    -D) hdr=$2; shift 2 ;;
    --max-redirs) max_redirs=$2; shift 2 ;;
    -w | --retry | --retry-delay | --max-time) shift 2 ;;
    -L) follow=1; shift ;;
    -*) shift ;;
    *) url=$1; shift ;;
  esac
done
# Bash builtins where possible: the stub runs for every request of every case.
rest=${url#*://}
base=${url%%://*}://${rest%%/*}
path=/${rest#*/}
first=$base
# The directories' prefix for the host in $base.
host_prefix() {
  case $base in
    https://search.palicanon.app) prefix=search ;;
    https://www.*) prefix=www ;;
    "$first") prefix='' ;;
    *) prefix=${base#*://} ;;
  esac
}
host_prefix
redirects=0
while :; do
  key=${path//\//_}
  dir="$SITE/$prefix$key"
  [ -d "$dir" ] || dir="$SITE/missing"
  location=''
  while IFS= read -r line; do
    case $line in
      [Ll]ocation:*) location=${line#*:}; location=${location// /}; location=${location//$'\r'/}; break ;;
    esac
  done <"$dir/headers"
  if [ -n "${follow:-}" ] && [ -n "$location" ]; then
    if [ "$redirects" -ge "${max_redirs:-50}" ]; then
      echo "curl: (47) Maximum (${max_redirs:-50}) redirects followed" >&2
      exit 47
    fi
    redirects=$((redirects + 1))
    case $location in
      /*) path=$location ;;
      *)
        rest=${location#*://}
        base=${location%%://*}://${rest%%/*}
        path=/${rest#*/}
        host_prefix
        ;;
    esac
    continue
  fi
  break
done
cp "$dir/headers" "$hdr"
cp "$dir/body" "$out"
status=$(<"$dir/status")
if [ -n "${follow:-}" ]; then printf '%s %s%s' "$status" "$base" "$path"; else printf '%s' "$status"; fi
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
  # The old site's pages live here (task 017), both forms: each is a 307 to
  # its slash form, then a 200 on this host.
  local old
  for old in acknowledgements terms privacy support legal; do
    respond "/$old" 307 '' "location: /$old/"
    respond "/$old/" 200 "$html" "${page[@]}"
  done
  # The rest of the cutover (index form): www goes to the apex, the old feed
  # is gone, and the IndexNow key is served unchanged.
  if [ "$1" = index ]; then
    respond 'www/x?a=1' 301 '' "location: $ORIGIN/x?a=1"
    respond "/$KEY" 200 "$(cat "$KEYFILE")" 'content-type: text/plain'
  fi
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

# The old site's pages are pages of this host (task 017), both forms: each
# ends at a 200 on exactly its slash form, never on the search.
for form in index noindex; do
  for page in acknowledgements terms privacy support legal; do
    good_site $form
    respond "/$page/" 404 '<html>not found</html>'
    expect "$form: /$page ending at 404 fails" 1 "/$page: ends at 404 (want 200)" -- "$ORIGIN" $form

    good_site $form
    respond "/$page" 301 '' "location: $SEARCH/$page"
    respond "search/$page" 200 '<html>the search</html>' "${SECURITY[@]}"
    expect "$form: /$page sent to the search fails" 1 "/$page: ends at $SEARCH/$page" -- "$ORIGIN" $form

    # Exactly its slash form, not any page of this host.
    good_site $form
    respond "/$page" 307 '' "location: /$page/index.html"
    respond "/$page/index.html" 200 "<html></html>"
    expect "$form: /$page ending at /$page/index.html fails" 1 \
      "/$page: ends at $ORIGIN/$page/index.html (want $ORIGIN/$page/)" -- "$ORIGIN" $form
  done
  good_site $form
  expect "$form: the five old pages passing is OK" 0 "deploy-check: OK $ORIGIN" -- "$ORIGIN" $form
done

# A redirect loop on a page that stays also fails, curl stopped by the
# script's own --max-redirs 5 (the stub follows curl's 50 otherwise).
good_site index
respond /support/ 307 '' 'location: /support'
respond /support 307 '' 'location: /support/'
expect 'prod: /support in a redirect loop fails' 1 '/support: ends at 000 (want 200)' -- "$ORIGIN" index
expect 'prod: /support in a redirect loop stops after 5 redirects' 1 \
  'Maximum (5) redirects followed' -- "$ORIGIN" index

# The home ignores ?q= (index form): the query is not redirected (task 011).
good_site index
respond '/?q=metta' 200 '<html>home</html>' "${SECURITY[@]}" 'cache-control: no-cache'
expect 'index: the home with ?q= answering 200 passes' 0 "deploy-check: OK $ORIGIN" -- "$ORIGIN" index

# www goes to the apex, path and query kept (the host derived from the origin).
good_site index
respond 'www/x?a=1' 301 '' "location: $ORIGIN/x"
expect 'prod: www dropping the query fails' 1 "www.dev.example.test/x?a=1: location is '$ORIGIN/x'" -- "$ORIGIN" index
good_site index
respond 'www/x?a=1' 301 '' 'location: https://elsewhere.test/x?a=1'
expect 'prod: www redirecting to another host fails' 1 "location is 'https://elsewhere.test/x?a=1'" -- "$ORIGIN" index
good_site index
respond 'www/x?a=1' 301 ''
expect 'prod: www with no location fails' 1 "location is ''" -- "$ORIGIN" index
good_site index
respond 'www/x?a=1' 200 '<html>home</html>' "${SECURITY[@]}"
expect 'prod: www answering 200 fails' 1 'status 200 (want 301)' -- "$ORIGIN" index

# The old feed is gone.
good_site index
respond /daily.json 200 '{}' 'content-type: application/json'
expect 'prod: /daily.json answering 200 fails' 1 '/daily.json: status 200 (want 404)' -- "$ORIGIN" index

# The IndexNow key: 200 and the 32 bytes of public/$KEY.
good_site index
rm -r "$SITE/_$KEY"
expect 'prod: the IndexNow key missing fails' 1 "/$KEY: status 404 (want 200)" -- "$ORIGIN" index
good_site index
respond "/$KEY" 200 "$(printf '%032d' 0)" 'content-type: text/plain'
expect 'prod: the IndexNow key with another content fails' 1 "/$KEY: the body is not the key" -- "$ORIGIN" index
good_site index
respond "/$KEY" 200 "$(cat "$KEYFILE")
" 'content-type: text/plain'
expect 'prod: the IndexNow key with a trailing newline fails' 1 "/$KEY: the body is not the key" -- "$ORIGIN" index

# The dev form checks the old URLs and nothing else of the cutover.
good_site noindex
expect 'dev: /daily.json, the key and www are not asserted' 0 "deploy-check: OK $ORIGIN (noindex)" -- "$ORIGIN" noindex

wait
cat "$work/res/"*
passed=$(cat "$work/res/"* | grep -c '^ok ')
failed=$(cat "$work/res/"* | grep -c '^FAIL ')
failed=$((failed + seq - passed - failed))
echo "deploy-check.test: $passed passed, $failed failed"
[ "$failed" = 0 ]
