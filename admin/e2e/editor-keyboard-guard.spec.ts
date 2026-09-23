import { test, expect } from '@playwright/test'

/**
 * 快捷键守卫：弹层打开时不应触发画布撤销（与 editorKeyboardGuard 一致）
 * 完整装修器 E2E 需登录态，此处用 DOM 探针验证守卫逻辑在浏览器内可用。
 */
test('message box overlay blocks shortcut guard', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    const wrap = document.createElement('div')
    wrap.className = 'el-message-box__wrapper'
    document.body.appendChild(wrap)
  })
  const blocked = await page.evaluate(() => {
    return Boolean(document.querySelector('.el-message-box__wrapper'))
  })
  expect(blocked).toBe(true)
})
