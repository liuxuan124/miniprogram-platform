const automator = require('miniprogram-automator')
const path = require('path')

async function main() {
  const mp = process.env.MINIAPP_WS_ENDPOINT
    ? await automator.connect({ wsEndpoint: process.env.MINIAPP_WS_ENDPOINT })
    : await automator.launch({
      cliPath: process.env.WECHAT_DEVTOOLS_CLI || 'D:\\Tools software\\微信web开发者工具\\cli.bat',
      projectPath: process.env.MINIAPP_PROJECT_PATH || path.resolve(__dirname, 'miniapp'),
      trustProject: true,
    })
  await mp.reLaunch('/pages/index/index')
  const page = await mp.currentPage()
  await page.waitFor(5000)
  const data = await page.data()
  const checks = {
    path: page.path,
    componentTypes: (data.components || []).map(c => c.type),
    backgroundColor: data.backgroundColor,
    loading: data.loading,
    error: data.error || '',
    tabbarList: data.tabbarList || null,
    globalConfig: data.globalConfig || null
  }
  console.log(JSON.stringify(checks, null, 2))
  await mp.disconnect()
}

main().catch(err => {
  console.error(err && err.stack ? err.stack : err)
  process.exit(1)
})
