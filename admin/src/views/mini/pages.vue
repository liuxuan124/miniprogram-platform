<template>
  <div class="mini-wb mw-page pages" v-loading="loading">
    <header class="mw-head">
      <div>
        <h1 class="mw-title">页面</h1>
        <p class="mw-sub">共 {{ totalCount }} 个，按用途分组，旧页面自动进入归档</p>
      </div>
      <div class="mw-actions">
        <el-button @click="router.push({ path: '/mini/templates', query: { tab: 'page' } })">
          从模板新建
        </el-button>
        <el-button :loading="creatingBlank" @click="createBlank">+ 空白页面</el-button>
        <el-button type="primary" class="mw-btn-primary" @click="router.push('/mini/pages/new-ai')">
          AI 生成页面
        </el-button>
      </div>
    </header>

    <div class="filters">
      <el-input
        v-model="keyword"
        clearable
        placeholder="搜索页面名称"
        style="max-width: 280px"
      />
      <div class="capsules">
        <button
          v-for="opt in statusFilters"
          :key="opt.key"
          type="button"
          class="mw-capsule"
          :class="{ active: statusFilter === opt.key }"
          @click="statusFilter = opt.key"
        >
          {{ opt.label }} {{ opt.count }}
        </button>
      </div>
    </div>

    <section
      v-for="group in visibleGroups"
      :key="group.key"
      class="mw-panel group-panel"
      :class="{ 'is-collapsed': group.collapsed }"
    >
      <button type="button" class="group-head" @click="toggleGroup(group.key)">
        <div class="group-head__left">
          <h2>{{ group.label }}</h2>
          <span class="count">{{ group.rows.length }}个</span>
          <span v-if="group.hint" class="hint">{{ group.hint }}</span>
        </div>
        <span v-if="group.collapsible" class="chevron">{{ group.collapsed ? '▾' : '▴' }}</span>
      </button>

      <template v-if="!group.collapsed">
        <div v-if="group.rows.length" class="page-rows">
          <div v-for="row in group.rows" :key="String(row.id)" class="page-row">
            <MiniPhoneThumb
              size="sm"
              :title="row.name"
              :accent="thumbAccent(row)"
              :layers="thumbLayers(row)"
              :src="thumbSrc(row)"
            />
            <div class="page-row__main">
              <div class="page-row__name">
                {{ row.name }}
                <span v-if="isAiHint(row)" class="ai-badge">AI 生成</span>
              </div>
              <div class="page-row__sub">{{ rowSubtitle(row, group.key) }}</div>
            </div>
            <PageStatusTag :row="row" />
            <button type="button" class="mw-link decor" @click="openEditor(row)">装修</button>
            <el-dropdown trigger="click" @command="(cmd: string) => onMore(cmd, row)">
              <button type="button" class="more-btn" aria-label="更多">⋯</button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="preview">预览</el-dropdown-item>
                  <el-dropdown-item command="copy-path">复制路径</el-dropdown-item>
                  <el-dropdown-item command="duplicate">复制页面</el-dropdown-item>
                  <el-dropdown-item command="set-nav" :disabled="isArchived(row)">设为导航</el-dropdown-item>
                  <el-dropdown-item
                    v-if="!isArchived(row)"
                    command="archive"
                    divided
                  >
                    归档
                  </el-dropdown-item>
                  <el-dropdown-item v-if="canOffline(row)" command="offline" divided>下线</el-dropdown-item>
                  <el-dropdown-item v-if="canDelete(row)" command="delete" divided>删除草稿</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
        <p v-else class="empty-hint">暂无{{ group.label }}</p>
      </template>
    </section>

    <el-dialog v-model="navDialogVisible" title="设为导航入口" width="420px">
      <p class="nav-dialog-hint">将「{{ navTarget?.name }}」绑定到选中的底部导航位（写入待发布草稿）。</p>
      <el-radio-group v-model="navSlotIndex" class="nav-slots">
        <el-radio v-for="(tab, i) in siteTabs" :key="i" :value="i">
          {{ i + 1 }}. {{ tab.text || `导航 ${i + 1}` }}
          <span class="muted">（现：{{ tab.pageName || tab.pagePath || '未绑定' }}）</span>
        </el-radio>
      </el-radio-group>
      <template #footer>
        <el-button @click="navDialogVisible = false">取消</el-button>
        <el-button type="primary" class="mw-btn-primary" :loading="navSaving" @click="confirmSetNav">
          确认
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageStatusTag from '@/components/mini/PageStatusTag.vue'
import MiniPhoneThumb from '@/components/mini/MiniPhoneThumb.vue'
import { getPageList, createPage, deletePage, unpublishPage, duplicatePage, updatePage } from '@/api/page'
import { getMiniSite, updateMiniSite, type MiniTabBarItem } from '@/api/miniSite'
import {
  inferPageGroup,
  PAGE_GROUP_LABELS,
  resolvePageStatus,
  type MiniPageStatus,
  type PageGroup,
} from '@/utils/pageStatus'
import type { PageRecord } from '@/types/page'

defineOptions({ name: 'MiniPages' })

const router = useRouter()
const loading = ref(false)
const creatingBlank = ref(false)
const pages = ref<PageRecord[]>([])
const keyword = ref('')
const statusFilter = ref<'all' | MiniPageStatus>('all')
const siteTabs = ref<MiniTabBarItem[]>([])
const templateName = ref('')

const collapsed = reactive<Record<string, boolean>>({
  content: true,
  archived: true,
})

const navDialogVisible = ref(false)
const navTarget = ref<PageRecord | null>(null)
const navSlotIndex = ref(0)
const navSaving = ref(false)

const tabPageIds = computed(() => {
  const ids = new Set<number>()
  for (const t of siteTabs.value) {
    if (t.pageId != null && t.pageId !== '') ids.add(Number(t.pageId))
  }
  return ids
})

const tabIndexByPageId = computed(() => {
  const map = new Map<number, number>()
  siteTabs.value.forEach((t, i) => {
    if (t.pageId != null && t.pageId !== '') map.set(Number(t.pageId), i)
  })
  return map
})

const listablePages = computed(() =>
  pages.value.filter((row) => !String(row.path || '').includes('/pages/mine/mine')),
)

const totalCount = computed(() => listablePages.value.length)

const filteredPages = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  return listablePages.value.filter((row) => {
    if (q) {
      const hay = `${row.name || ''} ${row.path || ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    if (statusFilter.value !== 'all') {
      if (resolvePageStatus(row) !== statusFilter.value) return false
    }
    return true
  })
})

const statusFilters = computed(() => {
  const counts: Record<string, number> = { all: 0, pending: 0, live: 0, draft: 0 }
  for (const row of listablePages.value) {
    counts.all += 1
    const st = resolvePageStatus(row)
    if (st === 'pending' || st === 'live' || st === 'draft') counts[st] += 1
  }
  return [
    { key: 'all' as const, label: '全部', count: counts.all },
    { key: 'pending' as const, label: '待发布', count: counts.pending },
    { key: 'live' as const, label: '已上线', count: counts.live },
    { key: 'draft' as const, label: '草稿', count: counts.draft },
  ]
})

function resolveGroup(row: PageRecord): PageGroup {
  const meta = row as PageRecord & { archived?: boolean | number; pageGroup?: string }
  if (meta.archived === true || meta.archived === 1) return 'archived'
  if (tabPageIds.value.has(Number(row.id))) return 'tab'
  return inferPageGroup(meta)
}

const visibleGroups = computed(() => {
  const order: PageGroup[] = ['tab', 'activity', 'content', 'archived']
  const buckets: Record<PageGroup, PageRecord[]> = {
    tab: [],
    activity: [],
    content: [],
    archived: [],
  }
  for (const row of filteredPages.value) {
    buckets[resolveGroup(row)].push(row)
  }
  // tab 组按导航顺序
  buckets.tab.sort((a, b) => {
    const ia = tabIndexByPageId.value.get(Number(a.id)) ?? 99
    const ib = tabIndexByPageId.value.get(Number(b.id)) ?? 99
    return ia - ib
  })

  const hints: Partial<Record<PageGroup, string>> = {
    tab: '顺序与真机底部一致',
    content: contentPreview(buckets.content),
    archived: '旧首页、旧模板副本，可恢复',
  }

  return order.map((key) => {
    const collapsible = key === 'content' || key === 'archived'
    return {
      key,
      label: PAGE_GROUP_LABELS[key],
      rows: buckets[key],
      hint: hints[key],
      collapsible,
      collapsed: collapsible ? !!collapsed[key] : false,
    }
  })
})

function contentPreview(rows: PageRecord[]) {
  if (!rows.length) return '知识商城、阅读清单…'
  return rows
    .slice(0, 3)
    .map((r) => r.name)
    .join('、') + (rows.length > 3 ? '…' : '')
}

function toggleGroup(key: string) {
  if (key !== 'content' && key !== 'archived') return
  collapsed[key] = !collapsed[key]
}

function formatRel(t?: string) {
  if (!t) return ''
  const ts = Date.parse(String(t).replace(' ', 'T'))
  if (!Number.isFinite(ts)) return String(t).slice(0, 16)
  const diff = Date.now() - ts
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
  return String(t).replace('T', ' ').slice(5, 16)
}

function rowSubtitle(row: PageRecord, group: PageGroup) {
  const parts: string[] = []
  if (group === 'tab') {
    const idx = tabIndexByPageId.value.get(Number(row.id))
    if (idx != null) parts.push(`导航 ${idx + 1}`)
  }
  if (templateName.value) parts.push(templateName.value)
  const time = formatRel(row.updateTime || row.updated_at || row.createTime || row.created_at)
  if (time) parts.push(time)
  const st = resolvePageStatus(row)
  if (st === 'pending') parts.push('有未发布改动')
  return parts.join(' · ') || String(row.path || '')
}

function isAiHint(row: PageRecord) {
  return /AI|ai生成|智能/.test(String(row.name || '')) || /ai/i.test(String(row.path || ''))
}

function isArchived(row: PageRecord) {
  return resolvePageStatus(row) === 'archived'
}

function canOffline(row: PageRecord) {
  const st = resolvePageStatus(row)
  return st === 'live' || st === 'pending'
}

function canDelete(row: PageRecord) {
  return resolvePageStatus(row) === 'draft'
}

function openEditor(row: PageRecord) {
  router.push(`/mini/pages/${row.id}/editor`)
}

const ACCENTS = ['#b4430f', '#1d6bb8', '#1f7a4d', '#8f5400', '#6b4c9a', '#a33b5c']

function thumbAccent(row: PageRecord) {
  const seed = `${row.path || ''}|${row.name || ''}|${row.id || ''}`
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return ACCENTS[h % ACCENTS.length]
}

function thumbLayers(row: PageRecord) {
  const name = String(row.name || '页面')
  const path = String(row.path || '').split('/').filter(Boolean).slice(-1)[0] || '自定义'
  return [name, path, resolvePageStatus(row)]
}

/** 列表缩略图：有 id 时尝试 iframe 预览；失败时组件仍可无 src 降级 */
function thumbSrc(row: PageRecord) {
  if (!row.id) return undefined
  // 列表大量 iframe 成本高：仅对导航组前 5 页启用真预览
  const inTab = tabPageIds.value.has(Number(row.id))
  if (!inTab && resolveGroup(row) !== 'activity') return undefined
  const { href } = router.resolve({ path: `/page-builder/preview/${row.id}` })
  return href
}

async function onMore(cmd: string, row: PageRecord) {
  if (cmd === 'preview') {
    const { href } = router.resolve({ path: `/page-builder/preview/${row.id}` })
    window.open(href, '_blank', 'noopener,noreferrer')
    return
  }
  if (cmd === 'copy-path') {
    try {
      await navigator.clipboard.writeText(String(row.path || ''))
      ElMessage.success('路径已复制')
    } catch {
      ElMessage.info(String(row.path || ''))
    }
    return
  }
  if (cmd === 'duplicate') {
    try {
      await ElMessageBox.confirm(`复制「${row.name}」为新草稿？`, '复制页面', { type: 'info' })
    } catch {
      return
    }
    try {
      let newId = 0
      try {
        const res = await duplicatePage(Number(row.id))
        newId = Number((res as { data?: { id?: number } })?.data?.id || 0)
      } catch {
        const suffix = Date.now().toString(36).slice(-4)
        const res = await createPage({
          name: `${row.name || '页面'}-副本-${suffix}`,
          type: (row.type as 1 | 2 | 3) || 3,
          path: `pages/custom/copy-${suffix}`,
        })
        newId = Number((res as { data?: { id?: number } })?.data?.id || 0)
      }
      if (!newId) throw new Error('未返回新页面 id')
      ElMessage.success('已复制为草稿')
      await load()
      router.push(`/mini/pages/${newId}/editor`)
    } catch (e: unknown) {
      ElMessage.error(e instanceof Error ? e.message : '复制失败')
    }
    return
  }
  if (cmd === 'archive') {
    try {
      await ElMessageBox.confirm(
        `将「${row.name}」归档？归档后从常用列表隐藏，可在「归档」分组恢复。`,
        '归档页面',
        { type: 'warning' },
      )
    } catch {
      return
    }
    try {
      await updatePage(Number(row.id), { pageGroup: 'archived', archived: 1 })
      ElMessage.success('已归档')
      await load()
    } catch {
      ElMessage.info('当前接口尚未支持归档字段（pageGroup/archived），请保留草稿或移出导航后手动管理')
    }
    return
  }
  if (cmd === 'set-nav') {
    navTarget.value = row
    navSlotIndex.value = 0
    navDialogVisible.value = true
    return
  }
  if (cmd === 'offline') {
    try {
      await ElMessageBox.confirm(`确认下线「${row.name}」？`, '下线页面', { type: 'warning' })
      await unpublishPage(Number(row.id))
      ElMessage.success('已下线')
      await load()
    } catch (e: unknown) {
      if (e !== 'cancel' && e instanceof Error) ElMessage.error(e.message)
    }
    return
  }
  if (cmd === 'delete') {
    try {
      await ElMessageBox.confirm(`确认删除草稿「${row.name}」？不可恢复。`, '删除', { type: 'warning' })
      await deletePage(Number(row.id))
      ElMessage.success('已删除')
      await load()
    } catch (e: unknown) {
      if (e !== 'cancel' && e instanceof Error) ElMessage.error(e.message)
    }
  }
}

async function confirmSetNav() {
  if (!navTarget.value) return
  if (!siteTabs.value.length) {
    ElMessage.warning('尚未配置底部导航，请先到概览添加')
    return
  }
  navSaving.value = true
  try {
    const next = siteTabs.value.map((t) => ({ ...t }))
    const i = navSlotIndex.value
    const page = navTarget.value
    next[i] = {
      ...next[i],
      pageId: page.id,
      pagePath: String(page.path || '').replace(/^\//, ''),
      pageName: page.name,
      text: next[i].text || page.name,
    }
    await updateMiniSite({ tabBar: next })
    ElMessage.success('已写入导航草稿，请去发布')
    navDialogVisible.value = false
    siteTabs.value = next
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '设置失败')
  } finally {
    navSaving.value = false
  }
}

async function createBlank() {
  try {
    await ElMessageBox.confirm('将创建空白自定义页并进入装修器', '新建空白页', { type: 'info' })
  } catch {
    return
  }
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
    const [res, site] = await Promise.all([
      getPageList({ current: 1, size: 200 }),
      getMiniSite('draft').catch(() => null),
    ])
    const data = (res as { data?: { records?: PageRecord[]; list?: PageRecord[] } })?.data
    pages.value = (data?.records || data?.list || []) as PageRecord[]
    siteTabs.value = site?.tabBar || []
    templateName.value = site?.templateName || ''
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '加载页面失败')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped lang="scss">
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}
.capsules { display: flex; flex-wrap: wrap; gap: 6px; }

.group-panel {
  margin-bottom: 12px;
  padding: 0;
  overflow: hidden;
  &.is-collapsed {
    border-style: dashed;
    background: transparent;
  }
}
.group-head {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border: 0;
  background: transparent;
  cursor: pointer;
  color: inherit;
  text-align: left;
}
.group-head__left {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  h2 { margin: 0; font-size: 15px; font-weight: 650; }
}
.count {
  font-size: 12px;
  color: var(--mw-muted);
  background: #f0ebe3;
  padding: 1px 8px;
  border-radius: 999px;
}
.hint { font-size: 12px; color: var(--mw-muted); }
.chevron { color: var(--mw-muted); font-size: 14px; }

.page-rows {
  display: flex;
  flex-direction: column;
  padding: 0 12px 12px;
}
.page-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 8px;
  border-top: 1px solid var(--mw-border);
}
.page-row__main { flex: 1; min-width: 0; }
.page-row__name {
  font-weight: 650;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.page-row__sub {
  margin-top: 3px;
  font-size: 12px;
  color: var(--mw-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ai-badge {
  font-size: 11px;
  font-weight: 500;
  color: var(--mw-blue);
  background: var(--mw-blue-bg);
  padding: 1px 6px;
  border-radius: 4px;
}
.decor { font-weight: 500; flex-shrink: 0; }
.more-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--mw-border);
  border-radius: 8px;
  background: var(--mw-card);
  cursor: pointer;
  color: var(--mw-muted);
  font-size: 16px;
  line-height: 1;
}
.empty-hint {
  margin: 0;
  padding: 8px 16px 16px;
  font-size: 13px;
  color: var(--mw-muted);
}

.nav-dialog-hint { font-size: 13px; color: var(--mw-muted); margin: 0 0 12px; }
.nav-slots {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}
.muted { color: var(--mw-muted); font-size: 12px; }
</style>
