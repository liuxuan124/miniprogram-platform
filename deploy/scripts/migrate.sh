#!/usr/bin/env bash
# 按版本号序执行 backend Flyway 风格 SQL（V*.sql），并记录到 schema_version 表。
# 用法:
#   DB_HOST=127.0.0.1 DB_USER=root DB_PASS=xx DB_NAME=miniprogram_prod ./deploy/scripts/migrate.sh
#   MIGRATE_FROM=V94 ./deploy/scripts/migrate.sh   # 只处理 >= V94 的脚本
# 密码优先用 MYSQL_PWD / DB_PASS 环境变量（不出现在 ps 参数里）。
#
# MIGRATE_FROM 使用场景：生产库的 schema_version 并非从 V1 开始登记
# （例如历史库由 dump 初始化，只记录了 V47 之后的迁移）。此时脚本会把 V1 当作
# 未执行而尝试重跑，甚至在 V1 内含 USE 语句时直接失败中断。设定起始版本即可跳过。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SQL_DIR="$ROOT/backend/src/main/resources/db/migration"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-${DB_USERNAME:-root}}"
DB_NAME="${DB_NAME:-miniprogram_prod}"

if [[ -n "${DB_PASS:-}" ]]; then
  export MYSQL_PWD="$DB_PASS"
elif [[ -n "${DB_PASSWORD:-}" ]]; then
  export MYSQL_PWD="$DB_PASSWORD"
elif [[ -z "${MYSQL_PWD:-}" ]]; then
  echo "请设置 DB_PASS、DB_PASSWORD 或 MYSQL_PWD" >&2
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
if [[ -n "${MIGRATE_FROM:-}" ]]; then
  echo "仅处理 >= ${MIGRATE_FROM} 的迁移脚本"
fi

# 注意：版本号必须按 V 后的数字比较，直接比较字符串会让 V100 排在 V94 之前。

# ── 前置断言：非 rollback 迁移脚本里不允许出现重复版本号 ──
# 2026-10-05 审计发现：target/classes 里残留过一份 V110__runtime_event.sql
#（V113 改名前的旧文件），被打进 jar 后与 V110__product_detail_template.sql 撞号。
# 当前项目未启用 Flyway，migrate.sh 按 schema_version 去重 → 第二个会被静默 SKIP，
# 让人误以为「已执行过」；将来若启用 Flyway，重复版本号会直接启动失败。
# 故在执行前硬断言，撞号立刻 exit 1，不留到运行期才发现。
_dupes="$(ls "$SQL_DIR"/V*.sql 2>/dev/null | grep -vi rollback \
  | while IFS= read -r f; do
      b="$(basename "$f")"; echo "${b%%__*}"
    done | sort -V | uniq -d)"
if [[ -n "$_dupes" ]]; then
  echo "ERROR 迁移脚本存在重复版本号（会导致第二个被静默 SKIP）:" >&2
  echo "$_dupes" >&2
  echo "请删除陈旧残留后重试（注意 target/classes 里的旧副本也会被打进 jar）" >&2
  exit 1
fi

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
done < <(ls "$SQL_DIR"/V*.sql 2>/dev/null | grep -vi rollback | sort -V | awk -v from="${MIGRATE_FROM:-}" '
{
  p = $0
  sub(/.*\//, "", p)
  v = p; sub(/__.*/, "", v)
  n = v;  sub(/^V/, "", n);  n = n + 0
  if (from != "") { f = from; sub(/^V/, "", f); if (n < f + 0) next }
  print $0
}')

echo "DONE"
