#!/usr/bin/env bash
# ============================================================================
# 微信小程序多场景搭建与运营系统 — 一键部署脚本
# ============================================================================
# 用法:
#   ./deploy.sh                    # 完整部署
#   ./deploy.sh --build-only       # 仅构建镜像
#   ./deploy.sh --no-build         # 不构建, 直接启动
#   ./deploy.sh --rollback         # 回滚到上一版本
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$DEPLOY_DIR/.." && pwd)"
ENV_FILE="$DEPLOY_DIR/.env"

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
BUILD=true
BUILD_ONLY=false
NO_BUILD=false
SKIP_CHECK=false

# ── 帮助信息 ──────────────────────────────────────────────────────────────
usage() {
    cat <<EOF
微信小程序多场景搭建与运营系统 — 部署脚本

用法: $0 [选项]

选项:
      --build-only    仅构建镜像, 不启动服务
      --no-build      不构建镜像, 直接启动已有镜像
      --skip-check    跳过环境检查
  -h, --help          显示帮助信息

示例:
  $0                          # 完整部署 (构建 + 启动)
  $0 --build-only             # 仅构建
  $0 --no-build               # 使用已有镜像启动
EOF
    exit 0
}

# ── 参数解析 ──────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case "$1" in
        --build-only) BUILD_ONLY=true; shift ;;
        --no-build)   NO_BUILD=true;   shift ;;
        --skip-check) SKIP_CHECK=true; shift ;;
        -h|--help)    usage ;;
        *)            error "未知参数: $1"; usage ;;
    esac
done

if [[ "$NO_BUILD" == true ]]; then
    BUILD=false
fi

# ── 步骤1: 环境检查 ──────────────────────────────────────────────────────
check_environment() {
    info "========== 环境检查 =========="

    # 检查 Docker
    if ! command -v docker &>/dev/null; then
        error "Docker 未安装!"
        echo "  请安装 Docker: https://docs.docker.com/get-docker/"
        exit 1
    fi
    ok "Docker: $(docker --version)"

    # 检查 Docker Compose
    if docker compose version &>/dev/null 2>&1; then
        ok "Docker Compose: $(docker compose version)"
        COMPOSE_CMD="docker compose"
    elif command -v docker-compose &>/dev/null; then
        ok "Docker Compose: $(docker-compose --version)"
        COMPOSE_CMD="docker-compose"
    else
        error "Docker Compose 未安装!"
        echo "  请安装 Docker Compose Plugin 或 docker-compose"
        exit 1
    fi

    # 检查 Docker 守护进程
    if ! docker info &>/dev/null 2>&1; then
        error "Docker 守护进程未运行!"
        echo "  请启动 Docker 服务"
        exit 1
    fi
    ok "Docker 守护进程运行中"

    # 检查磁盘空间 (至少 5GB)
    AVAILABLE_GB=$(df -BG "$DEPLOY_DIR" | awk 'NR==2 {print $4}' | tr -d 'G')
    if [[ -n "$AVAILABLE_GB" ]] && [[ "$AVAILABLE_GB" -lt 5 ]]; then
        warn "磁盘剩余空间不足 5GB (当前: ${AVAILABLE_GB}GB), 部署可能失败"
    else
        ok "磁盘空间充足 (${AVAILABLE_GB:-?}GB 可用)"
    fi

    info "环境检查通过"
    echo ""
}

# ── 步骤2: 配置检查 ──────────────────────────────────────────────────────
check_config() {
    info "========== 配置检查 =========="

    if [[ ! -f "$ENV_FILE" ]]; then
        warn ".env 文件不存在, 从模板创建"
        cp "$DEPLOY_DIR/.env.example" "$ENV_FILE"
        warn "请编辑 $ENV_FILE 修改生产环境配置!"
        echo ""
    fi
    ok ".env 文件: $ENV_FILE"

    # 检查关键配置项
    source "$ENV_FILE"

    if [[ "${JWT_SECRET:-}" == "change-me-in-production" ]] || [[ -z "${JWT_SECRET:-}" ]]; then
        warn "JWT_SECRET 使用默认值, 请在生产环境中修改!"
    else
        ok "JWT_SECRET 已配置"
    fi

    if [[ -z "${WECHAT_APPID:-}" ]] || [[ -z "${WECHAT_APPSECRET:-}" ]]; then
        warn "微信 AppID/AppSecret 未配置, 小程序登录功能不可用"
    else
        ok "微信配置已设置"
    fi

    if [[ -z "${XUNFEI_API_KEY:-}" ]]; then
        warn "讯飞 API 配置未设置, AI 对话功能不可用"
    else
        ok "讯飞 API 配置已设置"
    fi

    echo ""
}

# ── 步骤3: 构建镜像 ──────────────────────────────────────────────────────
build_images() {
    info "========== 构建镜像 =========="

    # 记录当前镜像版本 (用于回滚)
    BACKUP_TAG=$(date +%Y%m%d%H%M%S)
    info "备份标签: $BACKUP_TAG"

    # 标记当前镜像为备份
    for IMG in miniapp-backend miniapp-admin; do
        if docker image inspect "$IMG:latest" &>/dev/null 2>&1; then
            docker tag "$IMG:latest" "$IMG:$BACKUP_TAG" 2>/dev/null || true
            info "已备份 $IMG:latest → $IMG:$BACKUP_TAG"
        fi
    done

    # 保存回滚标签
    echo "$BACKUP_TAG" > "$DEPLOY_DIR/.last_deploy_tag"

    # 构建后端镜像
    info "构建后端镜像..."
    $COMPOSE_CMD -f "$DEPLOY_DIR/docker-compose.yml" build backend

    # 构建前端镜像
    info "构建前端镜像..."
    $COMPOSE_CMD -f "$DEPLOY_DIR/docker-compose.yml" build admin

    ok "镜像构建完成"
    echo ""
}

# ── 步骤4: 启动服务 ──────────────────────────────────────────────────────
start_services() {
    info "========== 启动服务 =========="

    cd "$DEPLOY_DIR"

    # 启动所有服务
    info "启动 Docker Compose 服务..."
    $COMPOSE_CMD --env-file "$ENV_FILE" up -d

    ok "服务已启动"
    echo ""
}

# ── 步骤5: 健康检查 ──────────────────────────────────────────────────────
health_check() {
    info "========== 健康检查 =========="

    local MAX_WAIT=180  # 最多等待 3 分钟
    local ELAPSED=0
    local INTERVAL=10

    info "等待服务就绪 (最多 ${MAX_WAIT}s)..."

    while [[ $ELAPSED -lt $MAX_WAIT ]]; do
        ALL_HEALTHY=true

        # 检查各服务状态
        for SERVICE in mysql redis backend admin; do
            STATUS=$(docker inspect --format='{{.State.Health.Status}}' "miniapp-$SERVICE" 2>/dev/null || echo "unknown")
            if [[ "$STATUS" != "healthy" ]]; then
                ALL_HEALTHY=false
                info "  $SERVICE: $STATUS"
            fi
        done

        if [[ "$ALL_HEALTHY" == true ]]; then
            ok "所有服务健康!"
            break
        fi

        sleep $INTERVAL
        ELAPSED=$((ELAPSED + INTERVAL))
    done

    if [[ "$ALL_HEALTHY" != true ]]; then
        warn "部分服务未在 ${MAX_WAIT}s 内就绪, 请手动检查"
        info "查看服务状态: $COMPOSE_CMD ps"
        info "查看服务日志: $COMPOSE_CMD logs <service-name>"
    fi

    echo ""
}

# ── 步骤6: 输出部署信息 ──────────────────────────────────────────────────
show_summary() {
    info "========== 部署完成 =========="
    echo ""
    echo "  管理后台:    http://localhost:${ADMIN_PORT:-80}"
    echo "  后端 API:    http://localhost:${BACKEND_PORT:-8080}"
    echo "  Prometheus:  http://localhost:${PROMETHEUS_PORT:-9090}"
    echo "  Grafana:     http://localhost:${GRAFANA_PORT:-3000}"
    echo ""
    echo "  回滚命令:    $DEPLOY_DIR/scripts/rollback.sh"
    echo "  查看日志:    $COMPOSE_CMD logs -f"
    echo "  停止服务:    $COMPOSE_CMD down"
    echo ""
}

# ── 主流程 ────────────────────────────────────────────────────────────────
main() {
    echo ""
    info "============================================"
    info "  微信小程序多场景搭建与运营系统 — 部署"
    info "============================================"
    echo ""

    if [[ "$SKIP_CHECK" != true ]]; then
        check_environment
        check_config
    fi

    if [[ "$BUILD" == true ]]; then
        build_images
    else
        info "跳过镜像构建 (--no-build)"
        echo ""
    fi

    if [[ "$BUILD_ONLY" == true ]]; then
        ok "仅构建模式, 镜像已构建完成"
        exit 0
    fi

    start_services
    health_check
    show_summary
}

main
