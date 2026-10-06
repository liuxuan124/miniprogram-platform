# admin-static 部署守门检查单

>2026-10-06 建。起因是同一天内出了三次互相覆盖的事故。

## 为什么需要这个

本项目**多个 Agent / 人同时改同一仓库并各自部署**，没有共享的"发车前检查"，
于是出现过：

| 时间 | 事故 | 后果 |
|------|------|------|
| 07:14 → 07:16 | 别人刚部署的版本被我的旧产物覆盖 | 别人的优化上线后立刻消失 |
| 13:2x | 构建被中断，`--outDir` 目录在但缺 `index.html` | 预览全 404，误判成产品崩了 |
| 13:27 | 并行会话的"卡片阴影"只写完schema+面板，渲染器还是空的 | 差点把半成品发上线 |

三次的根因相同：**没有"发车前检查"**。这个脚本把它固化成一条命令。

## 用法

```bash
# 完整检查（只读，安全，可随时跑）
node scripts/deploy-checklist.mjs --out=dist-patch-1

# 部署前：记录基线 + 检查半成品
node scripts/deploy-checklist.mjs --stage=build --out=dist-xxx

# 部署后：全量 md5 验证
node scripts/deploy-checklist.mjs --stage=post --out=dist-xxx
```

退出码：`0` = 无阻断；`1` = 有阻断项，**不要部署**。

## 五道检查各自拦什么

| # | 检查 | 拦的事故 | 判据要点 |
|---|------|---------|---------|
| 1 | 并行改动检测 | 覆盖别人的版本 | 按**文件 mtime**，不按 git（并行会话会提交，git 状态不可信）。5 分钟内仍在变→ 提醒 |
| 2 | 半成品检测 | 配置不生效 | **三端完成度**：schema / panel / renderer。panel>0 且 renderer=0 → **阻断** |
| 3 | 产物完整性 | 部署出空站| 必须 `ls index.html`，**目录存在 ≠ 内容完整** |
| 4 | 覆盖检测 | 盖掉线上内容 | 比对文件集合，列出「将被覆盖」与「线上缺失」 |
| 5 | 部署后验证 | 部署没生效 | **全量 md5**，不用抽样 grep（见下） |

## 三个必须知道的判据

### 1. 抽样 grep 不可靠，必须全量 md5

2026-10-06踩过的坑，三种检测方法全部失效：

| 试过的方法 | 为什么失效 |
|-----------|-----------|
| grep 函数名（如 `toRecords`） | 压缩后被改名，**本地产物里也搜不到** |
| grep 注释里的中文 | 注释被 strip，必然搜不到 |
| 比同名文件 md5 | chunk 文件名按内容哈希变，308 个js 只有 27 个同名 |

**正确做法**：全量算md5 建 map 比对。见 `scripts/check-deploy-byte.mjs`。

### 2. 判断"内容变了但规模未变"要看体积 + md5 两个

`page.ts` 改了 64 行进了产物，但因为在 pinia 主 chunk 里、文件名变 了，
按文件名找不到对应物。**正确判据**：两版主 chunk 体积相同（1138565 字节）+ md5 不同 → 内容变了。

### 3. 词边界匹配，不能用子串计数

写这个脚本时自己踩了：为了模拟半成品，把 `card_shadow` 改名成
`card_shadow_DISABLED_FOR_TEST`，结果子串计数仍返回 3 → **检测失灵、误报"三端齐备"**。

所以用 `field(?![A-Za-z0-9_])`。
**教训跟"测试里复制实现"同源：检测手段本身必须先被反例验证过一次。**

## 半成品检测的判定逻辑

```
renderer 引用数 r、面板引用数 p、schema 声明数 s

r >= 2           → 三端齐备，放行
1<= r < 2        → 提醒"确认不是只读不应用"（完整实现需预设映射 + 样式输出）
r == 0 && p > 0  → 🔴 阻断：面板能配但渲染器不用 = 用户配了不生效
r == 0 && p == 0 → 跳过（未在开发）
```

为什么 `r == 0` 不因"schema 注释写了缺省回落 none"就放行？
因为**注释可能是上一轮留下的，而这一轮已经把字段暴露给面板了**。
以代码现状为准，不以注释为准。

## 新增功能后要做什么

往`TRIPLES` 里加一条：

```js
{
  name: '功能名',
  schema:   'admin/src/components/page-builder/<域>/xxxSchema.ts',
  panel:    'admin/src/components/page-builder/props/XxxProps.vue',
  renderer: 'admin/src/components/page-builder/renderers/XxxRenderer.vue',
  field:    'new_field_name',
}
```

⚠️ 端上（`miniapp/`）**不在 admin-static 范围内**，需另行构建上传。
若功能涉及端上，检查单会提示"请另行确认端上"。

## 配套脚本

| 脚本 | 用途 |
|------|------|
| `scripts/deploy-checklist.mjs` | 本脚本，守门 |
| `scripts/check-deploy-byte.mjs` | 全量 md5 比对（也可单独跑） |
| `deploy/scripts/prune-deploy-backups.sh` | 备份清理（留 3+5） |
| `deploy/scripts/prune-admin-static-assets.sh` | 历史 chunk 清理（⚠️ 当前损坏，见记忆） |

## 禁用

❌ **`deploy/scripts/push-admin-dist-to-prod.sh` 禁止使用**。
两个问题：`rsync --delete` 会删线上非构建资源；`npm run build` 固定输出到 `dist/`，
会覆盖并行会话的其他产物目录。

正确姿势：`npx vite build --outDir <独立目录>` + tar + 手工部署。
