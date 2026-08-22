#!/usr/bin/env python3
"""
将 mp_content.attachments 中带 url 无 fileId 的条目迁移为文件库引用（可选脚本）。

用法:
  python scripts/migrate-moment-attachments-to-file-library.py --api http://127.0.0.1:8080 --token <admin_jwt>

说明:
  - 仅处理 content_type=moment 且 attachments JSON 含 url 的记录
  - 为每个 url 创建 mp_file_item（read_mode=free, status=published）并写回 fileId
  - 生产环境请先备份数据库
"""

from __future__ import annotations

import argparse
import json
import sys
from urllib.parse import urlparse

try:
    import requests
except ImportError:
    print("请先安装 requests: pip install requests", file=sys.stderr)
    sys.exit(1)


def extract_storage_key(url: str) -> str:
    marker = "/uploads/"
    if marker in url:
        return url.split(marker, 1)[1]
    path = urlparse(url).path or url
    return path.lstrip("/")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--api", default="http://127.0.0.1:8080")
    parser.add_argument("--token", required=True)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    headers = {"Authorization": f"Bearer {args.token}", "Content-Type": "application/json"}
    base = args.api.rstrip("/")

    # 管理端内容列表（需按项目实际接口调整分页）
    resp = requests.get(
        f"{base}/api/v1/admin/contents",
        params={"contentType": "moment", "current": 1, "size": 200},
        headers=headers,
        timeout=30,
    )
    resp.raise_for_status()
    payload = resp.json().get("data") or {}
    records = payload.get("records") or []

    migrated = 0
    for row in records:
        attachments = row.get("attachments") or []
        if not attachments:
            continue
        changed = False
        new_list = []
        for att in attachments:
            if att.get("fileId") or att.get("file_id"):
                new_list.append(att)
                continue
            url = att.get("url") or ""
            if not url:
                new_list.append(att)
                continue
            storage_key = extract_storage_key(url)
            file_payload = {
                "name": att.get("name") or "未命名文件",
                "storageKey": storage_key,
                "mimeType": att.get("mimeType") or "",
                "fileType": att.get("fileType") or "other",
                "size": att.get("size") or 0,
                "status": "published",
                "readMode": "free",
                "allowDownload": 1,
                "downloadAudience": "all",
            }
            if args.dry_run:
                print(f"[dry-run] would create file for content {row.get('id')}: {file_payload['name']}")
                att = {**att, "fileId": 0, "url": ""}
                changed = True
                new_list.append(att)
                continue
            create_resp = requests.post(f"{base}/api/v1/admin/files", json=file_payload, headers=headers, timeout=30)
            create_resp.raise_for_status()
            file_id = (create_resp.json().get("data") or {}).get("id")
            att = {**att, "fileId": file_id, "url": ""}
            changed = True
            new_list.append(att)
        if changed and not args.dry_run:
            content_id = row.get("id")
            update_resp = requests.put(
                f"{base}/api/v1/admin/contents/{content_id}",
                json={"attachments": new_list, "attachmentCount": len(new_list)},
                headers=headers,
                timeout=30,
            )
            update_resp.raise_for_status()
            migrated += 1
            print(f"migrated content {content_id}")

    print(f"done, migrated contents: {migrated}")


if __name__ == "__main__":
    main()
