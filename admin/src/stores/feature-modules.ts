/**
 * 功能模块开关（对应系统配置 plugins）
 * - 后台侧栏/命令面板据此隐藏入口
 * - 关闭会员模块时同步 minePageConfig 入口
 * - 关闭商品模块时同步 tabbar 商城 Tab
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getConfigsSilent, updateConfigs } from '@/api/system'
import { extractConfigList, readConfigEntry, toConfigUpdateItems } from '@/utils/system-config'

export type FeatureModuleKey =
  | 'product'
  | 'member'
  | 'order'
  | 'content'
  | 'comment'
  | 'activity'
  | 'form'
  | 'qa'
  | 'appointment'
  | 'coupon'
  | 'agent'
  | 'planet'

export interface FeatureModuleState {
  key: string
  enabled: boolean
}

const DEFAULT_MODULES: FeatureModuleState[] = [
  { key: 'product', enabled: false },
  { key: 'member', enabled: false },
  { key: 'planet', enabled: false },
  { key: 'order', enabled: false },
  { key: 'content', enabled: true },
  { key: 'comment', enabled: true },
  { key: 'activity', enabled: true },
  { key: 'form', enabled: false },
  { key: 'qa', enabled: false },
  { key: 'appointment', enabled: true },
  { key: 'coupon', enabled: false },
  { key: 'agent', enabled: true },
]

const PRODUCT_TAB_SLOT_INDEX = 3

function isMemberEntry(item: Record<string, unknown>): boolean {
  const id = String(item.id || '')
  const url = String(item.url || item.pagePath || '')
  return id === 'member-center' || url.includes('member-center')
}

function isProductTabItem(item: Record<string, unknown>, index: number): boolean {
  const shell = String(item.tabRoute || item.slotRoute || '')
  if (shell.includes('shop') || shell.includes('knowledge-mall')) return true
  if (!shell && index === PRODUCT_TAB_SLOT_INDEX) return true
  const path = String(item.pagePath || item.path || '')
  const text = String(item.text || item.name || '')
  const pageName = String(item.pageName || '')
  if (/\/pages\/shop|knowledge-mall|product-list|product-detail|\/cart/.test(path)) return true
  return /商品|商城/.test(text) || /商城|商品/.test(pageName)
}

function isTradeMenuItem(item: Record<string, unknown>): boolean {
  const id = String(item.id || '')
  const url = String(item.url || item.pagePath || '')
  if (id === 'orders' || id === 'library' || id === 'coupons') return true
  return /order-list|coupon-list|product-detail|\/cart|order-create|knowledge-mall|\/pages\/shop/.test(url)
}

export const useFeatureModulesStore = defineStore('featureModules', () => {
  const modules = ref<FeatureModuleState[]>(DEFAULT_MODULES.map((m) => ({ ...m })))
  const loaded = ref(false)

  const memberEnabled = computed(() => isEnabled('member'))
  const productEnabled = computed(() => isEnabled('product'))
  const planetEnabled = computed(() => isEnabled('planet'))

  function isEnabled(key: FeatureModuleKey | string): boolean {
    const found = modules.value.find((m) => m.key === key)
    if (found) return found.enabled !== false
    return !['product', 'order', 'coupon', 'qa', 'form', 'member', 'planet'].includes(String(key))
  }

  function applyPluginsList(list: unknown) {
    if (!Array.isArray(list)) return
    const next = DEFAULT_MODULES.map((m) => ({ ...m }))
    list.forEach((entry) => {
      if (!entry || typeof entry !== 'object') return
      const row = entry as { key?: string; enabled?: boolean }
      if (!row.key) return
      const target = next.find((m) => m.key === row.key)
      if (target) target.enabled = row.enabled !== false
    })
    modules.value = next
  }

  async function load() {
    try {
      const res = await getConfigsSilent()
      const configs = extractConfigList(res.data)
      configs.forEach((item) => {
        const { key, value } = readConfigEntry(item)
        if (key !== 'plugins' || !value) return
        try {
          applyPluginsList(JSON.parse(String(value)))
        } catch {
          // ignore
        }
      })
    } catch (e) {
      console.warn('[featureModules] load failed', e)
    } finally {
      loaded.value = true
    }
  }

  function setModules(list: FeatureModuleState[]) {
    modules.value = DEFAULT_MODULES.map((base) => {
      const hit = list.find((m) => m.key === base.key)
      return { key: base.key, enabled: hit ? hit.enabled !== false : base.enabled }
    })
  }

  async function setEnabled(key: FeatureModuleKey | string, enabled: boolean) {
    const next = DEFAULT_MODULES.map((base) => {
      const cur = modules.value.find((m) => m.key === base.key)
      const row = { key: base.key, enabled: cur ? cur.enabled !== false : base.enabled }
      if (row.key === key) row.enabled = enabled
      return row
    })
    // 保留 plugins 中已有但未在 DEFAULT 的项
    try {
      const res = await getConfigsSilent()
      const configs = extractConfigList(res.data)
      let existing: FeatureModuleState[] = []
      configs.forEach((item) => {
        const { key: k, value } = readConfigEntry(item)
        if (k !== 'plugins' || !value) return
        try {
          const parsed = JSON.parse(String(value))
          if (Array.isArray(parsed)) {
            existing = parsed.map((p: any) => ({
              key: String(p.key),
              enabled: p.enabled !== false,
            }))
          }
        } catch { /* ignore */ }
      })
      const map = new Map<string, boolean>()
      existing.forEach((e) => map.set(e.key, e.enabled))
      next.forEach((e) => map.set(e.key, e.enabled))
      const payload = Array.from(map.entries()).map(([k, en]) => ({ key: k, enabled: en }))
      await updateConfigs(toConfigUpdateItems({ plugins: payload }, 'basic'))
      applyPluginsList(payload)
      if (key === 'planet') {
        await syncMinePageForPlanetModule(enabled)
        await syncTabbarForPlanetModule(enabled)
      }
    } catch (e) {
      throw e
    }
  }

  async function syncMinePageForPlanetModule(enabled: boolean) {
    const res = await getConfigsSilent()
    const configs = extractConfigList(res.data)
    let mine: Record<string, unknown> = {}
    configs.forEach((item) => {
      const { key, value } = readConfigEntry(item)
      if (key !== 'minePageConfig' || !value) return
      try {
        const parsed = JSON.parse(String(value))
        if (parsed && typeof parsed === 'object') mine = parsed
      } catch { /* ignore */ }
    })
    const menuItems = Array.isArray(mine.menuItems) ? [...(mine.menuItems as Record<string, unknown>[])] : []
    const isPlanet = (item: Record<string, unknown>) => {
      const id = String(item.id || '')
      const url = String(item.url || item.pagePath || '')
      return id === 'planet' || url.includes('/pages/planet/planet')
    }
    let found = false
    menuItems.forEach((item) => {
      if (!isPlanet(item)) return
      item.enabled = enabled
      found = true
    })
    if (enabled && !found) {
      menuItems.unshift({
        id: 'planet',
        icon: 'line:planet',
        title: '星球',
        url: '/pages/planet/planet',
        enabled: true,
        group: '',
      })
    }
    mine.menuItems = menuItems
    await updateConfigs(toConfigUpdateItems({ minePageConfig: mine }, 'basic'))
  }

  async function syncTabbarForPlanetModule(enabled: boolean) {
    const res = await getConfigsSilent()
    const configs = extractConfigList(res.data)
    let tabbar: Record<string, unknown>[] = []
    configs.forEach((item) => {
      const { key, value } = readConfigEntry(item)
      if (key !== 'tabbarItems' || !value) return
      try {
        const parsed = JSON.parse(String(value))
        if (Array.isArray(parsed)) tabbar = parsed
      } catch { /* ignore */ }
    })
    if (!tabbar.length) return
    const next = tabbar.map((item, index) => {
      const shell = String(item.tabRoute || item.slotRoute || item.pagePath || '')
      const text = String(item.text || item.name || '')
      const isPlanetSlot = shell.includes('planet') || /星球/.test(text) || (!shell && index === 2 && enabled)
      if (!isPlanetSlot && !(index === 2 && enabled && !shell.includes('shop') && !shell.includes('knowledge-mall'))) return item
      if (enabled) {
        return {
          ...item,
          enabled: true,
          text: item.text || '星球',
          pagePath: '/pages/planet/planet',
          tabRoute: '/pages/planet/planet',
        }
      }
      if (shell.includes('planet')) return { ...item, enabled: false }
      return item
    })
    await updateConfigs(toConfigUpdateItems({ tabbarItems: next }, 'basic'))
  }

  /** 按会员模块开关同步「我的」页入口 */
  async function syncMinePageForMemberModule(enabled: boolean) {
    const res = await getConfigsSilent()
    const configs = extractConfigList(res.data)
    let mine: Record<string, unknown> = {}
    configs.forEach((item) => {
      const { key, value } = readConfigEntry(item)
      if (key !== 'minePageConfig' || !value) return
      try {
        const parsed = JSON.parse(String(value))
        if (parsed && typeof parsed === 'object') mine = parsed
      } catch {
        // ignore
      }
    })

    mine.showMemberCard = enabled
    const menuItems = Array.isArray(mine.menuItems) ? [...(mine.menuItems as Record<string, unknown>[])] : []
    let touched = false
    menuItems.forEach((item) => {
      if (!isMemberEntry(item)) return
      item.enabled = enabled
      touched = true
    })
    if (!touched && !enabled) {
      // 没有菜单项也至少关掉卡片
    } else if (!touched && enabled) {
      menuItems.push({
        id: 'member-center',
        icon: 'line:crown',
        title: '会员中心',
        url: '/pkg-user/member-center/member-center',
        enabled: true,
        group: '',
      })
    }
    mine.menuItems = menuItems

    await updateConfigs(
      toConfigUpdateItems({ minePageConfig: mine }, 'basic'),
    )
  }

  /** 按商品模块开关同步底部导航商城 Tab */
  async function syncTabbarForProductModule(enabled: boolean) {
    const res = await getConfigsSilent()
    const configs = extractConfigList(res.data)
    let tabbar: Record<string, unknown>[] = []
    configs.forEach((item) => {
      const { key, value } = readConfigEntry(item)
      if (key !== 'tabbarItems' || !value) return
      try {
        const parsed = JSON.parse(String(value))
        if (Array.isArray(parsed)) tabbar = parsed
      } catch {
        // ignore
      }
    })
    if (!tabbar.length) return

    const next = tabbar.map((item, index) => {
      if (!isProductTabItem(item, index)) return item
      return { ...item, enabled }
    })

    await updateConfigs(
      toConfigUpdateItems({ tabbarItems: next }, 'basic'),
    )
  }

  /** 按商品模块开关同步「我的」页交易入口 */
  async function syncMinePageForProductModule(enabled: boolean) {
    const res = await getConfigsSilent()
    const configs = extractConfigList(res.data)
    let mine: Record<string, unknown> = {}
    configs.forEach((item) => {
      const { key, value } = readConfigEntry(item)
      if (key !== 'minePageConfig' || !value) return
      try {
        const parsed = JSON.parse(String(value))
        if (parsed && typeof parsed === 'object') mine = parsed
      } catch {
        // ignore
      }
    })

    const orderQuickAccess = {
      ...((mine.orderQuickAccess as Record<string, unknown>) || {}),
      showOrderTabs: enabled,
      showAllOrdersBtn: enabled,
    }
    mine.orderQuickAccess = orderQuickAccess

    const menuItems = Array.isArray(mine.menuItems) ? [...(mine.menuItems as Record<string, unknown>[])] : []
    menuItems.forEach((item) => {
      if (!isTradeMenuItem(item)) return
      item.enabled = enabled
    })
    mine.menuItems = menuItems

    await updateConfigs(
      toConfigUpdateItems({ minePageConfig: mine }, 'basic'),
    )
  }

  return {
    modules,
    loaded,
    memberEnabled,
    productEnabled,
    planetEnabled,
    isEnabled,
    applyPluginsList,
    load,
    setModules,
    setEnabled,
    syncMinePageForMemberModule,
    syncTabbarForProductModule,
    syncMinePageForProductModule,
    syncMinePageForPlanetModule,
    syncTabbarForPlanetModule,
  }
})
