#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Tests own a fresh, disposable database and never seed the application database.
export E2E_DATABASE="event_manager_e2e_$(date +%s)_$RANDOM"
export MONGODB_URI="mongodb://127.0.0.1:27017/$E2E_DATABASE"
export JWT_SECRET="$(node -e "process.stdout.write(require('crypto').randomBytes(48).toString('hex'))")"
export ADMIN_EMAIL=e2e-admin@example.test
export ADMIN_PASSWORD=e2e-only-password-123
mkdir -p artifacts
backend_pid=
cleanup(){
 [ -z "$backend_pid" ] || kill "$backend_pid" 2>/dev/null || true
 [ -z "$backend_pid" ] || wait "$backend_pid" 2>/dev/null || true
 node --input-type=module -e 'import {MongoClient} from "./frontend/node_modules/mongodb/lib/index.js"; const name=process.env.E2E_DATABASE; if(!name?.startsWith("event_manager_e2e_")) throw Error("Unsafe database"); const c=new MongoClient(process.env.MONGODB_URI); await c.connect(); await c.db(name).dropDatabase(); await c.close();' || true
}
trap cleanup EXIT
(cd backend && bash gradlew bootJar --no-daemon) > artifacts/e2e-build.log 2>&1
java -jar backend/build/libs/backend-0.0.1-SNAPSHOT.jar --server.address=127.0.0.1 > artifacts/e2e-api.log 2>&1 & backend_pid=$!
ready=0
for attempt in $(seq 1 60); do
 if curl -fsS http://127.0.0.1:8080/api/health > /dev/null 2>&1; then ready=1; break; fi
 if ! kill -0 "$backend_pid" 2>/dev/null; then echo 'E2E API exited; inspect artifacts/e2e-api.log'; exit 1; fi
 sleep 1
done
if [ "$ready" != 1 ]; then echo 'E2E API failed readiness check'; exit 1; fi
(cd frontend && npm run test:e2e)
