# Agent 入口（先读这份）

给后续 Agent 的短入口。细节去链接，不要凭记忆扫全库。

---

## 🚨 如果你要部署 admin-static：先看这一条

```bash
deploy/scripts/deploy-admin-static.sh     # 唯一允许的部署方式
```

**禁止裸部署**（`rsync` / `scp dist` 到线上 / 手写 `tar -xzf`）。
理由：多会话并行部署已造成互相顶掉（2026-10-06 一天 6 次、2 次被顶）。

上面这条命令会自动做：守卫检查（拦「别人半成品带 TS 错误」）→ 备份 →
构建 → 上传 → 解压 → **验证入口 chunk** → 记录状态。不通过会自动中止。

- **可直接转发给部署会话的话术** → `deploy/DEPLOY-HANDOVER-MESSAGE.md`
- 环境速查 / 验证命令 / 故障处理 → `deploy/DEPLOY-HANDOVER.md`
- 开发会话请勿碰线上，交给部署会话发版。

---

## 现在以什么为准

| 主题 | 真相源 | 注意 |
|------|--------|------|
| 库表 / 迁移 | `backend/src/main/resources/db/migration/` | 当前最高 **V101**（含 `V101__channel_attribution.sql` 渠道归因）。`docs/handover/database-schema.md` 只写到 V10，已过期 |
| 跨端契约 | `agent-team/contracts/` | 改接口/表结构/DSL/订单状态前先读冻结日志 |
| 测试续跑 | `agent-team/testing/status-ledger.md` | 禁止凭记忆重头测 |
| 上线人工项 | `docs/handover/pending-items.md` | 资质 / 备案 / 支付商户 |
| 近期产品变更 | `docs/CHANGELOG.md` | **有实质改动就记一行**；季度只做压缩，不当唯一真相 |
| 总控状态 | `agent-team/status/project-status.yaml` | 文件日期可能旧，以 CHANGELOG + git 为准 |

`docs/handover/` 是架构/部署/运维的底稿，不当「本周功能清单」。

## 仓库结构（干活用）

- `backend/` Spring Boot
- `admin/` Vue3 管理后台
- `miniapp/` 微信小程序（含 `pkg-user` 等分包）
- `agent-team/` 多 Agent 协作、契约、QA 台账
- `.cursor/rules/` 工作区规则（术语说明、QA 角色等）

## 🚨 部署纪律（多会话并行，务必遵守）

**同一项目有多个会话并行改动 + 各自部署，已造成互相顶掉**（2026-10-06 实测：当天部署 6 次、2 次被顶，线上堆了 **954 个 `index-*.js`**，正常只1-2 个）。

> 📄 **部署 agent 必读**：`deploy/DEPLOY-HANDOVER.md`（环境速查、验证命令、故障处理）
> 开发 agent 只需知道：**开发会话不碰线上**，把构建产物与 CHANGELOG 交给部署会话。

### 必须走统一入口，禁止裸部署

```bash
deploy/scripts/deploy-admin-static.sh                # 守卫 → 备份 → 构建 → 上传 → 记录
deploy/scripts/deploy-admin-static.sh --check-only   # 只跑守卫，不部署
```

### 守卫会拦什么

| 检查 | 拦住的情况 |
|---|---|
| 线上内容指纹 vs 本地 | 被别的会话顶掉 / 会顶掉别人 |
| 5 分钟内源文件改动 | 另一个会话正在写 → 构建产物可能交叉 |
| TS 编译（排除 3 个历史遗留文件） | 别人半成品带编译错误上线 |

**有 TS 错误时守卫会 `exit 1` 中止**。若确认无风险要强推：
`FORCE_DEPLOY=1 deploy/scripts/deploy-admin-static.sh`

### 分工（2026-10-06 lx 明确）

- **开发会话**：只出代码 + 构建产物 + `CHANGELOG` 一行，**不碰线上**
- **部署会话**：统一跑上面的脚本发版

### 铁律

1. ⚠️ **禁止用 `rsync --delete` 同步**（`push-admin-dist-to-prod.sh` 有此问题，会删线上非构建资源）——
   用 `tar -xzf` 解压式部署
2. ⚠️ **`tar -xzf` 不更新 mtime** —— 判断「线上是不是我这份」要看
   `index.html` 引用的 chunk 名或 sha256，**不能只看时间**
3. ⚠️ **解压后立即验证**：确认线上 `index.html` 指向本地构建的入口 chunk
4. 部署成功后跑 `deploy/scripts/prune-deploy-backups.sh`（备份留 3 个）

---

## 写代码前

1. 读 `docs/CHANGELOG.md` 顶部（本季 + 未入库工作）。
2. 动库表只新增 Flyway（编号续 V101 之后），不要改已执行过的脚本语义。
3. 跨模块改动对照 `agent-team/contracts/`；冲突先停，不要猜哪份为准。
4. QA / 上线任务走 `agent-team/agents/qa-release-agent.md`，先标明 QA 或 RELEASE。

## 改完后维护（强制、短）

在 `docs/CHANGELOG.md` **本季区块顶部**加一行：`YYYY-MM-DD` + 一句话（做了什么、影响哪端、迁移号如有）。

不要：把测试台账抄进来、写长周报、只写进 Cursor Agent Store（换会话读不到）。
