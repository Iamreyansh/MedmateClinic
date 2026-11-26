#!/usr/bin/env bash
# Start the real stack in this sandbox: Postgres (already running), the Spring
# Boot API on 8080, and the Vite SPA on 3100 with VITE_USE_MOCK=false.
#
#   verify/dev-stack.sh start    # api + web
#   verify/dev-stack.sh stop
#   verify/dev-stack.sh status
#
# The E2E suite and the pixel-diff harness both talk to this stack.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-21-openjdk-amd64}"

API_PORT="${API_PORT:-8080}"
WEB_PORT="${WEB_PORT:-3100}"
WEB_HOST="${WEB_HOST:-127.0.0.1}"

export DATABASE_URL="jdbc:postgresql://127.0.0.1:5432/medmate_clinic_api"
export DATABASE_USER="medmate"
export DATABASE_PASSWORD="medmate"
export DEMO_ENABLED="true"
export DEMO_CLINIC_ID="11111111-1111-4111-8111-111111111111"
export APP_ENV="development"
export SERVER_PORT="$API_PORT"
export CORS_ORIGINS="http://localhost:${WEB_PORT},http://127.0.0.1:${WEB_PORT},http://[::1]:${WEB_PORT}"

RUN_DIR="/tmp/medmate-stack"
mkdir -p "$RUN_DIR"

start_api() {
  local jar="$ROOT/backend/target/medmate-clinic-api-1.0.0.jar"
  if [ ! -f "$jar" ]; then
    echo "· building the API"
    (cd "$ROOT/backend" && mvn -q -DskipTests package) || return 1
  fi
  setsid nohup java -jar "$jar" > "$RUN_DIR/api.log" 2>&1 < /dev/null &
  echo $! > "$RUN_DIR/api.pid"
}

start_web() {
  # The mock must be off: the whole point is to test against the real API.
  cd "$ROOT" || return 1
  local api_url=()
  if [ -n "${CROSS_ORIGIN:-}" ]; then
    api_url=(VITE_API_URL="http://127.0.0.1:${API_PORT}/api")
  fi
  # The SPA calls a relative "/api" and Vite proxies it, so the browser never
  # makes a cross-origin request — which is what the CORS allowlist is for.
  #
  # CROSS_ORIGIN=1 is the opt-in for the other path: the SPA calls the API
  # absolutely, so every request is cross-origin and the allowlist decides
  # whether the browser can read the answer. One test in e2e/ runs that way,
  # because a preflight that comes back without Access-Control-Allow-Origin
  # looks like a network failure to the browser, not like a bad status.
  VITE_USE_MOCK=false \
  VITE_API_TARGET="http://127.0.0.1:${API_PORT}" \
  "${api_url[@]}" \
  setsid nohup npx vite --host "$WEB_HOST" --port "$WEB_PORT" --strictPort \
    > "$RUN_DIR/web.log" 2>&1 < /dev/null &
  echo $! > "$RUN_DIR/web.pid"
}

wait_for() {
  local url="$1" name="$2" tries="${3:-90}"
  for _ in $(seq 1 "$tries"); do
    if curl -sS -o /dev/null -m 2 "$url" 2>/dev/null; then
      echo "✓ $name is up ($url)"
      return 0
    fi
    sleep 1
  done
  echo "✗ $name did not come up ($url)"
  return 1
}

case "${1:-start}" in
  start)
    start_api
    wait_for "http://127.0.0.1:${API_PORT}/actuator/health" "the API" 120 || exit 1
    start_web
    wait_for "http://${WEB_HOST}:${WEB_PORT}/" "the web app" 90 || exit 1
    ;;
  stop)
    for name in api web; do
      if [ -f "$RUN_DIR/$name.pid" ]; then
        # The process was started with setsid, so its group can be killed:
        # `npx vite` spawns a child that survives a kill of the wrapper.
        kill -- "-$(cat "$RUN_DIR/$name.pid")" 2>/dev/null
        rm -f "$RUN_DIR/$name.pid"
      fi
    done
    sleep 1
    # A server started outside this script (or before the pid file existed)
    # would keep the port and the new one would never bind.
    pkill -f "medmate-clinic-api-1.0.0.jar" 2>/dev/null
    pkill -f "vite --host" 2>/dev/null
    sleep 2
    ;;
  status)
    curl -sS -m 3 "http://127.0.0.1:${API_PORT}/actuator/health" && echo
    curl -sS -o /dev/null -m 3 -w "web: %{http_code}\n" "http://${WEB_HOST}:${WEB_PORT}/"
    ;;
  *)
    echo "usage: $0 {start|stop|status}" >&2
    exit 2
    ;;
esac
