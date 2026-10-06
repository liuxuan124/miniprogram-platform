# 交接给部署 Agent：page-builder 部署规程

> 写于 2026-10-06。本文档给**部署会话**看，开发会话请看 `AGENTS.md` 的「部署纪律」节。

---

## 一句话现状

今天多会话并行部署 **6 次，其中 2 次互相顶掉**，线上 `assets/` 堆了 **963 个 `index-*.js`**（正常 1-2 个）。
根因不是谁操作错，而是**没有共享状态** —— 每个会话都以为自己是唯一部署方。

已建好守卫工具，**请统一走统一入口，不要裸部署**。

---

## 你只需要记这一条命令

```bash
cd /Users/lx/项目文件/liuxuan/小程序搭建运营系统
deploy/scripts/deploy-admin-static.sh
```

它会依次做：守卫检查 → 备份 → 构建 → 上传 → 解压 → 验证入口 chunk → 记录状态。
任何一步不通过会**自动中止**，不会把半成品推上线。

常用变体：

| 场景 | 命令 |
|---|---|
| 只检查不部署 | `deploy/scripts/deploy-admin-static.sh --check-only` |
| 确认无风险要强推 | `FORCE_DEPLOY=1 deploy/scripts/deploy-admin-static.sh` |
| 单独跑守卫 | `node deploy/scripts/deploy-guard.mjs` |

---

## 四条铁律（都是踩过的坑）

### 1. 🔴 禁止 `rsync --delete`

`deploy/scripts/push-admin-dist-to-prod.sh` **有这个问题，会删掉线上非构建资源**。别用。
部署一律走 `tar -xzf` 解压式（统一入口已内置）。

### 2. 🔴 判断「线上是不是我这份」不能只看时间

`tar -xzf` **不更新 mtime**。所以线上文件时间可能比你的构建时间还早，看起来像「没部署过」，实际是别人的。

**正确判据**：看 `index.html` 引用的入口 chunk：

```bash
ssh zfculture 'grep -oE "assets/index-[A-Za-z0-9_-]+\.js" /opt/miniprogram-platform/admin-static/index.html'
```

### 3. 🔴 解压后必须立即验证

解压完立刻跑上面那条命令，确认指向你的 `index-XX.js`。
不验的话，你可能部署成功又被别人覆盖了还不知道（今天发生过 2 次）。

### 4. 部署完跑清理脚本

```bash
scp deploy/scripts/prune-admin-static-assets.sh deploy/scripts/prune-deploy-backups.sh zfculture:/tmp/
ssh zfculture 'bash /tmp/prune-admin-static-assets.sh; PRUNE_RESULT=/tmp/_pb.json bash /tmp/prune-deploy-backups.sh'
```

⚠️ **远端 `/tmp` 不持久**，这两个脚本每次都要重新 scp 上传。

---

## 环境速查

| 项 | 值 |
|---|---|
| 服务器 | `ssh zfculture`（别名已配） |
| 静态目录 | `/opt/miniprogram-platform/admin-static` |
| 后端 jar | `/opt/miniprogram-platform/backend/app.jar`（**不在根目录**） |
| 域 | `admin.zfculture.site` |
| 备份保留 | 3 个（`admin-static.bak-*`） |

---

## 当前线上状态（交接时）

- 入口 chunk：`index-IVhcOQjz.js`（14:53:33 由另一会话部署）
- 今天四轮修复**均已在线**：

| 轮次 | 内容 | 特征串（验证用） |
|---|---|---|
| 1 | hydrate 触发条件（改属性不再整页重拉） | `recommend_plan_id`（329 文件） |
| 2 | 拖滑块性能（脏标记乐观置位） | `hasUnpersistedChanges`（214 文件） |
| 3 | 笔记流样式（指示器色/搜索图标/卡片阴影） | `tab_indicator_color`（11）、`card_shadow_custom`（10） |
| 4 | 数量字段不再带 px | `semantic`（14） |

> ⚠️ `displayUnit` 查不到是正常的 —— 会被压缩改名。别用它做判据。

---

## ⚠️ 一个已知未解决的问题

**963 个 `index-*.js` 清不掉**。

`prune-admin-static-assets.sh` 按「静态引用」判断孤儿，但**解压式部署的机制导致旧构建的 chunk 都被某一版 `index.html` 引用过**，所以它们全被判定为「被引用」。

要清理得改成「按 `index.html` 引用链可达性」判断，或者定期重开一次干净目录部署。
**这是个有风险的改造，不要顺手做** —— 需要单独评估。

---

## 遇到问题怎么办

| 现象 | 处理 |
|---|---|
| 守卫报「线上已被其他会话替换」 | 正常。先确认对方部署的内容是否要保留，再决定是否追平 |
| 守卫报 TS 错误 | **多半是另一个会话的半成品**。等其完成，或与对方确认后再 `FORCE_DEPLOY` |
| 守卫报「5 分钟内有文件被改动」 | 并发会话正在写。构建产物可能与其交叉，部署后**主动告知对方** |
| 部署后线上仍不是我这份 | 被覆盖了。记下时间，排查是否有人同时部署 |

---

## 最重要的一句

**部署前跑一次 `deploy/scripts/deploy-guard.mjs`，部署后立刻验证入口 chunk。**
这两步能避免今天发生的所有问题。
