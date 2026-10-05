import { ADMIN_API, assertPathAllowed } from "./config.js";
import { getAccessToken, invalidateToken } from "./auth.js";

/**
 * 统一请求封装：
 *  - 自动带 Bearer token
 *  - 业务码非 200 直接抛错（后端统一 R{code,message,data}）
 *  - 401 自动刷新 token 重试一次
 */
export async function request(cfg, { method = "GET", path, query = {}, body = null, retry = true }) {
  assertPathAllowed(path);
  const url = new URL(`${cfg.base}${path}`);
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }

  const headers = { Accept: "application/json" };
  if (cfg.tenantId) headers["X-Tenant-Id"] = String(cfg.tenantId);
  if (body !== null) headers["Content-Type"] = "application/json";
  headers.Authorization = `Bearer ${await getAccessToken(cfg)}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body === null ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(cfg.timeoutMs),
  });

  // 401：token 可能过期，刷新后重试一次
  if ((res.status === 401 || res.status === 403) && retry) {
    invalidateToken();
    return request(cfg, { method, path, query, body, retry: false });
  }

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`响应不是合法 JSON：HTTP ${res.status} ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} · code=${json?.code} · ${json?.message || text.slice(0, 200)}`);
  }
  if (json && json.code !== undefined && json.code !== 200) {
    throw new Error(`业务失败 code=${json.code} · ${json.message || ""}`);
  }
  return json ? json.data : null;
}

/** 多部分文件上传（素材/图片） */
export async function uploadFile(cfg, filePath, field = "file") {
  const { readFile } = await import("node:fs/promises");
  const buf = await readFile(filePath);
  const filename = filePath.split("/").pop() || "upload.bin";
  const form = new FormData();
  form.append(field, new Blob([buf]), filename);

  const headers = {};
  if (cfg.tenantId) headers["X-Tenant-Id"] = String(cfg.tenantId);
  headers.Authorization = `Bearer ${await getAccessToken(cfg)}`;

  const res = await fetch(`${cfg.base}${ADMIN_API}/system/upload`, {
    method: "POST",
    headers,
    body: form,
    signal: AbortSignal.timeout(cfg.timeoutMs),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json || json.code !== 200) {
    throw new Error(`上传失败：HTTP ${res.status} · ${json?.message || ""}`);
  }
  return json.data;
}
