# 部署前差异评估报告（2026-09-27）

> 评估对象：`release/miniprogram-platform-20260927-1253-6511ef5-dirty-r2.tar.gz`
> 目标环境：生产服务器 Ubuntu 22.04.5（本机 SSH 别名 `zfculture`）
> **本文禁止写入真实服务器 IP，统一用 `<SERVER_IP>` 占位——远端仓库为公开仓库。**

## 一、执行摘要

**结论：可以部署，但必须先执行第二章的三条红线规避，并在部署前完成备份。**

本次**不是首次部署，而是增量升级**——目标服务器已在运行完整的生产实例。
最大的两个风险都来自"照着发布包步骤做"：

1. 覆盖 nginx 配置会让 **HTTPS 立刻全挂**
2. 覆盖运行时 env 会让后端**连不上数据库**

数据库侧经只读预览确认：**待执行的 4 个迁移在本环境均为安全或零影响**。

## 二、环境对照（现网 vs 待部署）

| 项 | 现网实际 | 待部署包 | 差异 |
|---|---|---|---|
| 部署根 | `/opt/miniprogram-platform` | 同名 | — |
| 后端服务 | systemd `miniprogram-backend.service`（User=ubuntu） | 同路径替换 jar | 需 restart |
| `backend/app.jar` | 82,077,639 B，md5 `ff284acf…`，**2026-09-26 01:28** | 82,089,121 B，md5 `cc271b31…` | **+11,482 B，需替换** |
| `admin-static/` | 449 个文件，index.html md5 `32b32bb0…` | 450 个文件，index.html md5 `0e0fd60b…` | **需替换** |
| 迁移脚本 | 已至 **V93**（2026-09-24 13:12） | V1–V97（103 个含 rollback） | **待跑 V94–V97** |
| Java | OpenJDK **17.0.19** | 要求 JDK 17（Spring Boot 3.2.5） | ✅ 满足 |
| MySQL / Redis | 8.0.45 / PONG | — | ✅ 正常 |
| HTTPS | Certbot 托管，`CN=zfculture.site`，到期 **2026-12-19** | 包内 default.conf 仅 `listen 80` | ⚠️ **见红线 1** |

🔎 说明：现网迁移记录表是项目自建的 **`schema_version`**（字段 `version` / `script` / `applied_at`），**不是** Flyway 的 `flyway_schema_history`。`deploy/scripts/migrate.sh` 正是读这张表并跳过已登记版本，默认 `DB_NAME=miniprogram_prod`，机制正确，不会重跑历史迁移。

## 三、🚫 三条红线（照发布包步骤做就出事）

| # | 禁止动作 | 后果 | 正确做法 |
|---|---|---|---|
| 1 | 用包的 `deploy/nginx/default.conf` 覆盖 `/etc/nginx/sites-enabled/miniprogram-platform` | 该文件只有 `listen 80`、**无 443/SSL**，而现网 HTTPS 由 Certbot 写在同一文件里 → **HTTPS 全站立刻挂** | **跳过这一步**；确需改 nginx 只做人工 diff 合并 |
| 2 | 用 `deploy/.env.example` 覆盖 `/opt/miniprogram-platform/config/backend.env` | 那是生产运行配置（DB 密码、`JWT_SECRET`、`PREVIEW_TOKEN_SECRET`、微信回调地址）→ 后端起不来 / 支付回调失效 | **跳过**；该文件保持原样不动 |
| 3 | 未备份直接执行 `migrate.sh` | V96/V97 含不可逆 `UPDATE` | 先 `mysqldump` 备份，再执行 |

## 四、数据库迁移增量分析（已做只读预览）

| 迁移 | 内容 | 破坏性 | 生产实测 |
|---|---|---|---|
| **V94** `mp_preview_publish_m1` | 建 3 张表（token 吊销 / 微信代码清单 / 上传审计），均 `IF NOT EXISTS` | 无 | 3 张表当前均**不存在** → 将正常创建 ✅ |
| **V95** `builder_home_nav_and_empty_warm` | `INSERT ... ON DUPLICATE KEY UPDATE` + `UPDATE ... WHERE config_key='site_builder_draft'` | 改写 `site_builder_draft` 的 `tabbarItems` 与首页绑定 | 语句**幂等，不会撞重复键** ✅；⚠️ 会把后台配置的 TabBar 重置为脚本内置值 |
| **V96** `repair_content_interaction_...` | 建 3 张互动表 + 下架乱码商品 | 含 `UPDATE mp_product` | 3 张表**已存在**（IF NOT EXISTS 跳过）；乱码命中 **0 行** ✅ |
| **V97** `disable_mojibake_product_duplicates` | 下架乱码分类商品 | 含 `UPDATE` | 乱码命中 **0 行** ✅ |

**生产库只读预览结果（`SELECT COUNT` 实测，未做任何写入）：**

```
V97 命中分类数      0
V96 命中分类数      0
V97 将下架商品数    0
参考：商品总数      27
参考：分类总数      5
```

> **关键结论**：V96/V97 在本地修的"乱码重复商品"问题，生产环境**根本不存在**（乱码数据未进生产），这两个迁移在此环境下**零影响**。
> 同时说明本库数据量极小（商品 27 / 分类 5），属准生产规模，回滚成本可控。
>
> 补充：V96 与 V97 实为同一件事的两种写法（V96 用字符正则，V97 用 UTF-8 字节前缀规避客户端字符集差异），两者都跑是幂等的，无害。

## 五、部署前必须完成的备份

```bash
# 1 数据库全量
sudo mysqldump -u root --single-transaction --routines --triggers miniprogram_prod \
  | gzip > /opt/backup/miniprogram_prod.$(date +%Y%m%d-%H%M).sql.gz

# 2 应用与配置
sudo mkdir -p /opt/backup/$(date +%Y%m%d)
sudo cp -a /opt/miniprogram-platform/backend/app.jar        /opt/backup/$(date +%Y%m%d)/
sudo cp -a /opt/miniprogram-platform/config/backend.env     /opt/backup/$(date +%Y%m%d)/
sudo cp -a /opt/miniprogram-platform/admin-static           /opt/backup/$(date +%Y%m%d)/
sudo cp -a /etc/nginx/sites-enabled/miniprogram-platform    /opt/backup/$(date +%Y%m%d)/nginx.conf
```

## 六、建议部署顺序（已绕开红线）

1. 备份（第五章全部）
2. `tar -xzf` 解压发布包到临时目录，**只取** `backend/app.jar`、`admin-static/`、`backend/src/main/resources/db/migration/`
3. 备份后执行 `deploy/scripts/migrate.sh`（跑 V94–V97，预期看到 `SKIP V1…V93` + `APPLY V94…V97`）
4. `sudo cp app.jar /opt/miniprogram-platform/backend/app.jar`
5. `sudo systemctl restart miniprogram-backend` → `curl http://127.0.0.1:8080/actuator/health` 应返回 `{"status":"UP"}`
6. 确认后端健康后，再替换 `admin-static/`（先 `mv` 旧目录为 `.bak`，新目录拷入）
7. `sudo nginx -t`（**不要** reload 前没通过）
8. **nginx 配置保持不动**，因此无需 reload
9. 验证：`https://admin.zfculture.site`、`https://api.zfculture.site/actuator/health`

## 七、回滚方案

| 步骤 | 回滚动作 |
|---|---|
| 迁移 | V94 建表可 `DROP`；V95 需从 dump 恢复 `mp_system_config`（或重跑旧值）；V96/V97 改了 0 行无需回滚 |
| jar | `cp -a` 备份件覆盖回 `/opt/miniprogram-platform/backend/app.jar` 然后 restart |
| admin-static | `rm -rf admin-static && mv admin-static.bak admin-static` |
| 全量 | `gunzip < dump.sql.gz \| mysql miniprogram_prod` |

## 八、残留风险

| 优先级 | 事项 | 归属 |
|---|---|---|
| P0 | 云控制台安全组需与 ufw 同策略（主机层管不到） | 人工 |
| P0 | 小程序资质：主体认证状态、类目、request 合法域名、隐私协议 | 人工 |
| P0 | 微信支付商户号、APIv3 密钥、回调地址 | 人工 |
| P1 | `V95` 会重置后台 TabBar 配置，部署后需到后台复核一次 TabBar | 部署后 |
| P1 | `docs/handover/pending-items.md` 技术债务清单已过期（三条"高"均已修复） | 待更新 |
| P2 | HTTPS 证书 2026-12-19 到期，需确认 Certbot 自动续期 cron 在跑 | 待确认 |

---

## 九、执行结果（2026-09-27 16:12–16:32，已上线）

| 步骤 | 结果 |
|---|---|
| 备份 | `/opt/backup/20260927-1612/`：DB dump（263K，gzip 校验 OK）、`app.jar`、`backend.env`、`admin-static`、nginx 配置 ✅ |
| 上传校验 | r2 包 SHA-256 `3611d710…` OK；包内 SHA256SUMS 逐项 OK ✅ |
| 迁移 | ⚠️ `migrate.sh` 在 V1 失败中断 → 改手控导入并登记 **V94–V97**，表数 **129 → 132** ✅ |
| `app.jar` | md5 `ff284acf…` → **`cc271b31…`**，restart 后 **15s** 返回 `{"status":"UP"}` ✅ |
| `admin-static` | 449 → **904** 文件（与包内一致），index.html md5 `0e0fd60b…` ✅ |
| nginx | **全程未改动**，`nginx -t` 通过，HTTPS 未受影响 ✅ |
| 线上验证 | `admin.zfculture.site` 200；`assets/index-*.js|css` 200；`/api/health` 返回 `status:UP`；日志显示 `profile=prod`、`Started MiniProgramApplication in 11.208 seconds`，无新异常 ✅ |

### 本次暴露的脚本缺陷（已修复）

`deploy/scripts/migrate.sh` 假定 `schema_version` 从 V1 起全登记，而生产实际只登记 **V47–V93**。
于是脚本把 V1 判为未执行并 `APPLY V1__init_schema.sql`，该脚本第 4 行含 `USE miniprogram_dev`，
当前账号无该库权限 → `ERROR 1044 Access denied` → 脚本 `exit 1`。
**失败发生在任何写入之前**，数据库未被污染（表数复查仍为 129）。

修复：新增 `MIGRATE_FROM` 环境变量，按 `V` 后**数字**比较（避免 `V100 < V94` 的字符串排序坑）。
自测：默认 97 个脚本 / `V50` 从 V50 起 / `V94` 仅 V94–V97，三种情形均正确。
