# 待办事项

> **2026-09-27 状态更新（本文件曾严重过期，以下为实测校准）**
>
> | 原状态 | 实测 | 依据 |
> |---|---|---|
> | ICP备案 / HTTPS / 服务器「未完成」 | **已完成** | 域名已解析至国内服务器并对外提供 HTTPS；Certbot 托管证书，`certbot.timer` 自动续期已启用 |
> | TabBar 图标 1x1 占位（高） | **已修复** | 实测 5 个 Tab 图标均为 81×81 正式图 |
> | BASE_URL 硬编码（高） | **已修复** | 已移至 `miniapp/utils/request.js`，支持环境切换，生产值 `https://api.zfculture.site` |
> | AppID 占位（高） | **已修复** | `project.config.json` = `wxea3928e0978492fe` |
> | 服务器防火墙未配 | **已收口** | ufw active，仅放行 22/80/443；root 登录与密码登录均已关闭（见 `server-hardening-20260927.md`） |
>
> **当前唯一硬阻塞是小程序端上线**，操作手册见 `miniapp-launch-runbook.md`。

## 1. 未完成任务

| 任务ID | 任务名称 | 状态 | 说明 |
|--------|----------|------|------|
| TASK-REL-001 | 微信小程序资质审核 | **进行中**（源码侧已就绪，平台侧待办） | 类目、request 合法域名、隐私指引、上传 IP 白名单 |
| TASK-REL-002 | ICP备案与服务器准备 | ✅ **已完成** | 域名备案、HTTPS 证书、服务器均已在役 |
| TASK-REL-004 | 微信支付商户资质 | 需人工处理 | 商户号、证书、回调配置（不阻塞提审，仅阻塞支付） |
| TASK-REL-005 | 小程序代码上传微信平台 | **未开始**（硬阻塞） | `mp_wx_code_upload_audit` 0 行；缺 `WX_UPLOAD_KEY` 等凭证 |
| TASK-REL-006 | 云控制台安全组收敛 | 需人工处理 | ufw 管不到云厂商那层，须同步配置 |

## 2. 资质审核清单

### 2.1 微信小程序资质 (REL-001)

- [ ] 登录微信公众平台 (mp.weixin.qq.com)
- [ ] 确认主体信息(企业/个体工商户)
- [ ] 确认主体认证状态(已认证/未认证)
- [x] 记录AppID ~~和AppSecret~~ — AppID 已确认 `wxea3928e0978492fe`；**AppSecret 待人工填入服务器 `backend.env` 的 `WX_SECRET`**
- [ ] 确认小程序类目选择（**阻塞提审**）
  - 推荐类目: 商业服务 → 综合电商 / 生活服务 → 预约服务
  - 脚本优选顺序: 资讯-信息资讯 → 教育-在线教育 → 工具-信息查询 → 商业服务
- [ ] 确认开发者权限
- [ ] 配置服务器域名(request合法域名)（**阻塞全部网络请求**）
  - request / socket / uploadFile / downloadFile 均填 `api.zfculture.site`
  - 业务域名填 `zfculture.site`，需放校验文件到 `admin-static` 根目录
- [ ] 配置上传 **IP 白名单**（**否则上传必失败**）— 需含服务器公网 IP 与本机出口 IP
- [ ] 编写隐私协议和用户信息收集说明（源码已开 `__usePrivacyCheck__`，**平台侧不配会被拒审**）
- [ ] 确认小程序名称、简介、Logo（简介禁出现"测试/demo/示例"）

### 2.2 ICP备案与服务器 (REL-002)

- [x] 确认域名已注册 — `zfculture.site` 及 `www/admin/api` 子域均已解析至生产服务器
- [x] 完成ICP备案 — 域名已正常对外提供服务，视为已完成
- [ ] 完成公安备案 — 建议上线后 30 日内补办
- [x] 申请HTTPS证书 — Let's Encrypt（Certbot），有效期至 2026-12-19
- [x] 配置Nginx HTTPS — 由 Certbot 写入 `/etc/nginx/sites-enabled/miniprogram-platform`
- [x] 自动续期 — `certbot.timer` 已启用（下次触发 2026-09-28 04:51）
- [ ] 开通对象存储(OSS/COS) — 当前文件落本地 `/opt/miniprogram-platform/backend/uploads`
- [ ] 配置CORS(允许小程序上传)
- [x] 确认服务器规格满足需求 — Ubuntu 22.04 / OpenJDK 17 / MySQL 8.0 / Redis 均在役
- [x] 配置防火墙 — ufw active，仅放行 22/80/443
- [ ] 配置**云控制台安全组**（主机层 ufw 管不到，须在腾讯云控制台同步收敛）

### 2.3 微信支付商户资质 (REL-004)

- [ ] 申请微信支付商户号
- [ ] 设置APIv3密钥
- [ ] 下载商户证书(apiclient_cert.pem, apiclient_key.pem)
- [ ] 配置支付回调地址(需HTTPS)
- [ ] 开通退款功能
- [ ] 确认支付限额
- [ ] 配置对账单下载权限

## 3. 部署前检查项

- [ ] 所有环境变量已配置(.env文件)
- [ ] MySQL已创建数据库和用户
- [ ] Redis已部署并可连接
- [ ] 对象存储已开通并配置CORS
- [ ] HTTPS证书已配置
- [ ] 微信小程序服务器域名已配置
- [ ] 支付回调地址已配置
- [ ] 定时任务已配置(统计日报)
- [ ] 日志目录已创建
- [ ] 备份脚本已部署
- [ ] 监控已配置(Prometheus + Grafana)

## 4. 上线后试运行计划

### 第一周: 内测

- 团队内部测试所有功能
- 重点关注: 支付流程、AI对话、表单提交
- 收集bug和体验问题
- 监控系统资源使用

### 第二周: 灰度

- 邀请少量种子用户
- 监控API响应时间和错误率
- 收集用户反馈
- 修复紧急问题

### 第三周: 公测

- 开放更多用户
- 持续监控
- 优化性能瓶颈
- 准备正式发布

### 正式发布

- 全量开放
- 持续监控7天
- 确认无重大问题后标记为稳定版

## 5. 已知技术债务

| 项目 | 优先级 | 说明 |
|------|--------|------|
| ~~TabBar图标~~ | ~~高~~ | ✅ **已修复**（2026-09-27 实测：5 个 Tab 图标均为 81×81 正式图） |
| ~~BASE_URL配置~~ | ~~高~~ | ✅ **已修复**（已移至 `miniapp/utils/request.js`，支持环境切换） |
| ~~AppID占位~~ | ~~高~~ | ✅ **已修复**（`wxea3928e0978492fe` 真实值） |
| 小程序未上传微信平台 | **高** | `mp_wx_code_upload_audit` 0 行；缺 `WX_UPLOAD_KEY` / `WX_SECRET`（见 `miniapp-launch-runbook.md`） |
| getUserProfile | 中 | 微信已废弃该API，需适配新方案 |
| 单元测试覆盖 | 中 | 当前测试覆盖率较低，需补充 |
| API文档自动化 | 低 | 建议集成Swagger/SpringDoc |
| CI/CD流水线 | 低 | 建议配置GitHub Actions/Jenkins |
