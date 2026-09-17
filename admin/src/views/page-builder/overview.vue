<template>
  <div class="overview-page">
    <PageHeader
      kicker="小程序 / 总览"
      title="总览"
      description="小程序的当前状态都在这里。改页面内容后点「上线」，用户刷新就能看到，不需要发版。"
    >
      <template #actions>
        <el-button @click="openAiDraft">AI 生成页面</el-button>
        <el-button type="primary" @click="openLivePreview">预览真机</el-button>
        <el-button @click="loadAll" :loading="loading">刷新</el-button>
      </template>
    </PageHeader>

    <section class="status-bar" v-loading="loading">
      <div class="status-item">
        <div class="status-label">小程序</div>
        <div class="status-value">{{ appName }}</div>
      </div>
      <div class="status-item">
        <div class="status-label">已保存版本</div>
        <div class="status-value">{{ latestSemver || '尚未保存过' }}</div>
        <div v-if="latestReleaseTime" class="status-meta">{{ latestReleaseTime }}</div>
      </div>
      <div class="status-item">
        <div class="status-label">最近上传代码到微信</div>
        <div class="status-value">{{ pushVersion || '尚未上传' }}</div>
        <div v-if="pushTime" class="status-meta">{{ pushTime }}</div>
      </div>
    </section>

    <section class="howto">
      <div class="howto-title">怎么让用户看到我的改动？</div>
      <div class="howto-grid">
        <div class="howto-card">
          <div class="howto-tag ok">最常用</div>
          <div class="howto-head">改页面内容</div>
          <p>换图、加商品、改文案 → 在装修器点「<b>上线</b>」→ 用户刷新小程序<b>立刻看到</b>，不用发版。</p>
          <el-button size="small" @click="router.push('/page-builder/list')">去页面列表</el-button>
        </div>
        <div class="howto-card">
          <div class="howto-tag">偶尔</div>
          <div class="howto-head">存一个可回退的版本</div>
          <p>大改版之前存个档，万一改坏了能一键退回。不影响用户当前看到的内容。</p>
          <el-button size="small" @click="router.push('/page-builder/release')">去发布与版本</el-button>
        </div>
        <div class="howto-card">
          <div class="howto-tag">很少</div>
          <div class="howto-head">小程序代码更新了</div>
          <p>技术同事改了小程序端功能时才需要。上传后还要<b>去微信公众平台提交审核</b>，通过后才生效。</p>
          <el-button size="small" @click="router.push('/page-builder/release')">去上传代码</el-button>
        </div>
      </div>
    </section>

    <section v-if="todos.length" class="todo-bar">
      <div class="todo-title">还需要处理（{{ todos.length }} 项，点击直达）</div>
      <button
        v-for="(item, idx) in todos"
        :key="idx"
        type="button"
        class="todo-item"
        @click="goTodo(item)"
      >
        {{ item.text }}
      </button>
    </section>

    <!-- 设置进度清单：完成项打勾，给操作者明确的全局进度感 -->
    <section class="checklist">
      <div class="checklist-title">上线准备进度</div>
      <div class="checklist-grid">
        <div v-for="check in setupChecks" :key="check.label" class="check-item" :class="{ done: check.done }">
          <span class="check-icon">{{ check.done ? '✓' : '○' }}</span>
          <span class="check-label">{{ check.label }}</span>
        </div>
      </div>
    </section>

    <div class="overview-grid">
      <section class="tab-section">
        <h2>底部导航实况</h2>
        <p class="muted">对应真机底部四个入口。点击卡片进入装修或配置。</p>
        <div class="tab-grid">
          <button
            v-for="(tab, idx) in tabCards"
            :key="tab.key"
            type="button"
            class="tab-card"
            :class="{ warn: tab.statusKey === 'dirty' || tab.statusKey === 'empty' }"
            @click="openTab(tab)"
          >
            <div class="tab-card__idx">导航 {{ idx + 1 }}</div>
            <div class="tab-card__name">{{ tab.text }}</div>
            <div class="tab-card__page">{{ tab.pageName }}</div>
            <div class="tab-card__status" :data-status="tab.statusKey">{{ tab.statusLabel }}</div>
          </button>
        </div>
        <el-empty v-if="!loading && !tabCards.length" description="尚未配置底部导航，请先去「外观」绑定" />
      </section>

      <aside class="live-preview">
        <div class="live-preview__head">
          <span>真机实况</span>
          <el-button size="small" link type="primary" @click="openLivePreview">新窗口打开 ›</el-button>
        </div>
        <div class="phone-frame">
          <iframe :src="livePreviewUrl" title="小程序实况预览" loading="lazy" />
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import { getConfigByGroupSilent } from '@/api/system'
import { getPublishPreflight, getLatestRelease, getPushPreviewStatus } from '@/api/version'
import { post } from '@/api/request'
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

type TodoItem = { text: string; path?: string }

const router = useRouter()
const loading = ref(false)
const appName = ref('小程序')
const preflight = ref<PublishPreflight | null>(null)
const latestRelease = ref<ReleaseRecord | null>(null)
const pushStatus = ref<any>(null)
const tabs = ref<Array<{ text?: string; pageId?: string | number; pageName?: string; pagePath?: string }>>([])

const latestSemver = computed(() => preflight.value?.latestSemver || latestRelease.value?.semver || '')
const latestReleaseTime = computed(() => {
  const t = latestRelease.value?.publishedAt || latestRelease.value?.createTime
  return t ? String(t).replace('T', ' ').slice(0, 19) : ''
})
const pushVersion = computed(() => pushStatus.value?.version || pushStatus.value?.releaseSemver || '')
const pushTime = computed(() => {
  const t = pushStatus.value?.uploadedAt
  return t ? String(t).replace('T', ' ').slice(0, 19) : ''
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
    list.push({ text: item, path: '/page-builder/start' })
  }
  for (const item of preflight.value?.warnings || []) {
    list.push({ text: item, path: '/page-builder/list' })
  }
  tabs.value.forEach((tab, index) => {
    if (!tab.pageId && !(tab.pagePath || '').includes('index')) {
      list.push({ text: `导航「${tab.text || index + 1}」未绑定页面`, path: '/page-builder/start' })
    }
  })
  return list.slice(0, 8)
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
  const { href } = router.resolve({ path: '/h5/miniapp-preview', query: { view: 'config', source: 'live' } })
  return href
})

function normalizePath(path?: string) {
  return String(path || '').replace(/\/+$/, '')
}

function openLivePreview() {
  const { href } = router.resolve({ path: '/h5/miniapp-preview', query: { view: 'config' } })
  window.open(href, '_blank', 'noopener,noreferrer')
}

async function openAiDraft() {
  try {
    const { value } = await ElMessageBox.prompt('用一句话描述想要的页面（行业/卖点）', 'AI 生成页面初稿', {
      confirmButtonText: '生成',
      cancelButtonText: '取消',
      inputPlaceholder: '例如：首页，突出核心卖点与内容',
    })
    const res = await post('/api/v1/admin/pages/ai-draft', { prompt: value, industry: 'general' })
    const dsl = (res as any)?.data?.dsl
    if (!dsl) {
      ElMessage.error('生成失败')
      return
    }
    sessionStorage.setItem('ai_page_draft_dsl', JSON.stringify(dsl))
    ElMessage.success((res as any)?.data?.message || '已生成初稿，请新建页面后粘贴使用')
    router.push('/page-builder/pages')
  } catch {
    /* cancel */
  }
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
  if (item.path) router.push(item.path)
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
      getPushPreviewStatus().then((res) => { pushStatus.value = (res as any)?.data || null }).catch(() => { pushStatus.value = null }),
    ])
  } finally {
    loading.value = false
  }
}

onMounted(loadAll)
</script>

<style scoped lang="scss">
.howto {
  margin-bottom: 16px;
  padding: 18px 20px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.howto-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 12px;
}

.howto-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 12px;
}

.howto-card {
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg);
}

.howto-tag {
  display: inline-block;
  font-size: 11.5px;
  padding: 1px 8px;
  border-radius: 999px;
  background: #eef1f4;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.howto-tag.ok {
  background: rgba(15, 118, 110, 0.12);
  color: #0f766e;
  font-weight: 600;
}

.howto-head {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}

.howto-card p {
  margin: 0 0 10px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-muted);
}

.overview-page { padding-bottom: 24px; }

.status-bar {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.status-item {
  padding: 16px 18px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.status-label { font-size: 12px; color: var(--text-muted); margin-bottom: 4px; }
.status-value { font-size: 18px; font-weight: 700; color: var(--text); }
.status-meta { margin-top: 4px; font-size: 12px; color: var(--text-muted); }

.todo-bar {
  margin-bottom: 16px;
  padding: 14px 16px;
  background: var(--warning-soft);
  border: 1px solid var(--warning);
  border-radius: var(--radius);
}

.todo-title { font-size: 13px; font-weight: 600; color: var(--warning); margin-bottom: 8px; }
.todo-item {
  display: block;
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  padding: 6px 0;
  color: var(--warning);
  font-size: 13.5px;
  cursor: pointer;
}
.todo-item:hover { color: var(--brand); }

.tab-section h2 { margin: 0 0 4px; font-size: 16px; }
.muted { color: var(--text-muted); font-size: 13px; margin: 0 0 14px; }

/* 上线准备清单 */
.checklist {
  margin-bottom: 16px;
  padding: 14px 16px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.checklist-title { font-size: 13px; font-weight: 600; margin-bottom: 10px; }

.checklist-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px;
}

.check-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
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

.check-item.done {
  color: var(--text);
}

.check-item.done .check-icon {
  color: #fff;
  background: var(--success);
  border-color: var(--success);
}

/* 底部导航 + 真机实况 双栏 */
.overview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 16px;
  align-items: start;
}

.live-preview {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px;
}

.live-preview__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 600;
}

.phone-frame {
  border: 1px solid var(--border);
  border-radius: 18px;
  overflow: hidden;
  background: var(--bg-page);
  aspect-ratio: 9 / 16;
}

.phone-frame iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

@media (max-width: 1100px) {
  .overview-grid { grid-template-columns: 1fr; }
  .phone-frame { max-width: 320px; margin: 0 auto; }
}

.tab-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.tab-card {
  text-align: left;
  padding: 16px;
  background: var(--bg-elevated);
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
  margin-top: 12px;
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
  .status-bar, .tab-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 640px) {
  .status-bar, .tab-grid { grid-template-columns: 1fr; }
}
</style>
