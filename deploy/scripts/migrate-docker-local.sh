#!/usr/bin/env bash
# 本地 Docker Compose MySQL：按序执行 backend/db/migration/V*.sql，并写入 schema_version。
# 用法（在仓库根目录或 deploy 目录）:
#   bash deploy/scripts/migrate-docker-local.sh
# 可选: MYSQL_CONTAINER=miniapp-mysql
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SQL_DIR="$ROOT/backend/src/main/resources/db/migration"
CONTAINER="${MYSQL_CONTAINER:-miniapp-mysql}"

if ! docker inspect "$CONTAINER" >/dev/null 2>&1; then
  echo "[migrate-docker] 未找到容器 $CONTAINER，请先 docker compose up -d mysql" >&2
  exit 1
fi

mysql_exec() {
  docker exec -i "$CONTAINER" sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"'
}

is_benign_mysql_error() {
  local out="$1"
  grep -qiE 'Duplicate column|Duplicate key name|already exists|1060|1061|1062|1050|1091|1826|check that column/key exists' <<<"$out"
}

echo "[migrate-docker] container=$CONTAINER sql_dir=$SQL_DIR"

mysql_exec <<'SQL'
CREATE TABLE IF NOT EXISTS schema_version (
  version VARCHAR(64) PRIMARY KEY,
  script VARCHAR(255) NOT NULL,
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
SQL

applied=0
skipped=0
failed=0

while IFS= read -r f; do
  [[ -z "$f" ]] && continue
  base="$(basename "$f")"
  ver="${base%%__*}"
  exists="$(docker exec "$CONTAINER" sh -c "mysql -u\"\$MYSQL_USER\" -p\"\$MYSQL_PASSWORD\" \"\$MYSQL_DATABASE\" -N -e \"SELECT COUNT(*) FROM schema_version WHERE version='$ver'\"" 2>/dev/null | grep -v Warning | tail -1 || echo 0)"
  if [[ "${exists:-0}" != "0" ]]; then
    skipped=$((skipped + 1))
    continue
  fi

  echo "[migrate-docker] APPLY $base"
  set +e
  out="$(mysql_exec <"$f" 2>&1)"
  code=$?
  set -e

  if [[ $code -eq 0 ]]; then
    docker exec "$CONTAINER" sh -c "mysql -u\"\$MYSQL_USER\" -p\"\$MYSQL_PASSWORD\" \"\$MYSQL_DATABASE\" -e \"INSERT INTO schema_version(version, script) VALUES ('$ver', '$base')\"" >/dev/null 2>&1
    applied=$((applied + 1))
  elif is_benign_mysql_error "$out"; then
    echo "[migrate-docker] SKIP (already applied) $base"
    docker exec "$CONTAINER" sh -c "mysql -u\"\$MYSQL_USER\" -p\"\$MYSQL_PASSWORD\" \"\$MYSQL_DATABASE\" -e \"INSERT IGNORE INTO schema_version(version, script) VALUES ('$ver', '$base')\"" >/dev/null 2>&1
    skipped=$((skipped + 1))
  else
    echo "[migrate-docker] FAILED $base (exit $code)" >&2
    echo "$out" | tail -20 >&2
    failed=$((failed + 1))
  fi
done < <(ls "$SQL_DIR"/V*.sql 2>/dev/null | grep -vi rollback | sort -V)

echo "[migrate-docker] done applied=$applied skipped=$skipped failed=$failed"
if [[ $failed -gt 0 ]]; then
  exit 1
fi
