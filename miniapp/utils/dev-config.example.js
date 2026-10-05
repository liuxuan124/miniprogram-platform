/**
 * 复制为 dev-config.js（已在 .gitignore），仅供 develop 环境联调。
 * 勿提交 AppSecret；生产/体验版不会读取本文件。
 *
 * 注意：resolveDevelopBaseUrl 用闭包引用 CONFIG，不依赖 `this`。
 * 调用方是解构后调用（`const { resolveDevelopBaseUrl } = require(...)`），
 * `this` 会是 undefined，用 `this.developBaseUrl` 会恒定回落 127.0.0.1。
 */
const CONFIG = {
  /** 本地 backend 根地址，不含末尾斜杠 */
  developBaseUrl: 'http://127.0.0.1:8080',
}

module.exports = {
  developBaseUrl: CONFIG.developBaseUrl,
  resolveDevelopBaseUrl() {
    return String(CONFIG.developBaseUrl || 'http://127.0.0.1:8080').replace(/\/$/, '')
  },
}