const automator = require('miniprogram-automator')
const path = require('path')

const WS_ENDPOINT = process.env.MINIAPP_WS_ENDPOINT || 'ws://127.0.0.1:56647'
const CLI_PATH = process.env.WECHAT_DEVTOOLS_CLI || 'D:\\Tools software\\微信web开发者工具\\cli.bat'
const PROJECT_PATH = process.env.MINIAPP_PROJECT_PATH || path.resolve(__dirname, 'miniapp')
const TIMEOUT_MS = Number(process.env.MINIAPP_VERIFY_TIMEOUT_MS || 15000)

function withTimeout(promise, label) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timeout after ${TIMEOUT_MS}ms`)), TIMEOUT_MS)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
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
    const page = await withTimeout(mp.currentPage(), 'currentPage')
    const views = await withTimeout(page.$$('view'), 'query views')
    const texts = await withTimeout(page.$$('text'), 'query texts')
    const samples = []
    for (let i = 0; i < Math.min(texts.length, 20); i++) {
      try {
        samples.push(await withTimeout(texts[i].text(), `text[${i}]`))
      } catch {}
    }
    const firstViewWxml = views[0]
      ? await withTimeout(views[0].outerWxml(), 'first view wxml')
      : ''
    console.log(JSON.stringify({
      viewCount: views.length,
      textCount: texts.length,
      textSamples: samples,
      firstViewWxml: firstViewWxml.slice(0, 3000),
    }, null, 2))
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
