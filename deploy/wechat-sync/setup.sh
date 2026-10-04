#!/usr/bin/env bash
# 交互式配置公众号同步器（AppSecret 只在本机输入，不落聊天记录）
# 用法：ssh zfculture 'bash /opt/wechat-sync/setup.sh'
set -euo pipefail

CFG=/opt/wechat-sync/config.json
IP_WHITELIST=$(curl -s --max-time 8 https://ifconfig.me/ip || echo "查不到")

echo "=============================================="
echo " 公众号同步器配置"
echo "=============================================="
echo
echo "服务器出口 IP： $IP_WHITELIST"
echo
echo ">>> 必做：公众号后台 -> 设置与开发 -> 基本配置 -> IP 白名单"
echo "    把上面这个 IP 加进去（多个用分号隔开）"
echo "    不加会报 40164 invalid ip not in whitelist"
echo
echo ">>> AppID / AppSecret 在同一页「公众号开发信息」里"
echo "    点击「重置」可重新查看 Secret"
echo

read -rp "AppID（wx 开头，如 wx1234567890abcdef）: " APPID
if [ -z "$APPID" ]; then echo "AppID 不能为空"; exit 1; fi

# AppSecret 静默输入，不回显
read -rsp "AppSecret（输入不回显）: " APPSECRET
echo
if [ -z "$APPSECRET" ]; then echo "AppSecret 不能为空"; exit 1; fi

echo
echo ">>> 写入配置（权限 600）..."
sudo tee "$CFG" >/dev/null <<JSON
{
  "appid": "$APPID",
  "appsecret": "$APPSECRET",
  "cookie_raw": "",
  "out_dir": "/opt/wechat-sync/out"
}
JSON
sudo chmod 600 "$CFG"
sudo chown ubuntu:ubuntu "$CFG"
echo "    已写入 $CFG"
echo

echo ">>> 连通性测试..."
sudo python3 /opt/wechat-sync/sync_wechat.py --config "$CFG" --channel api --test || {
  echo
  echo "测试失败，对照下面排查："
  echo "  40164 invalid ip not in whitelist -> IP 白名单没加 $IP_WHITELIST，或没生效等几分钟"
  echo "  40013 invalid appid              -> AppID 复制错了"
  echo "  40125 invalid appsecret          -> AppSecret 复制错了或已重置"
  echo "  48001 api unauthorized           -> 账号主体不符合（需非个人主体）"
  echo "  45009 api freq out of limit      -> 刚才调太频繁，等 1 分钟"
  exit 1
}

echo
echo ">>> 首次全量同步（下载正文图片，较慢）..."
sudo python3 /opt/wechat-sync/sync_wechat.py --config "$CFG" 2>&1 | tail -20
echo
sudo ls -la /opt/wechat-sync/out/
echo
echo "全部搞定。产物在 /opt/wechat-sync/out/"
