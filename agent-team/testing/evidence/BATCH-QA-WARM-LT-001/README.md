# BATCH-QA-WARM-LT-001 执行摘要（证据索引）

- at: 2026-09-19T23:05+08:00
- work_mode: QA
- wx_version_target: 1.30.4
- api: https://api.zfculture.site

## 已落盘证据

| 文件 | 用途 |
| --- | --- |
| api-health.json | GET /api/health UP |
| planet-home.json / planet-dual-fields.json | 双态会员字段 |
| mine-overview-unauth.json | mine overview 未登录 401 |
| upload-unauth.json | upload 未登录 401 |
| uploads-200.txt | 公网 /uploads/ 拉图 200 |
| db-snapshot.txt | avatar 无 wxfile；membership 表；1.30.4 |
| local-pngs.txt | 包内默认 PNG 存在 |

## 未执行原因

- 无生产 MP JWT → authed upload / profile / mine overview 成功路径 NOT_RUN
- 无微信真机自动化环境 → TC-WARM-MP-* NOT_RUN
