#!/usr/bin/env python3
"""Import Xiaohongshu + WeChat Official Account posts into miniapp content library."""

from __future__ import annotations

import json
import subprocess
import sys
import urllib.error
import urllib.request

BASE = "http://localhost:8080"
ORIGIN = "http://localhost:5175"

# From user screenshots
XHS_POSTS = [
    {
        "title": "跨境电商-从国内到海外货物运输全流程解析",
        "publishedAt": "2025-09-15 20:31:00",
        "viewCount": 16653,
        "commentCount": 14,
        "likeCount": 389,
        "favoriteCount": 489,
        "shareCount": 113,
        "pinned": True,
        "category": "物流清关",
        "summary": "从国内仓到海外履约的全链路拆解：头程、清关、尾程与异常单处理。",
    },
    {
        "title": "跨境电商合规架构“保姆级”解读!",
        "publishedAt": "2025-09-08 20:31:00",
        "viewCount": 9573,
        "commentCount": 48,
        "likeCount": 335,
        "favoriteCount": 549,
        "shareCount": 149,
        "pinned": True,
        "category": "平台运营",
        "summary": "用可落地的合规架构，帮卖家理清主体、税务、产品合规与平台规则边界。",
    },
    {
        "title": "铺货越来越难做了!!!",
        "publishedAt": "2026-07-21 20:31:00",
        "viewCount": 2138,
        "commentCount": 14,
        "likeCount": 75,
        "favoriteCount": 135,
        "shareCount": 63,
        "pinned": False,
        "category": "选品方法论",
        "summary": "铺货红利消退后，如何从“铺得快”转向“测得准、做得稳”。",
    },
    {
        "title": "🥳 在小红书创作1周年啦!",
        "publishedAt": "2026-07-16 20:31:00",
        "viewCount": 1471,
        "commentCount": 20,
        "likeCount": 88,
        "favoriteCount": 82,
        "shareCount": 53,
        "pinned": False,
        "category": "IP人设与内容",
        "summary": "一年创作复盘：内容选题、人设沉淀与知识库变现路径。",
    },
    {
        "title": "购物车门槛取消,新卖家能捡漏吗?",
        "publishedAt": "2026-07-15 20:31:00",
        "viewCount": 1924,
        "commentCount": 14,
        "likeCount": 88,
        "favoriteCount": 155,
        "shareCount": 37,
        "pinned": False,
        "category": "平台运营",
        "summary": "购物车门槛变化后的机会与坑：新卖家该怎么判断值不值得冲。",
    },
    {
        "title": "📌不是刷几个关键词,而是流量逻辑变了",
        "publishedAt": "2026-07-14 20:31:00",
        "viewCount": 1574,
        "commentCount": 8,
        "likeCount": 67,
        "favoriteCount": 139,
        "shareCount": 48,
        "pinned": False,
        "category": "平台运营",
        "summary": "别再只盯关键词堆砌，先看懂平台流量分发逻辑再做内容与广告。",
    },
]

OA_POSTS = [
    {
        "title": "从Rufus到Alexa：跨境电商的流量入口正在被重新分配",
        "publishedAt": "2026-07-22 20:30:00",
        "category": "平台运营",
        "summary": "AI助手正在改写跨境流量入口，卖家要重新评估获客与转化链路。",
    },
    {
        "title": "AI体系投入产出怎么算？管理者的ROI决策公式",
        "publishedAt": "2026-07-22 20:30:00",
        "category": "IP人设与内容",
        "summary": "给管理者一套可计算的 AI 投入产出公式，避免“为上AI而上AI”。",
    },
    {
        "title": "欧盟免税时代终结，低价小包模式还走得通吗？",
        "publishedAt": "2026-07-22 20:30:00",
        "category": "物流清关",
        "summary": "免税政策变化后，低价小包的成本、时效与合规边界如何重估。",
    },
    {
        "title": "亚马逊标题字符新规7月27日生效+301关税叠加至35%+CPSC强制电子申报 | 每周跨境热点周报第21期",
        "publishedAt": "2026-07-22 20:30:00",
        "category": "平台运营",
        "summary": "本周跨境热点：亚马逊标题规则、301关税与CPSC电子申报要点速览。",
    },
]


def req(method: str, path: str, token: str | None = None, body=None):
    data = None if body is None else json.dumps(body, ensure_ascii=False).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "Origin": ORIGIN,
        "Accept": "application/json",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            payload = {"raw": raw}
        return e.code, payload


def ok(payload: dict):
    return payload.get("code") in (0, 200)


def mysql(sql: str):
    cmd = [
        "docker",
        "exec",
        "miniapp-mysql",
        "mysql",
        "-uroot",
        "-proot123456",
        "miniapp",
        "-e",
        sql,
    ]
    subprocess.run(cmd, check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def build_html(title: str, source: str, summary: str, metrics: dict | None = None) -> str:
    metric_html = ""
    if metrics:
        metric_html = (
            f"<p><strong>平台数据</strong>：阅读 {metrics.get('viewCount', 0)} · "
            f"评论 {metrics.get('commentCount', 0)} · 点赞 {metrics.get('likeCount', 0)} · "
            f"收藏 {metrics.get('favoriteCount', 0)} · 转发 {metrics.get('shareCount', 0)}</p>"
        )
    return (
        f"<h2>{title}</h2>"
        f"<p><strong>来源</strong>：{source}</p>"
        f"{metric_html}"
        f"<p>{summary}</p>"
        "<p>本文已从原平台同步到小程序知识库。可在后台「内容管理」补充完整正文、封面与外链。</p>"
    )


def main():
    status, payload = req(
        "POST",
        "/api/v1/admin/auth/login",
        body={"username": "admin", "password": "admin123"},
    )
    if not ok(payload):
        print("login failed", payload)
        sys.exit(1)
    token = payload["data"]["accessToken"]

    # category map
    status, payload = req("GET", "/api/v1/admin/content-categories", token)
    cats = payload.get("data") or []
    if isinstance(cats, dict):
        cats = cats.get("records") or []
    cat_ids = {c.get("name"): c.get("id") for c in cats if isinstance(c, dict)}

    # existing titles
    status, payload = req("GET", "/api/v1/admin/contents?current=1&size=200", token)
    data = payload.get("data") or {}
    records = data.get("records") if isinstance(data, dict) else (data or [])
    by_title = {r.get("title"): r for r in records if isinstance(r, dict)}

    def upsert(post: dict, source: str, sort_base: int, idx: int):
        title = post["title"]
        tags = [source, post["category"]]
        if post.get("pinned"):
            tags.append("置顶")
        if source == "小红书":
            tags.extend(
                [
                    f"评论:{post.get('commentCount', 0)}",
                    f"收藏:{post.get('favoriteCount', 0)}",
                    f"转发:{post.get('shareCount', 0)}",
                ]
            )
        body = {
            "title": title[:128],
            "contentType": "note" if source == "小红书" else "article",
            "categoryId": cat_ids.get(post["category"]),
            "coverImage": f"https://picsum.photos/seed/{abs(hash(title)) % 100000}/600/800",
            "images": [
                f"https://picsum.photos/seed/{abs(hash(title)) % 100000}/600/800",
                f"https://picsum.photos/seed/{abs(hash(title + 'b')) % 100000}/600/800",
            ] if source == "小红书" else None,
            "summary": post["summary"][:512],
            "content": build_html(
                title,
                source,
                post["summary"],
                post if source == "小红书" else None,
            ),
            "author": "跨境IP博主",
            "source": source,
            "tags": tags,
            "likeCount": int(post.get("likeCount") or 0),
            "favoriteCount": int(post.get("favoriteCount") or 0),
            "sortOrder": sort_base + idx,
        }

        existing = by_title.get(title)
        if existing:
            cid = existing["id"]
            status, payload = req("PUT", f"/api/v1/admin/contents/{cid}", token, body)
            print(("OK" if ok(payload) else "FAIL"), "update", title[:24], payload.get("message"))
        else:
            status, payload = req("POST", "/api/v1/admin/contents", token, body)
            if not ok(payload):
                print("FAIL create", title[:24], payload)
                return
            cid = payload["data"]["id"]
            print("OK create", title[:24], "id=", cid)

        status, payload = req("PUT", f"/api/v1/admin/contents/{cid}/publish", token)
        print(("OK" if ok(payload) else "FAIL"), "publish", cid)

        # metrics + publish time via SQL (API create forces counters to 0)
        # 注意：不要在 docker mysql -e 里写中文 source，会乱码；source 已由 API 写入
        view = int(post.get("viewCount") or 0)
        like = int(post.get("likeCount") or 0)
        favorite = int(post.get("favoriteCount") or 0)
        published = post.get("publishedAt") or "2026-07-22 20:30:00"
        mysql(
            "UPDATE mp_content SET "
            f"view_count={view}, like_count={like}, favorite_count={favorite}, "
            f"published_at='{published}', "
            f"status='published' WHERE id={cid};"
        )

    for i, post in enumerate(XHS_POSTS):
        upsert(post, "小红书", 10, i)
    for i, post in enumerate(OA_POSTS):
        upsert(post, "微信公众号", 20, i)

    print("DONE")


if __name__ == "__main__":
    main()
