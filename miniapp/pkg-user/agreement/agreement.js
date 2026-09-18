// pkg-user/agreement/agreement.js — 隐私政策 / 用户协议（F6）
const SystemService = require('../../services/system')

const DEFAULT_CONTENT = {
  privacy: {
    title: '隐私政策',
    paragraphs: [
      '我们重视您的个人信息保护。本政策说明我们如何收集、使用、存储和保护您的信息。',
      '1. 信息收集：在您使用小程序时，我们可能收集微信授权的基本信息（昵称、头像）、手机号（经您授权）以及收藏、反馈等使用数据。',
      '2. 信息使用：用于提供资讯阅读、内容收藏、客服沟通及改进产品体验，不会用于与本小程序无关的用途。',
      '3. 信息存储：数据存储于境内服务器，采取合理安全措施防止泄露、篡改或丢失。',
      '4. 您的权利：您可申请查询、更正或删除个人信息，可通过小程序内「在线客服」或「意见反馈」联系我们。',
      '5. 政策更新：我们可能适时修订本政策，修订后将在小程序内公示。',
    ],
  },
  terms: {
    title: '用户协议',
    paragraphs: [
      '欢迎使用「暖阁」。使用本服务即表示您同意以下条款：',
      '1. 服务说明：本小程序提供创作者内容、社群交流与知识商品等服务，具体以页面展示为准。',
      '2. 账号与安全：请妥善保管账号信息，因您自身原因导致的损失由您自行承担。',
      '3. 内容使用：您可在合理范围内阅读、收藏本站内容；未经许可不得批量抓取、转售或用于违法用途。',
      '4. 禁止行为：不得利用本平台从事违法、侵权或干扰正常运营的行为。',
      '5. 免责声明：本站内容仅供行业学习参考，不构成投资、法律或税务建议；因不可抗力或第三方原因导致的服务中断，我们将在法律允许范围内免责。',
    ],
  },
}

Page({
  data: {
    title: '',
    paragraphs: [],
    externalUrl: '',
    useExternalOnly: false,
  },

  onLoad(options) {
    const type = options.type === 'terms' ? 'terms' : 'privacy'
    const preset = DEFAULT_CONTENT[type]
    this.setData({
      title: preset.title,
      paragraphs: preset.paragraphs,
    })
    wx.setNavigationBarTitle({ title: preset.title })

    SystemService.fetchSystemConfig(true)
      .then((config) => {
        const urlKey = type === 'terms' ? 'user_agreement_url' : 'privacy_policy_url'
        const url = config[urlKey] || config[type === 'terms' ? 'userAgreementUrl' : 'privacyPolicyUrl'] || ''
        if (url && String(url).startsWith('http')) {
          this.setData({
            externalUrl: url,
            paragraphs: [],
            useExternalOnly: true,
          })
        }
      })
      .catch(() => {})
  },

  onOpenExternal() {
    const url = this.data.externalUrl
    if (!url) return
    wx.navigateTo({
      url: '/pkg-user/webview/webview?url=' + encodeURIComponent(url) + '&title=' + encodeURIComponent(this.data.title),
      fail: () => wx.setClipboardData({ data: url, success: () => wx.showToast({ title: '链接已复制', icon: 'none' }) }),
    })
  },
})
