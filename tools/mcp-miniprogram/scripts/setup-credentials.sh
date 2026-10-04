#!/bin/bash
# 交互式写入凭据文件，并当场验证登录。
# 密码不回显、不进命令行（验证时由子进程直接读文件，不经 shell 传参）、不进审计日志。
# 用法：bash scripts/setup-credentials.sh
set -euo pipefail

CRED_DIR="${HOME}/.workbuddy/credentials"
CRED_FILE="${CRED_DIR}/mp.env"
NODE_BIN="${NODE_BIN:-$(command -v node || true)}"

if [ -z "${NODE_BIN}" ]; then
  echo "❌ 找不到 node，请先安装或设置 NODE_BIN 环境变量"; exit 1
fi

mkdir -p "${CRED_DIR}"
[ -f "${CRED_FILE}" ] && cp "${CRED_FILE}" "${CRED_FILE}.bak" && echo "已备份旧凭据：${CRED_FILE}.bak"
echo

# 从凭据文件读字段并验证登录；不接受密码作为命令行参数，避免落进命令审计
verify_login() {
  "${NODE_BIN}" -e '
    const fs = require("fs");
    const c = fs.readFileSync(process.argv[1], "utf8");
    const g = k => { const m = c.match(new RegExp("^" + k + "=(.*)$", "m")); return m ? m[1] : ""; };
    const base = (g("MP_API_BASE") || "https://api.zfculture.site").replace(/\/+$/, "");
    const u = g("MP_USERNAME"), p = g("MP_PASSWORD"), s = g("MP_JWT_SECRET");
    if (s && !u) { console.log("SKIP 自签模式，跳过登录验证"); process.exit(0); }
    if (!u || !p) { console.log("FAIL 用户名或密码为空"); process.exit(1); }
    fetch(base + "/api/v1/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: u, password: p }),
      signal: AbortSignal.timeout(15000),
    })
      .then(r => r.json())
      .then(j => {
        if (j.code === 200) {
          console.log("OK 登录成功：" + j.data.username + " · " + (j.data.roleName || j.data.roleCode || "未知角色"));
          process.exit(0);
        }
        console.log("FAIL code=" + j.code + " · " + j.message);
        process.exit(1);
      })
      .catch(e => { console.log("FAIL 网络错误 · " + e.message); process.exit(1); });
  ' "${CRED_FILE}"
}

attempt=0
while :; do
  attempt=$((attempt + 1))
  [ "${attempt}" -gt 1 ] && echo && echo "—— 第 ${attempt} 次尝试 ——"

  echo "== 小程序后台连接器 · 凭据配置 =="
  echo "（要用自签 JWT 模式：用户名处直接回车，改填 JWT_SECRET）"
  read -r -p "后台用户名: " MP_USERNAME

  if [ -n "${MP_USERNAME}" ]; then
    echo "✓ 用户名录入：${MP_USERNAME}"
    read -r -s -p "后台密码（不回显）: " MP_PASSWORD; echo
    echo "✓ 密码录入：${#MP_PASSWORD} 个字符"
    MP_JWT_SECRET=""
  else
    MP_PASSWORD=""
    read -r -s -p "JWT_SECRET（不回显）: " MP_JWT_SECRET; echo
    echo "✓ SECRET 录入：${#MP_JWT_SECRET} 个字符"
  fi

  read -r -p "后端地址 [https://api.zfculture.site]: " MP_API_BASE
  MP_API_BASE="${MP_API_BASE:-https://api.zfculture.site}"

  {
    echo "# 小程序平台连接器凭据 —— 600 权限，勿提交 git"
    echo "MP_API_BASE=${MP_API_BASE}"
    echo "MP_USERNAME=${MP_USERNAME}"
    echo "MP_PASSWORD=${MP_PASSWORD}"
    echo "MP_JWT_SECRET=${MP_JWT_SECRET}"
  } > "${CRED_FILE}"
  chmod 600 "${CRED_FILE}"

  echo
  echo "▶ 正在验证登录…"
  if result=$(verify_login); then
    echo "✅ ${result}"
    break
  else
    echo "❌ ${result}"
    echo "   请确认：用户名是能登录管理后台的那个账号；密码注意大小写与特殊字符。"
    read -r -p "重输一遍？[Y/n] " again
    case "${again}" in
      [nN]*) echo "已保留当前凭据文件，稍后可重跑本脚本。"; break ;;
    esac
  fi
done

echo
echo "凭据文件：${CRED_FILE}（权限 $(stat -f '%Lp' "${CRED_FILE}")）"
echo
echo "验证通过后，回 WorkBuddy 连接器管理页重启 miniprogram 即可。"
echo "写权限开关：~/.workbuddy/mcp.json 里的 MP_READ_ONLY（1=只读，0=开放发布）。"
