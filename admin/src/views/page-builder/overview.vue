<template>
  <div class="overview-page">
    <PageHeader
      title="搭建工作台"
      description="看当前上线内容，直接改导航、绑定页和「我的」。换整店模板去品牌导航。"
    >
      <template #actions>
        <el-button type="primary" @click="openLivePreview">预览真机</el-button>
        <el-button :loading="loading" aria-label="刷新工作台" @click="loadAll">刷新</el-button>
      </template>
    </PageHeader>

    <section class="status-bar" v-loading="loading">
      <div class="status-item">
        <div class="status-label">小程序</div>
        <div class="status-value">{{ appName }}</div>
        <div class="status-meta">当前正在运营</div>
      </div>
      <div
        class="status-item"
        role="link"
        tabindex="0"
        @click="router.push('/page-builder/start?scene=templates')"
        @keydown.enter="router.push('/page-builder/start?scene=templates')"
      >
        <div class="status-label">使用中模板</div>
        <div class="status-value">{{ currentTemplateName }}</div>
        <div class="status-meta">点这里去换模板</div>
      </div>
      <div
        class="status-item"
        role="link"
        tabindex="0"
        @click="router.push('/page-builder/release')"
        @keydown.enter="router.push('/page-builder/release')"
      >
        <div class="status-label">当前上线</div>
        <div class="status-value">{{ liveVersionLabel }}</div>
        <div class="status-meta">{{ latestReleaseTime || '内容版本，不是微信正式版' }}</div>
      </div>
      <div class="status-item">
        <div class="status-label">导航入口</div>
        <div class="status-value">{{ tabCards.length ? `${tabCards.length} 个` : '未配置' }}</div>
        <div class="status-meta">点下方卡片直接改</div>
      </div>
    </section>

    <section class="ops-bar">
      <button type="button" class="ops-card" @click="router.push('/page-builder/start')">
        <div class="ops-card__name">导航模块</div>
        <div class="ops-card__desc">改底部入口、绑定页面</div>
      </button>
      <button type="button" class="ops-card" @click="router.push('/page-builder/list')">
        <div class="ops-card__name">链接页面</div>
        <div class="ops-card__desc">装修已绑定的内容页</div>
      </button>
      <button type="button" class="ops-card" @click="router.push('/page-builder/mine')">
        <div class="ops-card__name">固定页 · 我的</div>
        <div class="ops-card__desc">路径锁定的个人中心表单配置</div>
      </button>
      <button type="button" class="ops-card" @click="router.push('/page-builder/start?scene=templates')">
        <div class="ops-card__name">换整店模板</div>
        <div class="ops-card__desc">去品牌导航选用</div>
      </button>
    </section>

    <IssueActionList
      :items="todos"
      tone="warning"
      badge="待处理"
      :heading="`还需要处理（${todos.length} 项）`"
      @go="goTodo"
    />

    <div class="overview-grid">
      <div class="overview-main">
        <section class="panel tab-section">
          <div class="panel-head">
            <h2 class="pb-h2">底部导航实况</h2>
            <p class="muted">对应真机底部四个入口，点卡片去装修或绑定。</p>
          </div>
          <div class="tab-grid">
            <button
              v-for="(tab, idx) in tabCards"
              :key="tab.key"
              type="button"
              class="tab-card"
              :class="{ warn: tab.statusKey === 'dirty' || tab.statusKey === 'empty' }"
              :aria-label="`打开导航 ${tab.text}`"
              @click="openTab(tab)"
            >
              <div class="tab-card__idx">导航 {{ idx + 1 }}</div>
              <div class="tab-card__name">{{ tab.text }}</div>
              <div class="tab-card__page">{{ tab.pageName }}</div>
              <div class="tab-card__status" :data-status="tab.statusKey">{{ tab.statusLabel }}</div>
            </button>
          </div>
          <el-empty v-if="!loading && !tabCards.length" description="尚未配置底部导航，请先去「品牌导航」绑定" />
        </section>

        <section class="panel checklist">
          <h2 class="pb-h2">上线准备进度</h2>
          <div class="checklist-grid">
            <div v-for="check in setupChecks" :key="check.label" class="check-item" :class="{ done: check.done }">
              <span class="check-icon">{{ check.done ? '✓' : '○' }}</span>
              <span class="check-label">{{ check.label }}</span>
            </div>
          </div>
        </section>

        <section class="panel howto">
          <h2 class="pb-h2">怎么让用户看到改动？</h2>
          <div class="howto-list">
            <div class="howto-row">
              <span class="howto-tag ok">最常用</span>
              <div class="howto-copy">
                <div class="howto-head">改页面内容</div>
                <p>换图、加商品、改文案后，在装修器点「上线」。用户刷新小程序立刻看到，不用发版。</p>
              </div>
              <el-button size="small" @click="router.push('/page-builder/list')">去页面管理</el-button>
            </div>
            <div class="howto-row">
              <span class="howto-tag">偶尔</span>
              <div class="howto-copy">
                <div class="howto-head">存一个可回退的版本</div>
                <p>大改版之前存档。万一改坏了，可以在发布中心一键退回，不影响用户当前看到的内容。</p>
              </div>
              <el-button size="small" @click="router.push('/page-builder/release')">去发布中心</el-button>
            </div>
            <div class="howto-row">
              <span class="howto-tag">很少</span>
              <div class="howto-copy">
                <div class="howto-head">上传小程序代码</div>
                <p>只有技术改了小程序端功能才需要，和整店模板不是一回事。去发布中心的微信区操作。</p>
              </div>
              <el-button size="small" @click="router.push('/page-builder/release')">去发布中心</el-button>
            </div>
          </div>
        </section>
      </div>

      <aside class="panel live-preview">
        <div class="live-preview__head">
          <h2 class="pb-h2">真机实况</h2>
          <el-button size="small" link type="primary" aria-label="在新窗口打开真机预览" @click="openLivePreview">新窗口打开 ›</el-button>
        </div>
        <div ref="phoneBoxRef" class="phone-scale">
          <iframe
            :src="livePreviewUrl"
            title="小程序实况预览"
            loading="lazy"
            :style="{ width: `${phoneSize.w}px`, height: `${phoneSize.h}px` }"
          />
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import IssueActionList, { type IssueActionItem } from '@/components/IssueActionList.vue'
import { getConfigByGroupSilent } from '@/api/system'
import { getPublishPreflight, getLatestRelease, getStoreTemplates } from '@/api/version'
import { CONFIG_KEYS } from '@/types/miniapp'
import type { PublishPreflight } from '@/api/version'
import type { ReleaseRecord } from '@/types/page'

type TabCard = {
  key: string
  text: string
  pageId: string
  pageName: string
  path: string
  isMine: boolean
  statusKey: 'live' | 'dirty' | 'draft' | 'empty' | 'builtin'
  statusLabel: string
}

type TodoItem = IssueActionItem

const router = useRouter()
const phoneBoxRef = ref<HTMLElement | null>(null)
const phoneSize = reactive({ w: 375, h: 720 })
let phoneRo: ResizeObserver | null = null
const loading = ref(false)
const appName = ref('小程序')
const preflight = ref<PublishPreflight | null>(null)
const latestRelease = ref<ReleaseRecord | null>(null)
const currentTemplateName = ref('未选用')
const tabs = ref<Array<{ text?: string; pageId?: string | number; pageName?: string; pagePath?: string }>>([])

const latestSemver = computed(() => preflight.value?.latestSemver || latestRelease.value?.semver || '')
const latestReleaseTime = computed(() => {
  const t = latestRelease.value?.publishedAt || latestRelease.value?.createTime
  return t ? String(t).replace('T', ' ').slice(0, 19) : ''
})
const liveVersionLabel = computed(() => {
  const v = latestSemver.value
  return v ? `v${String(v).replace(/^v/, '')}` : '尚未上线'
})

const tabCards = computed<TabCard[]>(() => {
  const pages = preflight.value?.pages || []
  const byId = new Map(pages.map((p) => [String(p.id), p]))
  const byPath = new Map(pages.map((p) => [normalizePath(p.path), p]))

  return (tabs.value || []).slice(0, 4).map((tab, index) => {
    const path = normalizePath(tab.pagePath || '')
    const isMine = path.includes('/pages/mine/mine') || String(tab.pageId) === '__mine__'
    const bound =
      (tab.pageId ? byId.get(String(tab.pageId)) : undefined)
      || (path ? byPath.get(path) : undefined)
    let statusKey: TabCard['statusKey'] = 'empty'
    let statusLabel = '空白'
    if (isMine) {
      statusKey = 'builtin'
      statusLabel = '系统配置页'
    } else if (bound) {
      if (bound.action === 'empty') {
        statusKey = 'empty'
        statusLabel = '空白'
      } else if (bound.action === 'publish') {
        statusKey = 'dirty'
        statusLabel = '有未上线的改动'
      } else if (bound.action === 'already_live' || bound.status === 1) {
        statusKey = 'live'
        statusLabel = '已上线'
      } else if (bound.status === 0) {
        statusKey = 'draft'
        statusLabel = '草稿'
      } else {
        statusKey = 'draft'
        statusLabel = '未上线'
      }
    } else if (!tab.pageId && !path) {
      statusKey = 'empty'
      statusLabel = '未绑定'
    }

    return {
      key: `tab-${index}`,
      text: tab.text || `导航${index + 1}`,
      pageId: String(tab.pageId || ''),
      pageName: tab.pageName || bound?.name || (isMine ? '我的' : '未绑定页面'),
      path,
      isMine,
      statusKey,
      statusLabel,
    }
  })
})

const todos = computed<TodoItem[]>(() => {
  const list: TodoItem[] = []
  for (const item of preflight.value?.blocking || []) {
    list.push({
      text: item,
      to: /首页|导航|外观|品牌/.test(item) ? '/page-builder/start' : '/page-builder/list',
      action: /首页|导航|外观|品牌/.test(item) ? '去品牌导航' : '去页面管理',
    })
  }
  for (const item of preflight.value?.warnings || []) {
    list.push({ text: item, to: '/page-builder/list', action: '去页面管理' })
  }
  tabs.value.forEach((tab, index) => {
    if (!tab.pageId && !(tab.pagePath || '').includes('index')) {
      list.push({
        text: `导航「${tab.text || index + 1}」未绑定页面`,
        to: '/page-builder/start',
        action: '去品牌导航',
      })
    }
  })
  const seen = new Set<string>()
  return list.filter((item) => {
    const key = item.text
      .replace(/尚未绑定页面|未绑定页面/g, '未绑定页面')
      .replace(/\s+/g, '')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, 8)
})

/** 上线准备清单：完成打勾，未完成空心圈 */
const setupChecks = computed(() => {
  const blocking = preflight.value?.blocking || []
  const warnings = preflight.value?.warnings || []
  const allTabsBound = tabs.value.length > 0 && tabs.value.every(
    (tab) => tab.pageId || (tab.pagePath || '').includes('index'),
  )
  return [
    { label: '首页已装修并绑定', done: !blocking.some((t) => t.includes('首页')) && Boolean(preflight.value) },
    { label: '底部导航全部绑定页面', done: allTabsBound },
    { label: '已保存过可回退的版本', done: Boolean(latestSemver.value) },
    { label: '没有未处理的警告', done: warnings.length === 0 && Boolean(preflight.value) },
  ]
})

/** 真机实况 iframe（与「预览真机」同一页面，内嵌展示） */
const livePreviewUrl = computed(() => {
  const { href } = router.resolve({ path: '/h5/miniapp-preview', query: { view: 'config', source: 'live', embed: '1' } })
  return href
})

function normalizePath(path?: string) {
  return String(path || '').replace(/\/+$/, '')
}

function openLivePreview() {
  const { href } = router.resolve({ path: '/h5/miniapp-preview', query: { view: 'config' } })
  window.open(href, '_blank', 'noopener,noreferrer')
}

function openTab(tab: TabCard) {
  if (tab.isMine) {
    router.push('/page-builder/mine')
    return
  }
  if (tab.pageId && /^\d+$/.test(tab.pageId)) {
    router.push(`/page-builder/editor/${tab.pageId}`)
    return
  }
  router.push('/page-builder/start')
}

function goTodo(item: TodoItem) {
  if (item.to) router.push(item.to)
}

async function loadConfig() {
  try {
    const res = await getConfigByGroupSilent('basic')
    const configs = (res as any)?.data?.configs || (res as any)?.data || []
    const map: Record<string, any> = {}
    for (const c of configs) {
      if (c?.configKey) map[c.configKey] = c.configValue
    }
    appName.value = String(map[CONFIG_KEYS.SHARE_TITLE] || map.miniappName || '我的小程序')
    const raw = map[CONFIG_KEYS.TABBAR_ITEMS]
    if (raw) {
      const items = typeof raw === 'string' ? JSON.parse(raw) : raw
      tabs.value = Array.isArray(items) ? items : []
    } else {
      tabs.value = []
    }
  } catch {
    tabs.value = []
  }
}

async function loadAll() {
  loading.value = true
  try {
    await Promise.all([
      loadConfig(),
      getPublishPreflight().then((res) => { preflight.value = res.data || null }).catch(() => { preflight.value = null }),
      getLatestRelease().then((res) => { latestRelease.value = (res as any)?.data || null }).catch(() => { latestRelease.value = null }),
      getStoreTemplates().then((res) => {
        const list = ((res as any)?.data || []) as ReleaseRecord[]
        const cur = Array.isArray(list) ? list.find((t) => t.isCurrent === 1 || t.isCurrent === true) : null
        currentTemplateName.value = cur?.templateName || cur?.releaseNotes || (cur?.semver ? `版式 ${cur.semver}` : '未选用')
      }).catch(() => { currentTemplateName.value = '未选用' }),
    ])
  } finally {
    loading.value = false
  }
}

function fitPhonePreview() {
  const el = phoneBoxRef.value
  if (!el) return
  const s = Math.min(el.clientWidth / 375, el.clientHeight / 720, 1)
  phoneSize.w = Math.max(1, Math.round(375 * s))
  phoneSize.h = Math.max(1, Math.round(720 * s))
}

onMounted(() => {
  loadAll()
  phoneRo = new ResizeObserver(fitPhonePreview)
  requestAnimationFrame(() => {
    if (phoneBoxRef.value) phoneRo?.observe(phoneBoxRef.value)
    fitPhonePreview()
  })
})

onUnmounted(() => {
  phoneRo?.disconnect()
})
</script>

<style scoped lang="scss">
.overview-page { padding-bottom: 24px; }

.pb-h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--text);
}

.status-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.status-item {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 88px;
  padding: 16px 20px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.status-item[role='link'] { cursor: pointer; }

.status-label { font-size: 13px; color: #6b7280; margin-bottom: 4px; }
.status-value { font-size: 20px; font-weight: 600; color: var(--text); line-height: 1.3; }
.status-meta { margin-top: 4px; font-size: 12px; color: var(--text-muted); min-height: 18px; }

.ops-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.ops-card {
  text-align: left;
  padding: 14px 16px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  font: inherit;
  color: inherit;
}

.ops-card:hover {
  border-color: var(--brand);
  box-shadow: 0 0 0 2px var(--brand-soft);
}

.ops-card__name { font-size: 15px; font-weight: 700; }
.ops-card__desc { margin-top: 4px; font-size: 12px; color: var(--text-muted); }

.muted { color: var(--text-muted); font-size: 13px; margin: 6px 0 0; line-height: 1.5; }

.panel {
  padding: 16px 18px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.panel-head { margin-bottom: 14px; }

.overview-main {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.checklist .pb-h2,
.howto .pb-h2 { margin-bottom: 12px; }

.checklist-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 16px;
}

.check-item {
  display: flex;
  align-items: center;
  min-height: 28px;
  gap: 8px;
  font-size: 13px;
  line-height: 1.4;
  color: var(--text-muted);
}

.check-item .check-icon {
  width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  border: 1px solid var(--border);
  border-radius: 50%;
  font-size: 11px;
  flex-shrink: 0;
}

.check-item.done { color: var(--text); }
.check-item.done .check-icon {
  color: #fff;
  background: var(--success);
  border-color: var(--success);
}

.overview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 16px;
  align-items: stretch;
}

.live-preview {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.live-preview__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 40px;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.phone-scale {
  flex: 1;
  min-height: 0;
  width: 100%;
  overflow: hidden;
  border-radius: 32px;
  background: #eef1f6;
  display: flex;
  align-items: center;
  justify-content: center;
}

.phone-scale iframe {
  border: 0;
  display: block;
  background: #fff;
}

.howto-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.howto-row {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg);
}

.howto-tag {
  justify-self: start;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--text-muted);
  background: var(--bg-page);
  white-space: nowrap;
}

.howto-tag.ok {
  color: var(--success);
  background: var(--success-soft);
}

.howto-copy { min-width: 0; }
.howto-head { font-size: 14px; font-weight: 700; line-height: 1.3; }
.howto-copy p {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--text-secondary);
}

.tab-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

@media (max-width: 1100px) {
  .overview-grid { grid-template-columns: 1fr; }
  .live-preview { max-width: 340px; }
  .phone-scale { min-height: 560px; }
}

@media (max-width: 720px) {
  .tab-grid, .checklist-grid { grid-template-columns: 1fr; }
  .howto-row {
    grid-template-columns: 1fr;
    justify-items: start;
  }
}

.tab-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-height: 118px;
  text-align: left;
  padding: 14px 16px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: 0.15s;
}
.tab-card:hover { border-color: var(--color-primary); box-shadow: 0 0 0 2px rgba(23,105,255,.12); }
.tab-card.warn { border-color: #fbbf24; background: #fffbeb; }
.tab-card__idx { font-size: 12px; color: var(--text-muted); }
.tab-card__name { margin-top: 6px; font-size: 16px; font-weight: 700; }
.tab-card__page { margin-top: 4px; font-size: 13px; color: var(--text-secondary); }
.tab-card__status {
  margin-top: auto;
  display: inline-block;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--brand-soft);
  color: var(--brand);
}
.tab-card__status[data-status='live'] { background: var(--success-soft); color: var(--success); }
.tab-card__status[data-status='dirty'] { background: var(--warning-soft); color: var(--warning); }
.tab-card__status[data-status='empty'] { background: var(--danger-soft); color: var(--danger); }
.tab-card__status[data-status='draft'] { background: var(--info-soft); color: var(--info); }

@media (max-width: 960px) {
  .status-bar, .tab-grid, .ops-bar { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 640px) {
  .status-bar, .tab-grid, .ops-bar { grid-template-columns: 1fr; }
}
</style>
