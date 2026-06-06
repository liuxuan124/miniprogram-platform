# 本项目空间部署状态

更新时间：2026-05-11

## 已完成

- 已整理 Docker 准生产部署目录。
- 已修复 Docker 后端健康检查地址为 `/api/health`。
- 已修复 Nginx 容器健康检查命令。
- 已补充本地环境变量模板：`.env.local.example`。
- 已补充 Docker 本地启动/停止脚本：
  - `start-local.ps1`
  - `stop-local.ps1`
- 已补充无 Docker 的本地开发联调脚本：
  - `start-dev-local.ps1`
- 已修复管理后台登录接口契约：
  - 登录：`/api/v1/admin/auth/login`
  - 用户信息：`/api/v1/admin/auth/profile`
  - 登出：`/api/v1/admin/auth/logout`
  - 成功码兼容：`0` 和 `200`
  - Token 字段兼容：`accessToken`

## 当前机器状态

- 当前 8080 端口是 Java 后端服务。
- `http://localhost:8080/api/health` 可访问。
- `http://localhost:8080/` 返回 403 是正常现象，因为 8080 是后端接口服务，不是后台页面入口。
- 当前环境未识别到 `docker` 命令，暂不能直接启动 Docker Compose。

## 当前推荐访问方式

无 Docker 时：

- 后端接口：`http://localhost:8080`
- 管理后台：`http://localhost:3000`

Docker 准生产部署时：

- 管理后台：`http://localhost`
- 后端接口：`http://localhost/api/v1/...`
- 后端健康检查：`http://localhost:8080/api/health`

## 下一步

1. 当前机器如要用 Docker 准生产部署，需要先安装并启动 Docker Desktop。
2. 如果暂时不装 Docker，可执行：

```powershell
.\deploy\start-dev-local.ps1
```

3. 然后打开：

```text
http://localhost:3000
```

4. 登录后台后再继续配置测试数据。

## 待补齐

- 数据库初始化/迁移机制仍需统一，建议后续把 `backend/src/main/resources/db/migration` 正式接入自动迁移或整理成一份准生产初始化 SQL。
- 云端部署前需要补齐真实域名、HTTPS、微信小程序 AppID/Secret、微信支付商户配置。
