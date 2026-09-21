<template>
  <div class="mini-wb mw-page templates" v-loading="loading">
    <header class="mw-head">
      <div>
        <h1 class="mw-title">模板库</h1>
        <p class="mw-sub">整店模板换整套风格；页面模板只新建一页</p>
      </div>
      <div class="mw-actions">
        <el-button :loading="creating" @click="createFromCurrent">把当前小程序存为模板</el-button>
      </div>
    </header>

    <div class="tab-bar">
      <div class="tabs">
        <button
          v-for="t in tabDefs"
          :key="t.key"
          type="button"
          class="tab"
          :class="{ active: tab === t.key }"
          @click="tab = t.key"
        >
          {{ t.label }} {{ t.count }}
        </button>
      </div>
      <div class="capsules">
        <button
          v-for="s in scenes"
          :key="s"
          type="button"
          class="mw-capsule"
          :class="{ active: scene === s }"
          @click="scene = s"
        >
          {{ s === '全部' ? '全部场景' : s }}
        </button>
      </div>
    </div>

    <section v-show="tab === 'store'">
      <div v-if="filteredStore.length" class="card-grid">
        <div
          v-for="item in filteredStore"
          :key="item.id"
          class="tpl-card"
          :class="{ live: isInUse(item) }"
        >
          <div class="tpl-thumb" :style="thumbStyle(item)">
            <div class="phone-stack">
              <MiniPhoneThumb
                v-for="(layer, li) in stackLayers(item)"
                :key="li"
                class="phone-stack__item"
                :class="`is-${li}`"
                size="sm"
                :title="layer"
                :accent="thumbAccent(item, li)"
                :layers="[layer, displayName(item), `${item.pageCount || 0}页`]"
              />
            </div>
            <span v-if="isInUse(item)" class="in-use">使用中</span>
          </div>
          <div class="tpl-body">
            <div class="tpl-name">{{ displayName(item) }}</div>
            <div class="tpl-meta">
              {{ sceneHint(item) }} · {{ item.pageCount || 0 }}页 · 含导航与配色
            </div>
            <div class="tpl-actions">
              <el-button size="small" @click="previewStore(item)">预览</el-button>
              <el-button
                v-if="!isInUse(item)"
                type="primary"
                size="small"
                class="mw-btn-primary"
                @click="confirmActivate(item)"
              >
                应用
              </el-button>
              <el-button v-else size="small" disabled>已应用</el-button>
            </div>
          </div>
        </div>
      </div>
      <el-empty v-else description="暂无整店模板" />
    </section>

    <section v-show="tab === 'page'">
      <div v-if="filteredPages.length" class="card-grid">
        <div v-for="tpl in filteredPages" :key="String(tpl.id || tpl.key)" class="tpl-card">
          <div class="tpl-thumb page-thumb">
            <div class="phone-stack phone-stack--single">
              <MiniPhoneThumb
                size="sm"
                :title="tpl.name"
                :accent="hashAccent(String(tpl.name || tpl.id || ''))"
                :layers="[tpl.name || '页面模板', String(tpl.description || tpl.notes || '单页').slice(0, 12)]"
              />
            </div>
          </div>
          <div class="tpl-body">
            <div class="tpl-name">{{ tpl.name }}</div>
            <div class="tpl-meta">{{ tpl.description || tpl.notes || '单页模板' }}</div>
            <div class="tpl-actions">
              <el-button size="small" type="primary" class="mw-btn-primary" @click="applyPageTpl(tpl)">
                套用为草稿
              </el-button>
            </div>
          </div>
        </div>
      </div>
      <el-empty v-else description="暂无页面模板" />
    </section>

    <section v-show="tab === 'mine'">
      <div v-if="filteredMine.length" class="card-grid">
        <div v-for="item in filteredMine" :key="item.id" class="tpl-card" :class="{ live: isInUse(item) }">
          <div class="tpl-thumb" :style="thumbStyle(item)">
            <div class="phone-stack">
              <MiniPhoneThumb
                v-for="(layer, li) in stackLayers(item)"
                :key="li"
                class="phone-stack__item"
                :class="`is-${li}`"
                size="sm"
                :title="layer"
                :accent="thumbAccent(item, li)"
                :layers="[layer, '我的模板']"
              />
            </div>
          </div>
          <div class="tpl-body">
            <div class="tpl-name">{{ displayName(item) }}</div>
            <div class="tpl-meta">我的模板 · {{ formatTime(item.updateTime || item.createTime) }}</div>
            <div class="tpl-actions">
              <el-button
                v-if="!isInUse(item)"
                size="small"
                type="primary"
                class="mw-btn-primary"
                @click="confirmActivate(item)"
              >
                应用
              </el-button>
            </div>
          </div>
        </div>
      </div>
      <el-empty v-else description="还没有我的模板，可先「把当前小程序存为模板」" />
    </section>

    <el-drawer v-model="impactVisible" :title="`应用「${pendingActivate?.name || ''}」`" size="420px">
      <ul class="impact-list">
        <li>
          <strong>底部导航</strong>
          将变成 {{ impactTabs.length || '—' }} 项
          <div v-if="impactTabs.length" class="impact-sub">
            {{ impactTabs.map((t) => t.text || t.pageName || '导航').join('、') }}
          </div>
        </li>
        <li>
          <strong>页面</strong>
          新增约 {{ Math.max(0, impactPageCount - currentPageCount) }} 个，替换约
          {{ Math.min(impactPageCount, currentPageCount) }} 个；旧页进归档可恢复
        </li>
        <li>
          <strong>配色</strong>
          {{ keepTheme ? '将尽量保留当前品牌配色' : '模板配色将覆盖当前主题（写入草稿）' }}
        </li>
        <li><strong>「我的」</strong> 个人中心不受影响</li>
      </ul>

      <div class="pending-note">
        套用后为<strong>待发布</strong>，用户看不到，需在发布页确认后才上线。
      </div>

      <el-checkbox v-model="keepTheme" style="margin-top: 14px">保留我的配色</el-checkbox>

      <template #footer>
        <el-button @click="impactVisible = false">取消</el-button>
        <el-button type="primary" class="mw-btn-primary" :loading="activatingId != null" @click="doActivate">
          确认应用
        </el-button>
      </template>
    </el-drawer>

    <el-dialog
      v-model="previewVisible"
      :title="`预览 · ${previewTitle}`"
      width="720px"
      destroy-on-close
      class="tpl-preview-dialog"
    >
      <div class="tpl-preview">
        <div class="tpl-preview__phones">
          <MiniPhoneThumb
            v-for="(layer, li) in previewLayers"
            :key="li"
            class="tpl-preview__phone"
            :class="`is-${li}`"
            size="lg"
            :title="layer"
            :accent="previewAccent"
            :layers="[layer, previewTitle, ...previewNavLabels.slice(0, 1)]"
          />
        </div>
        <div class="tpl-preview__nav">
          <div class="tpl-preview__nav-title">底部导航（来自模板快照）</div>
          <ul v-if="previewNavLabels.length">
            <li v-for="(label, i) in previewNavLabels" :key="i">
              <span class="idx">{{ i + 1 }}</span>
              {{ label }}
            </li>
          </ul>
          <p v-else class="muted">快照中未解析到 tabbar，套用后以实际导航为准</p>
        </div>
      </div>
      <template #footer>
        <el-button @click="previewVisible = false">关闭</el-button>
        <el-button
          v-if="previewRaw && !isInUse(previewRaw)"
          type="primary"
          class="mw-btn-primary"
          @click="previewVisible = false; confirmActivate(previewRaw!)"
        >
          应用此模板
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import MiniPhoneThumb from '@/components/mini/MiniPhoneThumb.vue'
import {
  getStoreTemplates,
  activateStoreTemplate,
  createStoreTemplate,
  toReleaseId,
} from '@/api/version'
import { getPageTemplates } from '@/api/page'
import { getMiniSite } from '@/api/miniSite'
import { applyPageTemplate } from '@/components/page-templates/applyPageTemplate'
import type { ReleaseRecord } from '@/types/page'

type PageTpl = {
  id?: number | string
  key?: string
  name?: string
  description?: string
  notes?: string
  dslContent?: string
  dsl?: unknown
}

defineOptions({ name: 'MiniTemplates' })

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const initialTab = route.query.tab === 'page' || route.query.tab === 'mine'
  ? (route.query.tab as 'page' | 'mine')
  : 'store'
const tab = ref<'store' | 'page' | 'mine'>(initialTab)
const storeTemplates = ref<ReleaseRecord[]>([])
const pageTemplates = ref<PageTpl[]>([])
const creating = ref(false)
const activatingId = ref<number | null>(null)
const impactVisible = ref(false)
const pendingActivate = ref<{ id: number; name: string; raw: ReleaseRecord } | null>(null)
const impactTabs = ref<Array<{ text?: string; pagePath?: string; pageName?: string }>>([])
const currentTabBar = ref<typeof impactTabs.value>([])
const impactPageCount = ref(0)
const currentPageCount = ref(0)
const keepTheme = ref(true)
const siteTemplateId = ref<number | null>(null)

const previewVisible = ref(false)
const previewTitle = ref('')
const previewLayers = ref<string[]>([])
const previewNavLabels = ref<string[]>([])
const previewAccent = ref('#b4430f')
const previewRaw = ref<ReleaseRecord | null>(null)

const scenes = ['全部', '知识付费', '电商零售', '本地门店', '活动营销'] as const
const scene = ref<(typeof scenes)[number]>('全部')

const ACCENTS = ['#b4430f', '#1d6bb8', '#1f7a4d', '#8f5400', '#6b4c9a', '#a33b5c']

function hashAccent(seed: string, offset = 0) {
  let h = offset
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return ACCENTS[h % ACCENTS.length]
}

function thumbAccent(item: ReleaseRecord, layer = 0) {
  return hashAccent(`${item.id}|${displayName(item)}|${item.pageCount || 0}`, layer * 17)
}

function parseSnapshot(item: ReleaseRecord) {
  const snap = item.snapshot || (item as ReleaseRecord & { configSnapshot?: string }).configSnapshot
  try {
    return typeof snap === 'string' ? JSON.parse(snap) : snap
  } catch {
    return null
  }
}

function stackLayers(item: ReleaseRecord): string[] {
  const cfg = parseSnapshot(item)
  const pages = Array.isArray(cfg?.pages) ? cfg.pages : []
  const names = pages
    .map((p: { name?: string; title?: string }) => p?.name || p?.title)
    .filter(Boolean)
    .slice(0, 3) as string[]
  if (names.length >= 3) return names
  const base = displayName(item)
  const fallback = [base, `${item.pageCount || names.length || 3}页`, sceneHint(item)]
  return [...names, ...fallback].slice(0, 3)
}

function extractNavLabels(item: ReleaseRecord): string[] {
  const cfg = parseSnapshot(item)
  const rawTabs = cfg?.tabbarItems || cfg?.systemConfig?.tabbarItems || cfg?.tabBar || cfg?.tabs || []
  if (!Array.isArray(rawTabs)) return []
  return rawTabs.map((t: { text?: string; pageName?: string; name?: string }) =>
    t.text || t.pageName || t.name || '导航',
  )
}

const myTemplates = computed(() =>
  storeTemplates.value.filter((r) => !(r as ReleaseRecord & { systemTemplate?: boolean }).isSystem
    && !(r as ReleaseRecord & { systemTemplate?: boolean }).systemTemplate),
)

const tabDefs = computed(() => [
  { key: 'store' as const, label: '整店模板', count: storeTemplates.value.length },
  { key: 'page' as const, label: '页面模板', count: pageTemplates.value.length },
  { key: 'mine' as const, label: '我的模板', count: myTemplates.value.length },
])

function matchScene(text: string) {
  if (scene.value === '全部') return true
  return text.includes(scene.value)
}

function haystack(item: ReleaseRecord) {
  const extra = item as ReleaseRecord & { notes?: string; category?: string }
  return `${displayName(item)} ${item.releaseNotes || ''} ${extra.notes || ''} ${extra.category || ''} ${item.templateCode || ''}`
}

const filteredStore = computed(() =>
  storeTemplates.value.filter((item) => matchScene(haystack(item))),
)

const filteredMine = computed(() =>
  myTemplates.value.filter((item) => matchScene(haystack(item))),
)

const filteredPages = computed(() =>
  pageTemplates.value.filter((tpl) => {
    const text = `${tpl.name || ''} ${tpl.description || ''} ${tpl.notes || ''}`
    return matchScene(text)
  }),
)

watch(tab, (v) => {
  router.replace({ query: { ...route.query, tab: v === 'store' ? undefined : v } })
})

function isInUse(item: ReleaseRecord) {
  if (siteTemplateId.value != null && Number(item.id) === Number(siteTemplateId.value)) return true
  return item.isCurrent === 1 || item.isCurrent === true
}

function displayName(item: ReleaseRecord) {
  return item.templateName || item.releaseNotes || `模板 #${item.id}`
}

function formatTime(t?: string) {
  return t ? String(t).replace('T', ' ').slice(0, 16) : '—'
}

function sceneHint(item: ReleaseRecord) {
  const h = haystack(item)
  for (const s of scenes) {
    if (s !== '全部' && h.includes(s)) return s
  }
  if (/知识|付费|社群/.test(h)) return '知识付费'
  if (/电商|零售|商城/.test(h)) return '电商零售'
  if (/门店|本地|到店/.test(h)) return '本地门店'
  if (/活动|营销/.test(h)) return '活动营销'
  return '通用'
}

function thumbStyle(item: ReleaseRecord) {
  return { '--accent': thumbAccent(item, 0) }
}

function previewStore(item: ReleaseRecord) {
  previewRaw.value = item
  previewTitle.value = displayName(item)
  previewLayers.value = stackLayers(item)
  previewNavLabels.value = extractNavLabels(item)
  previewAccent.value = thumbAccent(item, 0)
  previewVisible.value = true
}

async function confirmActivate(item: ReleaseRecord) {
  const id = toReleaseId(item.id)
  if (id == null) return
  pendingActivate.value = { id, name: displayName(item), raw: item }
  keepTheme.value = true
  const snap = item.snapshot || (item as ReleaseRecord & { configSnapshot?: string }).configSnapshot
  let tabs: Array<{ text?: string; pagePath?: string; pageName?: string }> = []
  let pageCount = Number(item.pageCount || 0)
  try {
    const cfg = typeof snap === 'string' ? JSON.parse(snap) : snap
    const rawTabs = cfg?.tabbarItems || cfg?.systemConfig?.tabbarItems || cfg?.tabBar || cfg?.tabs || []
    tabs = Array.isArray(rawTabs) ? rawTabs : []
    if (!pageCount && Array.isArray(cfg?.pages)) pageCount = cfg.pages.length
  } catch {
    /* ignore */
  }
  impactTabs.value = tabs.length ? tabs : currentTabBar.value
  impactPageCount.value = pageCount || impactTabs.value.length || 0
  impactVisible.value = true
}

async function doActivate() {
  if (!pendingActivate.value) return
  activatingId.value = pendingActivate.value.id
  try {
    await activateStoreTemplate(pendingActivate.value.id)
    ElMessage.success(
      keepTheme.value
        ? '已套用整店模板（已尽量保留站点信息），请去发布让用户看到'
        : '已套用整店模板，请去发布让用户看到',
    )
    impactVisible.value = false
    await load()
    router.push('/mini/publish')
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '套用失败')
  } finally {
    activatingId.value = null
  }
}

async function applyPageTpl(tpl: PageTpl) {
  try {
    const dsl =
      typeof tpl.dslContent === 'string'
        ? JSON.parse(tpl.dslContent)
        : (tpl.dsl || tpl.dslContent)
    if (!dsl) {
      ElMessage.warning('该模板无可用内容，请换一套或从空白页开始')
      return
    }
    const id = await applyPageTemplate({ name: tpl.name || '页面模板', dsl })
    ElMessage.success('已生成草稿页')
    router.push(`/mini/pages/${id}/editor`)
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '套用失败')
  }
}

async function createFromCurrent() {
  creating.value = true
  try {
    await createStoreTemplate(`我的模板 ${new Date().toLocaleDateString()}`)
    ElMessage.success('已从当前站点新建模板')
    tab.value = 'mine'
    await load()
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '创建失败')
  } finally {
    creating.value = false
  }
}

async function load() {
  loading.value = true
  try {
    const [storeRes, pageRes, site] = await Promise.all([
      getStoreTemplates(),
      getPageTemplates({ current: 1, size: 50 }).catch(() => null),
      getMiniSite('draft').catch(() => null),
    ])
    storeTemplates.value = ((storeRes as { data?: ReleaseRecord[] })?.data || []) as ReleaseRecord[]
    const pdata = (pageRes as { data?: { records?: PageTpl[]; list?: PageTpl[] } | PageTpl[] })?.data
    pageTemplates.value = (
      Array.isArray(pdata) ? pdata : (pdata?.records || pdata?.list || [])
    ) as PageTpl[]
    currentTabBar.value = site?.tabBar || []
    siteTemplateId.value = site?.templateId != null ? Number(site.templateId) : null
    const inUse = storeTemplates.value.find((r) => isInUse(r))
    currentPageCount.value = Number(inUse?.pageCount || currentTabBar.value.length || 0)
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '加载模板失败')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped lang="scss">
.tab-bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}
.tabs { display: flex; gap: 4px; }
.tab {
  border: 0;
  background: transparent;
  padding: 8px 12px;
  font-size: 14px;
  color: var(--mw-muted);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  &.active {
    color: var(--mw-terracotta);
    font-weight: 650;
    border-bottom-color: var(--mw-terracotta);
  }
}
.capsules { display: flex; flex-wrap: wrap; gap: 6px; }

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}
.tpl-card {
  border: 1px solid var(--mw-border);
  border-radius: 14px;
  background: var(--mw-card);
  overflow: hidden;
  &.live { border-color: var(--mw-terracotta); box-shadow: 0 0 0 1px var(--mw-terracotta); }
}
.tpl-thumb {
  position: relative;
  height: 128px;
  background: linear-gradient(160deg, #f3ebe2, #e8dfd3);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 10px;
  --accent: #b4430f;
}
.page-thumb { height: 100px; }
.phone-stack {
  position: relative;
  width: 110px;
  height: 86px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  &--single { width: 52px; }
}
.phone-stack__item {
  position: absolute;
  bottom: 0;
  &.is-0 { left: 0; transform: rotate(-8deg) translateY(4px); opacity: 0.88; z-index: 1; }
  &.is-1 { left: 50%; transform: translateX(-50%); z-index: 2; }
  &.is-2 { right: 0; transform: rotate(8deg) translateY(4px); opacity: 0.88; z-index: 1; }
}
.phone-stack--single .phone-stack__item {
  position: relative;
  left: auto;
  right: auto;
  transform: none;
  opacity: 1;
}
.in-use {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--mw-terracotta-soft);
  color: var(--mw-terracotta);
  font-weight: 600;
}
.tpl-body { padding: 14px; }
.tpl-name { font-weight: 650; font-size: 15px; }
.tpl-meta {
  margin-top: 4px;
  font-size: 12px;
  color: var(--mw-muted);
  line-height: 1.45;
  min-height: 34px;
}
.tpl-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.impact-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 14px;
  li {
    font-size: 13px;
    line-height: 1.5;
    color: var(--mw-ink);
    strong { display: block; margin-bottom: 2px; }
  }
}
.impact-sub { margin-top: 4px; color: var(--mw-muted); font-size: 12px; }
.pending-note {
  margin-top: 16px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--mw-amber-bg);
  color: var(--mw-amber);
  font-size: 13px;
  line-height: 1.45;
}

.tpl-preview {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 20px;
  align-items: start;
}
.tpl-preview__phones {
  position: relative;
  height: 220px;
  background: linear-gradient(160deg, #f3ebe2, #e8dfd3);
  border-radius: 14px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.tpl-preview__phone {
  position: absolute;
  bottom: 16px;
  &.is-0 { left: 18%; transform: rotate(-7deg); opacity: 0.9; z-index: 1; }
  &.is-1 { left: 50%; transform: translateX(-50%); z-index: 2; }
  &.is-2 { right: 18%; transform: rotate(7deg); opacity: 0.9; z-index: 1; }
}
.tpl-preview__nav-title {
  font-weight: 650;
  font-size: 14px;
  margin-bottom: 10px;
}
.tpl-preview__nav ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tpl-preview__nav li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #faf6f1;
  border: 1px solid var(--mw-border);
}
.tpl-preview__nav .idx {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--mw-terracotta);
  color: #fff;
  font-size: 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}
.muted { color: var(--mw-muted); font-size: 13px; }
</style>
