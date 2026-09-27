# 本地准生产部署说明

目标：在本项目空间先跑出一套接近云端的部署结构，后续迁移云服务器时主要替换域名、证书、密码、微信和支付配置。

## 先看这条：后台搭建了，小程序为什么没变

**这不是偶发 bug，是默认配置的必然结果。** 小程序在微信开发者工具里没有预览令牌 `pt`，`contentViewParam()`
因此一律请求 `view=online`——也就是**上一次内容发布的快照**，而不是你刚在后台保存的草稿。

所以本地二选一，否则永远看到旧内容：

1. **推荐**：`deploy/.env` 里设 `APP_CONTENT_AUTO_SYNC=true`，`cd deploy && docker compose up -d backend`。
   之后后台保存外观/页面即自动写线上配置并递增 `live_release_no`。
2. 保持 `false`，则每次改完必须在后台**概览或外观页点「保存并同步」**；只点「保存草稿」不算。

改完在开发者工具里按顺序：**清缓存（含 Storage）→ 重新编译 → 页面下拉刷新**。
（DSL 缓存键含 `live_release_no` 会自动失效，但系统配置有 10 分钟缓存。）

排查用两条命令，`live_release_no` 不涨就说明没同步：

```bash
curl -s "http://127.0.0.1:8080/api/v1/mp/config/public?view=online" | grep -o '"live_release_no":[^,]*'
```

`?view=draft` 返回 404 属正常——`.env` 未设 `PREVIEW_TOKEN_SECRET` 时签不出预览令牌，本地只能看线上快照。

## 目录职责

- `docker-compose.yml`：编排 MySQL、Redis、后端、管理后台、Prometheus、Grafana。
- `Dockerfile.backend`：构建 Spring Boot 后端镜像。
- `Dockerfile.admin`：构建管理后台静态资源并用 Nginx 托管。
- `nginx/default.conf`：托管后台页面，并把 `/api/` 代理到后端。
- `.env.local.example`：本地准生产环境变量模板。
- `start-local.ps1`：Windows 本地启动脚本。
- `stop-local.ps1`：Windows 本地停止脚本。

## 第一次启动

在项目根目录执行：

```powershell
Copy-Item deploy\.env.local.example deploy\.env
notepad deploy\.env
```

然后按需修改：

- `MYSQL_ROOT_PASSWORD`
- `MYSQL_PASSWORD`
- `REDIS_PASSWORD`
- `JWT_SECRET`
- `WX_MINIAPP_APPID`
- `WX_MINIAPP_SECRET`
- 微信支付相关配置

启动：

```powershell
.\deploy\start-local.ps1 -Build
```

后续普通启动：

```powershell
.\deploy\start-local.ps1
```

停止：

```powershell
.\deploy\stop-local.ps1
```

## 本地访问

- 管理后台：`http://localhost`
- 后端健康检查：`http://localhost:8080/api/health`
- Prometheus：`http://localhost:9090`
- Grafana：`http://localhost:3000`

## 管理后台登录

后台前端已对齐后端接口：

- 登录接口：`/api/v1/admin/auth/login`
- 当前用户：`/api/v1/admin/auth/profile`
- 退出登录：`/api/v1/admin/auth/logout`

本地 Docker 默认 **`APP_CONTENT_AUTO_SYNC=false`**：保存草稿后，需在概览/外观点 **「保存并同步」** 才写入小程序可读线上配置。微信**代码包**仍在本机开发者工具上传。

## 本地编译（改代码后）

| 模块 | 推荐命令 | 说明 |
|------|----------|------|
| 管理后台 | `cd admin && ADMIN_BUILD_SKIP_TSC=1 npx vite build` | 产物在 `admin/dist/` |
| 后端 | `cd deploy && docker compose build backend` | 镜像内 **JDK 17** 编译；本机若装 **Java 27**，直接 `mvn compile` 可能因 Lombok 报错 |
| 小程序 | `cd miniapp && npm run test:unit` | 无 webpack 打包；改依赖后需在开发者工具 **构建 npm** |

编译后更新正在跑的 Docker（Mac/Linux）：

```bash
docker cp admin/dist/. miniapp-admin:/usr/share/nginx/html/
cd deploy && docker compose up -d backend
```

管理后台开发模式（热更新）：`cd admin && npm run dev` → `http://localhost:3000`。

小程序开发者工具联调本地后台：复制 `miniapp/utils/dev-config.example.js` 为 `dev-config.js`（默认 `http://127.0.0.1:8080`）。若误连生产 API，模拟器会显示线上站点而非本地搭建内容。

若提示 **「数据库结构未升级」** 或接口报 `Unknown column`：

```bash
bash deploy/scripts/migrate-docker-local.sh
cd deploy && docker compose restart backend
```

（本机无 `mysql` 客户端时用上述脚本；有客户端可对 `127.0.0.1:3306` 跑 `deploy/scripts/migrate.sh`。）

如果出现 403，优先检查：

- 是否访问了旧接口 `/api/auth/login`
- 后端是否已启动
- Nginx `/api/` 是否正常代理到 backend
- 数据库中是否存在管理员账号

## 云端迁移时需要替换

- `ADMIN_PORT` 通常保持 80，云端再配 HTTPS 443。
- `BACKEND_PORT` 可只在内网开放，外部通过 Nginx 访问 `/api/`。
- 替换 `.env` 中数据库、Redis、JWT、微信小程序、微信支付配置。
- 将 `WX_PAY_NOTIFY_URL` 改为正式 HTTPS 域名。
- 在微信公众平台配置合法域名。

## 当前注意事项

当前项目已有 `db/migration` SQL，但尚未接入自动迁移工具。首次部署到全新 MySQL 时，需要确认数据库表已初始化。建议下一步补齐统一的数据库初始化/迁移机制，再做完整云端部署。

如果当前机器未安装 Docker，可以先使用开发联调脚本：

```powershell
.\deploy\start-dev-local.ps1
```

此时访问：

- 管理后台：`http://localhost:3000`
- 后端健康检查：`http://localhost:8080/api/health`

注意：`http://localhost:8080/` 是后端根路径，不是管理后台页面入口，返回 403 属于安全拦截，不代表后端异常。
