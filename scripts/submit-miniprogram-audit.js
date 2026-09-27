#!/usr/bin/env node
/**
 * 上传体验版并提交微信代码审核
 */
const fs = require('fs')
const os = require('os')
const path = require('path')
const https = require('https')

function parseArgs(argv) {
  const args = {}
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i]
    const value = argv[i + 1]
    if (key.startsWith('--') && value && !value.startsWith('--')) {
      args[key.slice(2)] = value
      i += 1
    }
  }
  return args
}

function requestJson(url, options = {}, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let raw = ''
      res.on('data', (chunk) => { raw += chunk })
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw || '{}'))
        } catch (e) {
          reject(new Error(`JSON parse failed: ${raw}`))
        }
      })
    })
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

function fail(message, detail) {
  console.log(JSON.stringify({ ok: false, message, detail: detail || '' }))
  process.exit(1)
}

function pickCategory(categories, forcedFirst, forcedSecond) {
  // 小程序含会员、商城下单与在线支付，类目必须与实际功能一致（QA MP-P0-02）。
  // 优先真实商业类目；可用 --first-class/--second-class 强制指定。
  if (forcedFirst) {
    const hit = categories.find((c) => c.first_class === forcedFirst
      && (!forcedSecond || c.second_class === forcedSecond))
    if (hit) return hit
    fail('指定的审核类目不存在', `${forcedFirst}/${forcedSecond || '*'}`)
  }
  const prefer = [
    ['商家自营', ''],
    ['商业服务', ''],
    ['电商平台', ''],
    ['资讯', '信息资讯'],
    ['资讯', ''],
    ['教育', '在线教育'],
    ['工具', '信息查询'],
  ]
  for (const [first, second] of prefer) {
    const hit = categories.find((c) => {
      if (c.first_class !== first) return false
      if (!second) return true
      return c.second_class === second
    })
    if (hit) return hit
  }
  return categories[0] || null
}

async function getAccessToken(appid, secret) {
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(appid)}&secret=${encodeURIComponent(secret)}`
  const data = await requestJson(url)
  if (!data.access_token) fail('获取 access_token 失败', JSON.stringify(data))
  return data.access_token
}

async function uploadProject({ projectPath, appid, version, desc, uploadKey }) {
  const ci = require('miniprogram-ci')
  const keyFile = path.join(os.tmpdir(), `wx-upload-key-${Date.now()}.pem`)
  fs.writeFileSync(keyFile, uploadKey, 'utf8')
  const configPath = path.join(projectPath, 'project.config.json')
  let originalConfig = null
  if (fs.existsSync(configPath)) {
    originalConfig = fs.readFileSync(configPath, 'utf8')
    const config = JSON.parse(originalConfig)
    config.appid = appid
    fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8')
  }
  try {
    const project = new ci.Project({
      appid,
      type: 'miniProgram',
      projectPath,
      privateKeyPath: keyFile,
      ignores: ['node_modules/**/*'],
    })
    return await ci.upload({
      project,
      version,
      desc,
      setting: { es6: true, es7: true, minify: true, autoPrefixWXSS: true },
      onProgressUpdate: () => {},
    })
  } finally {
    if (originalConfig !== null) fs.writeFileSync(configPath, originalConfig, 'utf8')
    try { fs.unlinkSync(keyFile) } catch (_) {}
  }
}

async function main() {
  const args = parseArgs(process.argv)
  const projectPath = args.project
  const appid = args.appid
  const version = args.version
  const desc = args.desc || '提交审核'
  const versionDesc = args['version-desc']
    || '跨境行业资讯阅读 + 会员体系 + 星球社群 + 文创商城（含在线下单与支付）'
  const uploadKey = String(process.env.WX_UPLOAD_KEY || '').replace(/\\n/g, '\n')
  const appSecret = process.env.WX_APP_SECRET || ''

  if (!projectPath || !appid || !version || !appSecret) {
    fail('缺少 project/appid/version/WX_APP_SECRET')
  }
  if (!uploadKey.includes('PRIVATE KEY')) fail('WX_UPLOAD_KEY 无效')

  const uploadResult = await uploadProject({ projectPath, appid, version, desc, uploadKey })
  const token = await getAccessToken(appid, appSecret)

  const categoryRes = await requestJson(`https://api.weixin.qq.com/wxa/get_category?access_token=${token}`)
  const categories = categoryRes.category_list || []
  const cat = pickCategory(categories, args['first-class'], args['second-class'])
  if (!cat) fail('未找到可用审核类目', JSON.stringify(categoryRes))

  // 页面地址必须取自 miniapp/app.json 当前注册路径（QA MP-P0-02：旧主包路径已全部迁移/拆分）
  const makeItem = (address, tag, title) => ({
    address,
    tag,
    title,
    first_class: cat.first_class,
    second_class: cat.second_class,
    first_id: cat.first_id,
    second_id: cat.second_id,
  })
  const itemList = [
    makeItem('pages/index/index', '跨境 资讯 干货', '首页'),
    makeItem('pages/discover/discover', '文章 笔记 阅读', '发现'),
    makeItem('pages/planet/planet', '社群 星球 会员', '星球'),
    makeItem('pages/shop/shop', '商城 文创 商品', '商城'),
    makeItem('pages/mine/mine', '个人中心 订单 收藏', '我的'),
  ]

  const auditBody = JSON.stringify({
    item_list: itemList,
    version_desc: versionDesc,
    feedback_info: '本小程序为跨境行业资讯与社群服务平台：提供文章/笔记阅读、星球社群、会员体系，'
      + '以及文创商品的在线展示、下单与微信支付。商品为自营文创类实物/虚拟商品，'
      + '涉及收货地址与订单管理；客服咨询通过微信客服进行。'
      + '隐私保护指引已在小程序后台按实际接口（手机号、头像相册、剪贴板、订阅消息、支付等）如实声明。',
  })

  const auditRes = await requestJson(
    `https://api.weixin.qq.com/wxa/submit_audit?access_token=${token}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(auditBody) } },
    auditBody,
  )

  if (auditRes.errcode && auditRes.errcode !== 0) {
    fail('提交审核失败', JSON.stringify(auditRes))
  }

  console.log(JSON.stringify({
    ok: true,
    version,
    desc,
    category: `${cat.first_class} / ${cat.second_class}`,
    auditid: auditRes.auditid,
    uploadTime: new Date().toISOString(),
    subPackageInfo: uploadResult.subPackageInfo || [],
  }))
}

main().catch((e) => fail(e.message || 'unknown', e.stack || ''))
