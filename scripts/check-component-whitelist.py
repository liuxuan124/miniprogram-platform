#!/usr/bin/env python3
"""三向比对 admin / miniapp / backend 组件白名单。"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def admin_types() -> set[str]:
    registry = (ROOT / "admin/src/components/page-builder/componentRegistry.ts").read_text(encoding="utf-8")
    enum_src = (ROOT / "admin/src/types/page.ts").read_text(encoding="utf-8")
    block = re.search(
        r"MINIAPP_RENDER_SUPPORTED_TYPES\s*=\s*new\s+Set<ComponentType>\(\[([\s\S]*?)\]\)",
        registry,
    )
    if not block:
        raise SystemExit("FAIL: 未找到 MINIAPP_RENDER_SUPPORTED_TYPES")
    keys = re.findall(r"ComponentType\.([A-Za-z0-9_]+)", block.group(1))
    enum_map = dict(re.findall(r"([A-Za-z0-9_]+)\s*=\s*'([^']+)'", enum_src))
    out: set[str] = set()
    for k in keys:
        if k not in enum_map:
            raise SystemExit(f"FAIL: admin Set 引用未知 ComponentType.{k}")
        out.add(enum_map[k])
    return out


def miniapp_types() -> set[str]:
    src = (ROOT / "miniapp/utils/render.js").read_text(encoding="utf-8")
    block = re.search(r"const COMPONENT_TYPES\s*=\s*\{([\s\S]*?)\}", src)
    if not block:
        raise SystemExit("FAIL: 未找到 COMPONENT_TYPES")
    return set(re.findall(r":\s*'([^']+)'", block.group(1)))


def backend_types() -> set[str]:
    src = (
        ROOT / "backend/src/main/java/com/miniprogram/service/impl/MiniappReleaseServiceImpl.java"
    ).read_text(encoding="utf-8")
    block = re.search(
        r"SUPPORTED_COMPONENT_TYPES\s*=\s*Set\.of\(([\s\S]*?)\);",
        src,
    )
    if not block:
        raise SystemExit("FAIL: 未找到 SUPPORTED_COMPONENT_TYPES")
    return set(re.findall(r'"([^"]+)"', block.group(1)))


def diff(a: str, b: str, sa: set[str], sb: set[str]) -> bool:
    only_a = sorted(sa - sb)
    only_b = sorted(sb - sa)
    if not only_a and not only_b:
        return False
    print(f"MISMATCH {a} vs {b}", file=sys.stderr)
    if only_a:
        print(f"  only in {a}: {', '.join(only_a)}", file=sys.stderr)
    if only_b:
        print(f"  only in {b}: {', '.join(only_b)}", file=sys.stderr)
    return True


def main() -> int:
    admin = admin_types()
    mini = miniapp_types()
    backend = backend_types()
    print(f"admin ({len(admin)}): {', '.join(sorted(admin))}")
    print(f"miniapp ({len(mini)}): {', '.join(sorted(mini))}")
    print(f"backend ({len(backend)}): {', '.join(sorted(backend))}")
    fail = False
    fail |= diff("admin", "miniapp", admin, mini)
    fail |= diff("admin", "backend", admin, backend)
    fail |= diff("miniapp", "backend", mini, backend)
    if fail:
        print("Component whitelist 三向比对失败", file=sys.stderr)
        return 1
    print(f"OK: component whitelist 三端一致 ({len(admin)} types)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
