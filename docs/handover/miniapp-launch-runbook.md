# 小程序端上线操作手册

> 场景：后端、管理后台、服务器已于 2026-09-27 全部上线（见 `deployment-diff-20260927.md`）。
> 本手册只覆盖**最后一公里**——把 `miniapp/` 代码变成微信里可访问的线上版本。

---

## 一、现状盘点

### 已完成（无需再做）

| 层 | 状态 |
|---|---|
| 后端 `app.jar` | 生产在跑，健康检查 UP |
| 管理后台 `admin-static` | `https://admin.zfculture.site` 可访问 |
| HTTPS 证书 | Certbot 托管，`certbot.timer` 自动续期已启用 |
| 数据库 | 已到 V97；表数 132；有真实业务数据（27 商品 / 72 订单 / 46 用户 / 70 内容） |
| 服务器安全 | root 禁用、密码登录关闭、ufw 仅放行 22/80/443 |
| ICP 备案 / 公安备案 | 域名已正常解析至国内服务器并对外提供 HTTPS，视为已完成 |
| 服务器防火墙 | ufw active（主机层） |
| 小程序源码就绪度 | AppID 真实值、`__usePrivacyCheck__` 已开、TabBar 五 Tab 图标为 81×81 正式图、请求域名已切 `https://api.zfculture.site` |

### 未完成（本手册要解决的）

| 缺口 | 归属 | 阻塞性质 |
|---|---|---|
| 小程序代码从未上传微信平台（`mp_wx_code_upload_audit` / `mp_wx_code_manifest` 均 0 行） | 需凭证 | 硬阻塞 |
| `WX_UPLOAD_KEY` 未配置（服务器 `backend.env` 与本地均无） | 需人工下载 | 硬阻塞 |
| `WX_APPID` / `WX_SECRET` 未写入服务器配置 | 需人工填 | 硬阻塞（提审脚本要用） |
| request 合法域名未配置 | 微信公众平台 | 硬阻塞（配错则小程序全部请求失败） |
| 小程序类目未确认 | 微信公众平台 | 硬阻塞（无类目无法提审） |
| 隐私保护指引未配置 | 微信公众平台 | 硬阻塞（源码已开 `__usePrivacyCheck__`，平台侧不配会被拒审） |
| 上传 IP 白名单未配置 | 微信公众平台 | 硬阻塞（服务器 IP 不在白名单则上传被拒） |
| 微信支付商户 | 微信支付商户平台 | 仅影响支付功能，不阻塞提审 |
| 云控制台安全组 | 腾讯云控制台 | 安全项，不阻塞提审 |
| 后台 TabBar 配置复核 | 部署后人工 | V95 会重置为脚本内置值 |

---

## 二、凭证清单（需从微信平台取得）

| 凭证 | 取得路径 | 落到哪里 |
|---|---|---|
| **小程序代码上传密钥**（`private.key`，PEM） | 微信公众平台 → 管理 → 开发管理 → 开发设置 → **小程序代码上传密钥** → 下载 | 服务器 `/opt/miniprogram-platform/config/backend.env` 的 `WX_UPLOAD_KEY`（PEM 全文，`\n` 换行） |
| **AppID** | 开发设置页首行 | 已填：`wxea3928e0978492fe`；需补写进 `backend.env` 的 `WX_APPID` |
| **AppSecret** | 开发设置 → 重置/查看 | 服务器 `backend.env` 的 `WX_SECRET`（**不要进 Git**） |
| **商户号 / APIv3 密钥 / 商户证书** | 微信支付商户平台 | 服务器 `backend.env`：`WX_PAY_MCH_ID`、`WX_PAY_API_V3_KEY`、证书放 `/opt/miniprogram-platform/config/certs/` |

> ⚠️ 仓库是**公开**的。本文件与任何入库文档一律不写密钥正文、不写服务器明文 IP。

---

## 三、微信公众平台必做的五项配置

登录 `mp.weixin.qq.com` → 管理 → 开发管理。

### 3.1 IP 白名单（不做则上传必失败）

开发设置 → **IP 白名单** → 添加两条：

- 服务器公网 IP（后台一键推送从服务器发起）
- 本机出口 IP（本地 CLI 上传时）

获取本机出口 IP：`curl -s https://api.myip.com`

### 3.2 服务器域名（不做则小程序所有请求失败）

开发设置 → **服务器域名** → 全部填 `api.zfculture.site`：

| 类型 | 值 |
|---|---|
| request 合法域名 | `https://api.zfculture.site` |
| socket 合法域名 | `wss://api.zfculture.site` |
| uploadFile 合法域名 | `https://api.zfculture.site` |
| downloadFile 合法域名 | `https://api.zfculture.site` |

业务域名（webview 用）：`https://zfculture.site`，需下载校验文件放到 `admin-static` 根目录。

> 注意：域名必须**已备案**且**支持 HTTPS**（已满足）。每月只能修改 5 次，一次填对。

### 3.3 服务类目

设置 → 基本设置 → **服务类目** → 添加。源码里 `submit-miniprogram-audit.js` 的优选顺序为：

1. 资讯 → 信息资讯
2. 教育 → 在线教育
3. 工具 → 信息查询
4. 商业服务 →（任意二级）

按实际主体资质选；涉及电商交易需含**商业服务类目**，否则商城功能会被拒。

### 3.4 隐私保护指引（源码已开隐私校验，不配会被拒审）

设置 → **服务内容声明 / 用户隐私保护指引** → 按 `app.json` 里实际用到的接口勾选（位置、相册、用户信息等），提交审核。

> `app.json` 已设 `__usePrivacyCheck__: true`，小程序启动会强制弹隐私协议。平台侧未配置指引 → 审核直接不通过。

### 3.5 小程序信息

名称、简介、Logo、头像。简介不能出现"测试 / demo / 示例"字样，否则拒审。

---

## 四、上传与提审（凭证到位后由本仓库脚本执行）

工具链已就绪：`miniprogram-ci@^2.1.31` 已安装，`node --check` 两个脚本均通过。

### 4.1 本地先传体验版（推荐先走这一步）

```bash
cd /Users/lx/项目文件/liuxuan/小程序搭建运营系统

export WX_UPLOAD_KEY="$(cat ~/Downloads/private.key)"   # 换成实际路径

node scripts/push-miniprogram-preview.js \
  --project "$(pwd)/miniapp" \
  --appid wxea3928e0978492fe \
  --version 1.0.0 \
  --desc "首个正式版本"
```

成功标志：输出 JSON 含 `"ok": true`；微信公众平台 → 版本管理 出现体验版。

**这一步建议本人先用手机扫体验版二维码走一遍主流程**（首页 / 发现 / 星球 / 商城下单 / 我的），再提审。

### 4.2 提审

```bash
node scripts/submit-miniprogram-audit.js \
  --project "$(pwd)/miniapp" \
  --appid wxea3928e0978492fe \
  --secret <AppSecret> \
  --version 1.0.0 \
  --desc "首个正式版本"
```

脚本会自动：上传 → 取 access_token → 查可用类目 → 选优选类目 → 提交审核。

### 4.3 发布

审核通过后：微信公众平台 → 管理 → 版本管理 → **发布**。（或用脚本/后台的发布能力。）

### 4.4 让后台「一键推送」可用（可选）

往服务器 `/opt/miniprogram-platform/config/backend.env` 追加后 `sudo systemctl restart miniprogram-backend`：

```ini
WX_UPLOAD_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
WX_APPID=wxea3928e0978492fe
WX_SECRET=<AppSecret>
```

---

## 五、验证清单

| # | 检查项 | 方法 | 期望 |
|---|---|---|---|
| 1 | 后端健康 | `curl https://api.zfculture.site/api/health` | `{"status":"UP"}` |
| 2 | 后台可登录 | 浏览器开 `https://admin.zfculture.site` | 200，能登录 |
| 3 | TabBar 配置 | 后台复核导航配置 | 与预期一致（V95 曾重置为脚本内置值） |
| 4 | 体验版可打开 | 手机扫体验版二维码 | 五个 Tab 均正常 |
| 5 | 请求不走 fallthrough | 手机开调试模式看 console | 无 `request:fail url not in domain list` |
| 6 | 商城下单 | 体验版下一单 | 订单落库，后台可见 |
| 7 | 图片上传 | 后台/小程序传图 | 文件落到 `/opt/miniprogram-platform/backend/uploads` |
| 8 | 提审结果 | 版本管理 | 审核通过 |
| 9 | 线上版本 | 微信搜小程序名 | 可搜到、可打开 |

---

## 六、残留风险

| 优先级 | 事项 | 归属 |
|---|---|---|
| P0 | 云控制台安全组需与 ufw 同策略（ufw 管不到云厂商那层） | 人工 |
| P0 | 微信支付商户号、APIv3 密钥、回调地址（`WX_PAY_REFUND_NOTIFY_URL` 键已存在但值待确认） | 人工 |
| P1 | 后台 TabBar 配置复核 | 部署后 |
| P1 | `docs/handover/pending-items.md` 严重过期（ICP/HTTPS 已完成；三条"高"技术债务已修复） | 待更新 |
| P2 | HTTPS 证书 2026-12-19 到期，`certbot.timer` 已启用，到期前确认续期成功一次 | 到期前 |
| P2 | 小程序发布后需补：监控告警、定时备份脚本、CI/CD | 后续 |

---

## 七、一句话总结

**服务端全部就绪，小程序端卡在「微信平台凭证 + 平台配置」这两件只能人工做的事上。**
凭证与平台五项配置完成后，上传与提审由本仓库脚本一条命令完成。
