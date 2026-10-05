/**
 * V119 登录幂等回归测试（纯 Node，无需开发者工具）
 *
 * 钉死三件事：
 *  1) bindPhone 走 /phone/v2 且把对象形态归一为 { phone, merged }（兼容旧版裸字符串）
 *  2) login-flow 收到 merged=true 时会重新 wxLogin 换 token（否则端上握着已软删账号的 token 一路 401）
 *  3) 🔴 completeLogin 只接受字符串 phone —— 对象绝不能落进持久化 userInfo
 *     （这是 2026-10-05 我真踩的事故：/phone 返回类型一改，老版本把对象当手机号存，显示 [object Object]）
 *
 * 用法：node scripts/qa/test-login-phone-idempotency.js
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '../..')
const AUTH = path.join(ROOT, 'miniapp/services/auth.js')
const FLOW = path.join(ROOT, 'miniapp/utils/login-flow.js')

let pass = 0
let fail = 0

function ok(name, cond) {
  if (cond) {
    pass++
    console.log('  ✓ ' + name)
  } else {
    fail++
    console.log('  ✗ ' + name)
  }
}

const auth = fs.readFileSync(AUTH, 'utf8')
const flow = fs.readFileSync(FLOW, 'utf8')

console.log('\n[1] bindPhone 契约')
ok('走新端点 /phone/v2（老端点返回裸字符串，拿不到 merged）',
  auth.includes('/api/v1/mp/auth/phone/v2'))
ok('不再使用老的 /phone 端点（避免与老版本契约混淆）',
  !/post\(\s*'\/api\/v1\/mp\/auth\/phone'\s*,/.test(auth))
ok('把返回值归一为对象形态', /typeof res === 'object'/.test(auth))
ok('裸字符串响应有兜底（老后端兼容）', /return \{ phone: res, merged: false \}/.test(auth))
ok('解析出 merged 标记', /merged: !!res\.merged/.test(auth))

console.log('\n[2] login-flow 合并后重登')
ok('声明了 mergedIntoExisting', /let mergedIntoExisting = false/.test(flow))
ok('从 bindPhone 结果读 merged', /bindRes && bindRes\.merged/.test(flow))
ok('取 phone 时取的是 bindRes.phone（不是整个对象）', /bindRes && bindRes\.phone/.test(flow))
ok('merged 时重新 wxLogin', /if \(mergedIntoExisting\)[\s\S]{0,400}wxLogin\(/.test(flow))

console.log('\n[3] 🔴 completeLogin 类型防御（防对象落库）')
ok('定义了 safePhone', /const safePhone = typeof phone === 'string'/.test(auth))
ok('userInfo 里写入的是 safePhone 而非 phone',
  /const nextUserInfo = \{[\s\S]{0,200}phone: safePhone/.test(auth))
ok('userInfo 写入处不再直接用裸 phone',
  !/const nextUserInfo = \{[\s\S]{0,200}\n\s*phone,\n/.test(auth))

console.log('\n[4] 回归：老契约未被破坏')
// 老版本端上依赖 /phone 返回裸 String；后端 controller 必须保留 R<String>
const ctrl = path.join(ROOT, 'backend/src/main/java/com/miniprogram/controller/MpAuthController.java')
if (fs.existsSync(ctrl)) {
  const c = fs.readFileSync(ctrl, 'utf8')
  ok('后端 /phone 仍返回 R<String>（老版本兼容）', /R<String>\s+bindPhone\(/.test(c))
  ok('后端 /phone/v2 返回 VO（新端上用）', /R<WxPhoneBindVO>\s+bindPhoneV2\(/.test(c))
  ok('合并信号走响应头（老版本会忽略）', /X-Account-Merged/.test(c))
} else {
  console.log('  (跳过) 未找到 MpAuthController.java')
}

console.log('\n' + '-'.repeat(46))
console.log(`结果：${pass} 通过 / ${fail} 失败`)
process.exit(fail === 0 ? 0 : 1)
