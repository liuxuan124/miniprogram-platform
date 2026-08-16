# BATCH-QA-025 剩余 PARTIAL 修复证据

时间：2026-08-16 15:40

## 代码修复

| FP | 变更 |
| --- | --- |
| FP-UI-094/101 | `componentRegistry` Banner/Nav validate 必填 |
| FP-UI-107/114/131 | `useEditorLiveItems.failed` + Renderer fail/loading/empty |
| FP-UI-121 | ActivityEntry `_previewDataFailed` 提示条 |
| FP-UI-127 | MemberCard 未登录态示意文案 |
| FP-UI-136 | VideoRenderer 画布内可播放 |
| FP-UI-059 | CanvasArea `data-testid=canvas-drop-zone` |

## API 回归

| 检查 | 结果 |
| --- | --- |
| page/14 stale draft | HTTP **409** code=300409 |
| page/14 publish | HTTP **200** path=`pages/custom/qa014-...` |

## 台账（268 正式分母）

- **266 PASS / 0 PARTIAL / 0 FAIL / 2 BLOCKED**
- BLOCKED：`FP-API-076`（无租户）、`FP-API-078`（难造 500）
