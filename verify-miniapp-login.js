const automator = require('miniprogram-automator')
const path = require('path')

const WS_ENDPOINT = process.env.MINIAPP_WS_ENDPOINT || 'ws://127.0.0.1:56647'
const CLI_PATH = process.env.WECHAT_DEVTOOLS_CLI || 'D:\\Tools software\\微信web开发者工具\\cli.bat'
const PROJECT_PATH = process.env.MINIAPP_PROJECT_PATH || path.resolve(__dirname, 'miniapp')
const API_BASE = process.env.MINIAPP_API_BASE || 'http://127.0.0.1:8080'
const TIMEOUT_MS = Number(process.env.MINIAPP_VERIFY_TIMEOUT_MS || 20000)

function withTimeout(promise, label) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timeout after ${TIMEOUT_MS}ms`)), TIMEOUT_MS)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

async function postJson(url, body) {
  const res = await withTimeout(fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }), 'backend login request')
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

async function main() {
  let mp
  try {
    mp = process.env.MINIAPP_WS_ENDPOINT
      ? await withTimeout(automator.connect({ wsEndpoint: WS_ENDPOINT }), 'connect')
      : await withTimeout(automator.launch({
        cliPath: CLI_PATH,
        projectPath: PROJECT_PATH,
        trustProject: true,
      }), 'launch')
    const loginRes = await withTimeout(mp.callWxMethod('login'), 'wx.login')
    if (!loginRes || !loginRes.code) {
      throw new Error(`wx.login did not return code: ${JSON.stringify(loginRes)}`)
    }

    const backendRes = await postJson(`${API_BASE}/api/v1/mp/auth/login`, { code: loginRes.code })
    const data = backendRes.data || {}
    const payload = data.data || {}
    console.log(JSON.stringify({
      wxLogin: 'ok',
      backendStatus: backendRes.status,
      backendCode: data.code,
      backendMessage: data.message,
      hasAccessToken: Boolean(payload.accessToken),
      userId: payload.userId || null,
      openidPresent: Boolean(payload.openid),
    }, null, 2))

    if (backendRes.status !== 200 || data.code !== 200 || !payload.accessToken) {
      process.exitCode = 1
    }
  } finally {
    if (mp) {
      try {
        await withTimeout(mp.disconnect(), 'disconnect')
      } catch {}
    }
  }
}

main().catch(err => {
  console.error(err && err.stack ? err.stack : err)
  process.exit(1)
})
