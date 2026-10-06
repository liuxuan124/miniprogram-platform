/**
 * 线上部署验证：确认浏览器真正加载的是新版本。
 *
 * 🔴 为什么不能只看 index.html 的 mtime：
 *   admin-static 是**解压式部署**（不删旧文件），线上会堆积上百个历史 chunk。
 *   grep 到 "搭建工作台" 可能命中的是三个小时前的旧 chunk，
 *   浏览器实际加载的却是另一个 —— 只看文件会得出"部署成功"的假结论。
 *   所以必须用真实浏览器打开页面，看它渲染出什么。
 *
 * ⚠️ 本脚本只读：注入假 token 是为了让前端路由守卫放行好看到侧栏结构，
 *    真实数据接口仍会 401（那是预期的，我们不碰生产数据）。
 */
import { chromium } from 'playwright'

const BASE = process.env.PROD_BASE || 'https://admin.zfculture.site'
const ROUTE = process.env.PROD_ROUTE || '/mini/workbench'

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 980 } })
const page = await ctx.newPage()

await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' }).catch(() => {})
await ctx.addInitScript((tk) => {
  localStorage.setItem('access_token', tk)
  localStorage.setItem('refresh_token', tk)
}, 'x.y.z')

await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'domcontentloaded' }).catch(() => {})
await page.waitForTimeout(4000)

const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ')

const EXPECT = ['搭建工作台', '页面管理', '版本管理', '模板管理']
const LEGACY = ['品牌与导航', '发版中心', '基础配置']
const has = (w) => (text.includes(w) ? 'YES' : 'no')

console.log('URL           :', page.url())
console.log('落在登录页    :', /\/login/.test(page.url()) ? 'YES（未验证到内容）' : 'no')
console.log('新四项        :', EXPECT.map((w) => `${w}=${has(w)}`).join('  '))
console.log('旧项残留      :', LEGACY.map((w) => `${w}=${has(w)}`).join('  '))
const i = text.indexOf('搭建工作台')
console.log('文本片段      :', i >= 0 ? text.slice(i, i + 240) : text.slice(0, 240))

await browser.close()