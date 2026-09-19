/**
 * 一键登录公共流程：时序优化、老用户降门槛、头像回写后端
 */
const { AuthService } = require('../services/auth')
const { AuthUtil } = require('./auth')
const { upload } = require('./request')
const { resolveMediaUrl } = require('./media-url')
const {
  isPersistedMediaUrl,
  persistLocalFileForUpload,
} = require('./image-fallback')

const isRemoteUrl = isPersistedMediaUrl
const AVATAR_SYNC_TIMEOUT_MS = 12000

function hasLocalProfile(nickName, localAvatar) {
  return !!(nickName && String(nickName).trim() && localAvatar)
}

function readAuthToken() {
  try {
    const app = getApp()
    const fromApp = app && app.globalData && app.globalData.token
    if (fromApp) return fromApp
  } catch (e) { /* ignore */ }
  return AuthUtil.getToken()
}

function waitForAuthToken(maxMs = 1500) {
  const started = Date.now()
  return new Promise((resolve) => {
    const tick = () => {
      const token = readAuthToken()
      if (token) {
        resolve(token)
        return
      }
      if (Date.now() - started >= maxMs) {
        resolve(null)
        return
      }
      setTimeout(tick, 50)
    }
    tick()
  })
}

function toastAvatarIssue(kind, err) {
  const status = err && (err.statusCode || err.code)
  const raw = String((err && (err.message || err.errMsg || err.msg)) || '')
  let title = '头像上传失败，请稍后在设置中重试'
  if (kind === 'profile') {
    title = '头像已上传，资料同步失败，请稍后在设置中重试'
  } else if (status === 401 || status === 110101 || /未登录|登录已过期|auth/i.test(raw)) {
    title = '头像上传失败：登录态未就绪，请稍后在设置中重试'
  } else if (/timeout|fail|network|网络|ERR_/i.test(raw) || status === 'NETWORK') {
    title = '头像上传失败：网络异常，请稍后在设置中重试'
  }
  try {
    wx.showToast({ title, icon: 'none', duration: 2800 })
  } catch (e) { /* ignore */ }
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((resolve) => {
      setTimeout(() => resolve({ timedOut: true }), ms)
    }),
  ])
}

/**
 * @param {Object} params
 * @param {string} params.phoneCode
 * @param {string} [params.nickName]
 * @param {string} [params.localAvatar]
 * @returns {Promise<{ phone: string, nickName: string, avatarUrl: string, alreadyBound: boolean }>}
 */
async function runOneTapLogin({ phoneCode, nickName, localAvatar }) {
  const trimmedNick = (nickName || '').trim()
  if (!phoneCode) {
    const err = new Error('需要授权手机号才能登录')
    err.code = 'PHONE_DENIED'
    throw err
  }

  // 立刻换 token，缩短手机号 code 等待时间（code 在用户手势里已拿到）
  const loginResult = await AuthService.wxLogin(
    { nickname: trimmedNick || undefined },
    { showError: false }
  )
  const serverUser = (loginResult && loginResult.userInfo) || {}
  const alreadyBound = !!serverUser.phoneBound

  // 新用户无头像昵称也可登录（用默认昵称）；资料可之后在设置里完善
  const finalNick = trimmedNick || serverUser.nickName || '微信用户'
  const displayAvatar = localAvatar || serverUser.avatarUrl || ''

  let phone
  try {
    phone = await AuthService.bindPhone(
      phoneCode,
      { nickname: finalNick || undefined },
      { showError: false }
    )
  } catch (bindErr) {
    if (alreadyBound) {
      // 老用户：wxLogin 已建立正式登录态，绑号失败不阻断
      phone = serverUser.phone || ''
      console.warn('[login-flow] bindPhone failed for returning user, continue:', bindErr)
    } else {
      AuthService.logout({ redirectToLogin: false, manual: false })
      throw bindErr
    }
  }

  AuthService.completeLogin({
    phone,
    nickName: finalNick,
    // 会话展示可用本地预览；持久化只保留远程 URL，避免 wxfile 污染
    avatarUrl: isPersistedMediaUrl(displayAvatar)
      ? displayAvatar
      : (isPersistedMediaUrl(serverUser.avatarUrl) ? serverUser.avatarUrl : ''),
  })
  AuthUtil.clearLoginInterceptInfo()
  AuthUtil.rememberLoginProfile({
    nickName: finalNick,
    avatarUrl: isPersistedMediaUrl(displayAvatar)
      ? displayAvatar
      : (isPersistedMediaUrl(serverUser.avatarUrl) ? serverUser.avatarUrl : ''),
  })

  // 等 token 落盘后再同步头像；await（带超时）避免弹层关闭后 tmp 路径失效且请求未发出
  const token = await waitForAuthToken(1500)
  if (!token && localAvatar && !isPersistedMediaUrl(localAvatar)) {
    console.warn('[login-flow] token not ready before avatar sync')
    toastAvatarIssue('upload', { code: 401, message: '未登录' })
  } else {
    await withTimeout(
      syncAvatarInBackground({
        localAvatar,
        nickName: finalNick,
        phone,
        serverAvatar: serverUser.avatarUrl || '',
      }),
      AVATAR_SYNC_TIMEOUT_MS
    )
  }

  return {
    phone,
    nickName: finalNick,
    avatarUrl: displayAvatar,
    alreadyBound,
  }
}

function syncAvatarInBackground({ localAvatar, nickName, phone, serverAvatar }) {
  const finish = (remoteUrl) => {
    if (!remoteUrl || !isPersistedMediaUrl(remoteUrl)) return Promise.resolve()
    return AuthService.updateProfile(
      { nickname: nickName || undefined, avatarUrl: remoteUrl },
      { showError: false }
    ).then(() => {
      AuthService.completeLogin({ phone, nickName, avatarUrl: remoteUrl })
      AuthUtil.rememberLoginProfile({ nickName, avatarUrl: remoteUrl })
      try {
        const pages = getCurrentPages()
        const cur = pages && pages[pages.length - 1]
        if (cur && typeof cur._refreshUserInfo === 'function') cur._refreshUserInfo()
        if (cur && typeof cur._applyGreet === 'function') cur._applyGreet()
        if (cur && typeof cur._loadMineOverview === 'function') cur._loadMineOverview()
      } catch (e) { /* ignore */ }
    }).catch((err) => {
      console.warn('[login-flow] 头像资料回写失败:', err)
      toastAvatarIssue('profile', err)
    })
  }

  if (isPersistedMediaUrl(localAvatar)) {
    if (localAvatar !== serverAvatar) return finish(localAvatar)
    return Promise.resolve()
  }

  if (!localAvatar) return Promise.resolve()

  return persistLocalFileForUpload(localAvatar)
    .then((stablePath) => upload(stablePath || localAvatar, {
      name: 'file',
      url: '/api/v1/mp/upload',
      formData: { subDir: 'avatar' },
      showError: false,
      auth: true,
    }))
    .then((uploaded) => {
      const raw = (uploaded && (uploaded.url || uploaded.fileUrl || uploaded.path)) || ''
      const remoteUrl = resolveMediaUrl(raw) || raw
      if (!remoteUrl || !isPersistedMediaUrl(remoteUrl)) {
        toastAvatarIssue('upload', { message: 'empty url' })
        return
      }
      return finish(remoteUrl)
    })
    .catch((uploadErr) => {
      console.warn('[login-flow] 头像后台上传失败（不影响登录）:', uploadErr)
      toastAvatarIssue('upload', uploadErr)
    })
}

/**
 * 勾选协议即可点亮登录按钮。
 * 新用户缺头像/昵称会在授权手机号后提示完善；老用户可直接登录。
 */
function computeCanSubmit({ agreePrivacy }) {
  return !!agreePrivacy
}

function applyRememberedProfile(setDataFn) {
  const cached = AuthUtil.getRememberedLoginProfile()
  if (!cached) return false
  const patch = {}
  if (cached.nickName) patch.nickName = cached.nickName
  if (cached.avatarUrl && isPersistedMediaUrl(cached.avatarUrl)) {
    patch.avatarUrl = cached.avatarUrl
    patch.avatarLocalPath = cached.avatarUrl
  }
  if (!Object.keys(patch).length) return false
  setDataFn(patch)
  return true
}

module.exports = {
  runOneTapLogin,
  computeCanSubmit,
  applyRememberedProfile,
  hasLocalProfile,
  isRemoteUrl,
  isPersistedMediaUrl,
}
