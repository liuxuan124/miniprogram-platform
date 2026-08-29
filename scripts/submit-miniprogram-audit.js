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

function pickCategory(categories) {
  const prefer = [
    ['资讯', '信息资讯'],
    ['资讯', ''],
    ['教育', '在线教育'],
    ['工具', '信息查询'],
    ['商业服务', ''],
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
  const versionDesc = args['version-desc'] || '纯内容资讯小程序，无在线销售与配送功能'
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
  const cat = pickCategory(categories)
  if (!cat) fail('未找到可用审核类目', JSON.stringify(categoryRes))

  const itemList = [
    {
      address: 'pages/index/index',
      tag: '跨境 资讯 内容',
      title: '首页',
      first_class: cat.first_class,
      second_class: cat.second_class,
      first_id: cat.first_id,
      second_id: cat.second_id,
    },
    {
      address: 'pages/content-list/content-list',
      tag: '文章 资讯',
      title: '内容',
      first_class: cat.first_class,
      second_class: cat.second_class,
      first_id: cat.first_id,
      second_id: cat.second_id,
    },
    {
      address: 'pages/mine/mine',
      tag: '个人中心',
      title: '我的',
      first_class: cat.first_class,
      second_class: cat.second_class,
      first_id: cat.first_id,
      second_id: cat.second_id,
    },
  ]

  const auditBody = JSON.stringify({
    item_list: itemList,
    version_desc: versionDesc,
    feedback_info: '本小程序为跨境资讯内容阅读平台，提供文章浏览、收藏与客服咨询，不含商品销售、在线支付与配送功能。',
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
