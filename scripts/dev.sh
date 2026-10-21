#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
: "${JWT_SECRET:?Generate JWT_SECRET (32 bytes minimum) in your environment}"
export MONGODB_URI="${MONGODB_URI:-mongodb://127.0.0.1:27017/event_manager}"
if [ -n "${JAVA_HOME:-}" ]; then export PATH="$JAVA_HOME/bin:$PATH"; fi
(cd backend && bash gradlew bootJar --no-daemon)
backend_pid= frontend_pid=
cleanup() {
 [ -z "$backend_pid" ] || kill "$backend_pid" 2>/dev/null || true
 [ -z "$frontend_pid" ] || kill "$frontend_pid" 2>/dev/null || true
 [ -z "$backend_pid" ] || wait "$backend_pid" 2>/dev/null || true
 [ -z "$frontend_pid" ] || wait "$frontend_pid" 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
java -jar backend/build/libs/backend-0.0.1-SNAPSHOT.jar & backend_pid=$!
(cd frontend && exec node node_modules/@angular/cli/bin/ng.js serve --host 127.0.0.1 --port 4200) & frontend_pid=$!
wait -n "$backend_pid" "$frontend_pid"
