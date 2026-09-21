<template>
  <div class="mini-page" v-loading="loading">
    <header class="page-head">
      <div>
        <div class="page-head__kicker">小程序 · 页面</div>
        <h1>页面</h1>
        <p>按导航 / 活动 / 内容 / 归档分组。主操作是装修；「我的」为固定路径壳页。</p>
      </div>
      <div class="page-head__actions">
        <el-button @click="router.push('/mini/pages/new-ai')">AI 生成</el-button>
        <el-button type="primary" class="btn-terracotta" @click="createBlank">空白新建</el-button>
      </div>
    </header>

    <div class="filters">
      <el-input
        v-model="keyword"
        clearable
        placeholder="搜索页面名 / 路径"
        style="max-width: 260px"
      />
      <div class="status-capsules">
        <button
          v-for="opt in statusFilters"
          :key="opt.key"
          type="button"
          class="capsule"
          :class="{ active: statusFilter === opt.key }"
          @click="statusFilter = opt.key"
        >
          {{ opt.label }}
          <span class="capsule__n">{{ opt.count }}</span>
        </button>
      </div>
    </div>

    <section v-for="group in groups" :key="group.key" class="group-panel">
      <div class="group-panel__head">
        <h2>{{ group.label }}</h2>
        <span class="group-panel__count">{{ group.rows.length }}</span>
      </div>

      <div v-if="group.key === 'tab'" class="mine-lock" @click="router.push('/page-builder/mine')">
        <el-icon><Lock /></el-icon>
        <div class="mine-lock__text">
          <b>我的</b>
          <span>固定路径 · 表单配置，非可删装修页</span>
        </div>
        <el-button size="small" @click.stop="router.push('/page-builder/mine')">配置</el-button>
      </div>

      <div v-if="group.rows.length" class="page-rows">
        <div v-for="row in group.rows" :key="String(row.id)" class="page-row">
          <div class="page-row__main">
            <div class="page-row__name">{{ row.name }}</div>
            <div class="page-row__path">{{ row.path }}</div>
          </div>
          <PageStatusTag :row="row" />
          <el-button type="primary" size="small" class="btn-terracotta" @click="openEditor(row)">装修</el-button>
          <el-dropdown trigger="click" @command="(cmd: string) => onMore(cmd, row)">
            <el-button size="small">更多</el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="preview">预览</el-dropdown-item>
                <el-dropdown-item command="copy-path">复制路径</el-dropdown-item>
                <el-dropdown-item command="set-nav" :disabled="isArchived(row)">设为导航入口</el-dropdown-item>
                <el-dropdown-item
                  v-if="canOffline(row)"
                  command="offline"
                  divided
                >
                  下线
                </el-dropdown-item>
                <el-dropdown-item
                  v-if="canDelete(row)"
                  command="delete"
                  divided
                >
                  删除
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
      <el-empty v-else-if="group.key !== 'tab'" :description="`暂无${group.label}页`" :image-size="48" />
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
        <el-button type="primary" class="btn-terracotta" :loading="navSaving" @click="confirmSetNav">
          确认
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Lock } from '@element-plus/icons-vue'
import PageStatusTag from '@/components/mini/PageStatusTag.vue'
import { getPageList, createPage, deletePage, unpublishPage } from '@/api/page'
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
const pages = ref<PageRecord[]>([])
const keyword = ref('')
const statusFilter = ref<'all' | MiniPageStatus>('all')
const siteTabs = ref<MiniTabBarItem[]>([])

const navDialogVisible = ref(false)
const navTarget = ref<PageRecord | null>(null)
const navSlotIndex = ref(0)
const navSaving = ref(false)

const filteredPages = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  return pages.value.filter((row) => {
    const path = String(row.path || '')
    if (path.includes('/pages/mine/mine')) return false
    if (q) {
      const hay = `${row.name || ''} ${path}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    if (statusFilter.value !== 'all') {
      if (resolvePageStatus(row) !== statusFilter.value) return false
    }
    return true
  })
})

const statusFilters = computed(() => {
  const counts: Record<string, number> = { all: 0, pending: 0, live: 0, draft: 0, archived: 0 }
  for (const row of pages.value) {
    if (String(row.path || '').includes('/pages/mine/mine')) continue
    counts.all += 1
    const st = resolvePageStatus(row)
    if (st in counts) counts[st] += 1
  }
  return [
    { key: 'all' as const, label: '全部', count: counts.all },
    { key: 'pending' as const, label: '待发布', count: counts.pending },
    { key: 'live' as const, label: '已上线', count: counts.live },
    { key: 'draft' as const, label: '草稿', count: counts.draft },
    { key: 'archived' as const, label: '归档', count: counts.archived },
  ]
})

const groups = computed(() => {
  const order: PageGroup[] = ['tab', 'activity', 'content', 'archived']
  const buckets: Record<PageGroup, PageRecord[]> = {
    tab: [],
    activity: [],
    content: [],
    archived: [],
  }
  for (const row of filteredPages.value) {
    buckets[inferPageGroup(row)].push(row)
  }
  return order.map((key) => ({
    key,
    label: PAGE_GROUP_LABELS[key],
    rows: buckets[key],
  }))
})

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

async function onMore(cmd: string, row: PageRecord) {
  if (cmd === 'preview') {
    const { href } = router.resolve({
      path: `/page-builder/preview/${row.id}`,
    })
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
    } catch (e: any) {
      if (e !== 'cancel' && e?.message) ElMessage.error(e.message)
    }
    return
  }
  if (cmd === 'delete') {
    try {
      await ElMessageBox.confirm(`确认删除草稿「${row.name}」？不可恢复。`, '删除', { type: 'warning' })
      await deletePage(Number(row.id))
      ElMessage.success('已删除')
      await load()
    } catch (e: any) {
      if (e !== 'cancel' && e?.message) ElMessage.error(e.message)
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
  } catch (e: any) {
    ElMessage.error(e?.message || '设置失败')
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
  const suffix = Date.now().toString(36).slice(-5)
  try {
    const res = await createPage({
      name: `未命名页面-${suffix}`,
      type: 3,
      path: `pages/custom/p-${suffix}`,
    })
    const id = Number((res as any)?.data?.id || 0)
    if (!id) throw new Error('未返回页面 id')
    ElMessage.success('已创建')
    router.push(`/mini/pages/${id}/editor`)
  } catch (e: any) {
    ElMessage.error(e?.message || '创建失败')
  }
}

async function load() {
  loading.value = true
  try {
    const [res, site] = await Promise.all([
      getPageList({ current: 1, size: 100 }),
      getMiniSite('draft').catch(() => null),
    ])
    pages.value = ((res as any)?.data?.records || (res as any)?.data?.list || []) as PageRecord[]
    siteTabs.value = site?.tabBar || []
  } catch (e: any) {
    ElMessage.error(e?.message || '加载页面失败')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped lang="scss">
.mini-page {
  --mini-bg: #f6f2ec;
  --mini-terracotta: #b4430f;
  --mini-ink: #2c241c;
  --mini-muted: #7a6e64;
  --mini-card: #fffcf8;
  --mini-border: #e5ddd2;
  min-height: 100%;
  margin: -16px;
  padding: 20px 24px 40px;
  background: var(--mini-bg);
  color: var(--mini-ink);
}
.page-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  h1 { margin: 4px 0; font-size: 24px; }
  p { margin: 0; color: var(--mini-muted); font-size: 13px; max-width: 520px; }
}
.page-head__kicker { font-size: 12px; color: var(--mini-muted); }
.page-head__actions { display: flex; gap: 8px; }
.btn-terracotta {
  --el-button-bg-color: var(--mini-terracotta);
  --el-button-border-color: var(--mini-terracotta);
  --el-button-hover-bg-color: #9a390d;
  --el-button-hover-border-color: #9a390d;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}
.status-capsules { display: flex; flex-wrap: wrap; gap: 6px; }
.capsule {
  border: 1px solid var(--mini-border);
  background: var(--mini-card);
  color: var(--mini-ink);
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 12px;
  cursor: pointer;
  &.active {
    border-color: var(--mini-terracotta);
    color: var(--mini-terracotta);
    background: #fdf0e6;
  }
}
.capsule__n {
  margin-left: 4px;
  opacity: 0.7;
}

.group-panel {
  background: var(--mini-card);
  border: 1px solid var(--mini-border);
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 14px;
}
.group-panel__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  h2 { margin: 0; font-size: 15px; }
}
.group-panel__count {
  font-size: 12px;
  color: var(--mini-muted);
  background: #f0ebe3;
  padding: 1px 8px;
  border-radius: 999px;
}

.mine-lock {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  margin-bottom: 10px;
  border-radius: 8px;
  background: #f8f4ee;
  border: 1px dashed #d4c4b4;
  cursor: pointer;
}
.mine-lock__text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  span { font-size: 12px; color: var(--mini-muted); }
}

.page-rows { display: flex; flex-direction: column; gap: 8px; }
.page-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f8f4ee;
}
.page-row__main { flex: 1; min-width: 0; }
.page-row__name { font-weight: 600; }
.page-row__path { font-size: 12px; color: var(--mini-muted); }

.nav-dialog-hint { font-size: 13px; color: var(--mini-muted); margin: 0 0 12px; }
.nav-slots {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}
.muted { color: var(--mini-muted); font-size: 12px; }
</style>
