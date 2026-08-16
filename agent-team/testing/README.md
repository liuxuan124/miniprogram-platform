# 测试产物目录

本目录由 `qa-release-agent` 维护。总控可确认功能点清单，但不得改写功能点内容。

| 路径 | 用途 |
| --- | --- |
| `feature-inventory.md` | 原子功能点清单，须经总控确认后才能进入用例设计 |
| `status-ledger.md` | 功能点进度台账，断点续测的唯一依据 |
| `cases/` | 测试用例，字段见 `_template.md` |
| `defects/` | 缺陷单，字段见 `_template.md` |
| `contract-conflicts/` | 契约冲突单；出现后必须 `BLOCKED` 并交总控裁决 |
| `evidence/` | 截图、日志、请求响应原文等证据 |

工作模式、阶段门禁与禁止事项见 `agent-team/agents/qa-release-agent.md`。
