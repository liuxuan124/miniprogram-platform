import crypto from "node:crypto";
import { ADMIN_API } from "./config.js";

/**
 * 认证层：两种模式
 *  A 登录模式：POST /api/v1/admin/auth/login 取 accessToken，到期前 5 分钟自动重登
 *  B 自签模式：用 jwt.secret 直接 HS256 签一个 admin token（claims: sub/userId/typ/iat/exp）
 */

const state = {
  token: "",
  expireAt: 0, // epoch ms
  mode: "",
};

function b64url(input) {
  return Buffer.from(input).toString("base64url");
}

function signJwt(secret, payload) {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const signingInput = `${header}.${body}`;
  const sig = crypto.createHmac("sha256", Buffer.from(secret, "utf8")).update(signingInput).digest("base64url");
  return `${signingInput}.${sig}`;
}

function selfSignedToken(cfg) {
  const now = Math.floor(Date.now() / 1000);
  return signJwt(cfg.jwtSecret, {
    sub: "admin",
    userId: cfg.adminUserId,
    typ: "access",
    iat: now,
    exp: now + 7200, // 2 小时
  });
}

async function login(cfg) {
  const res = await fetch(`${cfg.base}${ADMIN_API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: cfg.username, password: cfg.password }),
    signal: AbortSignal.timeout(cfg.timeoutMs),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json || json.code !== 200 || !json.data?.accessToken) {
    throw new Error(
      `管理端登录失败：HTTP ${res.status} / code=${json?.code} / ${json?.message || "无返回"}`
    );
  }
  const ttlSec = Number(json.data.expiresIn || 7200);
  state.token = json.data.accessToken;
  state.expireAt = Date.now() + ttlSec * 1000;
  state.mode = "login";
  return state.token;
}

/** 取一个可用的访问令牌 */
export async function getAccessToken(cfg) {
  if (!cfg.configured) {
    throw new Error(`连接器未完成配置 · ${cfg.configError}`);
  }
  if (cfg.username && cfg.password) {
    // 提前 5 分钟续期
    if (!state.token || state.mode !== "login" || Date.now() > state.expireAt - 5 * 60 * 1000) {
      return login(cfg);
    }
    return state.token;
  }
  // 自签模式：每次现签，2h 有效期内可复用
  if (!state.token || state.mode !== "self" || Date.now() > state.expireAt - 5 * 60 * 1000) {
    state.token = selfSignedToken(cfg);
    state.expireAt = Date.now() + 2 * 60 * 60 * 1000;
    state.mode = "self";
  }
  return state.token;
}

/** 401 后强制刷新：清缓存让下次重新获取 */
export function invalidateToken() {
  state.token = "";
  state.expireAt = 0;
  state.mode = "";
}

export function authMode(cfg) {
  return cfg.username && cfg.password
    ? "login(用户名密码)"
    : `self-signed(userId=${cfg.adminUserId})`;
}
