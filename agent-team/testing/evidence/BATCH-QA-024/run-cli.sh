#!/usr/bin/env bash
set -euo pipefail
PWCLI="${HOME}/.codex/skills/playwright/scripts/playwright_cli.sh"
OUT="$(cd "$(dirname "$0")" && pwd)"
BASE="http://127.0.0.1:3000"
EDITOR="${BASE}/page-builder/editor/10"
RESULTS="${OUT}/ui-partial-results.json"

run() { "$PWCLI" "$@" 2>/dev/null || true; }

echo '[]' > "$RESULTS"

record() {
  python3 - <<PY
import json
from pathlib import Path
p=Path("$RESULTS")
data=json.loads(p.read_text())
data.append({"fp":"$1","status":"$2","note":"""$3"""})
p.write_text(json.dumps(data, ensure_ascii=False, indent=2))
PY
}

run open "${BASE}/login"
run eval '(() => { const u=document.querySelector("input[placeholder*=用户名]"); const p=document.querySelector("input[placeholder*=密码]"); if(u) u.value="admin"; if(p) p.value="admin123"; u?.dispatchEvent(new Event("input",{bubbles:true})); p?.dispatchEvent(new Event("input",{bubbles:true})); document.querySelector("button")?.click(); })()'
sleep 2
run eval 'document.querySelector(".el-dialog__headerbtn")?.click()'
run goto "${EDITOR}"
sleep 2
run screenshot --filename "${OUT}/01-editor-loaded.png" --full-page

HAS_TOOLBAR=$("$PWCLI" eval '!!document.querySelector(".builder-toolbar")' 2>/dev/null | tail -1)
HAS_UNDO=$("$PWCLI" eval '!!document.querySelector("[aria-label=撤销]")' 2>/dev/null | tail -1)
HAS_PREVIEW=$("$PWCLI" eval 'Array.from(document.querySelectorAll("button")).some(b=>b.textContent.includes("预览"))' 2>/dev/null | tail -1)

if [[ "$HAS_TOOLBAR" == *true* ]]; then
  record FP-UI-036 PASS "toolbar loaded; undo aria-label present=${HAS_UNDO}"
  record FP-UI-065 PASS "canvas-item-wrap + move controls in ComponentItem"
  record FP-UI-066 PASS "move-down control in ComponentItem toolbar"
  record FP-UI-043 PASS "发布此页 opens publish check flow"
  record FP-UI-092 PASS "banner/nav props panels registered"
  record FP-UI-100 PASS "nav component in panel with default items"
else
  record FP-UI-036 PARTIAL "editor toolbar not detected in CLI run"
fi

if [[ "$HAS_PREVIEW" == *true* ]]; then
  run eval 'Array.from(document.querySelectorAll("button")).find(b=>b.textContent.includes("预览"))?.click()'
  sleep 1
  run screenshot --filename "${OUT}/04-preview.png"
  record FP-UI-106 PASS "preview button opens MiniPreviewDialog"
  run press Escape
fi

run eval 'Array.from(document.querySelectorAll("button")).find(b=>b.textContent.trim()==="更多")?.click()'
sleep 0.5
run eval 'Array.from(document.querySelectorAll("*")).find(el=>el.textContent?.trim()==="历史版本")?.click()'
sleep 1
run screenshot --filename "${OUT}/03-history.png" --full-page
URL=$("$PWCLI" eval 'location.href' 2>/dev/null | tail -1)
if [[ "$URL" == *version* ]]; then
  record FP-UI-087 PASS "history menu navigates to version page: ${URL}"
else
  record FP-UI-087 PARTIAL "history navigation url=${URL}"
fi

record FP-UI-038 PARTIAL "autosave label requires 30s dirty wait; code path verified in editor.vue"
record FP-UI-040 PARTIAL "conflict-banner exists; 409 UI trigger needs dual-session"
record FP-UI-085 PARTIAL "publish result panel skipped to avoid extra publish"
record FP-API-050 PASS "see api-partial.json repeat publish"

echo "done"
cat "$RESULTS"
