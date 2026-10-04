# mcp-miniprogram

WorkBuddy 连接器：让 WorkBuddy 直接读写「小程序搭建运营平台」后端的内容、装修页面与素材库。

## 一、它是什么

一个标准 MCP server（stdio 传输）。WorkBuddy 拉起它，就能用自然语言做这些事：

- 「把后台最近 10 条内容列出来」
- 「读一下 ID 128 这篇文章的正文」
- 「新建一篇草稿，标题 XXX，正文 YYY」
- 「把内容 128 发布上线」
- 「把首页的 DSL 改一下，存草稿然后发布」
- 「把这张图传到素材库」

## 二、能力清单（12 个工具）

### 读
| 工具 | 作用 |
|------|------|
| `mp_list_contents` | 内容列表，支持关键词/状态/类型/分类筛选 + 分页 |
| `mp_get_content` | 内容详情（含正文、封面、附件、标签） |
| `mp_list_pages` | 装修页面列表 |
| `mp_get_page` | 页面详情（含 DSL 结构） |
| `mp_list_assets` | 素材库列表 |

### 写 / 发布
| 工具 | 作用 |
|------|------|
| `mp_create_content` | 新建内容（草稿态） |
| `mp_update_content` | 更新内容（先读后写合并，只改传入字段） |
| `mp_publish_content` | 发布内容上线 |
| `mp_unpublish_content` | 内容下架 |
| `mp_save_page_draft` | 存页面 DSL 草稿 |
| `mp_publish_page` | 发布装修页面 |
| `mp_upload_file` | 上传本地文件到素材库 |

## 三、认证

### 凭据放哪：优先用文件，别写进 mcp.json

**推荐** —— 凭据文件（秘密不进 `mcp.json`）：

```bash
bash scripts/setup-credentials.sh     # 交互式，密码不回显
```

生成 `~/.workbuddy/credentials/mp.env`（权限 600）。`mcp.json` 里只写：

```json
"staticEnv": {
  "MP_API_BASE": "https://api.zfculture.site",
  "MP_CREDENTIALS_FILE": "~/.workbuddy/credentials/mp.env",
  "MP_READ_ONLY": "1"
}
```

次选 —— 环境变量直接写进 `mcp.json` 的 `staticEnv`（明文，任何能读 home 目录的程序都能看到）。

### 认证方式：两种，二选一

### 模式 A · 后台账号密码（推荐）
```
MP_USERNAME  后台登录用户名
MP_PASSWORD  后台登录密码
```
内部走 `POST /api/v1/admin/auth/login` 取 accessToken，到期前 5 分钟自动重登，401 自动刷新重试一次。**不需要知道 JWT 密钥。**

### 模式 B · 自签 JWT
```
MP_JWT_SECRET     后端 jwt.secret（≥32 字符）
MP_ADMIN_USER_ID  管理员用户 ID，默认 1（必须是一个 status=1 的 admin 账号）
```
按后端 `JwtTokenProvider` 的规则本地签 HS256 token，claims 为 `{sub:"admin", userId, typ:"access", iat, exp}`。

### 其他可选变量
```
MP_API_BASE    后端地址，默认 https://api.zfculture.site（连本地改成 http://127.0.0.1:8080）
MP_TENANT_ID   租户 ID，走 X-Tenant-Id 请求头
MP_TIMEOUT_MS  单次请求超时，默认 20000
```

## 四、依赖与运行

```bash
cd tools/mcp-miniprogram
npm install
```

手动冒烟（验证握手 + 工具清单）：
```bash
MP_USERNAME=xxx MP_PASSWORD=yyy node scripts/smoke.js
```

带一次真实调用：
```bash
MP_USERNAME=xxx MP_PASSWORD=yyy node scripts/smoke.js mp_list_contents '{"current":1,"size":5}'
```

## 五、注册到 WorkBuddy

配置写在 `~/.workbuddy/mcp.json`。改完后 **不会自动生效**：打开连接器管理页，右上角「自定义连接器」入口，对新出现的服务器点「信任」；若之前已信任过，重启 WorkBuddy 让新配置重新加载。

## 六、注意

- 写操作（发布、改内容、发页面）直接作用于生产库，没有二次确认弹窗。**让 WorkBuddy 发布前，自己先想清楚。**
- `mp_update_content` 是「先读全量再合并覆盖」，并发编辑时可能互相覆盖，有锁时传 `confirmOverwrite: true`。
- 封面/图片字段必须是 `/uploads/...` 相对路径，不要拼 admin 域名的绝对 URL。
- 保存草稿 ≠ 发布。页面改动必须再调 `mp_publish_page` 才会生效。

## 七、安全边界

### 已内置的三道护栏

1. **只读开关**：`MP_READ_ONLY=1` 时，7 个写工具从 `tools/list` 中移除，即便被强行调用也直接拒绝。**首次接入建议开着，跑顺了再改成 `0`。**
2. **敏感路径黑名单**：`finance` / `refunds` / `system` / `admin-users` / `roles` / `permissions` / `agent` 在请求层硬拦截（`/admin/system/upload` 作为例外放行）。就算以后扩展工具也碰不到财务、退款、账号权限。
3. **凭据文件 600 权限**：`mcp.json` 里只有路径，没有秘密。

### 真实存在的风险（别假装没有）

| 风险 | 说明 | 应对 |
|------|------|------|
| **密码进对话** | 一旦在对话里把密码打出来，它会进对话历史与上下文，这是最大的暴露面 | **永远不要在对话里发密码**，用 `setup-credentials.sh` 自己写 |
| **命令明文落盘** | `~/.workbuddy/audit-log/*.jsonl` 的 `commandPreview` 字段存完整命令串，带密码的 curl 会永久留痕 | 不要用命令行传密码；脚本内用 `read -s` |
| **本地明文凭据** | 凭据文件与 `mcp.json` 都在本机，能读 home 的程序都能读 | 文件 600；机器有他人使用时改用自签 JWT 且定期轮换 |
| **超管权限过宽** | 若用 super_admin 账号，token 理论可达财务/系统模块 | 给连接器**单独建一个低权限后台账号**，只给内容/页面/素材权限 |
| **生产直写** | 写操作直接打生产库，没有二次确认 | 先 `MP_READ_ONLY=1` 跑一段时间 |

### 最该做的一件事

在后台给这个连接器**新建一个专用账号**，只授予内容与页面模块权限，不要复用你的超管账号。这样即便凭据泄露，损失边界也只是"能改内容"，碰不到财务和系统配置。
