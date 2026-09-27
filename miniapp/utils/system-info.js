/** 窗口/设备信息：优先新 API，旧基础库回退 getSystemInfoSync */

function getWindowInfo() {
  try {
    if (typeof wx.getWindowInfo === 'function') {
      return wx.getWindowInfo()
    }
  } catch (e) { /* ignore */ }
  try {
    const sys = wx.getSystemInfoSync()
    return {
      statusBarHeight: sys.statusBarHeight,
      windowWidth: sys.windowWidth,
      windowHeight: sys.windowHeight,
      screenWidth: sys.screenWidth,
      screenHeight: sys.screenHeight,
      safeArea: sys.safeArea,
      pixelRatio: sys.pixelRatio,
    }
  } catch (e) {
    return {
      statusBarHeight: 20,
      windowWidth: 375,
      windowHeight: 667,
      screenWidth: 375,
    }
  }
}

function getDeviceInfo() {
  try {
    if (typeof wx.getDeviceInfo === 'function') {
      return wx.getDeviceInfo()
    }
  } catch (e) { /* ignore */ }
  try {
    const sys = wx.getSystemInfoSync()
    return {
      platform: sys.platform,
      system: sys.system,
      brand: sys.brand,
      model: sys.model,
    }
  } catch (e) {
    return { platform: '' }
  }
}

function getPlatform() {
  return String(getDeviceInfo().platform || '').toLowerCase()
}

module.exports = {
  getWindowInfo,
  getDeviceInfo,
  getPlatform,
}
