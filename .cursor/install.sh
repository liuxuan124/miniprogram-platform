#!/usr/bin/env bash
# Cloud Agent install: idempotent bootstrap for the mini-program platform.
# - Installs system deps (MySQL, Redis, Maven, python3-bcrypt)
# - Initializes the dev database (schema + seed + admin account)
# - Builds the Spring Boot backend jar
# - Installs the Vue admin frontend dependencies
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "[install] installing system packages"
export DEBIAN_FRONTEND=noninteractive
sudo apt-get update -qq
sudo apt-get install -y -qq maven mysql-server redis-server python3-bcrypt

echo "[install] starting MySQL and Redis"
sudo service redis-server start || true
sudo service mysql start || true
# Wait for MySQL socket to accept connections
for i in $(seq 1 30); do
  if sudo mysqladmin ping >/dev/null 2>&1; then break; fi
  sleep 1
done

echo "[install] initializing dev database"
bash "$ROOT/.cursor/db-init.sh"

echo "[install] building backend jar"
cd "$ROOT/backend"
mvn -q -DskipTests package

echo "[install] installing admin frontend dependencies"
cd "$ROOT/admin"
npm ci

echo "[install] done"
