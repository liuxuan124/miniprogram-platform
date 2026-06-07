// pages/agreement/agreement.js — 隐私政策 / 用户协议（F6）
const SystemService = require('../../services/system')

const DEFAULT_CONTENT = {
  privacy: {
    title: '隐私政策',
    paragraphs: [
      '我们重视您的个人信息保护。本政策说明我们如何收集、使用、存储和保护您的信息。',
      '1. 信息收集：在您使用小程序时，我们可能收集微信授权的基本信息（昵称、头像）、手机号（经您授权）及订单、预约等业务数据。',
      '2. 信息使用：用于提供商品/服务、订单处理、会员权益、客服联系及改进产品体验。',
      '3. 信息存储：数据存储于境内服务器，采取合理安全措施防止泄露。',
      '4. 您的权利：您可申请查询、更正或删除个人信息，可通过客服电话联系我们。',
      '5. 政策更新：我们可能适时修订本政策，修订后将在小程序内公示。',
    ],
  },
  terms: {
    title: '用户协议',
    paragraphs: [
      '欢迎使用本小程序。使用本服务即表示您同意以下条款：',
      '1. 服务说明：本平台提供商品展示、在线下单、活动报名、预约等服务，具体以页面展示为准。',
      '2. 账号与安全：请妥善保管账号信息，因您自身原因导致的损失由您自行承担。',
      '3. 交易规则：下单后请按页面提示完成支付或确认；退款、售后按平台规则及法律法规执行。',
      '4. 禁止行为：不得利用本平台从事违法、侵权或干扰正常运营的行为。',
      '5. 免责声明：因不可抗力或第三方原因导致的服务中断，我们将在法律允许范围内免责。',
    ],
  },
}

Page({
  data: {
    title: '',
    paragraphs: [],
    externalUrl: '',
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
          this.setData({ externalUrl: url })
        }
      })
      .catch(() => {})
  },

  onOpenExternal() {
    const url = this.data.externalUrl
    if (!url) return
    wx.navigateTo({
      url: '/pages/webview/webview?url=' + encodeURIComponent(url) + '&title=' + encodeURIComponent(this.data.title),
      fail: () => wx.setClipboardData({ data: url, success: () => wx.showToast({ title: '链接已复制', icon: 'none' }) }),
    })
  },
})
