#!/usr/bin/env bash
# Cloud Agent start: bring up per-boot infrastructure services.
# Terminals (backend + admin) are launched separately and depend on these.
set -euo pipefail

echo "[start] starting Redis"
sudo service redis-server start || true

echo "[start] starting MySQL"
sudo service mysql start || true

echo "[start] waiting for MySQL to accept connections"
for i in $(seq 1 60); do
  if sudo mysqladmin ping >/dev/null 2>&1; then
    echo "[start] MySQL is ready"
    break
  fi
  sleep 1
done

echo "[start] infrastructure ready"
