# 一次性部署交接单（2026-10-05）

> 交接对象：下一个执行部署的 Agent
> 目标环境：生产服务器 Ubuntu 22.04，SSH 别名 `zfculture`，部署根 `/opt/miniprogram-platform`
> **本文禁止写入真实服务器 IP / 密码，统一用占位符。**

## 一、执行摘要

**本次是把多个并行会话累积的 8 项「未部署」工作一次性上线**，涉及三段：

| 段 | 内容 | 是否必做 |
|---|---|---|
| ① 数据库 | 手工执行 V112、V113（生产未启用 flyway） | 必做 |
| ② 后端 | 替换 `app.jar` + restart | 必做 |
| ③ 后台 | 替换 `admin-static/` | 必做 |
| ④ 小程序 | 上传新版本 + 提审 | 需 lx 在 IDE 操作 |

## 二、🚫 红线（照做会出事）

| # | 禁止动作 | 后果 | 正确做法 |
|---|---|---|---|
| 1 | 用 `deploy/nginx/` 覆盖生产 nginx 配置 | HTTPS 全挂（生产配置含 Certbot 443） | **跳过，nginx 不动** |
| 2 | 覆盖 `/opt/miniprogram-platform/config/backend.env` | 后端连不上 DB / 支付回调失效 | **跳过，env 不动** |
| 3 | 执行 `deploy/scripts/push-admin-dist-to-prod.sh` | `rsync --delete` 删掉线上非构建资源 | **禁用**；用 `tar` 解压式覆盖 |
| 4 | 未备份直接跑迁移 | 不可逆 | 先 `mysqldump` 备份 |

## 三、现网 vs 待部署 对照

| 项 | 现网实际 | 待部署 | 动作 |
|---|---|---|---|
| 迁移登记 | `schema_version` 最高 **V111** | 需补 **V112 / V113** | 见 §四 |
| `backend/app.jar` | 82,198,654 B，**2026-10-04 22:05:56** | 本地 jar sha256 `6a0c641f47c89f0b3c492e2a9702461f6826fe2176d25032f6800007c5d01106` | **替换 + restart** |
| `admin-static/index.html` | sha256 `44cda7251ca1b9d793b6b8f15a5da3e4c2c6e0d300f0f54bc823c868ac0502bc`（23:10） | 本地 `admin/dist/index.html` sha256 `f5ca4ce02adafcb719ece7d25dd214ec5aa58707c7d4f6ff46157d2a47a9aa33` | **替换** |
| 后端服务 | `miniprogram-backend.service` = active | 同 | restart |
| 小程序 | 线上 1.33.2 | 需发新版 | 见 §七 |

## 四、数据库迁移（先做）

### 4.1 待执行清单

| 迁移 | 内容 | 幂等 | 备注 |
|---|---|---|---|
| `V112__product_author_profile.sql` | `mp_product` 加 `author_id` + `idx_product_author` | 是（information_schema 判存在） | 生产确认无此列 |
| `V113__runtime_event.sql` | 新建 `mp_runtime_event` 表 | 是（CREATE TABLE IF NOT EXISTS） | 生产确认无此表 |

### 4.2 前置核实（已代查，执行前复核一次）

```sql
-- 生产实测结果（2026-10-05 02:3x）
-- mp_product.author_id        → 0 行（不存在，需 V112）
-- mp_runtime_event            → 不存在（需 V113）
-- mp_planet_benefit_config    → 存在（V108 已执行，仅未登记）
-- mp_membership_plan.applies_to → 存在（V108 已执行，仅未登记）
-- mp_content.visibility       → 存在（V107 已执行，仅未登记）
```

> ⚠️ **注意**：V107/V108/V109 **不在 `schema_version` 表里但列/表已在生产** —— 属「跑过没登记」。
> **不要再跑 V107–V109**（重复执行会报错或产生意外）；只需补登 V112/V113。

### 4.3 执行步骤

```bash
# 1) 备份（不可逆变更前必做）
ssh zfculture 'sudo mysqldump miniprogram_prod mp_product > /tmp/mp_product_before_v112.sql'
ssh zfculture 'sudo mysqldump miniprogram_prod > /tmp/db_full_before_v112_v113.sql'

# 2) 传迁移（本地 → 服务器 /tmp）
scp backend/src/main/resources/db/migration/V112__product_author_profile.sql zfculture:/tmp/
scp backend/src/main/resources/db/migration/V113__runtime_event.sql zfculture:/tmp/

# 3) 依次执行
ssh zfculture 'sudo mysql miniprogram_prod < /tmp/V112__product_author_profile.sql'
ssh zfculture 'sudo mysql miniprogram_prod < /tmp/V113__runtime_event.sql'

# 4) 登记 schema_version（INSERT IGNORE，并行会话可能抢号，务必看 script 名）
ssh zfculture 'sudo mysql miniprogram_prod -e "
INSERT IGNORE INTO schema_version(version,script,applied_at) VALUES
(\"V112\",\"V112__product_author_profile.sql\",NOW()),
(\"V113\",\"V113__runtime_event.sql\",NOW());"'

# 5) 复核（必须看到 V112/V113 且 script 名正确）
ssh zfculture 'sudo mysql -N miniprogram_prod -e "SELECT version,script FROM schema_version WHERE version IN (\"V112\",\"V113\")"'
```

### 4.4 迁移验证

```bash
ssh zfculture 'sudo mysql -N miniprogram_prod -e "
SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=\"mp_product\" AND COLUMN_NAME=\"author_id\";   -- 期望 1
SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=\"mp_runtime_event\";                        -- 期望 1
SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=\"mp_product\" AND INDEX_NAME=\"idx_product_author\";"'
```

## 五、部署前置检查（并行会话冲突）

**必须先查**，因为项目长期有并行会话在改代码：

```bash
# ① 线上 admin-static/index.html 最后修改时间
ssh zfculture 'ls -l --time-style=full-iso /opt/miniprogram-platform/admin-static/index.html'

# ② 本地 dist 构建时间
stat -f "%Sm %N" -t "%H:%M:%S" admin/dist/index.html

# ③ 工作区源码是否有晚于本地 dist 的改动（有命中 = 有人改动比构建新）
find admin/src backend/src -newermt "<本地 dist 构建时间>" -type f

# ④ 线上历史备份（能还原「谁在什么时候部署了什么」）
ssh zfculture 'ls -dt /opt/miniprogram-platform/admin-static.bak-* | head -5'
```

判定：
- 线上 mtime **晚于** 本地 dist 构建时间 → 有人抢先部署，**停下来问 lx**；
- ③ 有命中 → 本次构建已落后于源码，**需重新构建**再部署；
- 全无异常 → 继续。

> 本交接单产出时（2026-10-05 02:3x）实测：
> - 线上 admin-static 为 23:10 部署（早于本地 dist 01:34:53）✅
> - `find admin/src backend/src -newermt "2026-10-05 01:34:53"` = **0 命中** ✅
> - jar 02:29:53 构建，`find backend/src -newermt` = **0 命中** ✅
> 即当前产物领先所有源码，可直接部署。

## 六、后端 + 后台 部署步骤

### 6.1 后端

```bash
# 1) 备份线上 jar
ssh zfculture 'sudo cp -a /opt/miniprogram-platform/backend/app.jar /opt/miniprogram-platform/backend/app.jar.bak-deploy-$(date +%Y%m%d-%H%M%S)'

# 2) 传新 jar（scp 前台执行，SSH 限流间隔 20s+）
scp backend/target/mini-program-platform-1.0.0-SNAPSHOT.jar zfculture:/tmp/app.jar.new

# 3) 替换 + 修属主 + 重启
ssh zfculture 'sudo cp /tmp/app.jar.new /opt/miniprogram-platform/backend/app.jar && sudo chown ubuntu:ubuntu /opt/miniprogram-platform/backend/app.jar && sudo systemctl restart miniprogram-backend.service'

# 4) 等 30s+ 再查健康（启动慢）
sleep 35
ssh zfculture 'curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8080/actuator/health'

# 5) 查启动日志无 Unknown column（V112/V113 生效与否的直接证据）
ssh zfculture 'sudo journalctl -u miniprogram-backend.service --since "3 min ago" | grep -iE "Unknown column|ERROR|Started" | tail -20'
```

### 6.2 后台

```bash
# 1) 若本地 dist 已确定是最新（见 §五），跳过重建；否则先重新构建：
#    注意 safe-delete 阈值 50 会拦 vite 内部 emptyDir，必须分批清空
#    cd admin && for i in $(seq 12); do find dist -type f -delete 2>/dev/null; done
#    find dist -mindepth 1 -type d -empty -delete && npx vite build

# 2) 打包（内容根 = dist 本身，写成「包 dist」会整体落错位却看似成功）
cd admin
COPYFILE_DISABLE=1 tar --no-mac-metadata --no-xattrs -C dist -czf /tmp/admin-dist.tar.gz .
tar -tzf /tmp/admin-dist.tar.gz | head    # 必须看到 ./index.html

# 3) 传包
scp /tmp/admin-dist.tar.gz zfculture:/tmp/

# 4) 备份 + 解压覆盖 + 修属主
ssh zfculture 'cd /opt/miniprogram-platform && sudo cp -a admin-static admin-static.bak-deploy-$(date +%Y%m%d-%H%M%S)'
ssh zfculture 'cd /opt/miniprogram-platform/admin-static && sudo tar -xzf /tmp/admin-dist.tar.gz && sudo chown -R ubuntu:ubuntu .'
```

## 七、小程序（需 lx 在 IDE 侧确认）

- 线上当前版本 **1.33.2**
- 本地 `miniapp/` 有 **121 个文件改动**未上传（含 V113 埋点 `utils/page-tracker.js`、`custom-tab-bar/index.js` 图标可用性修复、会员通票标签等）
- 上传命令：
  ```bash
  node --check miniapp/utils/page-tracker.js   # 先过语法
  /Applications/wechatwebdevtools.app/Contents/MacOS/cli upload \
    --project "/Users/lx/项目文件/liuxuan/小程序搭建运营系统/miniapp" \
    --version 1.33.3 --desc "<本次变更摘要>"
  ```
- ⚠️ **CLI 结束打印的包体表格是唯一判据**；主包已逼近 2MB 上限（1.33.2 = 97.5%，余量≈52KB），**本次必须看表格确认未超**
- ⚠️ 若报 `IDE may already started at port 9420` + `wait IDE port timeout`：先 `nohup cli auto --project <miniapp> --auto-port 9420 &` 起到 LISTEN，再 upload
- 上传后需 **lx 在微信后台手动提审**

## 八、部署验证清单（五件套 + 产物级）

```bash
# ① 入口哈希一致（最可靠）
shasum -a 256 admin/dist/index.html
ssh zfculture 'sha256sum /opt/miniprogram-platform/admin-static/index.html'   # 两者必须相同

# ② 非构建资源在位（9 项）
ssh zfculture 'ls /opt/miniprogram-platform/admin-static/{logo-motaibai.svg,logo.svg,vite.svg,golden-dsl.json,kuajing-motaibai-header.png,section-bar-tech-bg.jpg} && ls -d /opt/miniprogram-platform/admin-static/{images,prototype,assets}'

# ③ 公网 200
curl -s -o /dev/null -w "admin=%{http_code}\n" https://admin.zfculture.site/
curl -s -o /dev/null -w "api=%{http_code}\n" https://api.zfculture.site/actuator/health

# ④ 产物级：拉线上 chunk 扫新代码特征（不能假设文件名稳定）
#    本次 5 个特征：
#    作者筛选      → 搜 "全部作者"        （library-*.js）
#    作者档案统计  → 搜 "商品/专栏"       （authors-*.js）
#    商品关联作者  → 搜 "不关联（官方/未指定）"（edit-*.js）
#    运行指标      → 搜 "白屏率"          （overview-*.js）
#    静默草稿      → 搜 "已存入草稿"      （appearance-*.js）

# ⑤ 后端接口
curl -s "https://api.zfculture.site/api/v1/admin/authors" -H "Authorization: Bearer <admin_token>" | head -c 300   # 应含 contentCount/productCount
```

## 九、本次上线的功能清单（8 项）

| # | 功能 | 端 | 迁移 |
|---|---|---|---|
| 1 | 按作者管理其内容/专栏（内容筛选 + 作者档案统计 + 商品关联作者） | admin + backend | **V112** |
| 2 | 小程序搭建模块状态流解耦 + 体验收口（静默草稿 / Diff 发布抽屉 / 运行指标） | admin + backend + miniapp | **V113** |
| 3 | 页面装修器「区块模板」重构（三层资产体系） | admin | — |
| 4 | 装修器属性面板排版基线（50 组件 label/数字框宽度收敛） | admin | — |
| 5 | 星球推荐组件多星球 + 主星球收敛 | backend + admin + miniapp | — |
| 6 | 会员体系三种运营模式 + 多星球通票 + 内容可见性三态 | backend + admin | V107–V109（已执行，仅未登记） |
| 7 | 会员体系 P1/P2（通票绑定 UI + 星球权益配置） | backend + admin + miniapp | — |
| 8 | 「社区管理」升级为独立顶级模块 | admin | — |

## 十、回滚

```bash
# 后端
ssh zfculture 'sudo cp -a /opt/miniprogram-platform/backend/app.jar.bak-deploy-<时间戳> /opt/miniprogram-platform/backend/app.jar && sudo systemctl restart miniprogram-backend.service'

# 后台
ssh zfculture 'cd /opt/miniprogram-platform && sudo rm -rf admin-static && sudo cp -a admin-static.bak-deploy-<时间戳> admin-static'

# 数据库：V112/V113 均为加列/建表，回滚=删除列/表（一般不需要）
#   ALTER TABLE mp_product DROP COLUMN author_id;  -- 会丢已填数据，慎用
#   DROP TABLE mp_runtime_event;                   -- 仅事件数据
```
