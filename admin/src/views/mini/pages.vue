<template>
  <div class="mini-wb mw-page pages-view" v-loading="loading && loaded">
    <MiniSkeleton v-if="!loaded" kind="list" />
    <template v-else>
      <MiniOpsConceptBanner variant="pages" />
      <div class="head">
        <div>
          <h1 class="h1">页面</h1>
          <div class="sub">
            共 {{ totalCount + groupCounts.system }} 个 · 系统页 {{ groupCounts.system }} ·
            装修页 {{ groupCounts.decorate }} · AI 页面 {{ groupCounts.ai }} · 活动与专题 {{ groupCounts.activity }}
          </div>
        </div>
        <div class="actions">
          <button
            type="button"
            class="btn"
            @click="router.push({ path: '/mini/templates', query: { tab: 'page' } })"
          >
            <MiniIcon name="grid" :size="15" />
            从模板新建
          </button>
          <button type="button" class="btn" @click="createBlank">
            <MiniIcon name="plus" :size="15" />
            空白页面
          </button>
          <button type="button" class="btn primary" @click="router.push('/mini/pages/new-ai')">
            <MiniIcon name="spark" :size="15" />
            AI 生成页面
          </button>
        </div>
      </div>

      <div class="filters">
        <label class="search">
          <MiniIcon name="search" :size="15" />
          <input v-model="keyword" type="search" placeholder="搜索页面名称或路径" aria-label="搜索页面" />
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
          {{ opt.label }} {{ opt.count }}
        </button>
      </div>

      <div class="groups-stack">
        <template v-for="group in visibleGroups" :key="group.key">
          <section
            class="group"
            :class="{ arch: group.key === 'archived', closed: closedGroups[group.key] && !filtering }"
          >
            <button
              type="button"
              class="g-head"
              :aria-expanded="!(closedGroups[group.key] && !filtering)"
              @click="toggleGroup(group.key)"
            >
              <b>{{ group.label }}</b>
              <span class="faint">{{ group.total }} 个</span>
              <span v-if="groupSub(group.key)" class="faint g-head__note">{{ groupSub(group.key) }}</span>
              <span class="g-head__arrow" :class="{ closed: closedGroups[group.key] && !filtering }">
                <MiniIcon name="down" :size="16" />
              </span>
            </button>

            <template v-if="!(closedGroups[group.key] && !filtering)">
              <!-- 系统页：小程序内置原生页，不可装修，只能改配置或绑导航位 -->
              <template v-if="group.key === 'system'">
                <div v-for="sp in systemRows" :key="'sys-' + sp.path" class="prow sys-row">
                  <div class="thumb">
                    <i style="background: #e2ddd4" /><i style="background: #e2ddd4" /><i style="background: #e2ddd4" />
                  </div>
                  <div class="pname">
                    <b>{{ sp.name }}</b>
                    <div class="faint">{{ sp.desc }} · {{ sp.path }}</div>
                  </div>
                  <div class="prow-ops">
                    <span class="tag t-live">系统页</span>
                    <span v-if="tabSlotByPath(sp)" class="tag t-slot">导航位 {{ tabSlotByPath(sp) }}</span>
                    <button type="button" class="btn soft sm" @click="router.push('/mini/appearance')">
                      配置
                    </button>
                  </div>
                </div>
                <div v-if="!systemRows.length" class="muted" style="padding: 14px 16px">
                  没有符合条件的系统页
                </div>
              </template>

              <template v-else-if="group.rows.length">
                <div v-for="row in group.rows" :key="String(row.id)" class="prow">
                  <div class="thumb">
                    <i
                      v-for="(c, i) in thumbColors(row)"
                      :key="i"
                      :style="{ background: c }"
                    />
                  </div>
                  <div class="pname">
                    <b>{{ row.name }}</b>
                    <div class="faint">{{ rowSub(row) }}</div>
                  </div>
                  <div class="prow-ops">
                    <div class="pstat">
                      <PageStatusTag :row="row" />
                      <span v-if="isTestPage(row)" class="tag t-err" style="margin-left: 4px">测试</span>
                    </div>
                    <button type="button" class="btn soft sm" @click="openEditor(row)">装修</button>
                    <PageRowMenu
                      :row="row"
                      :archived="isArchived(row)"
                      :is-nav="tabIndexOf(row) >= 0"
                      :is-activity="inferPageGroup(row) === 'activity'"
                      :is-test="isTestPage(row)"
                      :can-offline="canOffline(row)"
                      :can-delete="canDelete(row)"
                      @command="onMore"
                    />
                  </div>
                </div>
              </template>
              <div v-else class="muted" style="padding: 14px 16px">
                这一组还没有页面
              </div>
            </template>
          </section>
        </template>
        <div v-if="!visibleGroups.length" class="card muted">没有符合条件的页面</div>
      </div>
    </template>

    <el-dialog
      v-model="navDialogVisible"
      class="mini-wb-overlay"
      :title="navDialogMode === 'entry' ? '设置入口' : '设为导航入口'"
      width="440px"
    >
      <p class="nav-dialog-hint">
        {{
          navDialogMode === 'entry'
            ? '可选底部导航位，并设置活动到期时间（到期后发布前会拦截）。'
            : '将「' + (navTarget?.name || '') + '」绑定到选中的底部导航位（写入草稿，需保存并同步）。'
        }}
      </p>
      <el-radio-group v-model="navSlotIndex" class="nav-slots">
        <el-radio v-for="(tab, i) in siteTabs" :key="i" :value="i">
          {{ i + 1 }}. {{ tab.text || `导航 ${i + 1}` }}
          <span class="muted">（现：{{ tab.pageName || tab.pagePath || '未绑定' }}）</span>
        </el-radio>
      </el-radio-group>
      <div v-if="navDialogMode === 'entry'" class="entry-expire">
        <label class="faint">入口到期（可选）</label>
        <el-date-picker
          v-model="entryExpireAt"
          type="datetime"
          value-format="YYYY-MM-DD HH:mm:ss"
          placeholder="不填则长期有效"
          style="width: 100%"
        />
      </div>
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
import MiniOpsConceptBanner from '@/components/mini/MiniOpsConceptBanner.vue'
import MiniSkeleton from '@/components/mini/MiniSkeleton.vue'
import { getPageList, createPage, deletePage, unpublishPage, duplicatePage, updatePage } from '@/api/page'
import { getMiniSite, updateMiniSite, type MiniTabBarItem } from '@/api/miniSite'
import {
  inferPageGroup,
  PAGE_GROUP_LABELS,
  PAGE_GROUP_SUB,
  MINI_SYSTEM_PAGES,
  resolvePageStatus,
  type MiniPageStatus,
  type MiniSystemPage,
  type PageGroup,
} from '@/utils/pageStatus'
import type { PageRecord } from '@/types/page'

defineOptions({ name: 'MiniPages' })

const THUMB_PALETTE = ['#E8C4A8', '#C9D6E8', '#C5DCC9', '#E8D5A8', '#E0C4D4', '#D9CFC3', '#F0D5C0', '#B7D4BC']

const router = useRouter()
const loading = ref(false)
const loaded = ref(false)
const pages = ref<PageRecord[]>([])
const keyword = ref('')
const statusFilter = ref<'all' | MiniPageStatus>('all')
const siteTabs = ref<MiniTabBarItem[]>([])
const closedGroups = reactive<Record<string, boolean>>({ archived: true })

const navDialogVisible = ref(false)
const navDialogMode = ref<'nav' | 'entry'>('nav')
const navTarget = ref<PageRecord | null>(null)
const navSlotIndex = ref(0)
const navSaving = ref(false)
const entryExpireAt = ref<string | null>(null)

const filtering = computed(() => !!keyword.value.trim() || statusFilter.value !== 'all')

const totalCount = computed(() =>
  pages.value.filter((row) => !String(row.path || '').includes('/pages/mine/mine')).length,
)

/** 各分组计数（系统页取自内置清单，其余来自库表页面） */
const groupCounts = computed<Record<PageGroup, number>>(() => {
  const c: Record<PageGroup, number> = {
    system: MINI_SYSTEM_PAGES.length,
    decorate: 0,
    ai: 0,
    activity: 0,
    archived: 0,
  }
  for (const row of pages.value) {
    if (String(row.path || '').includes('/pages/mine/mine')) continue
    c[inferPageGroup(row)] += 1
  }
  return c
})

function matchRow(row: PageRecord) {
  const path = String(row.path || '')
  if (path.includes('/pages/mine/mine')) return false
  const q = keyword.value.trim().toLowerCase()
  if (q) {
    const hay = `${row.name || ''} ${path}`.toLowerCase()
    if (!hay.includes(q)) return false
  }
  if (statusFilter.value !== 'all' && resolvePageStatus(row) !== statusFilter.value) return false
  return true
}

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
    { key: 'pending' as const, label: '待同步', count: counts.pending },
    { key: 'live' as const, label: '已上线', count: counts.live },
    { key: 'draft' as const, label: '草稿', count: counts.draft },
    { key: 'offline' as const, label: '已下线', count: counts.offline },
    { key: 'archived' as const, label: '归档', count: counts.archived },
  ]
})

/**
 * 分组顺序：系统页 → 装修页 → AI 页面 → 活动与专题 → 归档。
 * 旧口径把「底部导航」当分类，槽位与页面混排；现在按页面来源分，
 * 导航绑定退化为行内标签（rowSub 里的「导航 N」）。
 */
const GROUP_ORDER: PageGroup[] = ['system', 'decorate', 'ai', 'activity', 'archived']

const groups = computed(() => {
  const buckets: Record<PageGroup, PageRecord[]> = {
    system: [], decorate: [], ai: [], activity: [], archived: [],
  }
  const totals: Record<PageGroup, number> = { ...groupCounts.value }
  for (const row of pages.value) {
    if (String(row.path || '').includes('/pages/mine/mine')) continue
    const g = inferPageGroup(row)
    if (matchRow(row)) buckets[g].push(row)
  }
  return GROUP_ORDER.map((key) => ({
    key,
    label: PAGE_GROUP_LABELS[key],
    rows: buckets[key],
    total: totals[key],
  }))
})

/** 系统页行：来自内置清单，不是库表页面；无页面状态，故只在「全部」筛选下展示 */
const systemRows = computed(() => {
  if (statusFilter.value !== 'all') return []
  const q = keyword.value.trim().toLowerCase()
  if (!q) return MINI_SYSTEM_PAGES
  return MINI_SYSTEM_PAGES.filter((s) => `${s.name} ${s.path}`.toLowerCase().includes(q))
})

/** 筛选时藏空组；未筛选时全部展示（空组给引导文案） */
const visibleGroups = computed(() => {
  if (!filtering.value) return groups.value
  return groups.value.filter((g) =>
    g.key === 'system' ? systemRows.value.length > 0 : g.rows.length > 0,
  )
})

function groupSub(key: PageGroup) {
  return PAGE_GROUP_SUB[key] || ''
}

function toggleGroup(key: string) {
  if (filtering.value) return
  closedGroups[key] = !closedGroups[key]
}

function tabIndexOf(row: PageRecord) {
  const id = Number(row.id)
  const path = String(row.path || '').replace(/^\//, '')
  const i = siteTabs.value.findIndex((t) => {
    if (t.pageId != null && Number(t.pageId) === id) return true
    const tp = String(t.pagePath || '').replace(/^\//, '')
    return tp && (tp === path || path.endsWith(tp))
  })
  return i
}

function formatUpdated(row: PageRecord) {
  const t = String((row as any).updateTime || (row as any).updatedAt || '')
  if (!t) return ''
  const s = t.replace('T', ' ')
  if (s.length >= 16) return s.slice(5, 16)
  return s.slice(0, 16)
}

function isTestPage(row: PageRecord) {
  return !!(row as any).isTest || (row as any).is_test === 1
}

/** 系统页当前占着哪个底部导航位（1-based）；0 = 该位置已改用装修页 */
function tabSlotByPath(sp: MiniSystemPage) {
  const want = String(sp.path || '').replace(/^\//, '')
  const i = siteTabs.value.findIndex((t) => {
    const tp = String(t.pagePath || '').replace(/^\//, '')
    if (!tp) return false
    return tp === want || tp.endsWith('/' + want) || want.endsWith(tp)
  })
  return i >= 0 ? i + 1 : 0
}

function rowSub(row: PageRecord) {
  const parts: string[] = []
  const ti = tabIndexOf(row)
  if (ti >= 0) parts.push(`导航 ${ti + 1}`)
  else if (pages.value.some((p) => p.name === row.name && Number(p.id) !== Number(row.id))) {
    parts.push('同名但未绑导航')
  }
  const exp = String((row as any).entryExpireAt || (row as any).entry_expire_at || '')
  if (exp) parts.push(`到期 ${exp.slice(0, 16)}`)
  const src = String((row as any).source || (row as any).src || '').trim()
  if (src) parts.push(src)
  const upd = formatUpdated(row)
  if (upd) parts.push(upd)
  if (!parts.length) parts.push(String(row.path || ''))
  return parts.join(' · ')
}

function thumbColors(row: PageRecord): string[] {
  const fromApi = (row as any).thumbColors
  if (Array.isArray(fromApi) && fromApi.length) {
    return fromApi.slice(0, 4).map(String)
  }
  const id = Number(row.id) || 0
  return [0, 1, 2].map((i) => THUMB_PALETTE[(id + i * 2) % THUMB_PALETTE.length])
}

function isArchived(row: PageRecord) {
  return resolvePageStatus(row) === 'archived'
}

function canOffline(row: PageRecord) {
  const st = resolvePageStatus(row)
  return st === 'live' || st === 'pending'
}

function canDelete(row: PageRecord) {
  // 与后端 PageServiceImpl.deletePage 的约束对齐：仅 status=1（已发布）不可删除。
  // 草稿(0) / 已下线(2) / 归档 均可删除；已上线页需先「下线」再删。
  // 旧实现只放行 'draft'，导致归档组里的测试页、已下线页都没有删除入口。
  return Number((row as any).status ?? 0) !== 1
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
    if (tabIndexOf(row) >= 0) {
      ElMessage.info('该页已在底部导航中')
      return
    }
    navTarget.value = row
    navSlotIndex.value = 0
    navDialogMode.value = 'nav'
    entryExpireAt.value = null
    navDialogVisible.value = true
    return
  }
  if (cmd === 'set-entry') {
    navTarget.value = row
    navSlotIndex.value = tabIndexOf(row) >= 0 ? tabIndexOf(row) : 0
    navDialogMode.value = 'entry'
    entryExpireAt.value = String((row as any).entryExpireAt || (row as any).entry_expire_at || '') || null
    navDialogVisible.value = true
    return
  }
  if (cmd === 'toggle-test') {
    const next = isTestPage(row) ? 0 : 1
    try {
      await ElMessageBox.confirm(
        next ? `将「${row.name}」标为测试页？正式发布前检查会拦截导航绑定。` : `取消「${row.name}」的测试页标记？`,
        next ? '标为测试页' : '取消测试',
        { type: 'warning' },
      )
      await updatePage(Number(row.id), { isTest: next } as any)
      ElMessage.success(next ? '已标为测试页' : '已取消测试')
      await load()
    } catch (e: any) {
      if (e !== 'cancel' && e?.message) ElMessage.error(e.message)
    }
    return
  }
  if (cmd === 'rename') {
    try {
      const { value } = await ElMessageBox.prompt('页面名称', '重命名', {
        inputValue: String(row.name || ''),
        inputPattern: /\S+/,
        inputErrorMessage: '名称不能为空',
      })
      await updatePage(Number(row.id), { name: String(value).trim() })
      ElMessage.success('已重命名')
      await load()
    } catch (e: any) {
      if (e !== 'cancel' && e?.message) ElMessage.error(e.message)
    }
    return
  }
  if (cmd === 'archive') {
    try {
      await ElMessageBox.confirm(`确认归档「${row.name}」？可从归档组恢复`, '归档', { type: 'warning' })
      await updatePage(Number(row.id), { archived: 1, pageGroup: 'archived' } as any)
      ElMessage.success('已归档')
      await load()
    } catch (e: any) {
      if (e !== 'cancel' && e?.message) ElMessage.error(e.message)
    }
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
      await ElMessageBox.confirm(`确认删除「${row.name}」？不可恢复`, '删除', { type: 'warning' })
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
    ElMessage.warning('尚未配置底部导航，请先到「外观」添加')
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
    if (navDialogMode.value === 'entry' || entryExpireAt.value) {
      await updatePage(Number(page.id), {
        pageGroup: 'activity',
        entryExpireAt: entryExpireAt.value || '',
      } as any)
    }
    ElMessage.success('已写入导航草稿，请到外观或概览「保存并同步」')
    navDialogVisible.value = false
    siteTabs.value = next
    await load()
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
.sys-row {
  background: var(--soft);
}
.g-head__note {
  margin-left: auto;
}
.g-head__arrow {
  display: inline-flex;
  color: var(--faint);
  transition: transform 0.15s ease;
  &.closed { transform: rotate(-90deg); }
  &:not(.g-head__note + &) { margin-left: 4px; }
}
.g-head:not(:has(.g-head__note)) .g-head__arrow {
  margin-left: auto;
}
.inline-ic { display: inline-block; vertical-align: -2px; color: var(--faint); }
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
.entry-expire {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
