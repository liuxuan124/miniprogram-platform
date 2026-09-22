<template>
  <div class="mini-wb mw-page pages-view" v-loading="loading && loaded">
    <MiniSkeleton v-if="!loaded" kind="list" />
    <template v-else>
    <div class="head">
      <div>
        <h1 class="h1">页面</h1>
        <div class="sub">共 {{ totalCount }} 个 · 按用途分组，旧页面收进归档</div>
      </div>
      <div class="actions">
        <button type="button" class="btn" @click="router.push({ path: '/mini/templates', query: { tab: 'page' } })">
          从模板新建
        </button>
        <button type="button" class="btn" @click="createBlank">空白页面</button>
        <button type="button" class="btn primary" @click="router.push('/mini/pages/new-ai')">AI 生成页面</button>
      </div>
    </div>

    <div class="filters">
      <label class="search">
        <MiniIcon name="search" :size="16" />
        <input v-model="keyword" type="search" placeholder="搜索页面名称或路径" />
      </label>
      <button
        v-for="opt in statusFilters"
        :key="opt.key"
        type="button"
        class="chip"
        :class="{ on: statusFilter === opt.key }"
        :aria-pressed="statusFilter === opt.key"
        @click="statusFilter = opt.key"
      >
        {{ opt.label }}{{ opt.count != null ? ` ${opt.count}` : '' }}
      </button>
      <button v-if="filtering" type="button" class="link" @click="clearFilters">清除筛选</button>
    </div>

    <!-- 筛选态：改成平铺一张列表，避免"筛完看到四个空分组" -->
    <section v-if="filtering" class="group">
      <div class="g-head as-static">
        <span style="font-weight: 600">筛选结果</span>
        <span class="faint">{{ filteredPages.length }}</span>
      </div>
      <template v-if="filteredPages.length">
        <div v-for="row in filteredPages" :key="String(row.id)" class="prow">
          <div class="thumb"><i /><i /><i /></div>
          <div class="pname">
            <b>{{ row.name }}</b>
            <div class="faint">{{ groupLabelOf(row) }} · {{ row.path }}</div>
          </div>
          <div class="pstat"><PageStatusTag :row="row" /></div>
          <button type="button" class="btn sm primary" @click="openEditor(row)">装修</button>
          <PageRowMenu
            :row="row"
            :archived="isArchived(row)"
            :can-offline="canOffline(row)"
            :can-delete="canDelete(row)"
            @command="onMore"
          />
        </div>
      </template>
      <div v-else class="empty-mini">
        <span class="muted">没有符合条件的页面</span>
        <button type="button" class="btn sm" @click="clearFilters">清除筛选</button>
      </div>
    </section>

    <div v-else class="groups-stack">
      <section
        v-for="group in groups"
        :key="group.key"
        class="group"
        :class="{ arch: group.key === 'archived', closed: closedGroups[group.key] }"
      >
        <button
          type="button"
          class="g-head"
          :aria-expanded="!closedGroups[group.key]"
          @click="toggleGroup(group.key)"
        >
          <span style="font-weight: 600">{{ group.label }}</span>
          <span class="faint">{{ group.rows.length }}</span>
          <span v-if="groupSub(group.key)" class="faint" style="margin-left: 4px">{{ groupSub(group.key) }}</span>
          <span class="g-head__arrow" :class="{ closed: closedGroups[group.key] }">
            <MiniIcon name="down" :size="16" />
          </span>
        </button>

        <template v-if="!closedGroups[group.key]">
          <div
            v-if="group.key === 'tab'"
            class="prow mine-row"
            @click="router.push('/page-builder/mine')"
          >
            <div class="thumb"><i /><i /><i /></div>
            <div class="pname">
              <b>我的 <MiniIcon name="lock" :size="13" class="inline-ic" /></b>
              <div class="faint">固定路径 · 表单配置，非可删装修页</div>
            </div>
            <div class="pstat"><span class="tag t-live">系统页</span></div>
            <button type="button" class="btn sm" @click.stop="router.push('/page-builder/mine')">配置</button>
          </div>

          <template v-if="group.rows.length">
            <div v-for="row in group.rows" :key="String(row.id)" class="prow">
              <div class="thumb"><i /><i /><i /></div>
              <div class="pname">
                <b>{{ row.name }}</b>
                <div class="faint">{{ row.path }}</div>
              </div>
              <div class="pstat">
                <PageStatusTag :row="row" />
              </div>
              <button type="button" class="btn sm primary" @click="openEditor(row)">装修</button>
              <PageRowMenu
                :row="row"
                :archived="isArchived(row)"
                :can-offline="canOffline(row)"
                :can-delete="canDelete(row)"
                @command="onMore"
              />
            </div>
          </template>
          <div v-else-if="group.key !== 'tab'" class="empty-mini">
            <span class="muted">这一组还没有页面</span>
            <button
              v-if="group.key !== 'archived'"
              type="button"
              class="btn sm"
              @click="router.push({ path: '/mini/templates', query: { tab: 'page' } })"
            >
              从模板加一页
            </button>
          </div>
        </template>
      </section>
    </div>
    </template>

    <el-dialog
      v-model="navDialogVisible"
      class="mini-wb-overlay"
      title="设为导航入口"
      width="420px"
    >
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
import PageRowMenu from '@/components/mini/PageRowMenu.vue'
import MiniIcon from '@/components/mini/MiniIcon.vue'
import MiniSkeleton from '@/components/mini/MiniSkeleton.vue'
import { getPageList, createPage, deletePage, unpublishPage, duplicatePage } from '@/api/page'
import { getMiniSite, updateMiniSite, type MiniTabBarItem } from '@/api/miniSite'
import {
  inferPageGroup,
  PAGE_GROUP_LABELS,
  PAGE_GROUP_SUB,
  resolvePageStatus,
  type MiniPageStatus,
  type PageGroup,
} from '@/utils/pageStatus'
import type { PageRecord } from '@/types/page'

defineOptions({ name: 'MiniPages' })

const router = useRouter()
const loading = ref(false)
const loaded = ref(false)
const pages = ref<PageRecord[]>([])
const keyword = ref('')
const statusFilter = ref<'all' | MiniPageStatus>('all')
const siteTabs = ref<MiniTabBarItem[]>([])
const closedGroups = reactive<Record<string, boolean>>({ archived: true })

const navDialogVisible = ref(false)
const navTarget = ref<PageRecord | null>(null)
const navSlotIndex = ref(0)
const navSaving = ref(false)

const totalCount = computed(() =>
  pages.value.filter((row) => !String(row.path || '').includes('/pages/mine/mine')).length,
)

/** 搜索或状态筛选生效时，分组壳会变成一堆空组，改平铺展示 */
const filtering = computed(() => !!keyword.value.trim() || statusFilter.value !== 'all')

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
  const counts: Record<string, number> = {
    all: 0, pending: 0, live: 0, draft: 0, offline: 0, archived: 0,
  }
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
    { key: 'offline' as const, label: '已下线', count: counts.offline },
    { key: 'archived' as const, label: '归档', count: counts.archived },
  ]
})

const groups = computed(() => {
  const order: PageGroup[] = ['tab', 'activity', 'content', 'archived']
  const buckets: Record<PageGroup, PageRecord[]> = {
    tab: [], activity: [], content: [], archived: [],
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

function groupSub(key: PageGroup) {
  return PAGE_GROUP_SUB[key] || ''
}

function groupLabelOf(row: PageRecord) {
  return PAGE_GROUP_LABELS[inferPageGroup(row)]
}

function toggleGroup(key: string) {
  closedGroups[key] = !closedGroups[key]
}

function clearFilters() {
  keyword.value = ''
  statusFilter.value = 'all'
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

async function onMore(cmd: string, row: PageRecord) {
  if (cmd === 'preview') {
    const { href } = router.resolve({ path: `/page-builder/preview/${row.id}` })
    window.open(href, '_blank', 'noopener,noreferrer')
    return
  }
  if (cmd === 'copy') {
    try {
      const res = await duplicatePage(Number(row.id))
      const id = Number((res as any)?.data?.id || (res as any)?.id || 0)
      ElMessage.success('已复制')
      if (id) router.push(`/mini/pages/${id}/editor`)
      else await load()
    } catch (e: any) {
      ElMessage.error(e?.message || '复制失败')
    }
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
    loaded.value = true
  }
}

onMounted(load)
</script>

<style scoped lang="scss">
.groups-stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.mine-row {
  cursor: pointer;
  background: var(--soft);
}
.g-head.as-static {
  cursor: default;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: var(--soft);
  border-bottom: 1px solid var(--line);
  border-radius: 14px 14px 0 0;
}
.g-head__arrow {
  margin-left: auto;
  display: inline-flex;
  color: var(--faint);
  transition: transform 0.15s ease;
  &.closed { transform: rotate(-90deg); }
}
.inline-ic { display: inline-block; vertical-align: -2px; color: var(--faint); }
.empty-mini {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  flex-wrap: wrap;
}
.nav-dialog-hint {
  font-size: 13px;
  color: var(--mute);
  margin: 0 0 12px;
}
.nav-slots {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}
</style>
