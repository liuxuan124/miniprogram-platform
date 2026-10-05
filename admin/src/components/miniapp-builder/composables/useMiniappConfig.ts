import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getPageList } from '@/api/page'
import { getConfigByGroup, updateConfigs, normalizeUploadUrl } from '@/api/system'
import type { PageRecord } from '@/types/page'
import type { MiniappForm } from '@/types/miniapp'
import { CONFIG_KEYS, NAV_TEMPLATES, DEFAULT_MINE_MENU, DEFAULT_THEME, DEFAULT_ORDER_QUICK_ACCESS, DEFAULT_USER_PROFILE, normalizeOrderTabLabels, resolveMineStyleKey, applyMineStylePreset, normalizeMineVisibleOn, normalizeMineThemeSource, normalizeMineHeaderStyle, normalizeMineCardStyle, resolveMineModules, DEFAULT_MINE_MODULES, DEFAULT_LOGIN_PAGE_CONFIG, resolveLoginModules, normalizeLoginThemeSource, normalizeLoginHeaderStyle, normalizeLoginCardStyle, resolveLoginPageStyleKey, applyLoginPageStylePreset } from '@/types/miniapp'
import { suggestMenuLineIcon } from '../menuLineIcons'
import { migrateTabBarIcon } from '@/components/page-builder/navIconSet'
import { normalizeTabBarItems, tabBarSnapshot } from '@/utils/tabbar'
import { normalizeMinipagePath, isBuiltinMinipagePath, isValidMinipageTarget, isMinipageIndexPath } from '@/utils/minipage-path'

/** 系统内置页面（不在页面列表中，但可作为TabBar绑定目标） */
const SYSTEM_PAGES: { id: string; name: string; path: string; type: 'system' }[] = [
  { id: '__mine__', name: '👤 我的页面（系统内置）', path: '/pages/mine/mine', type: 'system' },
  { id: '__ai_chat__', name: '🤖 AI对话（系统内置）', path: '/pages/ai-chat/ai-chat', type: 'system' },
  { id: '__login__', name: '🔐 登录页（系统内置）', path: '/pages/login/login', type: 'system' },
  { id: '__index__', name: '🏠 首页（系统内置）', path: '/pages/index/index', type: 'system' },
  { id: '__content_list__', name: '📝 内容列表（系统内置）', path: '/pkg-content/content-list/content-list', type: 'system' },
  { id: '__tab_hub__', name: '🧩 扩展 Tab（系统内置）', path: '/pkg-content/tab-hub/tab-hub', type: 'system' },
  { id: '__product_list__', name: '🛍️ 商品列表（系统内置）', path: '/pkg-content/product-list/product-list', type: 'system' },
  { id: '__category__', name: '📋 分类页（系统内置）', path: '/pages/category/category', type: 'system' },
  { id: '__cart__', name: '🛒 购物车（系统内置）', path: '/pkg-content/cart/cart', type: 'system' },
]

function normalizeBindId(id: unknown) {
  if (id == null || id === '') return ''
  const s = String(id)
  return /^\d+$/.test(s) ? Number(s) : s
}

// 路径校验已抽到无依赖的 utils/minipage-path，tabBar 与「我的」菜单共用同一套口径。
// 这里转出去，方便外部只想要校验函数时不必拖进整个 composable。
export {
  normalizeMinipagePath,
  isBuiltinMinipagePath,
  isValidMinipageTarget,
} from '@/utils/minipage-path'

function isIndexPath(path?: string) {
  return isMinipageIndexPath(path)
}

export function useMiniappConfig() {
  const loading = ref(false)
  const saving = ref(false)
  const publishing = ref(false)
  const pages = ref<PageRecord[]>([])
  let savedSnapshot = ''
  const hasPendingSiteDraft = ref(false)

  const form = reactive<MiniappForm>({
    templateKey: 'standard',
    homePageId: '',
    minePageId: '',
    tabs: [],
    mineConfig: {
      loginTitle: '点击登录，同步阅读偏好',
      loginSubtitle: '收藏文章、接收内容更新提醒',
      loginButtonText: '登录',
      memberCardTitle: '会员中心',
      previewNickname: '微信用户',
      previewAvatar: '',
      previewPhone: '',
      previewEmail: '',
      showMenuIcons: true,
      showDecorBackground: true,
      showMemberCard: true,
      templateStyle: 'warm',
      style: 'gradient',
      themeColor: '#C2410C',
      themeColorSecondary: '#EA580C',
      // ↓ 1.30 新增字段的初值：与线上表现一致（主题继承全局、模块全显示）
      themeSource: 'inherit',
      modules: { ...DEFAULT_MINE_MODULES },
      pageBackgroundColor: '',
      headerStyle: 'gradient',
      cardStyle: 'shadow',
      menuItems: DEFAULT_MINE_MENU.map((item, i) => ({ ...item, id: `mine-${i + 1}`, visibleOn: 'always' as const })),
      orderQuickAccess: { ...DEFAULT_ORDER_QUICK_ACCESS },
      userProfile: { ...DEFAULT_USER_PROFILE },
    },
    // 登录页配置（固定页 /pages/login/login，与 mineConfig 平行）
    loginPageConfig: { ...DEFAULT_LOGIN_PAGE_CONFIG, modules: { ...DEFAULT_LOGIN_PAGE_CONFIG.modules } },
    theme: { ...DEFAULT_THEME },
    shareTitle: '',
    shareImage: '',
  })

  const isDirty = computed(() => getSnapshot() !== savedSnapshot)

  /**
   * 🔴 2026-10-06 新增：保存结果状态。
   * 原来只有 isDirty（是否脏），没有「保存成功/失败/何时」，
   * 于是页面只能显示「已保存（编辑中）」这类含糊文案，
   * 保存失败了也看不出来。现在三态齐全，供 SaveStateBar 使用：
   *   saving（上面已声明）正在保存
   *   saveError  保存失败（带原因，可重试）
   *   lastSavedAt 最近一次保存成功的时间
   */
  const saveError = ref('')
  const lastSavedAt = ref('')

  function getSnapshot(): string {
    return JSON.stringify({
      templateKey: form.templateKey,
      homePageId: form.homePageId == null || form.homePageId === '' ? '' : String(form.homePageId),
      minePageId: form.minePageId == null || form.minePageId === '' ? '' : String(form.minePageId),
      tabs: tabBarSnapshot(form.tabs),
      mineConfig: form.mineConfig,
      loginPageConfig: form.loginPageConfig,
      theme: form.theme,
      shareTitle: form.shareTitle,
      shareImage: form.shareImage,
    })
  }

  function markSaved() {
    form.tabs = normalizeTabBarItems(form.tabs)
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

      // 编辑态优先读待上线草稿
      if (configMap.site_builder_draft) {
        try {
          const draft = typeof configMap.site_builder_draft === 'string'
            ? JSON.parse(configMap.site_builder_draft)
            : configMap.site_builder_draft
          if (draft && typeof draft === 'object' && Object.keys(draft).length > 0) {
            Object.assign(configMap, draft)
            hasPendingSiteDraft.value = true
          } else {
            hasPendingSiteDraft.value = false
          }
        } catch {
          hasPendingSiteDraft.value = false
        }
      } else {
        hasPendingSiteDraft.value = false
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
            form.tabs = normalizeTabBarItems(items.map((t: any, i: number) => ({
              id: t.id || `tab-${i}`,
              text: t.text || t.label || t.name || '',
              icon: migrateTabBarIcon(t.icon || t.iconPath || ''),
              pagePath: t.pagePath || t.path || '',
              pageId: normalizeBindId(t.pageId) as any,
              pageName: t.pageName || '',
              tabRoute: t.tabRoute || t.slotRoute || '',
            })))
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
                      needLogin: m.needLogin === true,
                      enabled: m.enabled !== undefined ? m.enabled : (m.visible !== false),
                      group: m.group || '',
                      // visibleOn 缺省 → always（老数据无此字段，行为不变）
                      visibleOn: normalizeMineVisibleOn(m.visibleOn ?? m.visible_on),
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
              // ↓↓↓ 1.30 新增字段。**必须显式白名单拷贝**（见上方注释）：
              // 漏掉任何一项都会让该字段在「保存 → 刷新」后静默回到默认值。
              // resolveXxx 系列内部已做「缺字段 → 默认值」，老数据加载零影响。
              themeSource: normalizeMineThemeSource(mine.themeSource ?? mine.theme_source),
              modules: resolveMineModules(mine.modules),
              pageBackgroundColor: String(mine.pageBackgroundColor || mine.page_background_color || ''),
              headerStyle: normalizeMineHeaderStyle(mine.headerStyle ?? mine.header_style),
              cardStyle: normalizeMineCardStyle(mine.cardStyle ?? mine.card_style),
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
              // applyMineStylePreset 会把 showMemberCard 硬写回 true、把 themeColor 刷成预设色。
              // 1.30 起这两项都能被页面独立配置覆盖，所以先备份再还原：
              // - showMemberCard 以 modules.memberCard（用户显式开关）为准
              // - 页面覆盖主题色时，themeColor/Secondary 保留用户选的值
              const keepMemberCard = (mine.modules as Record<string, unknown> | undefined)?.memberCard
              const keepThemeColor = form.mineConfig.themeColor
              const keepThemeColorSecondary = form.mineConfig.themeColorSecondary
              const isPageTheme = normalizeMineThemeSource(mine.themeSource ?? mine.theme_source) === 'page'
              applyMineStylePreset(form.mineConfig as Record<string, unknown>, styleKey)
              if (keepMemberCard === false) form.mineConfig.showMemberCard = false
              if (isPageTheme) {
                if (keepThemeColor) form.mineConfig.themeColor = keepThemeColor
                if (keepThemeColorSecondary) form.mineConfig.themeColorSecondary = keepThemeColorSecondary
              }
            }
            // modules.memberCard 是会员卡显隐的唯一真源，老字段 showMemberCard 向它对齐，
            // 保证后台预览 / 小程序端 / 草稿恢复三处口径一致。
            if ((mine.modules as Record<string, unknown> | undefined)?.memberCard === false) {
              form.mineConfig.showMemberCard = false
            }
          }
        } catch { /* ignore */ }
      }

      // Login page config - 逐字段白名单拷贝（与上面 mine 同口径，同样是铁律）
      if (configMap[CONFIG_KEYS.LOGIN_PAGE_CONFIG]) {
        try {
          const login = typeof configMap[CONFIG_KEYS.LOGIN_PAGE_CONFIG] === 'string'
            ? JSON.parse(configMap[CONFIG_KEYS.LOGIN_PAGE_CONFIG])
            : configMap[CONFIG_KEYS.LOGIN_PAGE_CONFIG]
          if (login && typeof login === 'object') {
            // 🔴 每一个新字段都必须显式写一次。
            // 漏掉任何一项 → 该字段在「保存 → 刷新」后静默回到默认值（最隐蔽的坑）。
            // resolveXxx 系列内部已做「缺字段 → 线上现状」，老数据加载零影响。
            form.loginPageConfig = {
              heroTitle: login.heroTitle || DEFAULT_LOGIN_PAGE_CONFIG.heroTitle,
              heroSubtitle: login.heroSubtitle !== undefined
                ? String(login.heroSubtitle || '')
                : DEFAULT_LOGIN_PAGE_CONFIG.heroSubtitle,
              loginButtonText: login.loginButtonText || DEFAULT_LOGIN_PAGE_CONFIG.loginButtonText,
              skipButtonText: login.skipButtonText !== undefined
                ? String(login.skipButtonText || '')
                : DEFAULT_LOGIN_PAGE_CONFIG.skipButtonText,
              securityBadgeText: login.securityBadgeText !== undefined
                ? String(login.securityBadgeText || '')
                : DEFAULT_LOGIN_PAGE_CONFIG.securityBadgeText,
              sheetTitle: login.sheetTitle !== undefined
                ? String(login.sheetTitle || '')
                : DEFAULT_LOGIN_PAGE_CONFIG.sheetTitle,
              sheetSubtitle: login.sheetSubtitle !== undefined
                ? String(login.sheetSubtitle || '')
                : DEFAULT_LOGIN_PAGE_CONFIG.sheetSubtitle,
              privacyNoteText: login.privacyNoteText !== undefined
                ? String(login.privacyNoteText || '')
                : DEFAULT_LOGIN_PAGE_CONFIG.privacyNoteText,
              // 老字段是显式布尔，缺省按 true（= 线上现状）；这里保留 !== false 口径
              showDecorOrbs: login.showDecorOrbs !== false,
              showSecurityBadge: login.showSecurityBadge !== false,
              showBackButton: login.showBackButton !== false,
              templateStyle: login.templateStyle ? String(login.templateStyle) : DEFAULT_LOGIN_PAGE_CONFIG.templateStyle,
              themeColor: String(login.themeColor || DEFAULT_LOGIN_PAGE_CONFIG.themeColor),
              themeColorSecondary: String(login.themeColorSecondary || DEFAULT_LOGIN_PAGE_CONFIG.themeColorSecondary),
              // ↓↓↓ 新增字段白名单（一个都不能少）
              themeSource: normalizeLoginThemeSource(login.themeSource ?? login.theme_source),
              modules: resolveLoginModules(login.modules),
              pageBackgroundColor: String(login.pageBackgroundColor || login.page_background_color || ''),
              headerStyle: normalizeLoginHeaderStyle(login.headerStyle ?? login.header_style),
              cardStyle: normalizeLoginCardStyle(login.cardStyle ?? login.card_style),
            }
            // 旧皮肤 key 归一化（warm/brand/minimal/wechat）
            const styleKey = resolveLoginPageStyleKey(form.loginPageConfig)
            const rawStyleKey = String(login.templateStyle || '')
            // 已删除/改名的 key 安全回退到 warm
            if (['default', 'nuange', 'standard'].includes(rawStyleKey) || login.themeColor || login.templateStyle) {
              // applyLoginPageStylePreset 会重写 themeColor/Secondary，
              // 页面覆盖态（themeSource=page）下用户选的颜色必须还原。
              const keepPrimary = form.loginPageConfig.themeColor
              const keepSecondary = form.loginPageConfig.themeColorSecondary
              const isPageTheme = normalizeLoginThemeSource(login.themeSource ?? login.theme_source) === 'page'
              applyLoginPageStylePreset(form.loginPageConfig as unknown as Record<string, unknown>, styleKey)
              if (isPageTheme) {
                if (keepPrimary) form.loginPageConfig.themeColor = keepPrimary
                if (keepSecondary) form.loginPageConfig.themeColorSecondary = keepSecondary
              }
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
      } else {
        form.tabs = normalizeTabBarItems(form.tabs)
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
    form.tabs = normalizeTabBarItems(form.tabs)
  }

  async function handleSave(): Promise<boolean> {
    const previewNick = String(form.mineConfig?.previewNickname ?? '')
    if (previewNick.length > 10) {
      ElMessage.error('预览昵称不能超过10个字')
      return false
    }

    const warnings = [...validateTabsBeforeSave(), ...validateMineMenuBeforeSave()]
    if (warnings.length > 0) {
      try {
        await ElMessageBox.confirm(
          `当前配置存在以下风险：\n${warnings.map(item => `- ${item}`).join('\n')}\n\n是否继续保存？`,
          '保存提醒',
          { confirmButtonText: '继续保存', cancelButtonText: '去检查', type: 'warning' },
        )
      } catch {
        return false
      }
    }

    saving.value = true
    try {
      form.tabs = normalizeTabBarItems(form.tabs)
      // 只写入草稿：线上仍读旧配置，需点「发布配置」才生效
      const draftPayload: Record<string, string> = {
        [CONFIG_KEYS.TEMPLATE_KEY]: form.templateKey,
        [CONFIG_KEYS.HOME_PAGE_ID]: String(form.homePageId ?? ''),
        [CONFIG_KEYS.MINE_PAGE_ID]: String(form.minePageId ?? ''),
        [CONFIG_KEYS.TABBAR_ITEMS]: JSON.stringify(form.tabs),
        [CONFIG_KEYS.MINE_PAGE_CONFIG]: JSON.stringify(form.mineConfig),
        [CONFIG_KEYS.LOGIN_PAGE_CONFIG]: JSON.stringify(form.loginPageConfig),
        [CONFIG_KEYS.THEME_CONFIG]: JSON.stringify(form.theme),
        [CONFIG_KEYS.SHARE_TITLE]: form.shareTitle || '',
        [CONFIG_KEYS.SHARE_IMAGE]: form.shareImage || '',
      }
      await updateConfigs([
        {
          configKey: 'site_builder_draft',
          configValue: JSON.stringify(draftPayload),
          configGroup: 'basic',
          description: '品牌导航待上线草稿',
        },
      ] as any)
      markSaved()
      // 🔴 记录保存结果，供 PageHeader 的 SaveStateBar 显示「已保存」而不是含糊的「编辑中」
      saveError.value = ''
      lastSavedAt.value = new Date().toISOString()
      ElMessage.success('已保存草稿。到「发布与版本」发布配置后用户才能看到')
      return true
    } catch (e: any) {
      // 🔴 保存失败必须留下痕迹：否则页面仍显示「已保存」，用户以为存上了其实没存
      saveError.value = e?.message || '未知错误'
      ElMessage.error('保存失败：' + saveError.value)
      throw e
    } finally {
      saving.value = false
    }
  }

  /**
   * 发布配置（写入线上 + 生成版本快照）
   *
   * 🔴 2026-10-06 统一发布语义：
   * 原来这里调 `publishContentToMiniapp()`（旧通道 /miniapp-releases/publish-content），
   * 而「发布与版本」页调 `publishMiniSite()`（/mini/publish）。**两条链路各自
   * 递增发布序号**，所以同一个配置版本在不同页面显示成不同的数
   * （这也是「工作台 33 / 发布 1200 / 列表 28」混乱的一个来源）。
   * 现在统一走 publishMiniSite，与发布页、与 useMiniConfigSync 完全同源。
   *
   * 保留 handleSave 前置：先把草稿落库，再发布，否则发布的是一个旧版本。
   */
  async function publishToMiniapp(): Promise<boolean> {
    if (isDirty.value) {
      const ok = await handleSave()
      if (!ok) return false
    }
    publishing.value = true
    try {
      const { publishMiniSite } = await import('@/api/miniSite')
      const result = await publishMiniSite({
        includeSite: true,
        notes: '固定页配置发布',
      })
      // 🔴 后端有「禁空发」：返回 200 也可能什么都没做，不能直接报成功
      if (result.siteConfigPromoted === false && !(result.publishedPages || result.publishedPageCount)) {
        ElMessage.warning('本次没有可发布的改动，线上配置未变化')
        return false
      }
      hasPendingSiteDraft.value = false
      ElMessage.success(
        result.liveReleaseNo != null
          ? `已发布配置（第 ${result.liveReleaseNo} 次），版本快照已保存`
          : '已发布配置，版本快照已保存',
      )
      return true
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || '发布失败'
      ElMessage.error(`${msg}。发布未完成，线上配置不会只改一半`)
      return false
    } finally {
      publishing.value = false
    }
  }

  function validateTabsBeforeSave() {
    const warnings: string[] = []
    const pagePathSet = new Set(pages.value.map(p => normalizeMinipagePath(p.path || '')).filter(Boolean))
    const pathToTabs = new Map<string, string[]>()

    for (const tab of form.tabs) {
      const text = tab.text || '未命名'
      const path = normalizeMinipagePath(tab.pagePath || '')
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
      if (!pagePathSet.has(path) && !isBuiltinMinipagePath(path)) {
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

  /**
   * 「我的」菜单跳转目标校验（1.30 新增，与 validateTabsBeforeSave 同口径）。
   * 返回的是**给人看的告警文案**，不是硬拦截：目标填错时端上 navigateTo 会失败，
   * 但静默拦下保存会让人以为系统坏了，所以只提示。
   */
  function validateMineMenuBeforeSave(): string[] {
    const warnings: string[] = []
    const pagePathSet = new Set(pages.value.map((p) => normalizeMinipagePath(p.path || '')).filter(Boolean))
    for (const item of form.mineConfig?.menuItems || []) {
      if (item.enabled === false) continue
      const title = item.title || '未命名'
      const url = String(item.url || '').trim()
      if (!url) {
        warnings.push(`菜单「${title}」没有跳转目标，真机上点击无反应`)
        continue
      }
      if (!isValidMinipageTarget(url)) {
        warnings.push(`菜单「${title}」的跳转目标格式不合法：${url}`)
        continue
      }
      const p = normalizeMinipagePath(url)
      if (!pagePathSet.has(p) && !isBuiltinMinipagePath(p)) {
        warnings.push(`菜单「${title}」指向未发布或不存在的页面：/${p}`)
      }
    }
    return Array.from(new Set(warnings))
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
        showMemberCard: false,
        // 1.30 新增字段一并复位，避免「恢复默认」后残留上一次的覆盖配置
        themeSource: 'inherit',
        modules: { ...DEFAULT_MINE_MODULES },
        pageBackgroundColor: '',
        headerStyle: 'gradient',
        cardStyle: 'shadow',
        menuItems: DEFAULT_MINE_MENU.map((item, i) => ({ ...item, id: `mine-${i + 1}`, visibleOn: 'always' as const })),
        orderQuickAccess: { ...DEFAULT_ORDER_QUICK_ACCESS },
        userProfile: { ...DEFAULT_USER_PROFILE },
      }
      form.theme = { ...DEFAULT_THEME }
      form.loginPageConfig = {
        ...DEFAULT_LOGIN_PAGE_CONFIG,
        modules: { ...DEFAULT_LOGIN_PAGE_CONFIG.modules },
      }
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
    publishing,
    isDirty,
    hasPendingSiteDraft,
    // 2026-10-06 新增：保存结果状态（供 SaveStateBar 五态显示）
    saveError,
    lastSavedAt,
    applyTemplate,
    handleSave,
    publishToMiniapp,
    handleReset,
    autoBindPages,
    loadPages,
    loadConfig,
    validateMineMenuBeforeSave,
  }
}
