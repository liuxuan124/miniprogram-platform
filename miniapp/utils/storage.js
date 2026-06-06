// utils/storage.js — 本地存储封装
// 提供带前缀、过期时间、JSON 序列化的本地存储能力

const STORAGE_PREFIX = 'mp_'

/**
 * 本地存储工具类
 * - 自动添加命名空间前缀，避免 key 冲突
 * - 支持 TTL 过期机制
 * - 自动 JSON 序列化/反序列化
 */
const StorageUtil = {
  /**
   * 存储数据
   * @param {string} key   存储键
   * @param {*}      value 存储值（任意可序列化类型）
   * @param {number} [expireMs] 过期时间（毫秒），不传则永不过期
   */
  set(key, value, expireMs) {
    const storageKey = STORAGE_PREFIX + key
    const data = {
      value: value,
      timestamp: Date.now(),
    }
    if (expireMs && expireMs > 0) {
      data.expire = expireMs
    }
    try {
      wx.setStorageSync(storageKey, JSON.stringify(data))
    } catch (e) {
      console.error('[StorageUtil] set 失败:', key, e)
    }
  },

  /**
   * 读取数据
   * @param {string} key 存储键
   * @returns {*} 存储值，过期或不存在返回 null
   */
  get(key) {
    const storageKey = STORAGE_PREFIX + key
    try {
      const raw = wx.getStorageSync(storageKey)
      if (!raw) return null

      const data = JSON.parse(raw)

      // 检查是否过期
      if (data.expire && data.timestamp) {
        const elapsed = Date.now() - data.timestamp
        if (elapsed > data.expire) {
          this.remove(key)
          return null
        }
      }

      return data.value
    } catch (e) {
      console.error('[StorageUtil] get 失败:', key, e)
      return null
    }
  },

  /**
   * 删除数据
   * @param {string} key 存储键
   */
  remove(key) {
    const storageKey = STORAGE_PREFIX + key
    try {
      wx.removeStorageSync(storageKey)
    } catch (e) {
      console.error('[StorageUtil] remove 失败:', key, e)
    }
  },

  /**
   * 清除所有带前缀的存储数据
   */
  clearAll() {
    try {
      const res = wx.getStorageInfoSync()
      res.keys.forEach((k) => {
        if (k.startsWith(STORAGE_PREFIX)) {
          wx.removeStorageSync(k)
        }
      })
    } catch (e) {
      console.error('[StorageUtil] clearAll 失败:', e)
    }
  },

  /**
   * 获取存储信息
   * @returns {{ keys: string[], currentSize: number, limitSize: number }}
   */
  getInfo() {
    try {
      const info = wx.getStorageInfoSync()
      // 只返回带前缀的 key（去掉前缀）
      const keys = info.keys
        .filter((k) => k.startsWith(STORAGE_PREFIX))
        .map((k) => k.slice(STORAGE_PREFIX.length))
      return {
        keys,
        currentSize: info.currentSize,
        limitSize: info.limitSize,
      }
    } catch (e) {
      console.error('[StorageUtil] getInfo 失败:', e)
      return { keys: [], currentSize: 0, limitSize: 0 }
    }
  },
}

module.exports = { StorageUtil }
