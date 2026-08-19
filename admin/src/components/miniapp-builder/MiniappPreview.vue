<template>
  <div class="miniapp-preview">
    <div class="phone">
      <div v-if="!previewHasBrandHeader" class="phone-notch"><div class="phone-speaker"></div></div>
      <div
        class="phone-screen"
        :class="{ 'phone-screen--brand-header': previewHasBrandHeader }"
        :style="{
          backgroundColor: form.theme.pageBackgroundColor,
          '--theme-primary': form.theme.primaryColor,
          '--theme-secondary': form.theme.secondaryColor,
        }"
      >
        <div
          v-if="!previewHasBrandHeader"
          class="phone-navbar"
          :style="{ backgroundColor: form.theme.navBarColor }"
        >
          <span class="navbar-title">{{ currentTabLabel }}</span>
        </div>
        <div
          v-if="previewPinnedBrandHeader"
          ref="previewPinnedHeaderEl"
          class="preview-pinned-brand-header"
        >
          <ComponentItem
            :component="previewPinnedBrandHeader"
            :index="previewPinnedBrandHeaderIndex"
            :selected="false"
            :preview-mode="true"
          />
        </div>
        <div class="phone-content">
          <!-- Loading state -->
          <div v-if="loading" class="preview-loading">
            <el-icon class="is-loading"><Loading /></el-icon>
            <span>加载中...</span>
          </div>

          <!-- Real page content (DSL rendered，与体验版同源：已发布快照) -->
          <div v-else-if="currentPageDsl" class="preview-dsl">
            <template v-for="(comp, idx) in currentPageDsl.components" :key="comp.id">
              <div
                v-if="isPreviewPinnedBrandHeader(comp, idx)"
                class="brand-header-flow-spacer"
                :style="{ height: `${previewPinnedBrandHeaderHeight}px` }"
              />
              <ComponentItem
                v-else-if="comp.type !== ComponentType.FloatButton"
                :component="comp"
                :index="idx"
                :selected="false"
                :preview-mode="true"
              />
            </template>
            <!-- Empty state for pages with no components -->
            <div v-if="!currentPageDsl.components?.length" class="preview-empty">
              <span class="empty-icon">📄</span>
              <p>此页面暂无组件</p>
              <p class="empty-hint">请前往装修器添加组件</p>
            </div>
          </div>

          <!-- Mine page preview (custom render) -->
          <MinePagePreview
            v-else-if="showMinePage"
            :mine-config="form.mineConfig"
            :theme="form.theme"
          />

          <!-- Mine page: custom DSL mode -->
          <div v-else-if="showMinePageDsl" class="preview-dsl">
            <ComponentItem
              v-for="(comp, idx) in minePageDsl?.components"
              :key="comp.id"
              :component="comp"
              :index="idx"
              :selected="false"
              :preview-mode="true"
            />
            <div v-if="!minePageDsl?.components?.length" class="preview-empty">
              <span class="empty-icon">📄</span>
              <p>此页面暂无组件</p>
              <p class="empty-hint">请前往装修器添加组件</p>
            </div>
          </div>

          <!-- Unbound / no data fallback -->
          <div v-else class="preview-section">
            <div class="preview-hero">
              <div class="hero-icon">{{ currentTab.icon }}</div>
              <div class="hero-title">{{ currentTabLabel }}</div>
              <div class="hero-desc">{{ currentTab.pageId ? '页面暂无内容' : '尚未绑定页面' }}</div>
            </div>
          </div>
        </div>

        <!-- TabBar -->
        <div class="phone-tabbar" :style="{ backgroundColor: form.theme.tabBarBackgroundColor }">
          <div
            v-for="(tab, idx) in form.tabs"
            :key="tab.id"
            class="tabbar-item"
            :class="{ active: activeTab === idx, unbound: !tab.pageId && !tab.pagePath.includes('index') }"
            :style="{ color: activeTab === idx ? form.theme.tabBarActiveColor : form.theme.tabBarInactiveColor }"
            @click="switchTab(idx)"
          >
            <TabBarIconDisplay :icon="tab.icon" class="tabbar-icon" />
            <span class="tabbar-label">{{ tab.text }}</span>
          </div>
        </div>
      </div>
    </div>
    <p class="preview-source-hint">与绑定页一致：页面结构来自该页最新内容（装修器发布后会同步到这里），列表数据来自线上接口</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import { getPageDetail } from '@/api/page'
import ComponentItem from '@/components/page-builder/ComponentItem.vue'
import type { MiniappForm } from '@/types/miniapp'
import { ComponentType, type PageRecord } from '@/types/page'
import type { PageDSL } from '@/types/page'
import { hydratePreviewDsl } from '@/utils/preview-datasource'
import TabBarIconDisplay from '@/components/miniapp-builder/TabBarIconDisplay.vue'
import MinePagePreview from '@/components/miniapp-builder/MinePagePreview.vue'
import { usePinnedBrandHeader, estimateBrandHeaderHeight } from '@/components/page-builder/composables/usePinnedBrandHeader'
import { useMeasuredElementHeight } from '@/components/page-builder/composables/useMeasuredElementHeight'

const props = defineProps<{ form: MiniappForm; pages: PageRecord[]; minePageMode?: 'config' | 'custom' }>()
const activeTab = ref(0)
const loading = ref(false)

const pageDslCache = ref<Map<string, PageDSL | null>>(new Map())

function normalizePreviewPath(path: string) {
  return (path || '').trim().replace(/^\/+/, '')
}

function resolveBoundPageId(tab: MiniappForm['tabs'][number]): string {
  const raw = String(tab.pageId || '').trim()
  if (/^\d+$/.test(raw) && raw !== '0') return raw
  const path = normalizePreviewPath(tab.pagePath || '')
  const name = String(tab.pageName || tab.text || '').trim()
  const page = props.pages.find((item) => {
    const id = String((item as { id?: string | number }).id || '')
    if (raw && id === raw) return true
    if (path && normalizePreviewPath(String((item as { path?: string }).path || '')) === path) return true
    if (name && String((item as { name?: string }).name || '') === name) return true
    return false
  })
  return page ? String((page as { id?: string | number }).id || '') : ''
}

function cacheKeyForTab(tab: MiniappForm['tabs'][number]) {
  const path = normalizePreviewPath(tab.pagePath || '')
  if (path) return path
  const pageId = resolveBoundPageId(tab)
  return pageId ? `id:${pageId}` : ''
}

function writeDslCache(key: string, dsl: PageDSL | null) {
  if (!key) return
  const next = new Map(pageDslCache.value)
  next.set(key, dsl)
  pageDslCache.value = next
}

async function loadPublishedDslForTab(tab: MiniappForm['tabs'][number]) {
  const key = cacheKeyForTab(tab)
  if (!key) return null

  loading.value = true
  try {
    const pageId = resolveBoundPageId(tab)
    if (/^\d+$/.test(pageId)) {
      try {
        const res = await getPageDetail(pageId)
        const dsl = parseDslFromResponse(res.data)
        if (dsl) {
          const { dsl: hydrated } = await hydratePreviewDsl(dsl)
          writeDslCache(key, hydrated)
          return hydrated
        }
      } catch {
        // fall through to published path
      }
    }

    const path = normalizePreviewPath(tab.pagePath || '')
    if (path) {
      try {
        const response = await fetch(`/api/v1/mp/pages?path=${encodeURIComponent(path)}`)
        const payload = await response.json()
        if (payload.code === 200 && payload.data) {
          const { dsl } = await hydratePreviewDsl(payload.data as PageDSL)
          writeDslCache(key, dsl)
          return dsl
        }
      } catch {
        // ignore
      }
    }

    writeDslCache(key, null)
    return null
  } finally {
    loading.value = false
  }
}

const currentTab = computed(() => props.form.tabs[activeTab.value] || { text: '', icon: '📦', pagePath: '' })
const currentTabLabel = computed(() => currentTab.value.text || '页面')
const mineTabIndex = computed(() => {
  return props.form.tabs.findIndex(t => t.text === '我的' || t.pagePath.includes('mine') || String(t.pageId) === '__mine__')
})
const showMinePage = computed(() => {
  const isMineTab = activeTab.value === props.form.tabs.length - 1 || activeTab.value === mineTabIndex.value
  const isSystemMine = String(currentTab.value?.pageId) === '__mine__'
  return (isMineTab || isSystemMine) && props.minePageMode !== 'custom'
})

const showMinePageDsl = computed(() => {
  const isMineTab = activeTab.value === props.form.tabs.length - 1 || activeTab.value === mineTabIndex.value
  if (!isMineTab || props.minePageMode !== 'custom') return false
  const tab = currentTab.value
  return tab?.pageId ? true : false
})

const minePageDsl = computed(() => {
  if (!showMinePageDsl.value) return null
  const key = cacheKeyForTab(currentTab.value)
  return key ? (pageDslCache.value.get(key) || null) : null
})

const currentPageDsl = computed(() => {
  const tab = currentTab.value
  const key = cacheKeyForTab(tab)
  if (!key) return null
  return pageDslCache.value.get(key) || null
})

const previewPageComponents = computed(() => currentPageDsl.value?.components ?? [])

const {
  pinnedBrandHeader: previewPinnedBrandHeader,
  pinnedBrandHeaderIndex: previewPinnedBrandHeaderIndex,
  hasBrandHeader: previewHasBrandHeader,
  isPinnedBrandHeader: isPreviewPinnedBrandHeader,
} = usePinnedBrandHeader(previewPageComponents)

const previewPinnedHeaderEl = ref<HTMLElement | null>(null)
const measuredPreviewPinnedHeight = useMeasuredElementHeight(
  previewPinnedHeaderEl,
  computed(() => !!previewPinnedBrandHeader.value),
)
const previewPinnedBrandHeaderHeight = computed(() => {
  if (!previewPinnedBrandHeader.value) return 0
  return measuredPreviewPinnedHeight.value || estimateBrandHeaderHeight(previewPinnedBrandHeader.value.props)
})

function parseDslFromResponse(data: any): PageDSL | null {
  if (!data) return null
  const raw = data.draftDslContent || data.dsl || data.dslContent
  if (!raw) return null
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as PageDSL } catch { return null }
  }
  if (raw.components) return raw as PageDSL
  return null
}

async function switchTab(idx: number) {
  activeTab.value = idx
  const tab = props.form.tabs[idx]
  if (!tab?.pagePath && !tab?.pageId) return
  if (showMinePage.value) return
  await loadPublishedDslForTab(tab)
}

watch(() => props.form.tabs, () => {
  pageDslCache.value = new Map()
  const tab = props.form.tabs[activeTab.value]
  if (tab) loadPublishedDslForTab(tab)
}, { deep: true })

watch(() => props.form.homePageId, () => {
  pageDslCache.value = new Map()
  const tab = props.form.tabs[activeTab.value] || props.form.tabs[0]
  if (tab) loadPublishedDslForTab(tab)
})

watch(() => props.pages.length, () => {
  const tab = props.form.tabs[activeTab.value]
  if (tab) loadPublishedDslForTab(tab)
})

onMounted(() => {
  const tab = props.form.tabs[0]
  if (tab) loadPublishedDslForTab(tab)
})

/** 供父组件调用：切到「我的」Tab（配置我的页面/模板风格时让预览立即展示效果） */
function showMineTab() {
  const idx = mineTabIndex.value >= 0 ? mineTabIndex.value : props.form.tabs.length - 1
  if (idx >= 0) void switchTab(idx)
}

defineExpose({ showMineTab })
</script>

<style scoped>
.miniapp-preview { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.preview-source-hint { margin: 0; font-size: 12px; color: #64748b; text-align: center; max-width: 375px; }
.phone { width: 375px; background: #111827; border-radius: 44px; padding: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
.phone-notch { height: 30px; display: flex; align-items: center; justify-content: center; }
.phone-speaker { width: 80px; height: 6px; background: #1f2937; border-radius: 3px; }
.phone-screen { border-radius: 32px; overflow: hidden; display: flex; flex-direction: column; height: 680px; position: relative; }
.phone-screen--brand-header .phone-content { flex: 1; min-height: 0; }
.preview-pinned-brand-header { position: absolute; top: 0; left: 0; right: 0; z-index: 20; }
.brand-header-flow-spacer { flex-shrink: 0; width: 100%; }
.phone-navbar { height: 44px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.navbar-title { color: #fff; font-size: 16px; font-weight: 700; }
/* 背景透明以透出 phone-screen 上的「页面背景」主题色 */
.phone-content { flex: 1; overflow-y: auto; padding: 0; background: transparent; }
.phone-tabbar { height: 56px; display: flex; align-items: center; justify-content: space-around; border-top: 1px solid #e3e8f0; flex-shrink: 0; }
.tabbar-item { display: flex; flex-direction: column; align-items: center; gap: 2px; cursor: pointer; transition: 0.14s; position: relative; }
.tabbar-item.unbound::after { content: ''; position: absolute; top: -2px; right: -4px; width: 6px; height: 6px; border-radius: 50%; background: #ef4444; }
.tabbar-icon { font-size: 20px; }
.tabbar-label { font-size: 10px; }

.preview-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; height: 200px; color: #a0b4d0; font-size: 13px; }

.preview-dsl { animation: fadeIn 0.2s; min-height: 100%; }
/* 与真机一致：轮播左右贴屏，不套装修器里的 10px 内边距 */
.preview-dsl :deep(.render-banner),
.preview-dsl :deep(.render-banner--preview) {
  padding-left: 0;
  padding-right: 0;
}
@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

.preview-empty { text-align: center; padding: 40px 16px; color: #a0b4d0; }
.empty-icon { font-size: 36px; display: block; margin-bottom: 8px; }
.preview-empty p { font-size: 13px; margin: 4px 0; }
.empty-hint { font-size: 11px; color: #c0c8d4; }

.preview-section { animation: fadeIn 0.2s; }
.preview-hero { text-align: center; padding: 24px 16px; }
.hero-icon { font-size: 40px; margin-bottom: 8px; }
.hero-title { font-size: 16px; font-weight: 700; color: #172033; }
.hero-desc { font-size: 12px; color: #7b8798; margin-top: 4px; }

.preview-user-card { padding: 20px 16px; border-radius: 12px; margin-bottom: 12px; display: flex; align-items: center; gap: 12px; color: #fff; }
.user-avatar { width: 48px; height: 48px; background: rgba(255,255,255,0.2); border-radius: 50%; display: grid; place-items: center; font-size: 24px; }
.user-info strong { font-size: 14px; display: block; }
.user-subtitle { font-size: 11px; opacity: 0.8; margin-top: 2px; display: block; }
.user-level { display: inline-block; font-size: 10px; background: rgba(255,255,255,0.2); padding: 1px 8px; border-radius: 99px; margin-top: 4px; }
.login-btn { margin-left: auto; padding: 6px 16px; background: #fff; color: var(--mine-accent, var(--theme-primary, #1769ff)); border: none; border-radius: 99px; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; }
.user-nickname { font-size: 12px; font-weight: 600; margin-top: 2px; display: block; }
.preview-member-card { padding: 14px 16px; border-radius: 10px; margin-bottom: 12px; color: #fff; }
.preview-member-card strong { display: block; font-size: 14px; }

/* 简约版（outline）：白底描边卡片，内部元素改为浅灰/描边风格 */
.mine-card--outline .user-avatar { background: #f1f5f9; }
.mine-card--outline .user-subtitle { opacity: 1; color: #64748b; }
.mine-card--outline .user-level { background: #f1f5f9; color: #475569; }
.mine-card--outline .login-btn { background: #fff; border: 1.5px solid var(--mine-accent, #334155); color: var(--mine-accent, #334155); }

.order-tabs { display: flex; gap: 8px; margin-bottom: 4px; padding: 10px 6px 0; }
.order-tab-item { flex: 1; text-align: center; padding: 8px 4px; background: #f8faff; border: 1px solid #eef0f4; border-radius: 8px; cursor: pointer; transition: 0.14s; }
.order-tab-item:hover { border-color: #a0b4d0; }
.order-tab-label { font-size: 11px; color: #607187; display: block; }
.all-orders-btn { text-align: center; font-size: 12px; color: #1769ff; padding: 8px 0; margin-bottom: 8px; }

.preview-menu-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.preview-menu-item { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px; }
.menu-icon { font-size: 22px; }
.menu-text { font-size: 11px; color: #607187; }
</style>
