# 小程序本地上传与发布（人工流程）

本仓库**不包含**后台代码推送、自动提审或 CI/CD。内容配置在运营后台「保存并同步」后由接口下发；**代码包**在本机上传。

## 目录与导入

| 项 | 路径 |
|----|------|
| 源码根目录 | `miniapp/` |
| 微信开发者工具「项目目录」 | 同上，选仓库内 `miniapp` 文件夹 |
| 构建产物 | 无独立 webpack 构建；npm 仅用于 `mp-html` 等 npm 组件 |
| npm 构建 | 开发者工具 → 工具 → 构建 npm（若改过 `package.json`） |

## 1. 安装依赖

```bash
cd miniapp
npm install
```

在微信开发者工具中执行「构建 npm」（生成 `miniprogram_npm/`）。

## 2. 环境与 API

| 环境 | API 基址 |
|------|-----------|
| 开发版 `develop` | `utils/dev-config.js` 的 `developBaseUrl`（从 `dev-config.example.js` 复制，**勿提交**） |
| 体验版 / 正式版 | `https://api.zfculture.site`（`utils/request.js` 中 `PROD_BASE_URL`） |

可选：在开发者工具 Storage 写入 `api_base_url` 覆盖（仅联调，勿用于正式发布包）。

**生产包禁止**指向 `localhost`：仅 `envVersion === 'develop'` 时走本地地址。

若 `dev-config.js` 仍指向 `https://api.zfculture.site`，开发者工具里看到的是**线上已发布配置**（墨太白/出海笔记等），与 `http://localhost/` 本地后台不是同一套数据。改回 `http://127.0.0.1:8080` 后请：**清缓存 → 重新编译 → 下拉刷新**。

首页 Tab 若绑定 **`pages/index/index` + pageId**（如「出海笔记首页」），小程序会走 **装修器 DSL**（`brand_intro` / `article_list` 等），不再注入 `warm-home-blocks` 暖阁默认壳。仅当 DSL 为单个 `warm_home` 组件或未绑页时才走暖阁 native 块 + `/api/v1/mp/home/warm`。

本地 HTTP 接口（`127.0.0.1:8080`）不在微信「request 合法域名」里，若 `project.config.json` 的 `urlCheck` 为 `true` 且未勾选 **详情 → 本地设置 → 不校验合法域名**，会出现 Toast「网络异常」、暖阁块「加载失败」。仓库内已默认 `urlCheck: false`；仍失败时清 Storage 里的 `api_base_url` 覆盖项。

真机预览本地 backend 时，需把 `developBaseUrl` 改成电脑的**局域网 IP**（如 `http://192.168.x.x:8080`），并确保手机与电脑同网段；模拟器用 `127.0.0.1` 即可。

## 3. AppID

在 `miniapp/project.config.json` / 开发者工具项目设置中配置与微信公众平台一致的 AppID。密钥、AppSecret 不得写入仓库。

## 4. 本地检查（推荐）

```bash
cd miniapp
node utils/content-config.test.js
node utils/qrcode.test.js
```

## 5. 开发者工具验证

1. 打开项目目录 `miniapp/`。
2. 编译模式选「普通编译」；内容预览草稿需体验版 + 扫码 `pt`（正式版忽略 pt）。
3. 验证：五 Tab 导航、绑定装修页、下拉刷新、弱网提示、登录前后入口。
4. **不要**用管理后台 H5 iframe 预览代替微信运行时。

## 6. 真机验证（人工）

- 体验版扫码：草稿预览（带 pt 角标）。
- 正式版：仅 `view=online` 配置。
- 检查：分享/扫码进入、下拉刷新、安全区、已打开小程序再次进入（`onShow` 发布号检测，约 45s 节流）。

## 7. 上传与审核（人工）

1. 开发者工具 → 上传 → 填写版本号与备注（与后台「代码版本记录」可手工对齐，无自动回执）。
2. 微信公众平台 → 版本管理 → 选体验版/提交审核 → 发布。
3. 发布后冒烟：Tab、首页 DSL、商品/文章列表、登录与订单（测试账号）。

## 8. 与内容配置的关系

- 改导航/装修/主题：**仅**后台保存并同步，用户下拉刷新或重新进入后拉新版本（`live_release_no`）。
- 改组件类型、新增渲染能力、改 `app.json` 页面注册：**必须**发新代码包。

详见 `agent-team/contracts/mp-content-config-sync-closed-loop.md` 与 `agent-team/contracts/mp-client-component-support.md`。
