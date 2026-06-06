import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getPageList } from '@/api/page'
import { getConfigByGroup, updateConfigs } from '@/api/system'
import type { PageRecord } from '@/types/page'
import type { MiniappForm } from '@/types/miniapp'
import { CONFIG_KEYS, NAV_TEMPLATES, DEFAULT_MINE_MENU, DEFAULT_THEME, DEFAULT_ORDER_QUICK_ACCESS, DEFAULT_USER_PROFILE } from '@/types/miniapp'

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
      const res = await getPageList({ current: 1, size: 200 })
      const data = res.data as any
      const userPages = (data?.records || data || []).map((p: any) => ({
        id: p.id,
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
              icon: t.icon || t.iconPath || '',
              pagePath: t.pagePath || t.path || '',
              pageId: t.pageId || '',
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
              menuItems: Array.isArray(mine.menuItems || mine.menu_items)
                ? (mine.menuItems || mine.menu_items).map((m: any, i: number) => ({
                    id: m.id || `mine-${i + 1}`,
                    icon: m.icon || '📦',
                    title: m.title || m.name || '',
                    url: m.url || m.linkUrl || m.link_url || '',
                    enabled: m.enabled !== undefined ? m.enabled : (m.visible !== false),
                    group: m.group || '',
                  }))
                : form.mineConfig.menuItems,
              orderQuickAccess: {
                showOrderTabs: mine.orderQuickAccess?.showOrderTabs ?? mine.showOrderTabs ?? DEFAULT_ORDER_QUICK_ACCESS.showOrderTabs,
                showAllOrdersBtn: mine.orderQuickAccess?.showAllOrdersBtn ?? mine.showAllOrdersBtn ?? DEFAULT_ORDER_QUICK_ACCESS.showAllOrdersBtn,
                tabLabels: mine.orderQuickAccess?.tabLabels || mine.orderTabLabels || { ...DEFAULT_ORDER_QUICK_ACCESS.tabLabels },
              },
              userProfile: {
                showAvatar: mine.userProfile?.showAvatar ?? true,
                showNickname: mine.userProfile?.showNickname ?? true,
                showMemberLevel: mine.userProfile?.showMemberLevel ?? true,
                allowEditProfile: mine.userProfile?.allowEditProfile ?? true,
                memberLevelLabel: mine.userProfile?.memberLevelLabel || '会员等级',
              },
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
        form.shareImage = configMap[CONFIG_KEYS.SHARE_IMAGE]
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

  async function handleSave() {
    const warnings = validateTabsBeforeSave()
    if (warnings.length > 0) {
      try {
        await ElMessageBox.confirm(
          `当前底部导航存在以下风险：\n${warnings.map(item => `- ${item}`).join('\n')}\n\n是否继续保存？`,
          '发布前校验提醒',
          { confirmButtonText: '继续保存', cancelButtonText: '去绑定', type: 'warning' },
        )
      } catch {
        return
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

    // 首页自动绑定
    const homeTab = form.tabs.find(t => t.text === '首页' && !t.pageId)
    if (homeTab) {
      const homePage = pages.value.find(p => p.path === '/pages/index/index')
      if (homePage) { homeTab.pageId = homePage.id; homeTab.pageName = homePage.name }
    }
  }

  // ✅ onMounted 放在顶层，确保组件挂载时自动加载配置
  onMounted(async () => {
    await loadPages()
    await loadConfig()
    autoBindPages()
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
