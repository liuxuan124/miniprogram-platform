#!/usr/bin/env bash
# Initialize the local development MySQL database for the mini-program platform.
# Applies all backend migrations, the local dev seed, and a known admin account.
# Idempotent: it drops and recreates the throwaway dev database each run so the
# schema is always correct and matches the JPA/MyBatis entities.
set -euo pipefail

DB_NAME="miniprogram_dev"
DB_PASS="${DB_PASSWORD:-changeme}"
ADMIN_USER="admin"
ADMIN_PASS="${ADMIN_PASSWORD:-Admin@2026}"
MIGRATIONS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/backend/src/main/resources/db/migration"
SEED_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/deploy/local-dev-seed.sql"

mysql_root() { mysql -uroot -p"$DB_PASS" -h127.0.0.1 "$@"; }

echo "[db-init] ensuring root password is set"
if ! mysql_root -e "SELECT 1" >/dev/null 2>&1; then
  sudo mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${DB_PASS}'; FLUSH PRIVILEGES;"
fi

echo "[db-init] (re)creating database ${DB_NAME}"
mysql_root -e "DROP DATABASE IF EXISTS ${DB_NAME}; CREATE DATABASE ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

echo "[db-init] applying migrations"
# MySQL 8 does not support 'ADD COLUMN IF NOT EXISTS' (MariaDB-only), so strip it.
# --force lets the idempotent repair migrations (V57 etc.) skip already-present columns.
for f in $(ls "${MIGRATIONS_DIR}"/V*.sql | sort -V); do
  sed -E 's/ADD COLUMN[[:space:]]+IF NOT EXISTS/ADD COLUMN/gI' "$f" \
    | mysql -uroot -p"$DB_PASS" -h127.0.0.1 --force "${DB_NAME}" 2>&1 \
    | grep -viE "using a password|Duplicate column|Duplicate key name|already exists|Unknown column '(deleted|model)'" || true
done

echo "[db-init] applying local dev seed"
mysql -uroot -p"$DB_PASS" -h127.0.0.1 --force "${DB_NAME}" < "${SEED_FILE}" 2>&1 \
  | grep -viE "using a password|Unknown column 'model'|Duplicate" || true

echo "[db-init] seeding admin account (${ADMIN_USER})"
HASH="$(ADMIN_PASS="$ADMIN_PASS" python3 -c "import bcrypt,os;print(bcrypt.hashpw(os.environ['ADMIN_PASS'].encode(), bcrypt.gensalt(rounds=10)).decode())")"
mysql_root "${DB_NAME}" -e "INSERT INTO mp_admin_user (tenant_id, username, password_hash, real_name, role_id, status) \
  VALUES (1, '${ADMIN_USER}', '${HASH}', '平台管理员', 1, 1) \
  ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash), role_id=VALUES(role_id), status=1;"

echo "[db-init] done. Admin login: ${ADMIN_USER} / ${ADMIN_PASS}"
