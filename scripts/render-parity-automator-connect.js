const path = require('path')
const automator = require('miniprogram-automator')

const ROOT = path.join(__dirname, '..')
const PROJECT = path.join(ROOT, 'miniapp')
const CLI = process.env.WECHAT_DEVTOOLS_CLI || '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
const PORTS = process.env.MINIAPP_AUTOMATOR_PORTS
  ? process.env.MINIAPP_AUTOMATOR_PORTS.split(',').map((p) => Number(p.trim())).filter(Boolean)
  : [9422, 9421, 9420]

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function connectAutomator() {
  const timeout = Number(process.env.MINIAPP_AUTOMATOR_TIMEOUT_MS || 120000)
  const opts = { timeout }
  const wsOverride = process.env.MINIAPP_WS_ENDPOINT
  if (wsOverride) {
    return { mp: await automator.connect({ wsEndpoint: wsOverride, ...opts }), port: wsOverride }
  }
  for (const port of PORTS) {
    try {
      return { mp: await automator.connect({ wsEndpoint: `ws://127.0.0.1:${port}`, ...opts }), port }
    } catch (e) { /* next */ }
  }
  try {
    const mp = await automator.launch({ projectPath: PROJECT, cliPath: CLI, port: 9421 })
    return { mp, port: 9421, launched: true }
  } catch (e) {
    throw new Error(`automator connect/launch failed: ${e.message || e}`)
  }
}

module.exports = { ROOT, PROJECT, sleep, connectAutomator }
