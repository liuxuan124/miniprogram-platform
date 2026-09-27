# 上线部署核对清单

配套文件：`RELEASE.md`（包内容/上线顺序）。本清单是**逐项勾验**用的。
带 ⛔ 的是硬性前置，不满足不要开始部署。

---

## 0. 运行环境（硬性）

- [ ] ⛔ **JDK 17+**：服务器执行 `java -version`，需含 `17`。
      `backend/app.jar` 为 **Spring Boot 3.2.5**、class 文件版本 61，**JDK 8/11 无法启动**（`UnsupportedClassVersionError`）。
- [ ] ⛔ MySQL 5.7+ / 8.0 可连，库已建、账号有 DDL 权限（Flyway 要用）。
- [ ] ⛔ Redis 可连。
- [ ] 磁盘剩余 ≥ 3 GB（含备份 + 解压 + 回滚余量）。
- [ ] `/actuator`、`/uploads` 的访问策略已确认（Nginx 默认仅内网放行 actuator）。

## 1. 上传前

- [ ] 校验发布包：`sha256sum -c miniprogram-platform-*.tar.gz.sha256` 输出 OK。
- [ ] 解压后校验明细：`cd <包目录> && sha256sum -c SHA256SUMS | grep -v ': OK$'`（无输出即为全部一致）。
- [ ] **备份**：`mysqldump` 全库 + 旧 `app.jar` + 旧 `admin-static` + `uploads/` 目录，备份文件放到**服务器之外**的位置。
- [ ] 记录当前生产 `schema_version`：`SELECT * FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 5;`

## 2. Nginx / HTTPS

> 包内 `deploy/nginx/default.conf` **只有 `listen 80`，没有 443**。HTTPS 必须现场补齐。

- [ ] ⛔ 域名已完成 **ICP 备案**（未备案 80/443 会被拦截）。
- [ ] 申请证书（Let's Encrypt 或商业证书），放到服务器证书目录。
- [ ] 在 `default.conf` 增补 443 server 块：`ssl_certificate` / `ssl_certificate_key` / `ssl_protocols TLSv1.2 TLSv1.3`。
- [ ] 80 端口做 `return 301 https://$host$request_uri;` 跳转。
- [ ] ⚠️ **`resolver 127.0.0.11` 是 Docker 内置 DNS**。若 Nginx 不在 Docker Compose 网络里，`backend` 主机名会解析失败，`/api` 全部返回 502 —— 改为系统 DNS（如 `resolver 8.8.8.8 valid=10s ipv6=off;`）或把 `set $backend_host backend;` 换成实际 IP。
- [ ] WebSocket `/ws/` 的 `Upgrade` 头已透传（AI 对话依赖，模板已配，改动后复核）。
- [ ] `client_max_body_size` ≥ 实际上传需求（模板 `/api/admin/file/` 为 50m）。
- [ ] `nginx -t` 通过后再 reload。

## 3. 数据库迁移

- [ ] `bash deploy/scripts/migrate.sh`（按 `schema_version` 增量，只跑未登记版本）。
- [ ] 确认最高版本落到 **V97__disable_mojibake_product_duplicates**。
- [ ] V96 补偿内容互动表 / V97 下架乱码重复商品 —— 复查商品列表无乱码、无重复。
- [ ] 迁移失败时**不要手动改已执行脚本**，补充新脚本或人工订正后登记版本。

## 4. 后端

- [ ] 停服 → 替换 `backend/app.jar` → 起服。
- [ ] `curl http://127.0.0.1:8080/actuator/health` 返回 `UP`。
- [ ] 启动日志无 Flyway 报错、无 Bean 创建失败、无端口占用。
- [ ] 环境变量齐备（对照 `deploy/.env.example`）：DB / Redis / JWT / `PREVIEW_TOKEN_SECRET` / `APP_CONTENT_AUTO_SYNC`。
      `PREVIEW_TOKEN_SECRET` 为空会导致草稿预览 `?view=draft` 404，已踩过。

## 5. 管理后台静态

- [ ] 后端健康通过后再替换 `admin-static/` 到 Nginx `root`。
- [ ] `index.html` 与 `assets/` 同批替换，避免 hash 资源 404。
- [ ] 页面验证：登录 → 运营概览 → 外观 → 页面管理 → 模板 → 发布。

## 6. 小程序端（发布包不含源码，需单独上传）

- [ ] 微信开发者工具打开 `miniapp/`，上传体验版。
- [ ] 公众平台配置 **request 合法域名**（必须 HTTPS）、socket / uploadFile / downloadFile 域名。
- [ ] 真机验四个 Tab：首页 / 发现 / 星球 / 商城 / 我的。
- [ ] 提审前确认小程序类目、隐私协议已就绪。

## 7. 上线后灰度复核（跨端报告遗留软警告）

`docs/render-parity-report.md` 硬失败 0，但有 38 项软警告，其中以下组件在**小程序侧要素数为 0**（黄金页无真实数据样本），需用线上真数据复核：

`planet_feed`、`member_plan`、`qa_list`、`note_feed`、`notice_bar`、`promo_banner`、`rich_text`、`search`、`section_title`、`product_list`、`certificate`、`warm_authors`、`warm_columns`、`warm_discover`

- [ ] 上述组件在真机上确有数据且正常渲染。
- [ ] 暖阁长尾 `BATCH-QA-WARM-LT-001` 12 项（真机上传、客服发图、打卡、弱网）尚未执行 → 灰度期补测，**不得据此声称全量重跑**。

## 8. 人工阻塞项（不在本包范围内）

来源 `docs/handover/pending-items.md`，目前全部未勾选：

| 编号 | 事项 | 状态 |
|------|------|------|
| TASK-REL-001 | 微信小程序资质（主体认证 / AppID / 类目） | 待办 |
| TASK-REL-002 | ICP 备案 + HTTPS + 对象存储 | 待办 |
| TASK-REL-004 | 微信支付商户（商户号 / APIv3 密钥 / 证书 / 回调） | 待办 |

未完成前，支付、提审类链路**不可用**。

## 9. 回滚

1. 停服，还原旧 `app.jar`，起服确认健康检查通过。
2. 还原旧 `admin-static/`。
3. 数据库：用第 1 步的 `mysqldump` 恢复；V83–V88 附了 `rollback.sql` 可按需反向执行。
4. 小程序：公众平台回退到上一个线上版本。
5. Nginx 配置回退并 reload。
