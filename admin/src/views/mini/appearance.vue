<template>
  <div class="mini-wb mw-page appearance-view" v-loading="loading && loaded">
    <MiniSkeleton v-if="!loaded" kind="overview" />
    <div v-else class="ov">
      <div class="ov-main">
        <MiniOpsConceptBanner variant="appearance" />
        <div class="head-row">
          <div>
            <h1 class="h1">外观</h1>
            <div class="sub">底部导航、品牌配色；整店模板在「模板」里切换</div>
          </div>
          <div class="actions">
            <button type="button" class="btn soft" @click="router.push('/mini/templates')">
              <MiniIcon name="grid" :size="15" />
              整店模板
            </button>
            <button
              type="button"
              class="btn primary"
              :loading="syncing"
              @click="handleSyncAll"
            >
              保存并同步
            </button>
            <button type="button" class="btn soft" @click="router.push('/mini/pages')">管理页面 ›</button>
          </div>
        </div>
        <div class="sub ov-meta">
          <span>当前模板：{{ templateLabel }}</span>
          <span v-if="site.pendingCount">待同步 {{ site.pendingCount }} 项</span>
        </div>

        <section class="card">
          <div class="head" style="margin-bottom: 14px">
            <div>
              <h2 class="h2">底部导航</h2>
              <div class="sub">拖动卡片排序；点卡片改名称、换绑定页面或进入装修</div>
            </div>
          </div>
          <div class="tabs-edit">
            <draggable
              v-model="sortableTabBar"
              item-key="__key"
              handle=".tab-drag"
              class="tabs-edit-inner"
              :animation="180"
              @end="onTabDragEnd"
            >
              <template #item="{ element: tab, index: i }">
                <button
                  type="button"
                  class="tabcard"
                  :class="{ err: isTabUnbound(tab) }"
                  @click="onTabCardClick(i)"
                >
                  <span class="faint tabcard-top">
                    <span>导航 {{ i + 1 }}</span>
                    <span class="tab-drag" title="拖拽排序" @click.stop>
                      <MiniIcon name="drag" :size="14" />
                    </span>
                  </span>
                  <span class="t">
                    {{ tab.text || `导航 ${i + 1}` }}
                    <span v-if="isMineTab(tab)" class="faint" title="系统页，路径固定">
                      <MiniIcon name="lock" :size="13" />
                    </span>
                  </span>
                  <span class="faint" style="font-size: 12px">→ {{ tabBindLabel(tab) === '未绑定' ? '未绑定页面' : tabBindLabel(tab) }}</span>
                  <span>
                    <span
                      class="tag"
                      :class="tabStatusTagClass(tab)"
                    >{{ tabStatus(tab).label === '未绑定' ? '需绑定' : tabStatus(tab).label }}</span>
                  </span>
                </button>
              </template>
            </draggable>
            <button
              v-if="tabBar.length < 5"
              type="button"
              class="tabadd"
              @click="addTabSlot"
            >
              <MiniIcon name="plus" :size="18" />
              <span>添加入口</span>
            </button>
          </div>
        </section>

        <section class="card">
          <div class="head" style="margin-bottom: 12px">
            <div>
              <h2 class="h2">品牌配色</h2>
              <div class="sub">主色用于导航选中态、按钮和强调组件</div>
            </div>
          </div>
          <div class="swatches">
            <button
              v-for="c in THEMES"
              :key="c"
              type="button"
              class="sw"
              :class="{ on: shownTheme === c }"
              :style="{ background: c }"
              :aria-label="`主色 ${c}`"
              :aria-pressed="shownTheme === c"
              :disabled="savingTheme"
              @click="pickTheme(c)"
            />
          </div>
          <p class="faint" style="margin: 8px 0 0; font-size: 12px; line-height: 1.5">
            选色后先保存草稿；点顶部「保存并同步」后才会更新线上可读配置（全页主色含登录、我的等）。
          </p>
          <div v-if="themeDirty" class="theme-bar">
            <span class="faint">未保存 · 右侧预览已按 {{ pendingTheme }} 显示</span>
            <button type="button" class="btn sm" :disabled="savingTheme" @click="discardTheme">
              放弃
            </button>
            <button type="button" class="btn sm primary" :disabled="savingTheme" @click="saveTheme">
              {{ savingTheme ? '保存中…' : '保存草稿' }}
            </button>
          </div>
          <div v-else-if="undoTheme" class="theme-bar">
            <span class="faint">主色草稿已保存，待同步到线上</span>
            <button type="button" class="link" :disabled="savingTheme" @click="revertTheme">
              撤销，改回 {{ undoTheme }}
            </button>
          </div>
        </section>

        <section class="card">
          <div class="head" style="margin-bottom: 12px">
            <div>
              <h2 class="h2">品牌信息</h2>
              <div class="sub">小程序名、登录文案等；保存草稿后需「保存并同步」才更新线上</div>
            </div>
          </div>
          <div class="brand-fields">
            <label class="kv">
              <span>小程序名称</span>
              <input v-model="brandForm.appName" class="input" maxlength="20" />
            </label>
            <label class="kv">
              <span>登录副标题</span>
              <input v-model="brandForm.loginTagline" class="input" maxlength="40" />
            </label>
            <label class="kv">
              <span>品牌眉题（英文）</span>
              <input v-model="brandForm.brandEyebrow" class="input" maxlength="32" />
            </label>
          </div>
          <button type="button" class="btn sm primary" :disabled="savingBrand" style="margin-top:12px" @click="saveBrand">
            {{ savingBrand ? '保存中…' : '保存品牌信息' }}
          </button>
        </section>

      </div>

      <DevicePreview
        :hint="appearancePreviewHint"
        :preview-url="previewUrl"
        :preview-url-live="previewUrlLive"
        :iframe-key="previewKey"
        @scan="qrVisible = true"
      />
    </div>

    <MiniH5QrDialog
      v-model="qrVisible"
      mode="miniapp-draft"
      title="扫码在手机上看"
    />

    <el-drawer
      v-model="drawerVisible"
      class="mini-wb-overlay"
      :title="drawerIndex == null ? '编辑底部导航' : `编辑导航 ${drawerIndex + 1}`"
      size="400px"
      destroy-on-close
    >
      <el-form v-if="editTab" label-position="top" @submit.prevent>
        <el-form-item label="标题">
          <el-input v-model="editTab.text" maxlength="8" show-word-limit placeholder="例如：首页" />
        </el-form-item>
        <el-form-item label="图标">
          <el-select
            :model-value="editTab.icon || editTab.iconPath || ''"
            filterable
            placeholder="选择导航图标"
            style="width: 100%"
            @change="(v: string) => { if (editTab) editTab = { ...editTab, icon: v, selectedIcon: v, iconPath: v, selectedIconPath: v } }"
          >
            <el-option
              v-for="ic in NAV_FLAT_ICONS"
              :key="ic.id"
              :label="ic.label"
              :value="ic.src"
            >
              <span style="display:inline-flex;align-items:center;gap:8px">
                <img :src="ic.src" alt="" width="18" height="18" style="object-fit:contain" />
                {{ ic.label }}
              </span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="绑定页面">
          <el-select
            v-model="editPageId"
            filterable
            clearable
            placeholder="选择系统页或装修页"
            style="width: 100%"
            @change="onBindPage"
          >
            <el-option-group v-if="systemPageOptions.length" label="系统页（小程序内置，不可装修）">
              <el-option
                v-for="s in systemPageOptions"
                :key="s.path"
                :label="`${s.name}（${s.path}）`"
                :value="`${SYSTEM_VALUE_PREFIX}${s.path}`"
              />
            </el-option-group>
            <el-option-group label="装修页">
              <el-option
                v-for="p in bindablePages"
                :key="String(p.id)"
                :label="`${p.name}（${p.path}）`"
                :value="Number(p.id)"
              />
            </el-option-group>
          </el-select>
          <p class="faint" style="margin:6px 0 0;font-size:12px;line-height:1.5">
            系统页由小程序内置模板渲染，后台只能改文案与开关；装修页可在装修器里自由编排。
          </p>
        </el-form-item>
        <el-form-item v-if="editTab.pagePath" label="路径">
          <el-input :model-value="editTab.pagePath" disabled />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="drawerVisible = false">取消</el-button>
        <el-button type="primary" class="mw-btn-primary" :loading="savingTabs" @click="saveTabEdit">
          保存
        </el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import draggable from 'vuedraggable'
import MiniIcon from '@/components/mini/MiniIcon.vue'
import MiniSkeleton from '@/components/mini/MiniSkeleton.vue'
import MiniH5QrDialog from '@/components/mini/MiniH5QrDialog.vue'
import MiniOpsConceptBanner from '@/components/mini/MiniOpsConceptBanner.vue'
import DevicePreview from '@/components/mini/DevicePreview.vue'
import { createEmptyTab, normalizeTabBarItems } from '@/utils/tabbar'
import type { NavTab } from '@/types/miniapp'
import {
  getMiniSite,
  getPendingChanges,
  updateMiniSite,
  type MiniSiteVO,
  type MiniTabBarItem,
  type PendingChangeItem,
} from '@/api/miniSite'
import { getPageList } from '@/api/page'
import { getLatestRelease } from '@/api/version'
import { getConfigByGroupSilent } from '@/api/system'
import { resolvePageStatus } from '@/utils/pageStatus'
import { refreshMiniPending } from '@/composables/useMiniPending'
import { useMiniConfigSync } from '@/composables/useMiniConfigSync'
import { NAV_FLAT_ICONS } from '@/components/page-builder/navIconSet'
import type { PageRecord as PageRow } from '@/types/page'
import { DEFAULT_MINIAPP_BRAND_CONFIG, type MiniappBrandConfig } from '@/types/miniapp'
import { normalizeBrandConfig } from '@/utils/brand-config'

defineOptions({ name: 'MiniAppearance' })

const THEMES = ['#B4430F', '#A93D0C', '#2458A6', '#1F7A4D', '#8F5400', '#9B2C5A', '#3A2E26'] as const

const router = useRouter()
const { syncing, syncToLive } = useMiniConfigSync()
const loading = ref(false)
/** 首屏用骨架屏，之后的刷新才用遮罩，避免每次操作都闪灰屏 */
const loaded = ref(false)
const savingTabs = ref(false)
const savingTheme = ref(false)
const savingBrand = ref(false)
const brandForm = ref<MiniappBrandConfig>({ ...DEFAULT_MINIAPP_BRAND_CONFIG })
const site = ref<MiniSiteVO>({})
const pending = ref<PendingChangeItem[]>([])
const qrVisible = ref(false)
const previewFocusPath = ref('')
const previewRevision = ref(0)
const pageOptions = ref<PageRow[]>([])
const wechatVerFallback = ref('')
const mpMenuConfigured = ref(false)

const drawerVisible = ref(false)
const drawerIndex = ref<number | null>(null)
const editTab = ref<MiniTabBarItem | null>(null)
/** 绑定选择器的值：数字=装修页 id；`sys:<path>`=系统页；null=未绑定 */
const editPageId = ref<number | string | null>(null)

/**
 * 系统页（小程序内置原生页，不走装修 DSL）。
 * Tab 壳是固定的五个，绑定只在自己那个壳里生效，
 * 所以这里按 `tabRoute` 过滤，不展示跨壳的无效组合。
 */
const SYSTEM_PAGES: { route: string; path: string; name: string }[] = [
  // 只有「我的」保留内置模板（承载登录/订单/优惠券等系统能力）。
  // 星球与商城的原生壳已于 2026-09-26 移除，统一由装修 DSL 渲染——
  // 同一个 Tab 保留两条渲染路径，正是「后台搭了不生效」那一类问题的来源。
  { route: '/pages/mine/mine', path: 'pages/mine/mine', name: '个人中心（我的）' },
]
const SYSTEM_VALUE_PREFIX = 'sys:'

function resolveTabShellRoute(tab?: MiniTabBarItem | null) {
  const raw = String(tab?.tabRoute || '').trim()
  if (raw) return raw.startsWith('/') ? raw : `/${raw}`
  const path = String(tab?.pagePath || '')
  const text = String(tab?.text || '')
  if (/mine/.test(path) || text === '我的') return '/pages/mine/mine'
  if (/planet/.test(path) || text === '星球') return '/pages/planet/planet'
  if (/shop|mall/.test(path) || text === '商城') return '/pages/shop/shop'
  if (/discover/.test(path) || text === '发现') return '/pages/discover/discover'
  return '/pages/index/index'
}

/** 当前 Tab 可选的系统页（最多一个，取决于它落在哪个壳） */
const systemPageOptions = computed(() =>
  SYSTEM_PAGES.filter((s) => s.route === resolveTabShellRoute(editTab.value)),
)


function systemPageByPath(path?: string | null) {
  const p = String(path || '').replace(/^\//, '')
  return SYSTEM_PAGES.find((s) => s.path === p) || null
}

/** 已选但未保存的主色；空串表示与草稿一致 */
const pendingTheme = ref('')
/** 保存成功后可一键改回的上一个主色 */
const undoTheme = ref('')

type SortableTab = MiniTabBarItem & { __key: string }
const sortableTabBar = ref<SortableTab[]>([])

const templateLabel = computed(() => site.value.templateName || '自定义模板')
const tabBar = computed(() => site.value.tabBar || [])
const pendingPreview = computed(() => pending.value.slice(0, 5))
const pendingCountText = computed(() => {
  const n = Number(site.value.pendingCount ?? pending.value.length ?? 0)
  return n > 0 ? `${n} 项` : '0 项'
})
const wechatCodeLabel = computed(
  () => site.value.wechatCodeVersion || wechatVerFallback.value || '—',
)
const homeTabText = computed(() => (site.value.tabBar || [])[0]?.text || '首页')
const boundPageCount = computed(
  () => (site.value.tabBar || []).filter((t) => t.pageId || t.pagePath).length,
)
const qrCodeLabel = computed(() =>
  boundPageCount.value > 0 ? `${boundPageCount.value} 个页面已生成` : '去生成',
)

const currentTheme = computed(() => {
  const t = site.value.theme || {}
  const c = String((t as any).primaryColor || (t as any).theme || (t as any).color || '').toUpperCase()
  return THEMES.find((x) => x.toUpperCase() === c) || ''
})

/** 色板选中环跟着"正在看的颜色"走，而不是已落库的颜色 */
const shownTheme = computed(() => pendingTheme.value || currentTheme.value)
const themeDirty = computed(() => !!pendingTheme.value && pendingTheme.value !== currentTheme.value)

const bindablePages = computed(() =>
  pageOptions.value.filter((p) => {
    const st = resolvePageStatus(p as any)
    return st === 'live' || st === 'pending' || st === 'draft'
  }),
)

function normalizePreviewPath(path?: string | null) {
  return String(path || '').replace(/^\//, '').trim()
}

function buildAppearancePreview(source: 'draft' | 'live') {
  const query: Record<string, string> = { view: 'config', source, embed: '1' }
  if (source === 'draft' && themeDirty.value) query.primary = pendingTheme.value
  const tabs = site.value.tabBar || []
  const screen = previewFocusPath.value || normalizePreviewPath(tabs[0]?.pagePath)
  if (screen) query.screen = screen
  return router.resolve({ path: '/h5/miniapp-preview', query }).href
}

const previewUrl = computed(() => buildAppearancePreview('draft'))
const previewUrlLive = computed(() => buildAppearancePreview('live'))

const previewKey = computed(() => `draft-${previewRevision.value}`)

const appearancePreviewHint = computed(() => {
  if (themeDirty.value) {
    return '预览含未保存的主色 · 保存草稿后再同步'
  }
  const n = Number(site.value.pendingCount ?? pending.value.length ?? 0)
  if (n > 0) {
    return `有 ${n} 项草稿待同步 · 可切换草稿/线上预览`
  }
  return '可切换草稿/线上预览；点底部导航可切换页面'
})

async function handleSyncAll() {
  const ok = await syncToLive({ includeSite: true })
  if (ok) await load()
}

function focusPreviewOnTab(tab?: MiniTabBarItem | null) {
  const path = normalizePreviewPath(tab?.pagePath)
  if (path) previewFocusPath.value = path
}

function bumpPreviewRevision() {
  previewRevision.value += 1
}

function onTabCardClick(index: number) {
  const tab = sortableTabBar.value[index] || tabBar.value[index]
  focusPreviewOnTab(tab)
  openTabDrawer(index)
}

function syncSortableFromSite() {
  sortableTabBar.value = (site.value.tabBar || []).map((t, i) => ({
    ...t,
    __key: `${t.pageId || t.pagePath || t.text || 'tab'}-${i}`,
  }))
}

watch(tabBar, () => syncSortableFromSite(), { deep: true })

function formatShort(t?: string | null) {
  if (!t) return ''
  const s = String(t).replace('T', ' ')
  return s.length >= 16 ? s.slice(5, 16) : s.slice(0, 16)
}

function pendingTime(item: PendingChangeItem) {
  const raw = (item as any).updatedAt || (item as any).updateTime || (item as any).createdAt
  if (!raw) return ''
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return ''
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  return formatShort(String(raw))
}

function isMineTab(tab: MiniTabBarItem) {
  const path = String(tab.pagePath || '')
  const name = String(tab.text || '')
  return path.includes('mine/mine') || name === '我的' || /pkg-user|\/mine/.test(path)
}

function isTabUnbound(tab: MiniTabBarItem) {
  return !(tab.pageId || tab.pagePath)
}

function findBoundPage(tab: MiniTabBarItem) {
  return pageOptions.value.find((p) => {
    if (tab.pageId != null && tab.pageId !== '' && Number(p.id) === Number(tab.pageId)) return true
    const path = String(p.path || '').replace(/^\//, '')
    return path && path === String(tab.pagePath || '').replace(/^\//, '')
  })
}

function shortPath(path: string) {
  const clean = String(path || '').replace(/^\//, '')
  if (!clean) return ''
  const parts = clean.split('/').filter(Boolean)
  if (parts.length <= 2) return clean
  return `…/${parts.slice(-2).join('/')}`
}

function tabBindLabel(tab: MiniTabBarItem) {
  if (isMineTab(tab)) return '系统页 · 个人中心'
  const hit = findBoundPage(tab)
  const name = String(hit?.name || tab.pageName || '').trim()
  if (name) return name.length > 10 ? `${name.slice(0, 10)}…` : name
  const path = String(tab.pagePath || hit?.path || '').trim()
  if (path) return shortPath(path)
  return '未绑定'
}

function tabStatus(tab: MiniTabBarItem): { key: string; label: string } {
  if (isTabUnbound(tab)) return { key: 'empty', label: '未绑定' }
  const hit = findBoundPage(tab)
  if (!hit) return { key: 'live', label: '已上线' }
  const st = resolvePageStatus(hit as any)
  if (st === 'pending' || st === 'draft') return { key: 'dirty', label: '有改动' }
  if (st === 'offline') return { key: 'empty', label: '已下架' }
  return { key: 'live', label: '已上线' }
}

function tabStatusTagClass(tab: MiniTabBarItem) {
  const st = tabStatus(tab)
  if (st.key === 'empty') return 't-err'
  if (st.key === 'dirty') return 't-pending'
  return 't-live'
}

function changeKindLabel(item: PendingChangeItem) {
  if (item.type === 'site') return '修改'
  const st = String(item.status || '')
  if (st === 'draft' || /尚未|新增|新建/.test(String(item.summary || ''))) return '新增'
  return '修改'
}

function openLivePreview() {
  qrVisible.value = true
}

/** 选色只改预览，不落库——主色影响面大，必须先看到再决定 */
function pickTheme(color: string) {
  if (savingTheme.value) return
  pendingTheme.value = color === currentTheme.value ? '' : color
  bumpPreviewRevision()
}

function discardTheme() {
  pendingTheme.value = ''
}

async function saveBrand() {
  if (savingBrand.value) return
  savingBrand.value = true
  try {
    const payload = normalizeBrandConfig(brandForm.value)
    const updated = await updateMiniSite({
      brandConfig: payload as unknown as Record<string, unknown>,
    })
    site.value = { ...site.value, ...updated, brand: payload as unknown as Record<string, unknown> }
    brandForm.value = payload
    ElMessage.success('品牌信息已保存草稿')
    void refreshMiniPending(true)
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    savingBrand.value = false
  }
}

async function writeTheme(color: string) {
  const prev = (site.value.theme && typeof site.value.theme === 'object') ? { ...site.value.theme } : {}
  const theme = {
    ...prev,
    primaryColor: color,
    tabBarActiveColor: color,
    secondaryColor: (prev as { secondaryColor?: string }).secondaryColor || color,
  }
  const prevMine =
    site.value.minePageConfig && typeof site.value.minePageConfig === 'object'
      ? { ...site.value.minePageConfig }
      : {}
  const brandRaw =
    site.value.brand && typeof site.value.brand === 'object' ? { ...site.value.brand } : {}
  const updated = await updateMiniSite({
    theme,
    minePageConfig: {
      ...prevMine,
      themeColor: color,
      themeColorSecondary: (prevMine as { themeColorSecondary?: string }).themeColorSecondary || color,
      templateStyle: 'warm',
    },
    brandConfig: {
      ...brandRaw,
      loginStyleKey: 'warm',
    },
  })
  site.value = { ...site.value, ...updated, theme: updated.theme || theme }
  void refreshMiniPending(true)
}

async function saveTheme() {
  const color = pendingTheme.value
  if (!color || savingTheme.value) return
  const before = currentTheme.value
  savingTheme.value = true
  try {
    await writeTheme(color)
    pendingTheme.value = ''
    ElMessage({
      type: 'success',
      duration: 6000,
      showClose: true,
      dangerouslyUseHTMLString: false,
      message: `品牌主色已保存草稿（${color}），记得点「保存并同步」`,
    })
    undoTheme.value = before || ''
    window.setTimeout(() => { undoTheme.value = '' }, 15000)
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '保存配色失败')
  } finally {
    savingTheme.value = false
  }
}

async function revertTheme() {
  const color = undoTheme.value
  if (!color) return
  savingTheme.value = true
  try {
    await writeTheme(color)
    undoTheme.value = ''
    ElMessage.success('已撤销，主色恢复为 ' + color)
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '撤销失败')
  } finally {
    savingTheme.value = false
  }
}

async function onTabDragEnd() {
  const next = sortableTabBar.value.map(({ __key: _k, ...rest }) => rest)
  await persistTabBar(next, '导航顺序已保存')
}

function openTabDrawer(index?: number) {
  const list = [...(site.value.tabBar || [])]
  if (index == null) {
    drawerIndex.value = 0
    if (!list.length) {
      editTab.value = { text: '首页', pagePath: '' }
      editPageId.value = null
      drawerVisible.value = true
      return
    }
  } else {
    drawerIndex.value = index
  }
  const idx = drawerIndex.value ?? 0
  const current = list[idx] || { text: '', pagePath: '' }
  editTab.value = { ...current }
  if (current.pageId != null && current.pageId !== '') {
    editPageId.value = Number(current.pageId)
  } else {
    const sys = systemPageByPath(current.pagePath)
    editPageId.value = sys ? `${SYSTEM_VALUE_PREFIX}${sys.path}` : null
  }
  drawerVisible.value = true
}

function addTabSlot() {
  const list = [...(site.value.tabBar || [])]
  if (list.length >= 5) {
    ElMessage.warning('底部导航最多 5 个')
    return
  }
  list.push(createEmptyTab(list as NavTab[]))
  site.value = { ...site.value, tabBar: list }
  syncSortableFromSite()
  openTabDrawer(list.length - 1)
}

function onBindPage(id: number | string | null) {
  if (!editTab.value) return
  if (id == null || id === '') {
    editTab.value = { ...editTab.value, pageId: undefined, pagePath: '', pageName: '' }
    return
  }
  // 系统页：只写路径，不写 pageId——有 pageId 就会被当成装修页去拉 DSL
  if (typeof id === 'string' && id.startsWith(SYSTEM_VALUE_PREFIX)) {
    const sys = systemPageByPath(id.slice(SYSTEM_VALUE_PREFIX.length))
    if (!sys) return
    editTab.value = {
      ...editTab.value,
      pageId: '',
      pagePath: sys.path,
      pageName: '',
    }
    return
  }
  const hit = pageOptions.value.find((p) => Number(p.id) === Number(id))
  if (!hit) return
  editTab.value = {
    ...editTab.value,
    pageId: hit.id,
    pagePath: String(hit.path || '').replace(/^\//, ''),
    pageName: hit.name,
  }
}

async function persistTabBar(next: MiniTabBarItem[], successMsg = '导航已保存') {
  savingTabs.value = true
  try {
    // 「我的」未绑定装修页时，路径回落到系统页，避免残留旧路径（如 pages/custom/warm-mine）
    // 被当成装修页去拉 DSL。显式绑定了装修页则尊重选择，不做干预。
    const normalized = normalizeTabBarItems(next as NavTab[]).map((tab) => {
      const t = tab as MiniTabBarItem
      const bound = t.pageId != null && String(t.pageId) !== ''
      return isMineTab(t) && !bound
        ? { ...tab, pageId: '', pageName: '', pagePath: 'pages/mine/mine' }
        : tab
    })
    if (normalized.length < 2) {
      ElMessage.warning('底部导航至少保留 2 个入口')
      savingTabs.value = false
      return
    }
    const updated = await updateMiniSite({ tabBar: normalized })
    site.value = { ...site.value, ...updated, tabBar: updated.tabBar || next }
    syncSortableFromSite()
    bumpPreviewRevision()
    ElMessage.success(successMsg)
    await load()
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '保存导航失败')
  } finally {
    savingTabs.value = false
  }
}

async function saveTabEdit() {
  if (!editTab.value || drawerIndex.value == null) return
  // 系统页无需也不允许绑定装修页，跳过「请先绑定页面」校验
  if (!isMineTab(editTab.value) && isTabUnbound(editTab.value)) {
    ElMessage.warning('请先绑定页面')
    return
  }
  const next = [...(site.value.tabBar || [])]
  while (next.length <= drawerIndex.value) next.push({ text: '', pagePath: '' })
  next[drawerIndex.value] = {
    ...next[drawerIndex.value],
    text: editTab.value.text,
    pagePath: editTab.value.pagePath,
    pageId: editTab.value.pageId,
    pageName: editTab.value.pageName,
  }
  await persistTabBar(next)
  focusPreviewOnTab(editTab.value)
  drawerVisible.value = false
}

async function load() {
  loading.value = true
  try {
    const [s, p, pageRes, latestRes, cfgRes] = await Promise.all([
      getMiniSite('draft'),
      getPendingChanges(),
      getPageList({ current: 1, size: 100 }),
      getLatestRelease().catch(() => null),
      getConfigByGroupSilent('basic').catch(() => null),
    ])
    site.value = s
    if (!previewFocusPath.value) {
      focusPreviewOnTab((s.tabBar || [])[0])
    }
    bumpPreviewRevision()
    brandForm.value = normalizeBrandConfig(
      (s.brand && typeof s.brand === 'object' ? s.brand : null) as Partial<MiniappBrandConfig>,
    )
    pending.value = p.items || []
    syncSortableFromSite()
    const data = (pageRes as { data?: { records?: PageRow[]; list?: PageRow[] } })?.data
    pageOptions.value = (data?.records || data?.list || []) as PageRow[]
    const pendingTotal =
      (p as { pendingCount?: number; total?: number }).pendingCount
      ?? (p as { total?: number }).total
      ?? pending.value.length
    if (s.pendingCount == null) {
      site.value = { ...s, pendingCount: pendingTotal }
    }
    const latest = (latestRes as { data?: { semver?: string; version?: string } })?.data
    wechatVerFallback.value = String(latest?.semver || latest?.version || '')
    try {
      const configs = (cfgRes as any)?.data?.configs || (cfgRes as any)?.data || []
      const map = Array.isArray(configs)
        ? Object.fromEntries(configs.map((c: any) => [c.configKey || c.key, c.configValue ?? c.value]))
        : {}
      mpMenuConfigured.value = !!(
        map.mp_app_id
        || map.mpAppId
        || map.wechat_mp_appid
        || map.officialAccountAppId
        || map.mp_menu
        || map.mpMenu
      )
    } catch {
      mpMenuConfigured.value = false
    }
    void refreshMiniPending(true)
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '加载概览失败')
  } finally {
    loading.value = false
    loaded.value = true
  }
}

onMounted(load)
</script>

<style scoped lang="scss">
/* 对照 docs/prototypes/暖阁小程序搭建原型.html · vOverview */
.head-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}
.appearance-view.mw-page {
  max-width: none;
  margin: 0;
  padding: 24px 28px 48px;
  gap: 18px;
}

.ov {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 20px;
  align-items: start;
}

.ov-main {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
}

.ov-meta {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  align-items: center;
}

.tabs-edit-inner {
  display: contents;
}

.tabs-edit {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.tabcard-top {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.tab-drag {
  cursor: grab;
  user-select: none;
  display: inline-flex;
}

.list-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--line2);
  &:last-child { border-bottom: 0; }
}

.kv {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  padding: 6px 0;
}

.lower-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.pending-card {
  flex: 1.3;
  min-width: 280px;
}

.eco-card {
  flex: 1;
  min-width: 240px;
}

.brand-fields {
  display: flex;
  flex-direction: column;
  gap: 10px;

  label.kv {
    display: grid;
    grid-template-columns: 96px minmax(0, 1fr);
    align-items: center;
    justify-content: start;
    gap: 12px;
    padding: 4px 0;

    > span {
      width: 96px;
      white-space: nowrap;
      flex-shrink: 0;
      color: var(--mute);
      font-size: 13px;
    }

    .input {
      width: 100%;
      min-width: 0;
    }
  }
}

.theme-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--line2);
  flex-wrap: wrap;
  .btn, .link { margin-left: auto; }
  .btn + .btn, .btn + .link { margin-left: 0; }
}

.empty-mini {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 0;
  flex-wrap: wrap;
}

@media (max-width: 1100px) {
  .ov {
    grid-template-columns: minmax(0, 1fr);
  }
  .tabs-edit {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
