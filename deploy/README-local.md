# 本地准生产部署说明

目标：在本项目空间先跑出一套接近云端的部署结构，后续迁移云服务器时主要替换域名、证书、密码、微信和支付配置。

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
