#!/usr/bin/env bash
# 按版本号序执行 backend Flyway 风格 SQL（V*.sql），并记录到 schema_version 表。
# 用法:
#   DB_HOST=127.0.0.1 DB_USER=root DB_PASS=xx DB_NAME=miniprogram_prod ./deploy/scripts/migrate.sh
# 密码优先用 MYSQL_PWD / DB_PASS 环境变量（不出现在 ps 参数里）。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SQL_DIR="$ROOT/backend/src/main/resources/db/migration"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_NAME="${DB_NAME:-miniprogram_prod}"

if [[ -n "${DB_PASS:-}" ]]; then
  export MYSQL_PWD="$DB_PASS"
elif [[ -z "${MYSQL_PWD:-}" ]]; then
  echo "请设置 DB_PASS 或 MYSQL_PWD" >&2
  exit 1
fi

mysql_cmd=(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" "$DB_NAME")

"${mysql_cmd[@]}" -e "
CREATE TABLE IF NOT EXISTS schema_version (
  version VARCHAR(64) PRIMARY KEY,
  script VARCHAR(255) NOT NULL,
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
"

shopt -s nullglob
# 必须用版本序，避免 V10 排在 V4 之前（兼容 bash 3，不用 mapfile）
while IFS= read -r f; do
  [[ -z "$f" ]] && continue
  base="$(basename "$f")"
  ver="${base%%__*}"
  exists="$("${mysql_cmd[@]}" -N -e "SELECT COUNT(*) FROM schema_version WHERE version='$ver'")"
  if [[ "$exists" != "0" ]]; then
    echo "SKIP $base"
    continue
  fi
  echo "APPLY $base"
  if "${mysql_cmd[@]}" < "$f"; then
    "${mysql_cmd[@]}" -e "INSERT INTO schema_version(version, script) VALUES ('$ver', '$base')"
  else
    echo "FAILED $base" >&2
    exit 1
  fi
done < <(ls "$SQL_DIR"/V*.sql 2>/dev/null | sort -V)

echo "DONE"
