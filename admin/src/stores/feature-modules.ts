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
  | 'activity'
  | 'form'
  | 'appointment'
  | 'coupon'
  | 'agent'

export interface FeatureModuleState {
  key: string
  enabled: boolean
}

const DEFAULT_MODULES: FeatureModuleState[] = [
  { key: 'product', enabled: true },
  { key: 'member', enabled: false },
  { key: 'order', enabled: true },
  { key: 'content', enabled: true },
  { key: 'activity', enabled: true },
  { key: 'form', enabled: true },
  { key: 'appointment', enabled: true },
  { key: 'coupon', enabled: true },
  { key: 'agent', enabled: true },
]

const PRODUCT_TAB_SLOT_INDEX = 2

function isMemberEntry(item: Record<string, unknown>): boolean {
  const id = String(item.id || '')
  const url = String(item.url || item.pagePath || '')
  return id === 'member-center' || url.includes('member-center')
}

function isTradeMenuItem(item: Record<string, unknown>): boolean {
  const id = String(item.id || '')
  const url = String(item.url || item.pagePath || '')
  if (id === 'orders' || id === 'library' || id === 'coupons') return true
  return /order-list|coupon-list|product-detail|\/cart|order-create|knowledge-mall/.test(url)
}

function isProductTabItem(item: Record<string, unknown>, index: number): boolean {
  if (index === PRODUCT_TAB_SLOT_INDEX) return true
  const path = String(item.pagePath || item.path || '')
  const text = String(item.text || item.name || '')
  const pageName = String(item.pageName || '')
  if (/knowledge-mall|product-list|product-detail|\/cart/.test(path)) return true
  return /商品|商城/.test(text) || /商城|商品/.test(pageName)
}

export const useFeatureModulesStore = defineStore('featureModules', () => {
  const modules = ref<FeatureModuleState[]>(DEFAULT_MODULES.map((m) => ({ ...m })))
  const loaded = ref(false)

  const memberEnabled = computed(() => isEnabled('member'))
  const productEnabled = computed(() => isEnabled('product'))

  function isEnabled(key: FeatureModuleKey | string): boolean {
    const found = modules.value.find((m) => m.key === key)
    return found ? found.enabled !== false : true
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
    isEnabled,
    applyPluginsList,
    load,
    setModules,
    syncMinePageForMemberModule,
    syncTabbarForProductModule,
    syncMinePageForProductModule,
  }
})
