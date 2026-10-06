<script setup lang="ts">
/**
 * ============================================================================
 * 品牌与导航（Split-View 工作台）
 * ============================================================================
 *
 * 整合了原「品牌信息」+「导航配置」+「全局功能开关」三个入口。
 * 收敛 rationale：这四件事改的都是**小程序的全局外壳**（用户第一眼看到的东西），
 * 却散在三个页面，来回跳才能看到"改完整体长什么样"。
 * 现在左边改、右边实时看 —— 这才是这类配置该有的工作方式。
 *
 * ⚠️ 保存语义（三条，不可混淆）：
 *   · 导航 / 品牌 / 功能开关 → 静默存入**草稿**，需到「发版中心」发布才影响线上；
 *   · 页面上下线 → 独立接口，**立即生效**（在「页面管理」里，不在这里）；
 *   · 微信代码包 → 另一条完全独立的流程（「发版中心」里单独一块）。
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import draggable from 'vuedraggable'
import MiniIcon from '@/components/mini/MiniIcon.vue'
import LiveSimulator from '@/components/mini/LiveSimulator.vue'
import {
  loadAllPages,
  pageKey,
  pagePathKey,
  isBuiltinShellPath,
} from '@/composables/usePageCatalog'
import { getMiniSite, updateMiniSite, type MiniSiteVO } from '@/api/miniSite'
import { getConfigsSilent, updateConfigs, type SystemConfigUpdateItem } from '@/api/system'
import { refreshMiniPending } from '@/composables/useMiniPending'
import { normalizeBrandConfig, buildBrandConfigUpdateItems } from '@/utils/brand-config'
import { normalizeTabBarItems, TABBAR_MIN, TABBAR_MAX } from '@/utils/tabbar'
import { parseFeatureFlags } from '@/constants/featureMeta'
import { DEFAULT_MINIAPP_BRAND_CONFIG, type MiniappBrandConfig, type NavTab } from '@/types/miniapp'
import type { PageRecord } from '@/types/page'
import DevicePreview from '@/components/mini/DevicePreview.vue'
import MiniH5QrDialog from '@/components/mini/MiniH5QrDialog.vue'
import { usePreviewCheck, PREVIEW_MODES } from '@/composables/usePreviewCheck'

defineOptions({ name: 'MiniWorkbench' })

const router = useRouter()

/**
 * 搭建工作台的四个环节。
 *
 * 🔴 为什么是这四个、而不是原来「品牌/导航/开关」三个 Tab：
 *   任务书要求「让用户能直接在工作台配置和操作」——
 *   改完导航却看不到效果、也看不出能不能发，是原来 9 个平铺入口最大的问题
 *   （配置在A 页、验证在 B 页、发布在 C 页）。
 *   现在四个环节同处一页：改 → 看 → 查 → 发，中间不跳。
 */
type TabKey = 'brand' | 'flags' | 'nav' | 'preview'

const WORKBENCH_TABS: Array<{ k: TabKey; t: string }> = [
  { k: 'brand', t: '品牌信息' },
  { k: 'flags', t: '系统功能' },
  { k: 'nav', t: '导航配置' },
  { k: 'preview', t: '预览检查' },
]

const tab = ref<TabKey>('brand')

/**
 * 预览检查。与旧 preview-check 页共用同一个 composable ——
 * 🔴 必须同源：2026-10-06 出现过「工作台显示有阻断、预览页显示已完成」，
 *    根因就是两处各算一套。这里不再重写任何判定逻辑。
 */
const preview = usePreviewCheck()
const qrVisible = ref(false)
/** 提醒默认折叠：它不影响"能不能发"，不该抢阻断项的注意力 */
const warnOpen = ref(false)

const loading = ref(true)
const loadError = ref('')
/** 🔴 页面清单是否读取失败（与"真的没有页面"区分开） */
const catFailed = ref(false)
const saving = ref(false)

const site = ref<MiniSiteVO>({})
const pages = ref<PageRecord[]>([])
const configMap = ref<Record<string, unknown>>({})

/* ── 导航 ──────────────────────────────────────────────────────────────── */

const tabs = ref<NavTab[]>([])
const tabDirty = ref(false)
const tabSaving = ref(false)
const simActiveIdx = ref(0)
/** 模拟器缩放 */
const zoom = ref<'75' | '100'>('100')

/** 拖拽用的可写副本；带 __key 供 draggable 稳定追踪 */
const sortableTabs = ref<Array<NavTab & { __key: string }>>([])

/**
 * 🔴 脏状态的正确判据是「与打开时的快照有差异」，不是「watch 触发过」。
 *
 * 踩过的坑（2026-10-06）：原来写的是
 *   watch(sortableTabs, () => { if (len) tabDirty = true }, { deep: true })
 *   syncTabsFromSite() 里先 tabDirty = false 再赋值 sortableTabs
 * —— watch 是异步 flush（默认 pre 阶段，走微任务），所以那次 false 刚设完
 * 就被随后排队的 watch 回调改成 true。结果：**刚打开页面就显示"待保存"、
 * 主按钮可点**，用户以为有东西没存。这是任务书点名的"误报脏状态"。
 */
const tabBaseline = ref('')
function tabsFingerprint(list: Array<NavTab & { __key: string }>): string {
  return JSON.stringify(
    list.map((t) => [
      String(t.text || ''),
      String(t.pageId || ''),
      String(t.pagePath || ''),
      (t as any).enabled === false ? '0' : '1',
    ]),
  )
}

function syncTabsFromSite() {
  const raw = (site.value.tabBar || []) as unknown as NavTab[]
  const norm = normalizeTabBarItems(raw)
  tabs.value = norm
  sortableTabs.value = norm.map((t, i) => ({ ...t, __key: `${t.id || 'tab'}-${i}` }))
  // 基线要在赋值之后立刻取：赋值已排入 watch 队列，但此时同步取快照仍拿到新值
  tabBaseline.value = tabsFingerprint(sortableTabs.value)
  tabDirty.value = false
}

watch(
  sortableTabs,
  () => {
    if (!tabBaseline.value) return
    tabDirty.value = tabsFingerprint(sortableTabs.value) !== tabBaseline.value
  },
  { deep: true },
)

/**
 * 「我的」固定末位 —— 微信要求首页与「我的」在两端。
 * 🔴 拖拽与按钮移动必须共用同一条规则，否则会出现两套互相矛盾的约束
 *    （2026-10-06 之前的 navigation.vue 就是只在 onTabDragEnd 里写，遗漏按钮路径）。
 */
function normalizeMineLast(list: Array<NavTab & { __key: string }>) {
  const idx = list.findIndex((t) => pagePathKey(t.pagePath) === 'pages/mine/mine')
  if (idx > 0 && idx !== list.length - 1) {
    const [mine] = list.splice(idx, 1)
    list.push(mine)
    return true
  }
  return false
}

/**
 * 绑定值的兜底展示。
 *
 * 🔴 2026-10-06 踩到：绑定的页面 id 不在当前列表里时（已归档 / 分页没取到），
 *    `<select :value>` 匹配不到任何 option → 浏览器把选中项置为第 0 项，
 *    用户看到的是"未绑定"。**这是个会诱导误操作的假象** ——
 *    他会以为绑定丢了，于是重新绑一个，覆盖掉原本的配置。
 *    正解：给"当前值但不在列表中"补一个占位 option，把真实路径显示出来。
 */
function orphanBindLabel(tabItem: NavTab): string | null {
  const pid = String(tabItem.pageId || '')
  const path = pagePathKey(tabItem.pagePath)
  if (!pid) return null
  if (bindablePages.value.some((p) => pageKey(p.id) === pid)) return null
  return `${tabItem.pageName || '已绑定页面'}（${path || `ID ${pid}`}）· 当前列表中不可见`
}

async function persistTabs(list?: Array<NavTab & { __key: string }>) {
  const src = list ?? sortableTabs.value
  const moved = normalizeMineLast([...src])
  if (moved) {
    sortableTabs.value = [...src]
    ElMessage.info('「我的」固定在最后一个入口，已自动放回末位')
  }
  const clean = sortableTabs.value.map(({ __key: _k, ...rest }) => rest)
  tabs.value = normalizeTabBarItems(clean as NavTab[])
  tabSaving.value = true
  try {
    await updateMiniSite({ tabBar: tabs.value as any })
    // 保存成功后重取基线：否则保存完仍显示"待保存"，用户会以为没存上
    sortableTabs.value = tabs.value.map((t, i) => ({ ...t, __key: `${t.id || 'tab'}-${i}` }))
    tabBaseline.value = tabsFingerprint(sortableTabs.value)
    tabDirty.value = false
    void refreshMiniPending(true)
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '导航保存失败')
  } finally {
    tabSaving.value = false
  }
}

function moveTab(i: number, dir: -1 | 1) {
  const j = i + dir
  if (j < 0 || j >= sortableTabs.value.length) return
  const list = [...sortableTabs.value]
  ;[list[i], list[j]] = [list[j], list[i]]
  sortableTabs.value = list
  void persistTabs(list)
}

function addTab() {
  if (tabs.value.length >= TABBAR_MAX) {
    ElMessage.info(`微信最多支持 ${TABBAR_MAX} 个入口`)
    return
  }
  sortableTabs.value = [
    ...sortableTabs.value,
    { __key: `new-${Date.now()}`, id: `t${Date.now()}`, text: '新入口', icon: '', pagePath: '', pageId: '' } as any,
  ]
}

async function removeTab(i: number) {
  const list = [...sortableTabs.value]
  list.splice(i, 1)
  sortableTabs.value = list
  await persistTabs(list)
}

/** 绑定页面：值用 p<id> 前缀，避免 number/string 混用导致选中态失效 */
function bindValue(tabItem: NavTab): string {
  const pid = String(tabItem.pageId || '')
  if (pid) return `p${pid}`
  // 🔴 必须去掉前导斜杠：normalizeTabBarItems 会把 pagePath 规范成 `/pages/x/x`，
  //    而 option 的 value 是 `sys:pages/x/x`（不带斜杠）。
  //    2026-10-06 实测：带斜杠导致内置页（首页/我的/星球…）的绑定全部显示成"未绑定"。
  const path = pagePathKey(tabItem.pagePath)
  if (path && isBuiltinShellPath(path)) return `sys:${path}`
  return ''
}

function onBind(tabItem: NavTab, value: string) {
  if (!value) {
    tabItem.pageId = ''
    tabItem.pagePath = ''
    tabItem.pageName = ''
    return
  }
  if (value.startsWith('sys:')) {
    // 内置页只写路径、不写 id：写了 id 会被当装修页去拉内容，拉不到
    tabItem.pagePath = value.slice(4)
    tabItem.pageId = ''
    tabItem.pageName = ''
    return
  }
  const hit = pages.value.find((p) => pageKey(p.id) === value.slice(1))
  if (!hit) return
  tabItem.pageId = hit.id as any
  tabItem.pagePath = String(hit.path || '').replace(/^\//, '')
  tabItem.pageName = hit.name
}

const bindablePages = computed(() =>
  pages.value.filter((p) => !isBuiltinShellPath(p.path) && p.path),
)

/** 绑定体检：区分「确实缺失」与「数据读不到」 */
const navChecks = computed(() => {
  const out: Array<{ level: 'ok' | 'warn' | 'danger'; text: string }> = []
  const list = tabs.value
  if (!list.length) {
    return [{ level: 'danger' as const, text: '还没有任何底部导航入口，用户打开小程序看不到 Tab 栏' }]
  }
  if (list.length < TABBAR_MIN) {
    out.push({ level: 'danger', text: `当前只有 ${list.length} 个入口，至少需要 ${TABBAR_MIN} 个` })
  }
  if (list.length > TABBAR_MAX) {
    out.push({ level: 'warn', text: `有 ${list.length} 个入口，超过上限 ${TABBAR_MAX} 个，多余的不会显示` })
  }
  for (const t of list) {
    const label = t.text || '未命名入口'
    if (!String(t.text || '').trim()) {
      out.push({ level: 'danger', text: `有入口没有名称，Tab 会显示空文字` })
      continue
    }
    const pid = String(t.pageId || '')
    if (!pid) {
      const path = String(t.pagePath || '')
      if (!path) out.push({ level: 'danger', text: `「${label}」还没绑定页面，点进去会跳空` })
      continue
    }
    const hit = pages.value.find((p) => pageKey(p.id) === pid)
    if (!hit) {
      // 🔴 页面列表读不到时不能断言"不存在" —— 那是指数据不可信，不是事实。
      //    而且要区分两种「空」：接口失败 vs 真的一个页面都没有，
      //    否则用户会把「接口挂了」当成「配置错了」去排查错方向。
      if (!pages.value.length) {
        out.push({
          level: 'warn',
          text: catFailed.value
            ? `「${label}」的绑定目标无法核对：页面清单读取失败`
            : `「${label}」的绑定目标暂时无法核对`,
        })
      } else {
        out.push({ level: 'danger', text: `「${label}」绑定的页面已不存在，请重新选择` })
      }
      continue
    }
    out.push({ level: 'ok', text: `「${label}」→ ${hit.name}` })
  }
  const hidden = list.filter((t) => (t as any).enabled === false).length
  if (hidden) out.push({ level: 'warn', text: `${hidden} 个入口已隐藏，用户在小程序里看不到` })
  return out
})

/* ── 品牌 ──────────────────────────────────────────────────────────────── */

const brand = ref<MiniappBrandConfig>({ ...DEFAULT_MINIAPP_BRAND_CONFIG, intro: '' } as any)
const brandDirty = ref(false)
const brandSaving = ref(false)
const hexInput = ref('')
const brokenLogo = ref(false)

const PRESET_COLORS = [
  '#C2410C', '#B45309', '#1D4ED8', '#15803D',
  '#7C3AED', '#B91C1C', '#0F766E', '#1E293B',
]

function readBrand(src: Record<string, unknown>) {
  const raw = src.miniappBrandConfig ?? src.brandConfig
  let parsed: any = raw
  if (typeof raw === 'string') {
    try { parsed = JSON.parse(raw) } catch { parsed = {} }
  }
  brand.value = { ...normalizeBrandConfig(parsed ?? {}), intro: String(parsed?.intro ?? '') } as any
  hexInput.value = currentAccent().replace('#', '')
  brandDirty.value = false
}

/** 主色：主题对象里取值，取不到回落品牌色 */
function currentAccent(): string {
  const theme = (site.value.theme || {}) as Record<string, unknown>
  const c = String(theme.primaryColor || theme.theme || theme.color || '').trim()
  if (/^#?[0-9a-fA-F]{6}$/.test(c)) return `#${c.replace('#', '').toUpperCase()}`
  const legacy = (configMap.value.miniappThemeConfig ?? null) as any
  const lc = legacy?.primaryColor || legacy?.color
  if (typeof lc === 'string' && /^#?[0-9a-fA-F]{6}$/.test(lc)) {
    return `#${lc.replace('#', '').toUpperCase()}`
  }
  return '#C2410C'
}

const accent = ref('#C2410C')
watch(currentAccent, (v) => { accent.value = v }, { immediate: true })

function normalizeHex(raw: string): string {
  const s = String(raw || '').trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(s)) {
    return `#${s.split('').map((c) => c + c).join('').toUpperCase()}`
  }
  if (/^[0-9a-fA-F]{6}$/.test(s)) return `#${s.toUpperCase()}`
  return ''
}

function onHexInput(v: string) {
  hexInput.value = v.replace(/[^0-9a-fA-F]/g, '').slice(0, 6)
  const norm = normalizeHex(hexInput.value)
  if (norm) {
    accent.value = norm
    brandDirty.value = true
  }
}

function pickColor(c: string) {
  accent.value = c
  hexInput.value = c.replace('#', '')
  brandDirty.value = true
}

function commitHex() {
  const norm = normalizeHex(hexInput.value)
  if (!norm) {
    // 非法值：回填当前生效色，并说明正确格式，不静默吞掉输入
    hexInput.value = accent.value.replace('#', '')
    ElMessage.warning('色值格式不正确，请输入 6 位，例如 C2410C')
    return
  }
  accent.value = norm
  hexInput.value = norm.replace('#', '')
  brandDirty.value = true
}

/* ── 功能开关 ──────────────────────────────────────────────────────────── */

const features = ref<
  Array<{ key: string; label: string; desc: string; effect: string; on: boolean; group: string }>
>([])

/**
 * 🔴 分组放在这里而不是 featureMeta.ts：
 *   那个文件是「解析 + 兜底默认值」的单一口径，职责单一；
 *   分组是**展示层**的组织方式（跟用户的工作场景有关，会随改版调整），
 *   塞进去会让"改文案"和"改分组"互相污染。
 */
const FEATURE_GROUP: Record<string, string> = {
  content: '内容互动',
  comment: '内容互动',
  activity: '内容互动',
  planet: '内容互动',
  member: '商业转化',
  product: '商业转化',
  order: '商业转化',
  coupon: '商业转化',
  appointment: '工具服务',
  agent: '工具服务',
  search: '工具服务',
  share: '工具服务',
}

function readFeatures() {
  const raw = configMap.value.plugins ?? configMap.value.featureFlags
  const parsed = parseFeatureFlags(raw)
  if (!parsed) {
    features.value = []
    return
  }
  features.value = parsed.map((f) => ({
    key: f.key,
    label: f.label,
    desc: f.desc,
    effect: f.effect,
    on: f.on,
    group: FEATURE_GROUP[f.key] || '其他',
  }))
}

const featureGroups = computed(() => {
  const order = ['内容互动', '商业转化', '工具服务', '其他']
  const map = new Map<string, typeof features.value>()
  for (const f of features.value) {
    if (!map.has(f.group)) map.set(f.group, [])
    map.get(f.group)!.push(f)
  }
  return order.filter((g) => map.has(g)).map((g) => ({ name: g, items: map.get(g)! }))
})

async function toggleFeature(key: string, on: boolean) {
  const f = features.value.find((x) => x.key === key)
  if (!f) return
  const prev = !on
  f.on = on // 乐观更新，失败回滚
  try {
    const current = parseFeatureFlags(configMap.value.plugins) || []
    const next = current.map((c) => (c.key === key ? { ...c, on } : c))
    await updateConfigs([
      {
        configKey: 'plugins',
        configValue: JSON.stringify(next),
        configGroup: 'basic',
        description: '小程序功能开关',
      },
    ])
    configMap.value.plugins = next
    void refreshMiniPending(true)
  } catch (e: unknown) {
    f.on = prev
    ElMessage.error(e instanceof Error ? e.message : '功能开关保存失败')
  }
}

/* ── 保存 ──────────────────────────────────────────────────────────────── */

async function saveBrand() {
  brandSaving.value = true
  try {
    const items = buildBrandConfigUpdateItems(brand.value) as SystemConfigUpdateItem[]
    // 主色与品牌信息落在两处配置：品牌走 miniappBrandConfig，主题走 miniappThemeConfig。
    // 🔴 两处必须一起写，否则会出现"名称改了颜色没改"这种半生效状态。
    const themeRaw = (configMap.value.miniappThemeConfig ?? null) as any
    const theme = { ...(themeRaw || {}), primaryColor: accent.value }
    items.push({
      configKey: 'miniappThemeConfig',
      configValue: JSON.stringify(theme),
      configGroup: 'basic',
      description: '小程序主题配色',
    } as SystemConfigUpdateItem)
    await updateConfigs(items)
    brandDirty.value = false
    void refreshMiniPending(true)
    ElMessage.success('品牌配置已存入草稿 · 到「发版中心」发布后生效')
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '品牌配置保存失败')
  } finally {
    brandSaving.value = false
  }
}

/* ── 加载 ──────────────────────────────────────────────────────────────── */

/** getConfigsSilent 有两种返回形状（分组 / 扁平），都要摊平 */
function flattenConfigs(d: any): Record<string, unknown> {
  const rows = Array.isArray(d) ? (d[0]?.configs ? d.flatMap((g: any) => g.configs || []) : d) : []
  const out: Record<string, unknown> = {}
  for (const r of rows || []) {
    const k = String(r?.configKey || r?.key || '')
    if (!k) continue
    let v = r?.configValue ?? r?.value ?? ''
    if (typeof v === 'string' && /^[[{]/.test(v.trim())) {
      try { v = JSON.parse(v) } catch { /* 保持原串 */ }
    }
    out[k] = v
  }
  return out
}

async function load() {
  loading.value = true
  loadError.value = ''
  catFailed.value = false
  try {
    site.value = (await getMiniSite('draft')) || {}
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : '站点配置读取失败'
  }
  const cat = await loadAllPages()
  pages.value = cat.status === 'ready' ? cat.pages : []
  // 🔴 页面清单读不到必须让用户知道：它直接影响「绑定检查」的结论。
  //   原来只把 pages 清空（`cat.status === 'ready' ? ... : []`），
  //   结果错误被静默吞掉，绑定检查只能软化成「暂时无法核对」——
  //   用户看不出「配置有问题」和「接口挂了」的区别。
  //   这是2026-10-06「页面配置显示 0 条」同一个病根。
  if (cat.status === 'error' && !loadError.value) {
    catFailed.value = true
    loadError.value = cat.error || '页面清单读取失败'
  }

  try {
    const res = await getConfigsSilent()
    configMap.value = flattenConfigs((res as any)?.data ?? res)
  } catch {
    configMap.value = {}
  }

  syncTabsFromSite()
  readBrand(configMap.value)
  readFeatures()
  // 预览检查的数据与品牌/导航同源（都用站点草稿 + 页面清单），
  // 一并加载，切到该 Tab 时不用再等一次接口
  await preview.load()
  loading.value = false
}

/* ── 各环节的状态点（未完成时在 Tab 上显示）──────────────────────────────
   用户不用逐个切进去才发现有事 —— 这是"工作台"相对"平铺菜单"的核心价值。
   ⚠️ 放在 load() 之前声明：下面 tabBadge() 会引用 navIssues，
      而它在 load() 之后定义 —— const 有TDZ，声明顺序不能颠倒。 */
const navIssues = computed(() => navChecks.value.filter((c) => c.level === 'danger').length)

function tabBadge(k: TabKey): string {
  if (k === 'brand' && brandDirty.value) return 'var(--saas-warn)'
  if (k === 'nav' && navIssues.value > 0) return 'var(--saas-danger)'
  if (k === 'flags' && features.value.length && !features.value.some((f) => f.on)) {
    return 'var(--saas-warn)'
  }
  if (k === 'preview') {
    if (!preview.preflightKnown.value) return 'var(--saas-warn)'
    if (preview.blockers.value.length) return 'var(--saas-danger)'
  }
  return ''
}

/* ── 快捷键 ────────────────────────────────────────────────────────────── */

function onKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault()
    if (tab.value === 'brand' && brandDirty.value) void saveBrand()
    else if (tab.value === 'nav' && tabDirty.value) void persistTabs()
  }
}

onMounted(async () => {
  await load()
  window.addEventListener('keydown', onKeydown)
})
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

/** 深链：?tab=xxx 直接切到对应环节（保留旧书签的定位能力） */
onMounted(() => {
  const t = String(router.currentRoute.value.query.tab || '')
  const hit = WORKBENCH_TABS.find((x) => x.k === t)
  if (hit) tab.value = hit.k
})
</script>

<template>
  <div class="ap-hub">
    <!-- 左：配置面板 -->
    <section class="ap-main">
      <header class="ap-bar">
        <div>
          <h1 class="saas-title">搭建工作台</h1>
          <p class="saas-cap">
            配置品牌、系统功能与底部导航，并在这里预览与检查。
            改动存入草稿，到「版本管理」发布后生效。
          </p>
        </div>
        <button
          v-if="tab === 'brand'"
          type="button"
          class="saas-btn saas-btn--primary"
          :disabled="!brandDirty || brandSaving"
          @click="saveBrand"
        >
          {{ brandSaving ? '保存中…' : brandDirty ? '保存品牌配置' : '已保存' }}
          <kbd v-if="brandDirty" class="saas-kbd">⌘S</kbd>
        </button>
        <button
          v-else-if="tab === 'nav'"
          type="button"
          class="saas-btn saas-btn--primary"
          :disabled="!tabDirty || tabSaving"
          @click="persistTabs()"
        >
          {{ tabSaving ? '保存中…' : tabDirty ? '保存导航' : '已保存' }}
          <kbd v-if="tabDirty" class="saas-kbd">⌘S</kbd>
        </button>
      </header>

      <nav class="saas-tabs" role="tablist" aria-label="配置分类">
        <button
          v-for="t in WORKBENCH_TABS"
          :key="t.k"
          type="button"
          role="tab"
          class="saas-tabs__item"
          :aria-selected="tab === t.k"
          @click="tab = t.k as TabKey"
        >
          {{ t.t }}
          <!-- 每个 Tab 带上自己的状态点：用户不用切进去就知道有事没事 -->
          <span
            v-if="tabBadge(t.k)"
            class="saas-dot"
            :class="{
              'saas-dot--pulse': true,
            }"
            :style="{ background: tabBadge(t.k) }"
          />
        </button>
      </nav>

      <!-- 🔴 加载态 / 错误条 / 四个面板是**并列**关系，不在同一条 if 链上。
        之前它们是 v-if / v-if / v-else-if×4：
        "有错误"时错误条渲染、面板被 v-else-if 跳过；
        "加载完成"时骨架屏 v-if 变false、面板的 v-else-if 又挂到了错误条上——
        结果两种情况下面板都不渲染（用户看到「只剩 Tab 头、内容全空」）。
        现在三者各自独立判断：骨架屏看 loading，面板看 !loading && tab，错误条独立。 -->
      <div v-if="loadError" class="saas-note saas-note--danger">
        <MiniIcon name="warn" :size="15" />
        <span>
          <b>{{ loadError }}</b>
          <template v-if="catFailed">
            。这会影响「导航配置」的绑定检查——在数据恢复前，无法判断导航指向的页面是否还存在。
          </template>
          <template v-else>。请稍后重试。</template>
        </span>
      </div>

      <div v-if="loading" class="saas-panel ap-pad">
        <div v-for="i in 4" :key="i" class="saas-skel" style="height: 56px; margin-bottom: 10px" />
      </div>

      <!-- ── Tab 1：底部导航 ──────────────────────────────────────────── -->
      <div v-if="!loading && tab === 'nav'" class="ap-panel">
        <!-- 绑定体检 -->
        <div class="saas-panel">
          <div class="saas-panel__hd">
            <div>
              <div class="saas-panel__title">绑定检查</div>
              <div class="saas-panel__hint">{{ tabs.length }} / {{ TABBAR_MAX }} 个入口</div>
            </div>
          </div>
          <ul class="ap-checks">
            <li v-for="(c, i) in navChecks" :key="i" class="ap-check" :class="`is-${c.level}`">
              <MiniIcon :name="c.level === 'ok' ? 'check' : c.level === 'warn' ? 'warn' : 'x'" :size="13" />
              <span>{{ c.text }}</span>
            </li>
          </ul>
        </div>

        <!-- 导航列表 -->
        <div class="saas-panel">
          <div class="saas-panel__hd">
            <div>
              <div class="saas-panel__title">底部导航</div>
              <div class="saas-panel__hint">拖动手柄排序，或用上移/下移按钮。首个是首页，末位固定为「我的」。</div>
            </div>
            <button
              type="button"
              class="saas-btn saas-btn--sm"
              :disabled="tabs.length >= TABBAR_MAX"
              @click="addTab"
            >
              <MiniIcon name="plus" :size="13" />添加入口
            </button>
          </div>

          <draggable
            v-model="sortableTabs"
            item-key="__key"
            handle=".ap-grip"
            class="ap-list"
            :animation="180"
            @end="persistTabs()"
          >
            <template #item="{ element: t, index: i }">
              <div class="ap-item" :class="{ 'is-off': (t as any).enabled === false }">
                <span class="ap-grip" title="拖动排序">
                  <MiniIcon name="drag" :size="14" />
                </span>
                <span class="ap-idx">{{ i + 1 }}</span>

                <img
                  v-if="t.icon"
                  :src="t.icon"
                  alt=""
                  class="ap-icon"
                  @error="($event.target as HTMLElement).style.visibility = 'hidden'"
                />
                <span v-else class="ap-icon ap-icon--ph"><MiniIcon name="grid" :size="14" /></span>

                <div class="ap-fields">
                  <input
                    v-model="t.text"
                    class="saas-input"
                    placeholder="入口名称"
                    aria-label="入口名称"
                    @change="persistTabs()"
                  />
                  <select
                    class="saas-select"
                    :value="bindValue(t)"
                    aria-label="绑定页面"
                    @change="onBind(t, ($event.target as HTMLSelectElement).value); persistTabs()"
                  >
                    <option value="">未绑定</option>
                    <!-- 🔴 绑定目标不在列表里时补占位项，避免 select 静默回落到"未绑定" -->
                    <option v-if="orphanBindLabel(t)" :value="bindValue(t)" disabled>
                      {{ orphanBindLabel(t) }}
                    </option>
                    <optgroup label="系统原生页">
                      <option
                        v-for="s in [
                          { p: 'pages/index/index', n: '首页' },
                          { p: 'pages/discover/discover', n: '发现' },
                          { p: 'pages/planet/planet', n: '星球' },
                          { p: 'pages/shop/shop', n: '商城' },
                          { p: 'pages/mine/mine', n: '我的' },
                        ]"
                        :key="s.p"
                        :value="`sys:${s.p}`"
                      >
                        {{ s.n }}
                      </option>
                    </optgroup>
                    <optgroup label="装修页">
                      <option v-for="p in bindablePages" :key="pageKey(p.id)" :value="`p${pageKey(p.id)}`">
                        {{ p.name || '（未命名）' }}
                      </option>
                    </optgroup>
                  </select>
                </div>

                <div class="ap-ops">
                  <button
                    type="button"
                    class="saas-btn saas-btn--sm saas-btn--icon saas-btn--ghost"
                    title="在小程序里预览这个入口"
                    @click="simActiveIdx = i"
                  >
                    <MiniIcon name="eye" :size="13" />
                  </button>
                  <button
                    type="button"
                    class="saas-btn saas-btn--sm saas-btn--icon saas-btn--ghost"
                    title="上移"
                    :disabled="i === 0"
                    @click="moveTab(i, -1)"
                  >
                    <MiniIcon name="up" :size="13" />
                  </button>
                  <button
                    type="button"
                    class="saas-btn saas-btn--sm saas-btn--icon saas-btn--ghost"
                    title="下移"
                    :disabled="i === sortableTabs.length - 1"
                    @click="moveTab(i, 1)"
                  >
                    <MiniIcon name="down" :size="13" />
                  </button>
                  <button
                    type="button"
                    class="saas-btn saas-btn--sm saas-btn--icon saas-btn--ghost"
                    title="删除入口"
                    @click="removeTab(i)"
                  >
                    <MiniIcon name="trash" :size="13" />
                  </button>
                </div>
              </div>
            </template>
          </draggable>

          <p v-if="!sortableTabs.length" class="saas-cap ap-empty">
            还没有底部导航入口，点「添加入口」开始。
          </p>
        </div>
      </div>

      <!-- ── Tab 2：品牌资产 ──────────────────────────────────────────── -->
      <div v-if="!loading && tab === 'brand'" class="ap-panel">
        <div class="saas-panel">
          <div class="saas-panel__hd">
            <div>
              <div class="saas-panel__title">品牌资产</div>
              <div class="saas-panel__hint">这里改的是全局默认值，单个页面可覆盖品牌色与文案。</div>
            </div>
          </div>
          <div class="saas-panel__bd ap-form">
            <div class="saas-grouptitle">标识</div>
            <div class="ap-2col">
              <div class="saas-field">
                <span class="saas-label">小程序名称</span>
                <input v-model="brand.appName" class="saas-input" @input="brandDirty = true" />
              </div>
              <div class="saas-field">
                <span class="saas-label">英文眉题</span>
                <input v-model="brand.brandEyebrow" class="saas-input" placeholder="选填" @input="brandDirty = true" />
              </div>
            </div>
            <div class="saas-field" style="margin-top: 12px">
              <span class="saas-label">品牌介绍</span>
              <textarea
                v-model="(brand as any).intro"
                class="saas-input ap-textarea"
                rows="2"
                maxlength="80"
                placeholder="一句话说明这个小程序是做什么的"
                @input="brandDirty = true"
              />
              <span class="saas-hint">用于个人中心与关于页，{{ String((brand as any).intro || '').length }}/80</span>
            </div>

            <div class="saas-grouptitle">Logo</div>
            <div class="saas-row saas-gap-12">
              <div class="ap-logo">
                <img
                  v-if="brand.logoUrl && !brokenLogo"
                  :src="brand.logoUrl"
                  alt="Logo 预览"
                  @error="brokenLogo = true"
                />
                <span v-else class="ap-logo__mark" :style="{ background: accent }">
                  {{ brand.logoMark || brand.appName.slice(0, 1) || '·' }}
                </span>
              </div>
              <div class="saas-grow saas-stack saas-gap-8">
                <input
                  v-model="brand.logoUrl"
                  class="saas-input"
                  placeholder="Logo 图片地址"
                  @input="brandDirty = true; brokenLogo = false"
                />
                <div class="saas-row saas-gap-8">
                  <input
                    v-model="brand.logoMark"
                    class="saas-input"
                    style="max-width: 90px"
                    placeholder="文字标"
                    aria-label="文字 Logo"
                    @input="brandDirty = true"
                  />
                  <span class="saas-hint saas-grow">
                    没有图片时用「文字标」+ 品牌色渲染，右侧可实时看到。
                  </span>
                </div>
              </div>
            </div>

            <div class="saas-grouptitle">主色调</div>
            <div class="saas-row saas-gap-8" style="flex-wrap: wrap">
              <button
                v-for="c in PRESET_COLORS"
                :key="c"
                type="button"
                class="ap-swatch"
                :class="{ 'is-on': accent === c }"
                :style="{ background: c }"
                :title="c"
                :aria-label="`使用颜色 ${c}`"
                @click="pickColor(c)"
              />
              <label class="ap-hex">
                <span>#</span>
                <input
                  v-model="hexInput"
                  maxlength="6"
                  aria-label="自定义主色"
                  @input="onHexInput(hexInput)"
                  @blur="commitHex"
                  @keyup.enter="commitHex"
                />
              </label>
            </div>
            <div class="saas-note" style="margin-top: 10px">
              <MiniIcon name="info" :size="13" />
              <span>
                当前生效主色 <b class="saas-mono">{{ accent }}</b>
                · 右侧预览与小程序端使用同一个值
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Tab 3：功能开关 ──────────────────────────────────────────── -->
      <div v-if="!loading && tab === 'flags'" class="ap-panel">
        <div class="saas-panel">
          <div class="saas-panel__hd">
            <div>
              <div class="saas-panel__title">功能开关</div>
              <div class="saas-panel__hint">控制小程序里各功能的开放与关闭，切换后立即存入草稿。</div>
            </div>
          </div>

          <div v-if="features.length" class="saas-panel__bd">
            <div v-for="g in featureGroups" :key="g.name" class="saas-field" style="margin-bottom: 20px">
              <div class="saas-grouptitle">{{ g.name }}</div>
              <label v-for="f in g.items" :key="f.key" class="ap-flag">
                <span class="saas-grow">
                  <span class="ap-flag__t">{{ f.label }}</span>
                  <!-- 优先展示"关掉会发生什么"（effect），它比描述更有决策价值 -->
                  <span v-if="f.effect" class="ap-flag__d">{{ f.effect }}</span>
                  <span v-else-if="f.desc" class="ap-flag__d">{{ f.desc }}</span>
                </span>
                <span class="ap-switch">
                  <input
                    type="checkbox"
                    :checked="f.on"
                    @change="toggleFeature(f.key, ($event.target as HTMLInputElement).checked)"
                  />
                  <span class="ap-switch__track"><span class="ap-switch__dot" /></span>
                </span>
              </label>
            </div>
          </div>

          <div v-else class="saas-panel__bd">
            <div class="saas-note saas-note--info">
              <MiniIcon name="info" :size="15" />
              <span>
                尚未配置功能开关。<b>功能开关在后台「系统设置」里维护</b>，
                配置后这里会显示每一项的名称、状态与影响范围。
              </span>
            </div>
            <button type="button" class="saas-btn" style="margin-top: 12px" @click="router.push('/settings/basic')">
              前往系统设置
            </button>
          </div>
        </div>
      </div>

      <!-- ── Tab 4：预览检查 ──────────────────────────────────────────────
           配置完直接在这里验证与放行，不再跳去另一个页面。 -->
      <div v-if="!loading && tab === 'preview'" class="ap-panel">
        <!-- 发布资格 -->
        <div class="saas-panel">
          <div class="saas-panel__hd">
            <div>
              <!-- 静态标题给"这是什么"，动态结论给"现在怎样"。
                   只有动态结论的话，用户扫一眼不知道这块是干什么的。 -->
              <div class="saas-panel__title">发布前检查</div>
              <div class="ap-verdict">{{ preview.verdictTitle.value }}</div>
              <div class="saas-panel__hint">{{ preview.verdictDesc.value }}</div>
            </div>
            <!-- 🔴 CTA 闭环（2026-10-06 修正）：
                 原来「重新检查」是唯一按钮，主操作「去版本管理发布」埋在页面最下方，
                 用户看完检查结果还要往下滚才能发布 —— 检查与发布断成两段。
                 现在主次并排：主=发布，次=重新检查，形成「检查 → 确认 → 立即发布」。 -->
            <div class="ap-check__cta">
              <button
                type="button"
                class="saas-btn saas-btn--primary saas-btn--sm"
                :disabled="!preview.canPublish.value || !preview.wb.facts.value.pendingCount"
                :title="
                  !preview.canPublish.value
                    ? '有阻断项或检查服务不可用，先处理左侧问题'
                    : !preview.wb.facts.value.pendingCount
                      ? '当前没有待发布改动'
                      : '到版本管理确认发布配置'
                "
                @click="router.push('/mini/versions')"
              >
                <MiniIcon name="upload" :size="13" />
                {{ preview.wb.facts.value.pendingCount ? '去版本管理发布' : '无待发布改动' }}
              </button>
              <button
                type="button"
                class="saas-btn saas-btn--sm"
                :disabled="preview.loading.value"
                @click="preview.load()"
              >
                重新检查
              </button>
            </div>
          </div>

          <div class="saas-panel__bd ap-check">
            <!-- 检查服务不可用：不能显示「0 阻断」 -->
            <div v-if="!preview.preflightKnown.value" class="saas-note saas-note--warn">
              <MiniIcon name="warn" :size="15" />
              <span>发布前检查服务暂时不可用，<b>无法确认</b>是否可以发布。请稍后重试。</span>
            </div>

            <!-- 体检与发布资格矛盾时必须点破，不能装作没事 -->
            <div v-if="preview.scanConflict.value" class="saas-note saas-note--warn">
              <MiniIcon name="warn" :size="15" />
              <span>{{ preview.scanConflict.value }}</span>
            </div>

            <!-- 阻断项 -->
            <div v-if="preview.blockers.value.length" class="ap-issues">
              <div class="ap-issues__hd">
                <span class="ap-issues__n">{{ preview.blockers.value.length }}</span> 个阻断项
                <span class="saas-cap">处理完才能发布</span>
              </div>
              <div v-for="(b, i) in preview.blockers.value" :key="`b${i}`" class="ap-issue is-danger">
                <MiniIcon name="x" :size="13" />
                <span class="saas-grow">{{ b.text }}</span>
                <button
                  v-if="b.action?.to"
                  type="button"
                  class="saas-btn saas-btn--sm"
                  @click="router.push(b.action.to)"
                >
                  修复
                </button>
              </div>
            </div>

            <div v-else-if="preview.preflightKnown.value" class="saas-note saas-note--success">
              <MiniIcon name="check" :size="15" />
              <span>没有阻断发布的问题。</span>
            </div>

            <!-- 提醒：折叠时露出前 2 条。
                 🔴 2026-10-06 修正：原来默认全折叠，标题只写「7 条提醒」，
                    下方内容体检却四项都是 0 —— 运营看到的是「要发 7 个问题，但检查说没问题」，
                    完全不知道该不该发。现在收起时也把前 2 条亮出来，
                    让人知道提醒是关于什么的。 -->
            <div v-if="preview.warnings.value.length" class="ap-issues">
              <button type="button" class="ap-issues__toggle" @click="warnOpen = !warnOpen">
                <span class="ap-issues__n ap-issues__n--warn">{{ preview.warnings.value.length }}</span>
                条提醒
                <span class="saas-cap">{{ warnOpen ? '收起' : '展开全部' }}</span>
                <MiniIcon :name="warnOpen ? 'chev' : 'down'" :size="13" />
              </button>
              <!-- 收起时也展示前 2 条（高危优先），不逼用户点开才知道内容 -->
              <div v-for="(w, i) in (warnOpen
                ? preview.warnings.value
                : preview.warnings.value.slice(0, 2))" :key="`w${i}`" class="ap-issue is-warn">
                <MiniIcon name="warn" :size="13" />
                <span class="saas-grow">{{ w.text }}</span>
                <button
                  v-if="w.action?.to"
                  type="button"
                  class="saas-btn saas-btn--sm"
                  @click="router.push(w.action.to)"
                >
                  {{ w.action.label || '立即修复' }}
                </button>
              </div>
              <p v-if="!warnOpen && preview.warnings.value.length > 2" class="ap-issues__more">
                还有 {{ preview.warnings.value.length - 2 }} 条，点击展开
              </p>
            </div>
          </div>
        </div>

        <!-- 内容体检 -->
        <div class="saas-panel">
          <div class="saas-panel__hd">
            <div>
              <div class="saas-panel__title">内容体检</div>
              <div class="saas-panel__hint">扫描导航失效、缺名称与已下线页面</div>
            </div>
          </div>

          <div class="saas-panel__bd">
            <!-- 🔴 读取失败时不能显示 0，那会被误读成"没有问题" -->
            <div v-if="preview.scanError.value" class="saas-note saas-note--danger">
              <MiniIcon name="warn" :size="15" />
              <span>
                页面清单读取失败：{{ preview.scanError.value }}
                <b>体检结果不可用</b>，这不是"没有问题"。
              </span>
            </div>

            <template v-else>
              <div class="ap-scan">
                <div class="ap-scan__cell">
                  <span class="saas-cap">失效导航</span>
                  <strong :class="preview.scan.value.brokenLink ? 'bad' : 'good'">
                    {{ preview.scan.value.brokenLink }}
                  </strong>
                </div>
                <div class="ap-scan__cell">
                  <span class="saas-cap">缺名称</span>
                  <strong :class="preview.scan.value.noname ? 'warn' : 'good'">
                    {{ preview.scan.value.noname }}
                  </strong>
                </div>
                <div class="ap-scan__cell">
                  <span class="saas-cap">可疑空页</span>
                  <strong :class="preview.scan.value.emptyPage ? 'warn' : 'good'">
                    {{ preview.scan.value.emptyPage }}
                  </strong>
                </div>
                <div class="ap-scan__cell">
                  <span class="saas-cap">已下线</span>
                  <strong :class="preview.scan.value.offline ? 'warn' : 'good'">
                    {{ preview.scan.value.offline }}
                  </strong>
                </div>
                <!-- 🔴 占位内容单独一格（2026-10-06 新增）。
                     前四格是"结构问题"（链接/命名/上下线），这一格是"内容问题"：
                     研发演示数据漏到用户可见页面。性质不同，不能混在同一组里。 -->
                <div class="ap-scan__cell" :class="{ 'ap-scan__cell--alert': preview.mockLeaks.value.length }">
                  <span class="saas-cap">占位内容</span>
                  <strong :class="preview.mockLeaks.value.length ? 'bad' : 'good'">
                    {{ preview.mockLeaks.value.length }}
                  </strong>
                </div>
              </div>

              <!-- 占位内容明细：必须列出具体是哪几页，光给数字等于让人猜 -->
              <div v-if="preview.mockLeaks.value.length" class="ap-scan__leak">
                <div class="ap-scan__leak-hd">
                  <MiniIcon name="warn" :size="13" />
                  检测到未清理的示例/占位内容，发布后用户会看到
                </div>
                <ul>
                  <li v-for="(d, i) in preview.mockLeaks.value" :key="i">{{ d }}</li>
                </ul>
              </div>

              <ul v-if="preview.scan.value.details.length" class="ap-scan__list">
                <li v-for="(d, i) in preview.scan.value.details" :key="i">{{ d }}</li>
              </ul>
            </template>
          </div>
        </div>

        <!-- 预览 -->
        <div class="saas-panel">
          <div class="saas-panel__hd">
            <div>
              <div class="saas-panel__title">草稿 / 线上预览</div>
              <div class="saas-panel__hint">草稿含未发布改动；线上是用户当前看到的样子</div>
            </div>
            <button type="button" class="saas-btn saas-btn--sm" @click="qrVisible = true">
              <MiniIcon name="qr" :size="13" />手机预览
            </button>
          </div>
          <div class="saas-panel__bd">
            <!-- 🔴 DevicePreview 自己管草稿/线上切换（内部状态），
                 所以这里传两个 URL 由它内部决定，不在外面再做一个 seg 假装联动。
                 外面那个 seg 会和它的内部状态不一致 —— 那是假的联动。 -->
            <div class="ap-preview">
              <DevicePreview
                :preview-url="preview.previewUrl.value"
                :preview-url-live="preview.previewUrlLive.value"
                :iframe-key="preview.previewKey.value"
                :show-mode-switch="true"
                :hint="preview.previewHint.value"
                @scan="qrVisible = true"
              />
            </div>
          </div>
        </div>

        <!-- 快捷入口 -->
        <div class="saas-panel">
          <div class="saas-panel__hd">
            <div>
              <div class="saas-panel__title">待发布与快捷入口</div>
              <div class="saas-panel__hint">
                {{ preview.wb.facts.value.pendingCount || 0 }} 项改动已存草稿，发布后才会影响线上
              </div>
            </div>
          </div>
          <div class="saas-panel__bd ap-links">
            <button type="button" class="saas-btn" @click="router.push('/mini/pages')">
              <MiniIcon name="page" :size="14" />去页面管理
            </button>
            <button
              type="button"
              class="saas-btn saas-btn--primary"
              :disabled="!preview.canPublish.value || !preview.wb.facts.value.pendingCount"
              @click="router.push('/mini/versions')"
            >
              <MiniIcon name="upload" :size="14" />去版本管理发布
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- 右：实时模拟器 -->
    <aside class="ap-aside">
      <div class="saas-panel">
        <div class="saas-panel__hd">
          <div>
            <div class="saas-panel__title">实时预览</div>
            <div class="saas-panel__hint">左边改什么，这里立刻变</div>
          </div>
          <div class="saas-seg" role="group" aria-label="预览缩放">
            <button
              v-for="z in ['75', '100']"
              :key="z"
              type="button"
              class="saas-seg__item"
              :aria-selected="String(zoom) === z"
              @click="zoom = z as '75' | '100'"
            >
              {{ z }}%
            </button>
          </div>
        </div>
        <LiveSimulator
          :tabs="tabs"
          :accent="accent"
          :app-name="brand.appName"
          :eyebrow="brand.brandEyebrow"
          :logo-url="brand.logoUrl"
          :logo-mark="brand.logoMark"
          :intro="(brand as any).intro"
          :zoom="zoom"
          :active-idx="simActiveIdx"
        />
      </div>
    </aside>

    <!-- 真机预览：扫码在手机上打开草稿口径的 H5 模拟 -->
    <MiniH5QrDialog v-model="qrVisible" mode="miniapp-draft" title="扫码预览草稿" />
  </div>
</template>

<style scoped lang="scss">
.ap-hub {
  display: grid;
  /* 左侧自适应、右侧固定 340 —— 让配置区拿到尽可能多的宽度 */
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 16px;
  align-items: start;
  min-width: 0;
}
.ap-main { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.ap-aside { position: sticky; top: 12px; }

.ap-bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  p { margin: 4px 0 0; max-width: 62ch; }
}
.ap-panel { display: flex; flex-direction: column; gap: 14px; }
.ap-pad { padding: 16px; }
.ap-empty { padding: 24px; text-align: center; }
.ap-form { display: flex; flex-direction: column; }

/* ── 绑定检查 ──────────────────────────────────────────────────────────── */
.ap-checks { list-style: none; margin: 0; padding: 8px 0; }
.ap-check {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 16px;
  font-size: var(--saas-fs-cap);
  line-height: 1.5;
  &.is-ok { color: var(--saas-success); }
  &.is-warn { color: var(--saas-warn); }
  &.is-danger { color: var(--saas-danger); }
}

.ap-check { display: flex; flex-direction: column; gap: 10px; }

/* 检查结论：比标题重一档、但比正文轻，用颜色表达"能不能发" */
.ap-verdict {
  margin-top: 4px;
  font-size: var(--saas-fs-body);
  font-weight: 600;
  color: var(--saas-ink);
}

/* 阻断 / 提醒列表 */
.ap-issues { display: flex; flex-direction: column; gap: 6px; }
.ap-issues__hd {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--saas-fs-cap);
  font-weight: 500;
  color: var(--saas-ink-2);
}
.ap-issues__toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  font-family: inherit;
  font-size: var(--saas-fs-cap);
  font-weight: 500;
  color: var(--saas-ink-2);
  cursor: pointer;
}
.ap-issues__n {
  display: grid;
  place-items: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: var(--saas-r-full);
  background: var(--saas-danger-bg);
  color: var(--saas-danger);
  font-family: var(--saas-mono);
  font-size: var(--saas-fs-mono);
  &--warn { background: var(--saas-warn-bg); color: var(--saas-warn); }
}
.ap-issue {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  border-radius: var(--saas-r-md);
  font-size: var(--saas-fs-cap);
  line-height: 1.5;
  &.is-danger { background: var(--saas-danger-bg); color: var(--saas-danger); }
  &.is-warn { background: var(--saas-warn-bg); color: var(--saas-warn); }
}

/* 内容体检四宫格 */
.ap-scan {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
  gap: 8px;
}
.ap-scan__cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  border: 1px solid var(--saas-border);
  border-radius: var(--saas-r-md);
  strong { font-family: var(--saas-mono); font-size: 18px; line-height: 1.2; }
  strong.good { color: var(--saas-success); }
  strong.warn { color: var(--saas-warn); }
  strong.bad { color: var(--saas-danger); }
}
.ap-scan__list {
  margin: 10px 0 0;
  padding-left: 18px;
  font-size: var(--saas-fs-cap);
  line-height: 1.8;
  color: var(--saas-ink-2);
}

/* DevicePreview 自带 sticky 定位，工作台里改为静态流式排布 */
.ap-preview {
  display: flex;
  justify-content: center;
  :deep(.device-preview) { position: static; max-width: none; }
}

/* CTA 闭环：主按钮 + 次按钮并排 */
.ap-check__cta { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

/* 占位内容告警格：唯一用 danger 底色的体检格，视觉上要能一眼看到 */
.ap-scan__cell--alert {
  border-color: var(--saas-danger);
  background: var(--saas-danger-bg);
}

.ap-scan__leak {
  margin-top: 10px;
  padding: 9px 11px;
  border: 1px solid var(--saas-danger);
  border-radius: var(--saas-r-md);
  background: var(--saas-danger-bg);
  font-size: var(--saas-fs-cap);
  line-height: 1.7;
  color: var(--saas-danger);
}
.ap-scan__leak-hd {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  margin-bottom: 4px;
}
.ap-scan__leak ul { margin: 0; padding-left: 20px; }

.ap-issues__more {
  margin: 2px 0 0;
  font-size: var(--saas-fs-cap);
  color: var(--saas-ink-3);
}

.ap-links { display: flex; gap: 8px; flex-wrap: wrap; }

/* ── 导航列表 ──────────────────────────────────────────────────────────── */
.ap-list { padding: 8px; display: flex; flex-direction: column; gap: 8px; }
.ap-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid var(--saas-border);
  border-radius: var(--saas-r-md);
  background: var(--saas-surface);
  transition: border-color var(--saas-t) var(--saas-ease), box-shadow var(--saas-t) var(--saas-ease);
  &:hover { border-color: var(--saas-border-strong); box-shadow: var(--saas-shadow-xs); }
  &.is-off { opacity: 0.55; }
}
.ap-grip {
  display: grid;
  place-items: center;
  width: 20px;
  color: var(--saas-ink-3);
  cursor: grab;
  &:active { cursor: grabbing; }
}
.ap-idx {
  width: 18px;
  font-family: var(--saas-mono);
  font-size: var(--saas-fs-mono);
  color: var(--saas-ink-3);
  text-align: center;
  flex: none;
}
.ap-icon {
  width: 24px;
  height: 24px;
  border-radius: var(--saas-r-xs);
  object-fit: cover;
  flex: none;
  background: var(--saas-subtle);
}
.ap-icon--ph { display: grid; place-items: center; color: var(--saas-ink-3); }
.ap-fields {
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
  gap: 6px;
  flex: 1;
  min-width: 0;
}
.ap-ops { display: flex; gap: 2px; flex: none; }

/* ── 品牌 ──────────────────────────────────────────────────────────────── */
.ap-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.ap-textarea { height: auto; padding: 8px 10px; line-height: 1.6; resize: vertical; font-family: inherit; }

.ap-logo {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border: 1px solid var(--saas-border);
  border-radius: var(--saas-r-md);
  overflow: hidden;
  flex: none;
  /* 透明背景棋盘格：让"Logo 有没有透明底"一眼可见 */
  background-image:
    linear-gradient(45deg, #f1f5f9 25%, transparent 25%),
    linear-gradient(-45deg, #f1f5f9 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #f1f5f9 75%),
    linear-gradient(-45deg, transparent 75%, #f1f5f9 75%);
  background-size: 12px 12px;
  background-position: 0 0, 0 6px, 6px -6px, -6px 0;
  img { width: 100%; height: 100%; object-fit: contain; }
}
.ap-logo__mark { color: #fff; font-size: 26px; font-weight: 700; }

.ap-swatch {
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: var(--saas-r-sm);
  cursor: pointer;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.08);
  transition: transform var(--saas-t) var(--saas-spring), box-shadow var(--saas-t) var(--saas-ease);
  &:hover { transform: scale(1.08); }
  /* 选中态：白色内环 + 外扩，而不是加粗边框（那会让色块变小） */
  &.is-on { box-shadow: inset 0 0 0 2px #fff, 0 0 0 2px var(--saas-ink); }
}
.ap-hex {
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding-left: 8px;
  border: 1px solid var(--saas-border);
  border-radius: var(--saas-r-sm);
  background: var(--saas-surface);
  color: var(--saas-ink-3);
  font-family: var(--saas-mono);
  font-size: var(--saas-fs-mono);
  input {
    width: 66px;
    border: 0;
    outline: none;
    background: transparent;
    color: var(--saas-ink);
    font-family: inherit;
    font-size: inherit;
    text-transform: uppercase;
    &::placeholder { color: var(--saas-ink-3); }
  }
  &:focus-within { border-color: var(--saas-border-accent); box-shadow: var(--saas-ring); }
}

/* ── 功能开关 ──────────────────────────────────────────────────────────── */
.ap-flag {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 0;
  border-bottom: 1px solid var(--saas-border);
  cursor: pointer;
  &:last-child { border-bottom: 0; }
}
.ap-flag__t { display: block; font-size: var(--saas-fs-body); color: var(--saas-ink); font-weight: 500; }
.ap-flag__d { display: block; font-size: var(--saas-fs-cap); color: var(--saas-ink-3); margin-top: 1px; }

.ap-switch {
  position: relative;
  display: inline-flex;
  cursor: pointer;
  flex: none;
  input { position: absolute; opacity: 0; width: 0; height: 0; }
  &__track {
    display: block;
    width: 36px;
    height: 20px;
    border-radius: var(--saas-r-full);
    background: var(--saas-neutral-line);
    position: relative;
    transition: background-color var(--saas-t) var(--saas-ease);
  }
  &__dot {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    box-shadow: var(--saas-shadow-xs);
    transition: transform var(--saas-t) var(--saas-spring);
  }
  input:checked + &__track { background: var(--saas-accent); }
  input:checked + &__track &__dot { transform: translateX(16px); }
  input:focus-visible + &__track { box-shadow: var(--saas-ring); }
}

@media (max-width: 1180px) {
  .ap-hub { grid-template-columns: minmax(0, 1fr); }
  .ap-aside { position: static; }
}
@media (max-width: 720px) {
  .ap-fields { grid-template-columns: minmax(0, 1fr); }
  .ap-2col { grid-template-columns: 1fr; }
}
</style>