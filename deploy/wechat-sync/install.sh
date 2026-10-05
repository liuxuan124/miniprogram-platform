#!/usr/bin/env bash
# 公众号同步器 —— 服务器部署 + 每日定时
# 用法（在服务器上执行）：bash install.sh
set -euo pipefail

APP_DIR=/opt/wechat-sync
DATA_DIR=$APP_DIR/out
LOG_DIR=/var/log/wechat-sync

echo "==> 创建目录"
sudo mkdir -p "$APP_DIR" "$DATA_DIR" "$LOG_DIR"

echo "==> 复制程序"
sudo cp "$(dirname "$0")/sync_wechat.py" "$APP_DIR/"
if [ ! -f "$APP_DIR/config.json" ]; then
  sudo cp "$(dirname "$0")/config.example.json" "$APP_DIR/config.json"
  sudo chmod 600 "$APP_DIR/config.json"
  echo "    已生成 config.json，请编辑填入凭据"
fi

echo "==> 安装定时任务（每天 06:20 同步）"
sudo tee /etc/cron.d/wechat-sync >/dev/null <<CRON
# 公众号内容同步
20 6 * * * root /usr/bin/python3 $APP_DIR/sync_wechat.py --config $APP_DIR/config.json --no-images >> $LOG_DIR/cron.log 2>&1
CRON
sudo chmod 644 /etc/cron.d/wechat-sync
sudo systemctl reload cron 2>/dev/null || sudo systemctl reload crond 2>/dev/null || true

echo "==> 拉取正文图片（首次执行，耗时较长）"
sudo /usr/bin/python3 "$APP_DIR/sync_wechat.py" --config "$APP_DIR/config.json" \
  >> "$LOG_DIR/manual.log" 2>&1 || echo "    首次执行失败，看 $LOG_DIR/manual.log"

echo
echo "完成。产物在 $DATA_DIR"
echo "  articles.json / articles.csv / index.html / stats.json"
echo "  定时：每天 06:20（编辑 /etc/cron.d/wechat-sync 可改）"
