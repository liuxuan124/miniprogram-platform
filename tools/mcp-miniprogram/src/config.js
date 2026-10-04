import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

/**
 * 连接器配置。
 *
 * 凭据两种来源，二选一（推荐文件模式，秘密不进 mcp.json）：
 *  A 凭据文件（推荐）：MP_CREDENTIALS_FILE=~/.workbuddy/credentials/mp.env
 *     内容 KEY=VALUE，权限须 600。mcp.json 里只写路径，不含秘密。
 *  B 环境变量（次选）：写进 ~/.workbuddy/mcp.json 的 staticEnv（明文，注意风险）
 *
 * 凭据内容（二选一）：
 *   MP_USERNAME + MP_PASSWORD   登录模式，走 /api/v1/admin/auth/login
 *   MP_JWT_SECRET                自签模式，HS256（+ 可选 MP_ADMIN_USER_ID，默认 1）
 *
 * 其他可选：
 *   MP_API_BASE       后端地址，默认 https://api.zfculture.site
 *   MP_TENANT_ID      租户 ID，走 X-Tenant-Id 头
 *   MP_TIMEOUT_MS     单次请求超时，默认 20000
 *   MP_READ_ONLY      设为 1 时只暴露读工具，写/发布工具从清单移除
 */

const PLACEHOLDERS = new Set(["REPLACE_ME", "CHANGEME", "TODO", ""]);

/** 极简 dotenv 解析：支持 export 前缀、单双引号、# 行尾注释 */
function parseEnvFile(content) {
  const out = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else {
      value = value.split(/\s+#/)[0].trim();
    }
    out[m[1]] = value;
  }
  return out;
}

function loadCredentialsFile(file) {
  const target = file.startsWith("~") ? path.join(homedir(), file.slice(1)) : file;
  let content;
  try {
    content = readFileSync(target, "utf8");
  } catch (err) {
    throw new Error(`读不到凭据文件 ${target}：${err.message}`);
  }
  return parseEnvFile(content);
}

export function loadConfig() {
  const base = (process.env.MP_API_BASE || "https://api.zfculture.site").replace(/\/+$/, "");

  // 文件模式优先：mcp.json 里只放路径，秘密不进配置
  // 读不到文件也不退出（否则连接器面板会显示加载失败），只记下来在调用时报错
  const credFile = process.env.MP_CREDENTIALS_FILE || "";
  let creds = {};
  let credFileError = "";
  if (credFile) {
    try {
      creds = loadCredentialsFile(credFile);
    } catch (err) {
      credFileError = err.message;
    }
  }

  const pick = (key) => {
    const fromEnv = process.env[key];
    if (fromEnv && !PLACEHOLDERS.has(fromEnv.toUpperCase())) return fromEnv;
    return creds[key] || "";
  };

  const cfg = {
    base,
    username: pick("MP_USERNAME"),
    password: pick("MP_PASSWORD"),
    jwtSecret: pick("MP_JWT_SECRET"),
    adminUserId: Number(pick("MP_ADMIN_USER_ID") || 1),
    tenantId: process.env.MP_TENANT_ID || "",
    timeoutMs: Number(process.env.MP_TIMEOUT_MS || 20000),
    readOnly: String(process.env.MP_READ_ONLY || "").trim() === "1",
  };

  // 注意：这里刻意「软失败」——凭据缺失也照常启动，
  // 否则 WorkBuddy 连接器面板会因进程退出而显示成加载失败（黄点），
  // 用户既看不到工具、也不知道错在哪。改为启动成功 + 调用时报明确原因。
  cfg.configured = Boolean(cfg.username && cfg.password) || Boolean(cfg.jwtSecret);
  cfg.configError = "";
  if (credFileError) {
    cfg.configured = false;
    cfg.configError = `凭据文件读取失败：${credFileError}`;
  } else if (!cfg.configured) {
    cfg.configError =
      "未配置认证方式。请在凭据文件（MP_CREDENTIALS_FILE，默认 ~/.workbuddy/credentials/mp.env）中设置 " +
      "MP_USERNAME + MP_PASSWORD（登录模式），或 MP_JWT_SECRET（自签模式）。" +
      "可运行 tools/mcp-miniprogram/scripts/setup-credentials.sh 生成。";
  } else if (cfg.username && !cfg.password) {
    cfg.configured = false;
    cfg.configError = "配置了 MP_USERNAME 但缺少 MP_PASSWORD，请补全凭据文件。";
  }
  return cfg;
}

export const ADMIN_API = "/api/v1/admin";

/** 敏感路径黑名单：即便后续扩展工具，也不允许触达财务/退款/系统/权限等模块 */
const SENSITIVE_PREFIXES = [
  `${ADMIN_API}/finance`,
  `${ADMIN_API}/refunds`,
  `${ADMIN_API}/system`,
  `${ADMIN_API}/admin-users`,
  `${ADMIN_API}/roles`,
  `${ADMIN_API}/permissions`,
  `${ADMIN_API}/agent`,
];

/** 敏感前缀下的例外：素材上传走 /admin/system/upload，允许 */
const SENSITIVE_EXCEPTIONS = new Set([`${ADMIN_API}/system/upload`]);

export function assertPathAllowed(fullPath) {
  if (SENSITIVE_EXCEPTIONS.has(fullPath)) return;
  for (const prefix of SENSITIVE_PREFIXES) {
    if (fullPath === prefix || fullPath.startsWith(prefix + "/")) {
      throw new Error(
        `已拦截：${fullPath} 属于敏感模块（财务/退款/系统配置/账号权限），本连接器不提供访问`
      );
    }
  }
}
