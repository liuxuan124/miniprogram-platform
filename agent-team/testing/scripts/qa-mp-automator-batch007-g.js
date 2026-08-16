const automator = require('miniprogram-automator')
const WS = 'ws://127.0.0.1:9420'

async function main() {
  let mp
  try {
    mp = await automator.connect({ wsEndpoint: WS })
    const page = await mp.currentPage()
    const info = await page.callMethod('__qa_noop').catch(() => null)
    const storage = await mp.evaluate(async () => {
      return {
        api_base_url: wx.getStorageSync('api_base_url') || '',
        token: wx.getStorageSync('token') ? 'present' : '',
        access_token: wx.getStorageSync('access_token') ? 'present' : '',
      }
    }).catch((e) => ({ evalError: e.message }))
    console.log(JSON.stringify({ info, storage }, null, 2))
  } catch (e) {
    console.log(JSON.stringify({ error: e.message }))
  } finally {
    if (mp) try { await mp.disconnect() } catch (_) {}
  }
}
main()
