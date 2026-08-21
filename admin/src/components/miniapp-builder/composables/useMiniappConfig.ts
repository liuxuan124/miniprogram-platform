import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getPageList } from '@/api/page'
import { getConfigByGroup, updateConfigs, normalizeUploadUrl } from '@/api/system'
import type { PageRecord } from '@/types/page'
import type { MiniappForm } from '@/types/miniapp'
import { CONFIG_KEYS, NAV_TEMPLATES, DEFAULT_MINE_MENU, DEFAULT_THEME, DEFAULT_ORDER_QUICK_ACCESS, DEFAULT_USER_PROFILE, normalizeOrderTabLabels, resolveMineStyleKey, applyMineStylePreset } from '@/types/miniapp'
import { suggestMenuLineIcon } from '../menuLineIcons'
import { migrateTabBarIcon } from '@/components/page-builder/navIconSet'

/** 系统内置页面（不在页面列表中，但可作为TabBar绑定目标） */
const SYSTEM_PAGES: { id: string; name: string; path: string; type: 'system' }[] = [
  { id: '__mine__', name: '👤 我的页面（系统内置）', path: '/pages/mine/mine', type: 'system' },
  { id: '__ai_chat__', name: '🤖 AI对话（系统内置）', path: '/pages/ai-chat/ai-chat', type: 'system' },
  { id: '__login__', name: '🔐 登录页（系统内置）', path: '/pages/login/login', type: 'system' },
  { id: '__index__', name: '🏠 首页（系统内置）', path: '/pages/index/index', type: 'system' },
  { id: '__content_list__', name: '📝 内容列表（系统内置）', path: '/pages/content-list/content-list', type: 'system' },
  { id: '__product_list__', name: '🛍️ 商品列表（系统内置）', path: '/pages/product-list/product-list', type: 'system' },
  { id: '__category__', name: '📋 分类页（系统内置）', path: '/pages/category/category', type: 'system' },
  { id: '__cart__', name: '🛒 购物车（系统内置）', path: '/pages/cart/cart', type: 'system' },
]

function normalizeBindId(id: unknown) {
  if (id == null || id === '') return ''
  const s = String(id)
  return /^\d+$/.test(s) ? Number(s) : s
}

function isIndexPath(path?: string) {
  return String(path || '').replace(/\/+$/, '') === '/pages/index/index'
}

export function useMiniappConfig() {
  const loading = ref(false)
  const saving = ref(false)
  const pages = ref<PageRecord[]>([])
  let savedSnapshot = ''

  const form = reactive<MiniappForm>({
    templateKey: 'standard',
    homePageId: '',
    minePageId: '',
    tabs: [],
    mineConfig: {
      loginTitle: '点击登录，解锁会员权益',
      loginSubtitle: '登录后查看订单、优惠券、积分等个人信息',
      loginButtonText: '微信一键登录',
      memberCardTitle: '我的会员中心',
      previewNickname: '微信用户',
      previewAvatar: '',
      previewPhone: '',
      previewEmail: '',
      showMenuIcons: false,
      showDecorBackground: true,
      showMemberCard: true,
      menuItems: DEFAULT_MINE_MENU.map((item, i) => ({ ...item, id: `mine-${i + 1}` })),
      orderQuickAccess: { ...DEFAULT_ORDER_QUICK_ACCESS },
      userProfile: { ...DEFAULT_USER_PROFILE },
    },
    theme: { ...DEFAULT_THEME },
    shareTitle: '',
    shareImage: '',
  })

  const isDirty = computed(() => getSnapshot() !== savedSnapshot)

  function getSnapshot(): string {
    return JSON.stringify({
      templateKey: form.templateKey,
      homePageId: form.homePageId,
      minePageId: form.minePageId,
      tabs: form.tabs,
      mineConfig: form.mineConfig,
      theme: form.theme,
      shareTitle: form.shareTitle,
      shareImage: form.shareImage,
    })
  }

  function markSaved() {
    savedSnapshot = getSnapshot()
  }

  async function loadPages() {
    try {
      const res = await getPageList({ current: 1, size: 100 })
      const data = res.data as any
      const userPages = (data?.records || data || []).map((p: any) => ({
        id: normalizeBindId(p.id),
        name: p.name || p.shareTitle || '未命名',
        path: p.path || '',
        type: p.type,
        status: p.status,
      }))
      // 追加系统内置页面，去重（按path去重）
      const existingPaths = new Set(userPages.map((p: any) => p.path))
      const extraSystemPages = SYSTEM_PAGES.filter(sp => !existingPaths.has(sp.path))
      pages.value = [...userPages, ...extraSystemPages] as any
    } catch {
      pages.value = SYSTEM_PAGES as any
    }
  }

  /** 仅当首页绑定失效或为空时补绑；不强制覆盖用户已选的其它页面 */
  function syncHomeBinding() {
    const fallbackHome = pages.value.find((p) => isIndexPath(p.path) && p.type !== 'system')
      || pages.value.find((p) => isIndexPath(p.path))

    const homeStillValid = form.homePageId != null && form.homePageId !== ''
      && pages.value.some((p) => String(p.id) === String(form.homePageId))

    if (!homeStillValid && fallbackHome) {
      form.homePageId = normalizeBindId(fallbackHome.id)
    }

    const homeTab = form.tabs.find((t) => t.text === '首页' || isIndexPath(t.pagePath))
    if (!homeTab) return

    const tabBoundValid = homeTab.pageId != null && String(homeTab.pageId) !== ''
      && pages.value.some((p) => String(p.id) === String(homeTab.pageId))

    if (tabBoundValid) {
      const bound = pages.value.find((p) => String(p.id) === String(homeTab.pageId))
      if (bound) {
        homeTab.pageName = bound.name
        if (bound.path) homeTab.pagePath = bound.path
      }
      // 与「首页」Tab 保持一致，避免两处配置打架
      if (String(form.homePageId) !== String(homeTab.pageId)) {
        form.homePageId = normalizeBindId(homeTab.pageId)
      }
      return
    }

    const preferred = pages.value.find((p) => String(p.id) === String(form.homePageId)) || fallbackHome
    if (!preferred) return
    homeTab.pageId = normalizeBindId(preferred.id) as any
    homeTab.pageName = preferred.name
    homeTab.pagePath = preferred.path || homeTab.pagePath || '/pages/index/index'
  }

  async function loadConfig() {
    loading.value = true
    try {
      const res = await getConfigByGroup('basic')
      const configs = (res.data as any)?.configs || res.data || []
      const configMap: Record<string, any> = {}
      for (const c of configs) {
        if (c.configKey && c.configValue !== undefined) {
          configMap[c.configKey] = c.configValue
        }
      }

      // Template key
      if (configMap[CONFIG_KEYS.TEMPLATE_KEY]) {
        form.templateKey = configMap[CONFIG_KEYS.TEMPLATE_KEY]
      }

      // Home/Mine page IDs
      if (configMap[CONFIG_KEYS.HOME_PAGE_ID]) {
        form.homePageId = Number(configMap[CONFIG_KEYS.HOME_PAGE_ID]) || ''
      }
      if (configMap[CONFIG_KEYS.MINE_PAGE_ID]) {
        form.minePageId = Number(configMap[CONFIG_KEYS.MINE_PAGE_ID]) || ''
      }

      // TabBar items - 兼容旧字段名 label/path 和新字段名 text/pagePath
      if (configMap[CONFIG_KEYS.TABBAR_ITEMS]) {
        try {
          const items = typeof configMap[CONFIG_KEYS.TABBAR_ITEMS] === 'string'
            ? JSON.parse(configMap[CONFIG_KEYS.TABBAR_ITEMS])
            : configMap[CONFIG_KEYS.TABBAR_ITEMS]
          if (Array.isArray(items) && items.length > 0) {
            form.tabs = items.map((t: any, i: number) => ({
              id: t.id || `tab-${i}`,
              text: t.text || t.label || t.name || '',
              icon: migrateTabBarIcon(t.icon || t.iconPath || ''),
              pagePath: t.pagePath || t.path || '',
              pageId: normalizeBindId(t.pageId) as any,
              pageName: t.pageName || '',
            }))
          }
        } catch { /* ignore parse errors */ }
      }

      // Mine page config - 兼容旧字段名 loginPrompt/visible/linkUrl 和新字段名
      if (configMap[CONFIG_KEYS.MINE_PAGE_CONFIG]) {
        try {
          const mine = typeof configMap[CONFIG_KEYS.MINE_PAGE_CONFIG] === 'string'
            ? JSON.parse(configMap[CONFIG_KEYS.MINE_PAGE_CONFIG])
            : configMap[CONFIG_KEYS.MINE_PAGE_CONFIG]
          if (mine) {
            form.mineConfig = {
              loginTitle: mine.loginTitle || mine.loginPrompt || '点击登录，解锁会员权益',
              loginSubtitle: mine.loginSubtitle || '登录后查看订单、优惠券、积分等个人信息',
              loginButtonText: mine.loginButtonText || '微信一键登录',
              memberCardTitle: mine.memberCardTitle || '我的会员中心',
              previewNickname: mine.previewNickname || '微信用户',
              previewAvatar: String(mine.previewAvatar || ''),
              previewPhone: String(mine.previewPhone || ''),
              previewEmail: String(mine.previewEmail || ''),
              showMenuIcons: mine.showMenuIcons === true,
              showDecorBackground: mine.showDecorBackground !== false,
              showMemberCard: mine.showMemberCard !== false,
              menuItems: Array.isArray(mine.menuItems || mine.menu_items)
                ? (mine.menuItems || mine.menu_items).map((m: any, i: number) => {
                    const title = m.title || m.name || ''
                    return {
                      id: m.id || `mine-${i + 1}`,
                      icon: suggestMenuLineIcon(title, m.icon),
                      title,
                      url: m.url || m.linkUrl || m.link_url || '',
                      enabled: m.enabled !== undefined ? m.enabled : (m.visible !== false),
                      group: m.group || '',
                    }
                  })
                : form.mineConfig.menuItems,
              orderQuickAccess: {
                showOrderTabs: mine.orderQuickAccess?.showOrderTabs ?? mine.showOrderTabs ?? DEFAULT_ORDER_QUICK_ACCESS.showOrderTabs,
                showAllOrdersBtn: mine.orderQuickAccess?.showAllOrdersBtn ?? mine.showAllOrdersBtn ?? DEFAULT_ORDER_QUICK_ACCESS.showAllOrdersBtn,
                tabLabels: normalizeOrderTabLabels(mine.orderQuickAccess?.tabLabels || mine.orderTabLabels),
              },
              userProfile: {
                showAvatar: mine.userProfile?.showAvatar ?? true,
                showNickname: mine.userProfile?.showNickname ?? true,
                showMemberLevel: mine.userProfile?.showMemberLevel ?? true,
                allowEditProfile: mine.userProfile?.allowEditProfile ?? true,
                memberLevelLabel: mine.userProfile?.memberLevelLabel || '会员等级',
              },
              ...(mine.templateStyle ? { templateStyle: mine.templateStyle } : {}),
              ...(mine.style ? { style: mine.style } : {}),
              ...(mine.themeColor ? { themeColor: mine.themeColor } : {}),
              ...(mine.themeColorSecondary ? { themeColorSecondary: mine.themeColorSecondary } : {}),
            }
            // 已删除的简约/暗黑风格安全回退到基础版；旧 standard/premium 归一到 basic/member
            const styleKey = resolveMineStyleKey(form.mineConfig)
            const rawStyleKey = String(mine.templateStyle || '')
            const needsStyleFallback =
              mine.style === 'outline'
              || rawStyleKey === 'minimal'
              || rawStyleKey === 'dark'
              || rawStyleKey === 'simple'
              || rawStyleKey === 'standard'
              || rawStyleKey === 'premium'
              || ['#1e293b', '#334155'].includes(String(mine.themeColor || '').toLowerCase())
            if (needsStyleFallback || mine.themeColor || mine.templateStyle) {
              applyMineStylePreset(form.mineConfig as Record<string, unknown>, styleKey)
            }
          }
        } catch { /* ignore */ }
      }

      // Theme config
      if (configMap[CONFIG_KEYS.THEME_CONFIG]) {
        try {
          const theme = typeof configMap[CONFIG_KEYS.THEME_CONFIG] === 'string'
            ? JSON.parse(configMap[CONFIG_KEYS.THEME_CONFIG])
            : configMap[CONFIG_KEYS.THEME_CONFIG]
          if (theme) {
            Object.assign(form.theme, theme)
          }
        } catch { /* ignore */ }
      }

      // Share config
      if (configMap[CONFIG_KEYS.SHARE_TITLE]) {
        form.shareTitle = configMap[CONFIG_KEYS.SHARE_TITLE]
      }
      if (configMap[CONFIG_KEYS.SHARE_IMAGE]) {
        form.shareImage = normalizeUploadUrl(configMap[CONFIG_KEYS.SHARE_IMAGE])
      }

      // If no tabs loaded, apply template
      if (form.tabs.length === 0) {
        applyTemplate(form.templateKey)
      }
    } catch {
      applyTemplate('standard')
    } finally {
      loading.value = false
      markSaved()
    }
  }

  function applyTemplate(key: string) {
    const template = NAV_TEMPLATES.find(t => t.key === key)
    if (!template) return
    form.templateKey = key
    form.tabs = template.tabs.map((t, i) => ({
      id: `tab-${i}`,
      text: t.text,
      icon: t.icon,
      pagePath: t.pagePath,
      pageId: '',
      pageName: '',
    }))
  }

  async function handleSave(): Promise<boolean> {
    const previewNick = String(form.mineConfig?.previewNickname ?? '')
    if (previewNick.length > 10) {
      ElMessage.error('预览昵称不能超过10个字')
      return false
    }

    const warnings = validateTabsBeforeSave()
    if (warnings.length > 0) {
      try {
        await ElMessageBox.confirm(
          `当前底部导航存在以下风险：\n${warnings.map(item => `- ${item}`).join('\n')}\n\n是否继续保存？`,
          '发布前校验提醒',
          { confirmButtonText: '继续保存', cancelButtonText: '去绑定', type: 'warning' },
        )
      } catch {
        return false
      }
    }

    saving.value = true
    try {
      const configs = [
        { configKey: CONFIG_KEYS.TEMPLATE_KEY, configValue: form.templateKey, configGroup: 'basic', description: '小程序导航模板' },
        { configKey: CONFIG_KEYS.HOME_PAGE_ID, configValue: String(form.homePageId), configGroup: 'basic', description: '首页绑定' },
        { configKey: CONFIG_KEYS.MINE_PAGE_ID, configValue: String(form.minePageId), configGroup: 'basic', description: '我的页面绑定' },
        { configKey: CONFIG_KEYS.TABBAR_ITEMS, configValue: JSON.stringify(form.tabs), configGroup: 'basic', description: '底部导航配置' },
        { configKey: CONFIG_KEYS.MINE_PAGE_CONFIG, configValue: JSON.stringify(form.mineConfig), configGroup: 'basic', description: '我的页面配置' },
        { configKey: CONFIG_KEYS.THEME_CONFIG, configValue: JSON.stringify(form.theme), configGroup: 'basic', description: '主题配色' },
        { configKey: CONFIG_KEYS.SHARE_TITLE, configValue: form.shareTitle, configGroup: 'basic', description: '小程序分享标题' },
        { configKey: CONFIG_KEYS.SHARE_IMAGE, configValue: form.shareImage, configGroup: 'basic', description: '小程序分享图片' },
      ]
      await updateConfigs(configs as any)
      markSaved()
      ElMessage.success('配置已保存')
      return true
    } catch (e: any) {
      ElMessage.error('保存失败：' + (e?.message || '未知错误'))
      throw e
    } finally {
      saving.value = false
    }
  }

  function validateTabsBeforeSave() {
    const warnings: string[] = []
    const pagePathSet = new Set(pages.value.map(p => normalizePath(p.path || '')).filter(Boolean))
    const pathToTabs = new Map<string, string[]>()

    for (const tab of form.tabs) {
      const text = tab.text || '未命名'
      const path = normalizePath(tab.pagePath || '')
      if (!tab.pageId && !path.includes('index')) {
        warnings.push(`导航「${text}」尚未绑定页面`)
      }
      if (!path) {
        warnings.push(`导航「${text}」缺少页面路径`)
        continue
      }
      const names = pathToTabs.get(path) || []
      names.push(text)
      pathToTabs.set(path, names)
      if (!pagePathSet.has(path) && !isBuiltInPath(path)) {
        warnings.push(`导航「${text}」指向未发布或不存在的页面：/${path}`)
      }
    }

    for (const [path, names] of pathToTabs.entries()) {
      if (names.length > 1) {
        warnings.push(`导航「${names.join('、')}」重复指向 /${path}`)
      }
    }

    return Array.from(new Set(warnings))
  }

  function normalizePath(path: string) {
    if (!path) return ''
    return path.trim().replace(/^\/+/, '')
  }

  function isBuiltInPath(path: string) {
    return SYSTEM_PAGES.some(page => normalizePath(page.path) === path)
  }

  function handleReset() {
    ElMessageBox.confirm('确认恢复默认配置？当前所有修改将丢失。', '恢复默认', {
      confirmButtonText: '确认恢复',
      cancelButtonText: '取消',
      type: 'warning',
    }).then(() => {
      applyTemplate('standard')
      form.homePageId = ''
      form.minePageId = ''
      form.mineConfig = {
        loginTitle: '点击登录，解锁会员权益',
        loginSubtitle: '登录后查看订单、优惠券、积分等个人信息',
        loginButtonText: '微信一键登录',
        memberCardTitle: '我的会员中心',
        previewNickname: '微信用户',
        previewAvatar: '',
        previewPhone: '',
        previewEmail: '',
        showMenuIcons: false,
        showDecorBackground: true,
        showMemberCard: true,
        menuItems: DEFAULT_MINE_MENU.map((item, i) => ({ ...item, id: `mine-${i + 1}` })),
        orderQuickAccess: { ...DEFAULT_ORDER_QUICK_ACCESS },
        userProfile: { ...DEFAULT_USER_PROFILE },
      }
      form.theme = { ...DEFAULT_THEME }
      form.shareTitle = ''
      form.shareImage = ''
      ElMessage.success('已恢复默认配置')
    }).catch(() => {})
  }

  function autoBindPages() {
    for (const tab of form.tabs) {
      if (tab.pageId) continue
      const keyword = tab.text.toLowerCase()
      const match = pages.value.find(p => {
        const name = (p.name || '').toLowerCase()
        const path = (p.path || '').toLowerCase()
        return name.includes(keyword) || path.includes(keyword) || path.includes(tab.pagePath)
      })
      if (match) {
        tab.pageId = match.id
        tab.pageName = match.name
      }
    }

    // 确保系统关键Tab（我的/AI）能自动绑定到内置页面
    const mineTab = form.tabs.find(t => t.text === '我的' && (!t.pageId || t.pageId === ''))
    if (mineTab) {
      const minePage = pages.value.find(p => String(p.id) === '__mine__')
      if (minePage) { mineTab.pageId = minePage.id as any; mineTab.pageName = minePage.name }
    }

    const aiTab = form.tabs.find(t => (t.text === 'AI' || t.text === 'AI助手') && (!t.pageId || t.pageId === ''))
    if (aiTab) {
      const aiPage = pages.value.find(p => String(p.id) === '__ai_chat__')
      if (aiPage) { aiTab.pageId = aiPage.id as any; aiTab.pageName = aiPage.name }
    }

    // 首页：仅补齐空/失效绑定，不覆盖用户已保存选择
    syncHomeBinding()
  }

  // ✅ onMounted 放在顶层，确保组件挂载时自动加载配置
  onMounted(async () => {
    await loadPages()
    await loadConfig()
    autoBindPages()
    // autoBind 只补空位，结束后记为已保存，避免一进页就显示「有未保存更改」
    markSaved()
  })

  return {
    form,
    pages,
    loading,
    saving,
    isDirty,
    applyTemplate,
    handleSave,
    handleReset,
    autoBindPages,
    loadPages,
  }
}
