<template>
  <div class="overview-page">
    <PageHeader
      kicker="小程序 / 总览"
      title="总览"
      description="一眼看清当前线上状态。改页面请在装修器点「上线」，小程序立刻生效。"
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
        <div class="status-label">当前还原点</div>
        <div class="status-value">{{ latestSemver || '尚未创建' }}</div>
        <div v-if="latestReleaseTime" class="status-meta">{{ latestReleaseTime }}</div>
      </div>
      <div class="status-item">
        <div class="status-label">最近上传体验版</div>
        <div class="status-value">{{ pushVersion || '尚未上传' }}</div>
        <div v-if="pushTime" class="status-meta">{{ pushTime }}</div>
      </div>
    </section>

    <section v-if="todos.length" class="todo-bar">
      <div class="todo-title">待办</div>
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
      inputPlaceholder: '例如：跨境电商首页，突出选品与课程',
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
    appName.value = String(map[CONFIG_KEYS.SHARE_TITLE] || map.miniappName || '跨境墨太白')
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
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: var(--radius);
}

.todo-title { font-size: 13px; font-weight: 600; color: #92400e; margin-bottom: 8px; }
.todo-item {
  display: block;
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  padding: 6px 0;
  color: #78350f;
  font-size: 13.5px;
  cursor: pointer;
}
.todo-item:hover { color: #1d4ed8; }

.tab-section h2 { margin: 0 0 4px; font-size: 16px; }
.muted { color: var(--text-muted); font-size: 13px; margin: 0 0 14px; }

.tab-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
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
  background: #eef2ff;
  color: #3730a3;
}
.tab-card__status[data-status='live'] { background: #ecfdf5; color: #047857; }
.tab-card__status[data-status='dirty'] { background: #fff7ed; color: #c2410c; }
.tab-card__status[data-status='empty'] { background: #fef2f2; color: #b91c1c; }
.tab-card__status[data-status='draft'] { background: #f1f5f9; color: #475569; }

@media (max-width: 960px) {
  .status-bar, .tab-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 640px) {
  .status-bar, .tab-grid { grid-template-columns: 1fr; }
}
</style>
