#!/usr/bin/env bash
# Isolated CI database. Override name/port only when checking this helper locally.
set -euo pipefail
printf 'CI host kernel: %s\n' "$(uname -sr)"
name="${MONGO_CONTAINER_NAME:-event-manager-ci-mongo}"
port="${MONGO_PORT:-27017}"
if [[ ! "$name" =~ ^[a-zA-Z0-9][a-zA-Z0-9_.-]*$ ]] || [[ ! "$port" =~ ^[0-9]+$ ]] || ((port < 1 || port > 65535)); then
 echo 'Invalid MongoDB container name or port.' >&2
 exit 1
fi
# Never remove or reuse a pre-existing container or volume.
container_id=$(docker create --name "$name" --publish "127.0.0.1:$port:27017" mongo:8.0)
diagnostics() {
 docker inspect --format 'MongoDB state: {{.State.Status}}, exit code: {{.State.ExitCode}}, error: {{.State.Error}}' "$container_id" || true
 docker logs --tail 100 "$container_id" || true
}
if ! docker start "$container_id"; then
 diagnostics
 exit 1
fi
deadline=$((SECONDS + 120))
while (( SECONDS < deadline )); do
 if [ "$(docker inspect --format '{{.State.Running}}' "$container_id")" != true ]; then
  echo 'MongoDB exited before becoming ready.' >&2
  diagnostics
  exit 1
 fi
 if timeout 10s docker exec "$container_id" mongosh --host 127.0.0.1 --quiet --eval 'quit(db.adminCommand({ping: 1}).ok === 1 ? 0 : 1)' > /dev/null 2>&1; then
  echo "MongoDB is ready on host port $port."
  exit 0
 fi
 sleep 2
done
echo 'MongoDB did not become ready within 120 seconds.' >&2
diagnostics
exit 1
