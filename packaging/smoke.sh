#!/usr/bin/env bash
set -euo pipefail

network="nyte-smoke-$$"
server="${network}-server"
web="${network}-web"
combined="${network}-combined"

cleanup() {
  local result=$?
  if (( result != 0 )); then
    for container in "$server" "$web" "$combined"; do
      docker logs "$container" 2>/dev/null || true
    done
  fi
  docker rm -f "$web" "$combined" "$server" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
}
trap cleanup EXIT

check_liveness() {
  curl --fail --silent --show-error --retry 20 --retry-all-errors --retry-delay 1 \
    --max-time 5 "$1/health/live" | jq -e '. == {"status":"ok"}'
}

check_web() {
  local url=$1
  local document asset
  for path in / /about; do
    document="$(curl --fail --silent --show-error --max-time 5 "$url$path")"
    grep -F 'id="root"' <<< "$document" >/dev/null
  done
  asset="$(grep -oE 'src="/assets/[^"]+"' <<< "$document" | cut -d '"' -f 2)"
  curl --fail --silent --show-error --max-time 5 "$url$asset" >/dev/null
  test "$(curl --silent --show-error -o /dev/null -w '%{http_code}' "$url/health/missing")" = 404
  test "$(curl --silent --show-error -o /dev/null -w '%{http_code}' "$url/assets/missing.js")" = 404
}

docker network create "$network" >/dev/null
docker run --detach --name "$server" --network "$network" --network-alias nyte-server \
  --publish 127.0.0.1::52470 nyte-server:baseline >/dev/null
docker run --detach --name "$web" --network "$network" \
  --publish 127.0.0.1::52471 nyte-web:baseline >/dev/null
docker run --detach --name "$combined" --network "$network" \
  --publish 127.0.0.1::52470 nyte:baseline >/dev/null

server_url="http://$(docker port "$server" 52470/tcp)"
web_url="http://$(docker port "$web" 52471/tcp)"
combined_url="http://$(docker port "$combined" 52470/tcp)"
check_liveness "$server_url"
check_liveness "$web_url"
check_liveness "$combined_url"
check_web "$web_url"
check_web "$combined_url"

echo "Server-only, web-only, and combined image checks passed."
