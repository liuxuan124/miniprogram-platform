# 部署 Agent 交接（转发这段即可）

## 你只需要记一条命令

```bash
cd /Users/lx/项目文件/liuxuan/小程序搭建运营系统
deploy/scripts/deploy-admin-static.sh
```

**禁止裸部署** —— 不要用 `rsync`、不要手动 `scp dist` 到线上、不要自己手写 `tar -xzf`。
这条命令会自动做：守卫检查 → 备份 → 构建 → 上传 → 解压 → 验证入口 chunk → 记录状态，
任何一步不通过会自动中止（不会把半成品推上线）。

## 为什么有这条规矩

今天多会话并行部署 **6 次，其中 2 次互相顶掉**。线上 `assets/` 现在堆了
**963 个 `index-*.js`**（正常 1-2 个）—— 根因不是谁操作错，而是没有共享状态，
每个会话都以为自己是唯一部署方。

## 四条铁律（都是今天踩出来的）

1. **禁 `rsync --delete`** —— `deploy/scripts/push-admin-dist-to-prod.sh` 有这问题，
   会删掉线上非构建资源。
2. **不能只看 mtime 判断线上是不是我这份** —— `tar -xzf` 不更新 mtime，
   会误判成「没部署过」。正确判据是看 `index.html` 引用的入口 chunk：
   ```bash
   ssh zfculture 'grep -oE "assets/index-[A-Za-z0-9_-]+\.js" /opt/miniprogram-platform/admin-static/index.html'
   ```
3. **解压后立刻跑上面那条命令验证** —— 不验的话，部署成功又被别人覆盖都不知道。
4. **部署完跑清理脚本，且远端 `/tmp` 不持久，要重新 scp 上传**：
   ```bash
   scp deploy/scripts/prune-admin-static-assets.sh deploy/scripts/prune-deploy-backups.sh zfculture:/tmp/
   ssh zfculture 'bash /tmp/prune-admin-static-assets.sh; PRUNE_RESULT=/tmp/_pb.json bash /tmp/prune-deploy-backups.sh'
   ```

## 环境速查

- 服务器 `ssh zfculture`｜静态目录 `/opt/miniprogram-platform/admin-static`
- 后端 jar 在 `backend/app.jar`（**不在根目录**）｜域 `admin.zfculture.site`
- 备份保留 3 个（`admin-static.bak-*`）

## 遇到问题怎么办

| 守卫报什么| 怎么办 |
|---|---|
| 线上已被其他会话替换 | 正常。先确认对方内容要不要保留，再决定是否追平 |
| TS 错误 | **多半是另一会话的半成品**，等其完成或确认后 `FORCE_DEPLOY=1` |
| 5 分钟内有文件被改 | 并发会话正在写，部署后**主动告知对方** |
| 部署后线上仍不是我这份 | 被覆盖了，记下时间排查是否有人同时部署 |

## 两件要知道的事

- **线上 963 个 `index-*.js` 清不掉**：清理脚本按「静态引用」判断，
  而解压式部署让旧 chunk 都被某版 `index.html` 引用过，全算「被引用」。
  要清得改成「从当前 index.html 出发的引用链可达性」—— **有风险，别顺手做**。
- **判据要选压缩后仍保留的字符串**：别用 computed/变量名（如 `displayUnit`
  会被 terser 改名，grep 不到），要用 prop 名（如 `semantic`）。

## 分工

- **开发会话**：只出代码 + 构建产物 + `CHANGELOG` 一行，**不碰线上**
- **部署会话**：统一跑上面那条命令发版

完整版：`deploy/DEPLOY-HANDOVER.md`（`AGENTS.md` 顶部也有摘要）
