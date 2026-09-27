/**
 * 复制为 dev-config.js（已在 .gitignore），仅供 develop 环境联调。
 * 勿提交 AppSecret；生产/体验版不会读取本文件。
 */
module.exports = {
  /** 本地 backend 根地址，不含末尾斜杠 */
  developBaseUrl: 'http://127.0.0.1:8080',
  resolveDevelopBaseUrl() {
    return String(this.developBaseUrl || 'http://127.0.0.1:8080').replace(/\/$/, '')
  },
}
