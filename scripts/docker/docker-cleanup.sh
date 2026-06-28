#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# Tear down the compose project and remove all volumes (including data).
# ---------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
if docker compose version &>/dev/null; then
  DOCKER_COMPOSE=(docker compose)
elif command -v docker-compose &>/dev/null; then
  DOCKER_COMPOSE=(docker-compose)
else
  echo >&2 "Error: neither 'docker compose' nor 'docker-compose' is available."
  exit 1
fi

echo "WARNING: This will stop all containers and delete all volumes (including persistent data)."
read -rp "Are you sure you want to continue? [y/N]: " answer

if [[ "${answer,,}" =~ ^y(es)?$ ]]; then
  (cd "$REPO_ROOT" && "${DOCKER_COMPOSE[@]}" -f docker-compose.yaml down -v)
  echo "All containers and volumes have been removed."
else
  echo "Operation cancelled."
fi
