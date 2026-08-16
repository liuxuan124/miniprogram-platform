/**
 * 一键登录公共流程：时序优化、老用户降门槛、头像回写后端
 */
const { AuthService } = require('../services/auth')
const { AuthUtil } = require('./auth')
const { upload } = require('./request')

function isRemoteUrl(url) {
  return !!(url && /^https?:\/\//i.test(String(url)))
}

function hasLocalProfile(nickName, localAvatar) {
  return !!(nickName && String(nickName).trim() && localAvatar)
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

  // 新用户必须有头像+昵称；老用户可直接用服务端资料
  if (!alreadyBound && !hasLocalProfile(trimmedNick, localAvatar)) {
    AuthService.logout({ redirectToLogin: false, manual: false })
    const err = new Error('请先选择头像并填写昵称')
    err.code = 'PROFILE_REQUIRED'
    throw err
  }

  let phone
  try {
    phone = await AuthService.bindPhone(
      phoneCode,
      { nickname: trimmedNick || undefined },
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

  const finalNick = trimmedNick || serverUser.nickName || ''
  const displayAvatar = localAvatar || serverUser.avatarUrl || ''

  AuthService.completeLogin({
    phone,
    nickName: finalNick,
    avatarUrl: displayAvatar,
  })
  AuthUtil.clearLoginInterceptInfo()
  AuthUtil.rememberLoginProfile({
    nickName: finalNick,
    avatarUrl: isRemoteUrl(displayAvatar) ? displayAvatar : (serverUser.avatarUrl || ''),
  })

  syncAvatarInBackground({
    localAvatar,
    nickName: finalNick,
    phone,
    serverAvatar: serverUser.avatarUrl || '',
  })

  return {
    phone,
    nickName: finalNick,
    avatarUrl: displayAvatar,
    alreadyBound,
  }
}

function syncAvatarInBackground({ localAvatar, nickName, phone, serverAvatar }) {
  const finish = (remoteUrl) => {
    if (!remoteUrl) return
    AuthService.updateProfile(
      { nickname: nickName || undefined, avatarUrl: remoteUrl },
      { showError: false }
    ).then(() => {
      AuthService.completeLogin({ phone, nickName, avatarUrl: remoteUrl })
      AuthUtil.rememberLoginProfile({ nickName, avatarUrl: remoteUrl })
    }).catch((err) => {
      console.warn('[login-flow] 头像资料回写失败:', err)
    })
  }

  if (isRemoteUrl(localAvatar)) {
    if (localAvatar !== serverAvatar) finish(localAvatar)
    return
  }

  if (!localAvatar) return

  upload(localAvatar, {
    name: 'file',
    url: '/api/v1/mp/upload',
    formData: { subDir: 'avatar' },
    showError: false,
  }).then((uploaded) => {
    const remoteUrl = (uploaded && (uploaded.url || uploaded.fileUrl)) || ''
    finish(remoteUrl)
  }).catch((uploadErr) => {
    console.warn('[login-flow] 头像后台上传失败（不影响登录）:', uploadErr)
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
  if (cached.avatarUrl && isRemoteUrl(cached.avatarUrl)) {
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
}
