const automator = require('miniprogram-automator')
const WS = 'ws://127.0.0.1:9420'

async function main() {
  let mp
  try {
    mp = await automator.connect({ wsEndpoint: WS })
    let storage = null
    try {
      storage = await mp.callWxMethod('getStorageSync', 'api_base_url')
    } catch (e) {
      storage = { callWxErr: e.message }
    }
    let evalStorage = null
    try {
      evalStorage = await mp.evaluate(() => ({
        api_base_url: wx.getStorageSync('api_base_url') || '',
        hasToken: !!(wx.getStorageSync('token') || wx.getStorageSync('access_token') || wx.getStorageSync('mp_token')),
      }))
    } catch (e) {
      evalStorage = { evalErr: e.message }
    }
    console.log(JSON.stringify({ storage, evalStorage }, null, 2))
  } catch (e) {
    console.log(JSON.stringify({ error: e.message }))
  } finally {
    if (mp) try { await mp.disconnect() } catch (_) {}
  }
}
main()
