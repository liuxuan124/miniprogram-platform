#!/usr/bin/env bash
# ============================================================================
# 微信小程序多场景搭建与运营系统 — Locust 性能测试运行脚本
# ============================================================================
# 用法:
#   ./run.sh                           # 默认参数: 50用户, 10/秒, 5分钟
#   ./run.sh -u 100 -r 20 -t 10m      # 自定义参数
#   ./run.sh --headless                # 无头模式 (CI/CD)
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# ── 默认参数 ──────────────────────────────────────────────────────────────
USERS=50
SPAWN_RATE=10
RUN_TIME="5m"
HOST="${PERF_HOST:-http://localhost:8080}"
HEADLESS=false
LOCUST_FILE="$SCRIPT_DIR/locustfile.py"
CONFIG_FILE="$SCRIPT_DIR/config/locust.conf"

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

# ── 帮助信息 ──────────────────────────────────────────────────────────────
usage() {
    cat <<EOF
微信小程序多场景搭建与运营系统 — 性能测试运行脚本

用法: $0 [选项]

选项:
  -u, --users NUM       并发用户数 (默认: 50)
  -r, --rate NUM        每秒增长用户数 (默认: 10)
  -t, --time DURATION   运行时长, 如 5m/1h (默认: 5m)
  -H, --host URL        目标主机 (默认: http://localhost:8080)
      --headless        无头模式, 不启动 Web UI
  -h, --help            显示帮助信息

示例:
  $0                                    # 默认: 50用户, 10/秒, 5分钟
  $0 -u 200 -r 20 -t 10m               # 压测: 200用户, 20/秒, 10分钟
  $0 --headless -u 100 -t 3m           # CI模式: 100用户, 3分钟

环境变量:
  PERF_HOST             目标主机 (同 -H)
EOF
    exit 0
}

# ── 参数解析 ──────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case "$1" in
        -u|--users)    USERS="$2";      shift 2 ;;
        -r|--rate)     SPAWN_RATE="$2"; shift 2 ;;
        -t|--time)     RUN_TIME="$2";   shift 2 ;;
        -H|--host)     HOST="$2";       shift 2 ;;
        --headless)    HEADLESS=true;   shift   ;;
        -h|--help)     usage                    ;;
        *)             error "未知参数: $1"; usage ;;
    esac
done

# ── 前置检查 ──────────────────────────────────────────────────────────────
info "执行前置检查..."

# 检查 locust 是否安装
if ! command -v locust &>/dev/null; then
    error "Locust 未安装!"
    echo ""
    info "请安装依赖:"
    echo "  pip install -r $SCRIPT_DIR/requirements.txt"
    exit 1
fi
ok "Locust 已安装: $(locust --version 2>&1 | head -1)"

# 检查测试文件
if [[ ! -f "$LOCUST_FILE" ]]; then
    error "测试文件不存在: $LOCUST_FILE"
    exit 1
fi
ok "测试文件: $LOCUST_FILE"

# 检查配置文件
if [[ -f "$CONFIG_FILE" ]]; then
    ok "配置文件: $CONFIG_FILE"
else
    warn "配置文件不存在: $CONFIG_FILE (使用默认配置)"
fi

# 检查目标主机可达性
info "检查目标主机: $HOST"
if command -v curl &>/dev/null; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$HOST" 2>/dev/null || echo "000")
    if [[ "$HTTP_CODE" != "000" ]]; then
        ok "目标主机可达 (HTTP $HTTP_CODE)"
    else
        warn "目标主机不可达: $HOST — 测试可能失败"
    fi
else
    warn "curl 不可用, 跳过主机可达性检查"
fi

# ── 构建命令 ──────────────────────────────────────────────────────────────
CMD="locust -f $LOCUST_FILE --host=$HOST"

if [[ -f "$CONFIG_FILE" ]]; then
    CMD="$CMD --config=$CONFIG_FILE"
fi

if [[ "$HEADLESS" == true ]]; then
    CMD="$CMD --headless -u $USERS -r $SPAWN_RATE -t $RUN_TIME"
else
    CMD="$CMD -u $USERS -r $SPAWN_RATE -t $RUN_TIME"
fi

# ── 执行测试 ──────────────────────────────────────────────────────────────
echo ""
info "=========================================="
info "  性能测试参数"
info "=========================================="
info "  目标主机:   $HOST"
info "  并发用户:   $USERS"
info "  增长速率:   $SPAWN_RATE /秒"
info "  运行时长:   $RUN_TIME"
info "  无头模式:   $HEADLESS"
info "=========================================="
echo ""

info "启动性能测试..."
echo ""

set +e
$CMD
EXIT_CODE=$?
set -e

echo ""
if [[ $EXIT_CODE -eq 0 ]]; then
    ok "性能测试完成"
else
    error "性能测试异常退出 (code: $EXIT_CODE)"
fi

# ── 生成报告提示 ──────────────────────────────────────────────────────────
if [[ "$HEADLESS" == true ]]; then
    echo ""
    info "测试结果已输出到控制台"
    info "如需 HTML 报告, 可添加 --html=report.html 参数"
fi

exit $EXIT_CODE
