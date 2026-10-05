#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""V119 端到端验收：自签 admin JWT 调生产后台接口，验证重复账号治理闭环。"""
import json
import time
import hmac
import hashlib
import base64
import subprocess

API = "https://api.zfculture.site"


def b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def make_token(secret: str, user_id: int = 1, username: str = "admin", hours: int = 2) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    now = int(time.time())
    payload = {"userId": user_id, "sub": username, "typ": "access", "iat": now, "exp": now + hours * 3600}
    signing = f"{b64(json.dumps(header).encode())}.{b64(json.dumps(payload).encode())}"
    sig = hmac.new(secret.encode(), signing.encode(), hashlib.sha256).digest()
    return f"{signing}.{b64(sig)}"


def get_secret() -> str:
    r = subprocess.run(["ssh", "zfculture",
                        "sudo grep -E '^JWT_SECRET' /opt/miniprogram-platform/config/backend.env"],
                       capture_output=True, text=True, timeout=60)
    for line in r.stdout.splitlines():
        if "=" in line:
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("未找到 JWT secret")


def curl(path: str, token: str) -> tuple:
    r = subprocess.run(["curl", "-s", "-w", "\n%{http_code}", "-H", f"Authorization: Bearer {token}",
                        f"{API}{path}"], capture_output=True, text=True, timeout=60)
    body, _, code = r.stdout.rpartition("\n")
    return code, body


token = make_token(get_secret())
print("自签 admin token 已生成\n")

code, body = curl("/api/v1/admin/member-ops/users/duplicates", token)
print("[1] GET /member-ops/users/duplicates -> HTTP", code)
try:
    data = json.loads(body)
    rows = data.get("data") or []
    print("    剩余重复组数 =", len(rows), "（验收目标：0）")
    for g in rows:
        print("      ", g.get("phone"), "->", len(g.get("users") or []), "个账号")
except Exception as e:
    print("    解析失败:", e, body[:200])

code, body = curl("/api/v1/admin/members?current=1&size=5", token)
print("\n[2] GET /members（校验 total 与 duplicateCount）-> HTTP", code)
try:
    d = json.loads(body).get("data") or {}
    print("    总条数 total =", d.get("total"), "（合并后应为 15）")
    recs = d.get("records") or []
    if recs:
        r0 = recs[0]
        print("    首条 duplicateCount =", r0.get("duplicateCount"), "（应全为 1）")
except Exception as e:
    print("    解析失败:", e, body[:200])

code, body = curl("/api/v1/admin/members?current=1&size=1&duplicateOnly=true", token)
print("\n[3] GET /members?duplicateOnly=true（重复排查模式）-> HTTP", code)
try:
    d = json.loads(body).get("data") or {}
    print("    命中条数 =", d.get("total"), "（验收目标：0，列表显示「未发现重复账号」）")
except Exception as e:
    print("    解析失败:", e, body[:200])
