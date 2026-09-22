<template>
  <div class="mini-wb mw-page overview" v-loading="loading && loaded">
    <MiniSkeleton v-if="!loaded" kind="overview" />
    <div v-else class="ov">
      <div class="ov-main">
        <div class="head">
          <div>
            <h1 class="h1">
              {{ site.name || '小程序' }}
              <template v-if="site.slogan"> · {{ site.slogan }}</template>
            </h1>
            <div class="sub ov-meta">
              <span class="tag t-live">运营中</span>
              <span>整店模板：{{ templateLabel }}</span>
              <span v-if="site.liveReleaseNo != null">
                线上：第 {{ site.liveReleaseNo }} 次发布
                <template v-if="site.liveReleaseAt"> · {{ formatShort(site.liveReleaseAt) }}</template>
              </span>
              <span v-else>线上：尚未发布</span>
              <span>微信代码 {{ wechatCodeLabel }}</span>
            </div>
          </div>
          <div class="actions">
            <button
              type="button"
              class="btn"
              @click="router.push({ path: '/mini/templates', query: { tab: 'page' } })"
            >
              从模板新建
            </button>
            <button type="button" class="btn" :disabled="creatingBlank" @click="createBlank">
              空白页面
            </button>
            <button type="button" class="btn primary" @click="router.push('/mini/pages/new-ai')">
              AI 生成页面
            </button>
          </div>
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
                  @click="openTabDrawer(i)"
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
          <div v-if="themeDirty" class="theme-bar">
            <span class="faint">未保存 · 右侧预览已按 {{ pendingTheme }} 显示</span>
            <button type="button" class="btn sm" :disabled="savingTheme" @click="discardTheme">
              放弃
            </button>
            <button type="button" class="btn sm primary" :disabled="savingTheme" @click="saveTheme">
              {{ savingTheme ? '保存中…' : '保存为待发布' }}
            </button>
          </div>
          <div v-else-if="undoTheme" class="theme-bar">
            <span class="faint">已存为待发布，用户还看不到</span>
            <button type="button" class="link" :disabled="savingTheme" @click="revertTheme">
              撤销，改回 {{ undoTheme }}
            </button>
          </div>
        </section>

        <div class="row lower-row">
          <section class="card pending-card">
            <div class="head">
              <div>
                <h2 class="h2">待发布的改动</h2>
                <div class="sub">{{ pendingCountText }}，发布后用户刷新即可看到</div>
              </div>
              <div class="actions">
                <button type="button" class="link" @click="goPublish">去发布 ›</button>
              </div>
            </div>
            <div style="margin-top: 6px">
              <div v-if="pendingPreview.length">
                <div
                  v-for="item in pendingPreview"
                  :key="String(item.id || item.pageId || item.name)"
                  class="list-row"
                >
                  <span :class="['tag', changeKindLabel(item) === '新增' ? 't-new' : 't-pending']">
                    {{ changeKindLabel(item) }}
                  </span>
                  <b style="font-weight: 500">{{ item.name || '未命名' }}</b>
                  <span class="faint" style="margin-left: auto; text-align: right">
                    {{ item.summary || pendingTime(item) }}
                  </span>
                </div>
              </div>
              <div v-else class="empty-mini">
                <span class="muted">没有待发布的改动，线上就是你现在看到的样子。</span>
                <button type="button" class="btn sm" @click="router.push('/mini/pages')">
                  去改页面
                </button>
              </div>
            </div>
          </section>

          <section class="card eco-card">
            <h2 class="h2">微信生态</h2>
            <div class="sub">小程序正式版与分发渠道</div>
            <div style="margin-top: 10px">
              <div class="kv">
                <span class="muted">正式版</span>
                <b style="font-weight: 500">代码 {{ wechatCodeLabel }} · 无需操作</b>
              </div>
              <div class="kv">
                <span class="muted">公众号菜单</span>
                <b style="font-weight: 500">
                  <template v-if="mpMenuConfigured">已绑定 → {{ homeTabText }}</template>
                  <template v-else>去配置</template>
                </b>
              </div>
              <div class="kv">
                <span class="muted">小程序码</span>
                <b style="font-weight: 500">{{ qrCodeLabel }}</b>
              </div>
            </div>
            <button type="button" class="link" style="font-size: 13px; margin-top: 8px" @click="goPublish">
              管理分发 ›
            </button>
          </section>
        </div>
      </div>

      <aside class="preview" :class="{ 'is-collapsed': !previewOpen }">
        <div class="preview-head">
          <b>真机预览</b>
          <button
            type="button"
            class="link"
            style="font-size: 12px"
            @click="previewOpen = !previewOpen"
          >
            {{ previewOpen ? '收起' : '展开' }}
          </button>
        </div>
        <template v-if="previewOpen">
          <div class="seg" role="group" aria-label="预览版本">
            <button type="button" :class="{ on: previewSource === 'draft' }" @click="previewSource = 'draft'">
              改动后
            </button>
            <button type="button" :class="{ on: previewSource === 'live' }" @click="previewSource = 'live'">
              线上
            </button>
          </div>
          <div class="phone" :class="previewZoom === 'lg' ? 'ph-lg' : 'ph-sm'">
            <iframe :key="previewKey" :src="previewUrl" title="小程序预览" loading="lazy" />
          </div>
          <div class="preview-foot">
            <div class="seg" role="group" aria-label="预览尺寸">
              <button type="button" :class="{ on: previewZoom === 'fit' }" @click="previewZoom = 'fit'">
                适中
              </button>
              <button type="button" :class="{ on: previewZoom === 'lg' }" @click="previewZoom = 'lg'">
                放大
              </button>
            </div>
            <button type="button" class="btn sm" @click="openLivePreview">
              <MiniIcon name="qr" :size="15" />
              扫码
            </button>
          </div>
        </template>
        <p v-else class="faint preview-hint">收起后主栏更宽，需要时再展开对照</p>
      </aside>
    </div>

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
        <el-form-item label="绑定页面">
          <el-select
            v-model="editPageId"
            filterable
            clearable
            placeholder="选择页面（不含归档）"
            style="width: 100%"
            @change="onBindPage"
          >
            <el-option
              v-for="p in bindablePages"
              :key="String(p.id)"
              :label="`${p.name}（${p.path}）`"
              :value="Number(p.id)"
            />
          </el-select>
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
import {
  getMiniSite,
  getPendingChanges,
  updateMiniSite,
  type MiniSiteVO,
  type MiniTabBarItem,
  type PendingChangeItem,
} from '@/api/miniSite'
import { createPage, getPageList } from '@/api/page'
import { getLatestRelease } from '@/api/version'
import { getConfigByGroupSilent } from '@/api/system'
import { resolvePageStatus } from '@/utils/pageStatus'
import { refreshMiniPending } from '@/composables/useMiniPending'
import type { PageRecord as PageRow } from '@/types/page'

defineOptions({ name: 'MiniOverview' })

const THEMES = ['#B4430F', '#A93D0C', '#2458A6', '#1F7A4D', '#8F5400', '#9B2C5A', '#3A2E26'] as const

const router = useRouter()
const loading = ref(false)
/** 首屏用骨架屏，之后的刷新才用遮罩，避免每次操作都闪灰屏 */
const loaded = ref(false)
const savingTabs = ref(false)
const savingTheme = ref(false)
const creatingBlank = ref(false)
const site = ref<MiniSiteVO>({})
const pending = ref<PendingChangeItem[]>([])
const previewSource = ref<'draft' | 'live'>('draft')
const pageOptions = ref<PageRow[]>([])
const wechatVerFallback = ref('')
const mpMenuConfigured = ref(false)

const drawerVisible = ref(false)
const drawerIndex = ref<number | null>(null)
const editTab = ref<MiniTabBarItem | null>(null)
const editPageId = ref<number | null>(null)

/** 已选但未保存的主色；空串表示与草稿一致 */
const pendingTheme = ref('')
/** 保存成功后可一键改回的上一个主色 */
const undoTheme = ref('')
const previewZoom = ref<'fit' | 'lg'>('fit')
/** 默认展开但用小尺寸；可收起把主栏让出来 */
const previewOpen = ref(true)

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

const previewUrl = computed(() => {
  const source = previewSource.value === 'live' ? 'live' : 'draft'
  const query: Record<string, string> = { view: 'config', source, embed: '1' }
  // 未保存的主色也要能在真机预览里看到
  if (themeDirty.value && previewSource.value === 'draft') query.primary = pendingTheme.value
  const { href } = router.resolve({ path: '/h5/miniapp-preview', query })
  return href
})

const previewKey = computed(
  () => `${previewSource.value}|${themeDirty.value ? pendingTheme.value : ''}`,
)

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

function goPublish() {
  router.push('/mini/publish')
}

function openLivePreview() {
  const source = previewSource.value === 'live' ? 'live' : 'draft'
  const { href } = router.resolve({ path: '/h5/miniapp-preview', query: { view: 'config', source } })
  window.open(href, '_blank', 'noopener,noreferrer')
}

/** 选色只改预览，不落库——主色影响面大，必须先看到再决定 */
function pickTheme(color: string) {
  if (savingTheme.value) return
  pendingTheme.value = color === currentTheme.value ? '' : color
}

function discardTheme() {
  pendingTheme.value = ''
}

async function writeTheme(color: string) {
  const prev = (site.value.theme && typeof site.value.theme === 'object') ? { ...site.value.theme } : {}
  const theme = { ...prev, primaryColor: color }
  const updated = await updateMiniSite({ theme })
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
      message: `品牌主色已存为待发布（${color}）`,
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
  editPageId.value = current.pageId != null && current.pageId !== '' ? Number(current.pageId) : null
  drawerVisible.value = true
}

function addTabSlot() {
  const list = [...(site.value.tabBar || [])]
  if (list.length >= 5) {
    ElMessage.warning('底部导航最多 5 个')
    return
  }
  list.push({ text: `导航 ${list.length + 1}`, pagePath: '' })
  site.value = { ...site.value, tabBar: list }
  syncSortableFromSite()
  openTabDrawer(list.length - 1)
}

function onBindPage(id: number | null) {
  if (!editTab.value) return
  if (id == null) {
    editTab.value = { ...editTab.value, pageId: undefined, pagePath: '', pageName: '' }
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
    const updated = await updateMiniSite({ tabBar: next })
    site.value = { ...site.value, ...updated, tabBar: updated.tabBar || next }
    syncSortableFromSite()
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
  if (isTabUnbound(editTab.value)) {
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
  drawerVisible.value = false
}

async function createBlank() {
  creatingBlank.value = true
  const suffix = Date.now().toString(36).slice(-5)
  try {
    const res = await createPage({
      name: `未命名页面-${suffix}`,
      type: 3,
      path: `pages/custom/p-${suffix}`,
    })
    const id = Number((res as { data?: { id?: number } })?.data?.id || 0)
    if (!id) throw new Error('未返回页面 id')
    ElMessage.success('已创建')
    router.push(`/mini/pages/${id}/editor`)
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '创建失败')
  } finally {
    creatingBlank.value = false
  }
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
.ov {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 28px;
  align-items: start;
}

/* 概览带右侧预览，略放宽内容壳，避免主栏被压得太窄 */
.overview.mw-page {
  max-width: 1280px;
}

.ov-main {
  display: flex;
  flex-direction: column;
  gap: 28px;
  min-width: 0;
}

.ov-meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.tabs-edit-inner {
  display: contents;
}

.tabs-edit {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
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
  padding: 12px 0;
  border-bottom: 1px solid var(--line2);
  &:last-child { border-bottom: 0; }
}

.kv {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  padding: 8px 0;
}

.lower-row {
  display: flex;
  gap: 20px;
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

.preview {
  position: sticky;
  top: 84px;
  width: 248px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;

  &.is-collapsed {
    width: 160px;
    align-items: stretch;
  }
}

.preview-head {
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;
}

.preview-hint {
  margin: 0;
  line-height: 1.5;
}

.preview-foot {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.phone {
  &.ph-sm { width: 210px; height: 430px; }
  &.ph-lg { width: 280px; height: 580px; }

  iframe {
    width: 100%;
    height: 100%;
    border: 0;
    background: #fffbf6;
    display: block;
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

@media (max-width: 1180px) {
  .ov {
    grid-template-columns: minmax(0, 1fr);
  }
  .preview {
    position: static;
    width: auto;
    max-width: 280px;
  }
  .tabs-edit {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
