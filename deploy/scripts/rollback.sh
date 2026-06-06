#!/usr/bin/env bash
# ============================================================================
# 微信小程序多场景搭建与运营系统 — 回滚脚本
# ============================================================================
# 用法:
#   ./rollback.sh                  # 回滚到上一版本
#   ./rollback.sh -t 20240101120000  # 回滚到指定版本
#   ./rollback.sh --list           # 列出可用版本
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TAG_FILE="$DEPLOY_DIR/.last_deploy_tag"

# ── 颜色输出 ──────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }

# ── 默认参数 ──────────────────────────────────────────────────────────────
TARGET_TAG=""
LIST_ONLY=false

# ── 帮助信息 ──────────────────────────────────────────────────────────────
usage() {
    cat <<EOF
微信小程序多场景搭建与运营系统 — 回滚脚本

用法: $0 [选项]

选项:
  -t, --tag TAG      回滚到指定版本标签
      --list         列出可用的回滚版本
  -h, --help         显示帮助信息

示例:
  $0                            # 回滚到上一版本
  $0 -t 20240101120000          # 回滚到指定版本
  $0 --list                     # 查看可用版本
EOF
    exit 0
}

# ── 参数解析 ──────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case "$1" in
        -t|--tag)   TARGET_TAG="$2"; shift 2 ;;
        --list)     LIST_ONLY=true;  shift   ;;
        -h|--help)  usage ;;
        *)          error "未知参数: $1"; usage ;;
    esac
done

# ── 检查 Docker Compose ──────────────────────────────────────────────────
if docker compose version &>/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &>/dev/null; then
    COMPOSE_CMD="docker-compose"
else
    error "Docker Compose 未安装!"
    exit 1
fi

# ── 列出可用版本 ──────────────────────────────────────────────────────────
list_versions() {
    info "可用的回滚版本:"
    echo ""

    for IMG in miniapp-backend miniapp-admin; do
        echo "  [$IMG]"
        TAGS=$(docker images --format "{{.Tag}}" "$IMG" 2>/dev/null | grep -v "latest" | sort -r | head -5 || true)
        if [[ -z "$TAGS" ]]; then
            echo "    (无历史版本)"
        else
            while IFS= read -r tag; do
                SIZE=$(docker images --format "{{.Size}}" "$IMG:$tag" 2>/dev/null | head -1 || echo "?")
                CREATED=$(docker images --format "{{.CreatedSince}}" "$IMG:$tag" 2>/dev/null | head -1 || echo "?")
                echo "    $tag  ($SIZE, $CREATED)"
            done <<< "$TAGS"
        fi
        echo ""
    done
}

# ── 执行回滚 ──────────────────────────────────────────────────────────────
do_rollback() {
    local TAG="$1"

    echo ""
    warn "============================================"
    warn "  即将回滚到版本: $TAG"
    warn "============================================"
    echo ""
    warn "此操作将:"
    warn "  1. 停止当前运行的服务"
    warn "  2. 将镜像回滚到 $TAG 版本"
    warn "  3. 重新启动服务"
    echo ""

    # 确认
    read -rp "确认回滚? [y/N] " CONFIRM
    if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
        info "已取消回滚"
        exit 0
    fi

    echo ""

    # 步骤1: 停止当前服务
    info "停止当前服务..."
    cd "$DEPLOY_DIR"
    $COMPOSE_CMD down
    ok "服务已停止"

    # 步骤2: 回滚镜像
    info "回滚镜像到版本 $TAG..."
    for IMG in miniapp-backend miniapp-admin; do
        if docker image inspect "$IMG:$TAG" &>/dev/null 2>&1; then
            docker tag "$IMG:$TAG" "$IMG:latest"
            ok "$IMG 回滚到 $TAG"
        else
            warn "$IMG:$TAG 镜像不存在, 跳过"
        fi
    done

    # 步骤3: 重新启动
    info "重新启动服务..."
    $COMPOSE_CMD --env-file "$DEPLOY_DIR/.env" up -d
    ok "服务已启动"

    # 步骤4: 健康检查
    info "等待服务就绪..."
    sleep 15

    ALL_OK=true
    for SERVICE in mysql redis backend admin; do
        STATUS=$(docker inspect --format='{{.State.Health.Status}}' "miniapp-$SERVICE" 2>/dev/null || echo "unknown")
        if [[ "$STATUS" == "healthy" ]]; then
            ok "$SERVICE: healthy"
        else
            warn "$SERVICE: $STATUS (可能仍在启动中)"
            ALL_OK=false
        fi
    done

    echo ""
    if [[ "$ALL_OK" == true ]]; then
        ok "回滚完成! 所有服务正常运行"
    else
        warn "部分服务尚未就绪, 请稍后检查: $COMPOSE_CMD ps"
    fi
}

# ── 主流程 ────────────────────────────────────────────────────────────────
main() {
    echo ""
    info "============================================"
    info "  微信小程序多场景搭建与运营系统 — 回滚"
    info "============================================"
    echo ""

    # 列出版本模式
    if [[ "$LIST_ONLY" == true ]]; then
        list_versions
        exit 0
    fi

    # 确定回滚版本
    if [[ -n "$TARGET_TAG" ]]; then
        do_rollback "$TARGET_TAG"
    elif [[ -f "$TAG_FILE" ]]; then
        TARGET_TAG=$(cat "$TAG_FILE")
        info "从部署记录读取到上一版本: $TARGET_TAG"
        do_rollback "$TARGET_TAG"
    else
        error "未找到上一版本记录, 请使用 -t 指定回滚版本"
        echo ""
        list_versions
        exit 1
    fi
}

main
