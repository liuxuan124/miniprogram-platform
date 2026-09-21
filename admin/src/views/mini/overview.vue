<template>
  <div class="mini-wb mw-page overview" v-loading="loading">
    <div class="ov">
      <div class="ov-main">
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

        <div class="ways">
          <button type="button" class="way hi" @click="router.push('/mini/pages/new-ai')">
            <span class="way-ic" aria-hidden="true">✦</span>
            <span>
              <b>AI 生成页面</b>
              <span class="muted" style="font-size: 12.5px">说出需求，AI 出 3 套方案，再手动微调</span>
            </span>
          </button>
          <button
            type="button"
            class="way"
            @click="router.push({ path: '/mini/templates', query: { tab: 'page' } })"
          >
            <span class="way-ic" aria-hidden="true">▦</span>
            <span>
              <b>从模板新建</b>
              <span class="muted" style="font-size: 12.5px">按行业场景挑页面模板或整店模板</span>
            </span>
          </button>
          <button type="button" class="way" :disabled="creatingBlank" @click="createBlank">
            <span class="way-ic" aria-hidden="true">+</span>
            <span>
              <b>空白页面</b>
              <span class="muted" style="font-size: 12.5px">从组件开始自由搭建</span>
            </span>
          </button>
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
                    <span class="tab-drag" title="拖拽排序" @click.stop aria-hidden="true">⋮⋮</span>
                  </span>
                  <span class="t">
                    {{ tab.text || `导航 ${i + 1}` }}
                    <span v-if="isMineTab(tab)" class="faint" title="固定">🔒</span>
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
              <span style="font-size: 18px; line-height: 1">+</span>
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
              :class="{ on: currentTheme === c }"
              :style="{ background: c }"
              :aria-label="`主色 ${c}`"
              :disabled="savingTheme"
              @click="selectTheme(c)"
            />
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
              <div v-else class="muted" style="padding: 14px 0">
                没有待发布的改动，线上就是你现在看到的样子。
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

      <aside class="preview">
        <div class="preview-head">
          <b>真机预览</b>
          <div class="seg" role="group" aria-label="预览版本">
            <button type="button" :class="{ on: previewSource === 'draft' }" @click="previewSource = 'draft'">
              改动后
            </button>
            <button type="button" :class="{ on: previewSource === 'live' }" @click="previewSource = 'live'">
              线上
            </button>
          </div>
        </div>
        <div class="phone">
          <iframe :key="previewSource" :src="previewUrl" title="小程序预览" loading="lazy" />
        </div>
        <button type="button" class="btn sm" @click="openLivePreview">扫码在手机上看</button>
      </aside>
    </div>

    <el-drawer
      v-model="drawerVisible"
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

const bindablePages = computed(() =>
  pageOptions.value.filter((p) => {
    const st = resolvePageStatus(p as any)
    return st === 'live' || st === 'pending' || st === 'draft'
  }),
)

const previewUrl = computed(() => {
  const source = previewSource.value === 'live' ? 'live' : 'draft'
  const { href } = router.resolve({
    path: '/h5/miniapp-preview',
    query: { view: 'config', source, embed: '1' },
  })
  return href
})

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

async function selectTheme(color: string) {
  if (currentTheme.value === color || savingTheme.value) return
  savingTheme.value = true
  try {
    const prev = (site.value.theme && typeof site.value.theme === 'object') ? { ...site.value.theme } : {}
    const theme = { ...prev, primaryColor: color }
    const updated = await updateMiniSite({ theme })
    site.value = { ...site.value, ...updated, theme: updated.theme || theme }
    ElMessage.success('品牌主色已保存为草稿')
    void refreshMiniPending(true)
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '保存配色失败')
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
  }
}

onMounted(load)
</script>

<style scoped lang="scss">
.overview.mw-page {
  margin: -16px;
}

.ov {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
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

.way-ic {
  flex-shrink: 0;
  width: 20px;
  text-align: center;
  font-size: 16px;
  line-height: 1.2;
  margin-top: 2px;
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
  letter-spacing: -2px;
  user-select: none;
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

.preview {
  position: sticky;
  top: 84px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.preview-head {
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;
}

.phone {
  iframe {
    width: 100%;
    height: 100%;
    border: 0;
    background: #fffbf6;
  }
}

@media (max-width: 1180px) {
  .ov {
    grid-template-columns: minmax(0, 1fr);
  }
  .preview {
    position: static;
  }
  .tabs-edit {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
