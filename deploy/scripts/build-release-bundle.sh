#!/usr/bin/env bash
# 构建可上传服务器的轻量生产包；不连接、不修改生产服务器。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
RELEASE_ROOT="${RELEASE_ROOT:-$ROOT/release}"
GIT_SHA="$(git -C "$ROOT" rev-parse --short HEAD)"
if [[ -n "$(git -C "$ROOT" status --porcelain --untracked-files=normal)" ]]; then
  WORKTREE_STATE="dirty"
else
  WORKTREE_STATE="clean"
fi
VERSION_SUFFIX="$GIT_SHA"
if [[ "$WORKTREE_STATE" == "dirty" ]]; then
  VERSION_SUFFIX="$VERSION_SUFFIX-dirty"
fi
VERSION="${RELEASE_VERSION:-$(date +%Y%m%d-%H%M)-$VERSION_SUFFIX}"
BUNDLE="$RELEASE_ROOT/miniprogram-platform-$VERSION"
ARCHIVE="$RELEASE_ROOT/miniprogram-platform-$VERSION.tar.gz"
IMAGE="miniapp-release-backend:$VERSION"
CONTAINER=""

cleanup() {
  if [[ -n "$CONTAINER" ]]; then
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

command -v docker >/dev/null || { echo "缺少 Docker，后端必须用 JDK 17 镜像构建" >&2; exit 1; }
command -v npm >/dev/null || { echo "缺少 npm，无法构建管理后台" >&2; exit 1; }
command -v tar >/dev/null || { echo "缺少 tar，无法生成发布归档" >&2; exit 1; }

case "$BUNDLE" in
  "$RELEASE_ROOT"/miniprogram-platform-*) ;;
  *) echo "拒绝清理非 release 目录：$BUNDLE" >&2; exit 1 ;;
esac

rm -rf "$BUNDLE"
rm -f "$ARCHIVE"
mkdir -p "$BUNDLE/backend/src/main/resources/db/migration" \
  "$BUNDLE/admin-static" "$BUNDLE/deploy/scripts" "$BUNDLE/deploy/nginx"

echo "[1/5] 构建管理后台"
(cd "$ROOT/admin" && npm ci && npm run build)
cp -R "$ROOT/admin/dist/." "$BUNDLE/admin-static/"

echo "[2/5] 使用 JDK 17 Docker 镜像构建后端"
docker build -f "$ROOT/deploy/Dockerfile.backend" -t "$IMAGE" "$ROOT"
CONTAINER="$(docker create "$IMAGE")"
docker cp "$CONTAINER:/app/app.jar" "$BUNDLE/backend/app.jar"
docker rm "$CONTAINER" >/dev/null
CONTAINER=""

echo "[3/5] 收集迁移与无密钥部署配置"
cp "$ROOT"/backend/src/main/resources/db/migration/V*.sql \
  "$BUNDLE/backend/src/main/resources/db/migration/"
cp "$ROOT/deploy/scripts/migrate.sh" "$BUNDLE/deploy/scripts/"
cp "$ROOT/deploy/.env.example" "$BUNDLE/deploy/.env.example"
cp "$ROOT/deploy/nginx/default.conf" "$BUNDLE/deploy/nginx/default.conf"
cp "$ROOT/deploy/docs/DEPLOY-CHECKLIST.md" "$BUNDLE/DEPLOY-CHECKLIST.md"

HIGHEST_MIGRATION="$(find "$ROOT/backend/src/main/resources/db/migration" -maxdepth 1 -name 'V*.sql' ! -name '*rollback*' -print | sort -V | tail -1 | xargs basename)"
cat > "$BUNDLE/RELEASE.md" <<EOF
# 生产发布包 $VERSION

- Git 基准：$GIT_SHA
- 工作区状态：${WORKTREE_STATE}（发布包按构建时文件生成；dirty 表示包含未提交改动）
- 最高迁移：$HIGHEST_MIGRATION
- 构建时间：$(date '+%Y-%m-%d %H:%M:%S %z')

## 内容

- backend/app.jar：JDK 17 构建的后端程序
- admin-static/：管理后台生产静态文件
- backend/src/main/resources/db/migration/：数据库迁移
- deploy/scripts/migrate.sh：按 schema_version 增量执行迁移
- deploy/.env.example：无密钥配置模板

## 运行环境要求（硬性）

- **JDK 17+**：\`backend/app.jar\` 为 Spring Boot 3.2.5、class 文件版本 61，JDK 8/11 无法启动（\`UnsupportedClassVersionError\`）。上线前在服务器执行 \`java -version\` 确认。
- MySQL 5.7+/8.0、Redis 可连；连接信息由服务器 .env 提供，本包只附无密钥模板。

## 上线顺序

1. 备份生产数据库、app.jar、admin-static 和 uploads。
2. 核对生产 schema_version 后执行 migrate.sh；只执行未登记版本。
3. 替换 app.jar 并重启后端，健康检查通过后再替换 admin-static。
4. 验证健康接口、后台登录、页面配置、星球、商城和订单链路。
5. **Nginx / HTTPS**：包内 deploy/nginx/default.conf 只有 \`listen 80\`，需自行补 443 与证书；其中 \`resolver 127.0.0.11\` 是 Docker 内置 DNS，非 Docker 部署必须改成系统 DNS，否则 /api 全部 502。域名须先完成 ICP 备案。
6. **小程序端**：本包不含小程序源码，需用微信开发者工具单独上传 miniapp/ 并在公众平台配置 request 合法域名（HTTPS）。

逐项勾验用同目录 \`DEPLOY-CHECKLIST.md\`（运行环境 / HTTPS / 迁移 / 后端 / 静态 / 小程序 / 灰度复核 / 人工阻塞项 / 回滚）。

此包不包含 .env、证书、密钥、uploads、小程序源码或测试证据。
EOF

echo "[4/5] 生成文件校验清单"
(cd "$BUNDLE" && find . -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 shasum -a 256 > SHA256SUMS)

echo "[5/5] 生成压缩包"
tar -C "$RELEASE_ROOT" -czf "$ARCHIVE" "$(basename "$BUNDLE")"
shasum -a 256 "$ARCHIVE" > "$ARCHIVE.sha256"

echo "发布包：$ARCHIVE"
echo "校验：  $ARCHIVE.sha256"
