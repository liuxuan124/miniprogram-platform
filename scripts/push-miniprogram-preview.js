#!/usr/bin/env node
/**
 * 上传小程序代码到微信体验版（供后台一键推送调用）
 *
 * 环境变量:
 *   WX_UPLOAD_KEY  - 代码上传密钥 PEM 内容
 *
 * 参数:
 *   --project   miniapp 目录绝对路径
 *   --appid     微信小程序 AppID
 *   --version   上传版本号
 *   --desc      版本描述
 */

const fs = require('fs')
const os = require('os')
const path = require('path')

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

function fail(message, detail) {
  const payload = { ok: false, message, detail: detail || '' }
  console.log(JSON.stringify(payload))
  process.exit(1)
}

async function main() {
  const args = parseArgs(process.argv)
  const projectPath = args.project
  const appid = args.appid
  const version = args.version
  const desc = args.desc || '后台一键推送体验版'
  const uploadKey = process.env.WX_UPLOAD_KEY

  if (!projectPath || !appid || !version) {
    fail('缺少必要参数 project/appid/version')
  }
  if (!uploadKey || !uploadKey.includes('PRIVATE KEY')) {
    fail('未配置有效的代码上传密钥 WX_UPLOAD_KEY')
  }
  if (!fs.existsSync(projectPath)) {
    fail(`miniapp 目录不存在: ${projectPath}`)
  }

  let ci
  try {
    ci = require('miniprogram-ci')
  } catch (error) {
    fail('未安装 miniprogram-ci，请在项目根目录执行 npm install', error.message)
  }

  const keyFile = path.join(os.tmpdir(), `wx-upload-key-${Date.now()}.pem`)
  fs.writeFileSync(keyFile, uploadKey, 'utf8')

  const configPath = path.join(projectPath, 'project.config.json')
  let originalConfig = null
  if (fs.existsSync(configPath)) {
    originalConfig = fs.readFileSync(configPath, 'utf8')
    try {
      const config = JSON.parse(originalConfig)
      config.appid = appid
      fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8')
    } catch (error) {
      fail('读取 project.config.json 失败', error.message)
    }
  }

  try {
    const project = new ci.Project({
      appid,
      type: 'miniProgram',
      projectPath,
      privateKeyPath: keyFile,
      ignores: ['node_modules/**/*'],
    })

    const uploadResult = await ci.upload({
      project,
      version,
      desc,
      setting: {
        es6: true,
        es7: true,
        minify: true,
        autoPrefixWXSS: true,
      },
      onProgressUpdate: () => {},
    })

    const payload = {
      ok: true,
      version,
      desc,
      subPackageInfo: uploadResult.subPackageInfo || [],
      pluginInfo: uploadResult.pluginInfo || [],
      devPluginInfo: uploadResult.devPluginInfo || [],
      uploadTime: new Date().toISOString(),
    }
    console.log(JSON.stringify(payload))
  } catch (error) {
    fail(error.message || '上传失败', error.stack || '')
  } finally {
    if (originalConfig !== null) {
      fs.writeFileSync(configPath, originalConfig, 'utf8')
    }
    try {
      fs.unlinkSync(keyFile)
    } catch (_) {
      // ignore
    }
  }
}

main()
