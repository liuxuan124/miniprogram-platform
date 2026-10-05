<script setup lang="ts">
/**
 * ============================================================================
 * 页面管理（Master-Detail 工作台）
 * ============================================================================
 *
 * 整合了原「页面列表」+「页面配置」+「模板库」+「我的页」+「登录页」五个入口。
 * 收敛 rationale：
 *   这五件事操作的是**同一个对象**（一个小程序页面），
 *   拆成 5 个菜单项导致用户要来回跳、且"改标题"和"装修"看起来像两件事。
 *   现在：列表点行 → 右侧抽屉原地改元数据；点「装修」→ 进画布。
 *
 * 数据读取统一走 usePageCatalog（见该文件顶部注释：2026-10-06 的
 * size>100 事故就是绕过它直接 getPageList 造成的）。
 *
 * 🔴 三条不妥协的约束（来自 2026-10-06 事故复盘）：
 *   1. 读取失败与「没有页面」严格区分 —— 不显示 "共 0 个"；
 *   2. 上线/下线是**立即生效**的独立接口，不进草稿 —— 文案必须说清；
 *   3. 页面状态口径与发布中心完全一致（复用 resolvePageStatus）。
 */
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import MiniIcon from '@/components/mini/MiniIcon.vue'
import { loadAllPages, pageKey } from '@/composables/usePageCatalog'
import { getMiniSite, type MiniSiteVO } from '@/api/miniSite'
import { refreshMiniPending } from '@/composables/useMiniPending'
import { updatePage, publishPage, unpublishPage, duplicatePage } from '@/api/page'
import {
  resolvePageStatus,
  inferPageGroup,
  resolveGroupLabel,
  ALL_STANDARD_GROUPS,
  PAGE_GROUP_LABELS,
  type MiniPageStatus,
} from '@/utils/pageStatus'
import type { PageRecord } from '@/types/page'

defineOptions({ name: 'MiniPagesHub' })

const router = useRouter()

/* ─────────────────────────── 状态 ─────────────────────────── */

type ScopeKey = 'all' | 'decorate' | 'system' | 'draft'

const loading = ref(true)
const loadError = ref('')
const pages = ref<PageRecord[]>([])
const site = ref<MiniSiteVO>({})
const scope = ref<ScopeKey>('all')
const keyword = ref('')
const searchRef = ref<HTMLInputElement | null>(null)

/** 抽屉 */
const drawerOpen = ref(false)
const editing = ref<PageRecord | null>(null)
const saving = ref(false)
const form = ref({
  name: '',
  shareTitle: '',
  description: '',
  entryExpireAt: '',
  pageGroup: 'decorate',
  online: true,
})
const advancedOpen = ref(false)

/** 键盘导航 */
const activeIdx = ref(-1)

/* ─────────────────────────── 系统原生页 ─────────────────────────── */

/**
 * 系统原生页 = 由小程序内置模板渲染、不在页面库里的两个页。
 * 🔴 它们不在 mp_page 表中，所以不能用页面列表去查（查不到≠不存在）——
 *    2026-10-06「导航误报首页/内容/星球/商城页面不存在」就是这个成因。
 */
const SYSTEM_PAGES = [
  {
    key: 'mine',
    path: 'pages/mine/mine',
    label: '我的',
    desc: '个人中心：会员卡、我的菜单、设置入口',
    to: '/page-builder/mine',
  },
  {
    key: 'login',
    path: 'pages/login/login',
    label: '登录',
    desc: '登录页：品牌区、登录方式、协议勾选',
    to: '/page-builder/login',
  },
] as const

/* ─────────────────────────── 数据 ─────────────────────────── */

async function load() {
  loading.value = true
  loadError.value = ''
  const cat = await loadAllPages()
  if (cat.status === 'error') {
    // 🔴 不退回空列表：保留错误，让界面显示「读不到」而不是「没有」
    loadError.value = cat.error || '页面列表读取失败'
    pages.value = []
  } else {
    pages.value = cat.pages
  }
  try {
    site.value = (await getMiniSite('draft')) || {}
  } catch {
    // 站点配置读不到不影响页面列表本身，只影响导航引用列
    site.value = {}
  }
  loading.value = false
}

/* ─────────────────────────── 派生 ─────────────────────────── */

const allPages = computed(() => pages.value)

function isSystemPath(p: PageRecord): boolean {
  const path = '/' + String(p?.path || '').replace(/^\//, '')
  return SYSTEM_PAGES.some((s) => s.path === path)
}

const decoratePages = computed(() =>
  allPages.value.filter((p) => !isSystemPath(p) && resolvePageStatus(p) !== 'archived'),
)
const draftPages = computed(() =>
  decoratePages.value.filter((p) => {
    const st = resolvePageStatus(p)
    return st === 'draft' || st === 'pending'
  }),
)

/** 系统原生页行（合成对象，与真实页面行同构以便统一渲染） */
const systemRows = computed(() =>
  SYSTEM_PAGES.map((s) => {
    const tab = ((site.value.tabBar || []) as any[]).find(
      (t) => '/' + String(t.pagePath || '').replace(/^\//, '') === '/' + s.path,
    )
    return {
      id: `sys-${s.key}`,
      name: s.label,
      path: s.path,
      desc: s.desc,
      isSystem: true,
      navText: tab?.text || '',
      status: 'live' as MiniPageStatus,
      to: s.to,
    }
  }),
)

function matchKeyword(p: any): boolean {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return true
  return `${p.name || ''} ${p.path || ''} ${p.desc || ''}`.toLowerCase().includes(kw)
}

const visibleRows = computed<any[]>(() => {
  switch (scope.value) {
    case 'decorate':
      return decoratePages.value.filter(matchKeyword)
    case 'draft':
      return draftPages.value.filter(matchKeyword)
    case 'system':
      return systemRows.value.filter(matchKeyword)
    default:
      return [
        ...decoratePages.value.filter(matchKeyword),
        ...systemRows.value.filter(matchKeyword),
      ]
  }
})

const counts = computed(() => ({
  all: decoratePages.value.length + systemRows.value.length,
  decorate: decoratePages.value.length,
  system: systemRows.value.length,
  draft: draftPages.value.length,
}))

const pendingCount = computed(
  () => Number(site.value.pendingCount ?? 0) || pendingRows.value.length,
)

const pendingRows = computed(() =>
  decoratePages.value.filter((p) => resolvePageStatus(p) === 'pending'),
)

/* ─────────────────────────── 展示辅助 ─────────────────────────── */

function statusPill(p: any) {
  if (p.isSystem) return { tone: 'neutral', text: `内置页 · ${p.path}` }
  const st = resolvePageStatus(p as PageRecord)
  switch (st) {
    case 'live':
      return { tone: 'success', text: '已上线' }
    case 'pending':
      return {
        tone: 'warn',
        text: `待同步${versionHint(p) ? ` · ${versionHint(p)}` : ''}`,
      }
    case 'draft':
      return { tone: 'neutral', text: '草稿' }
    case 'offline':
      return { tone: 'warn', text: '已下线' }
    case 'archived':
      return { tone: 'neutral', text: '已归档' }
    default:
      return { tone: 'neutral', text: '草稿' }
  }
}

/** 草稿版本 vs 线上版本 —— 这两个数天然不同，必须写清含义 */
function versionHint(p: any): string {
  const draft = toInt(p?.latestVersion)
  const live = toInt(p?.currentVersion ?? p?.version)
  if (!draft || !live || draft === live) return ''
  return `草稿 v${draft} / 线上 v${live}`
}

function toInt(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function groupLabel(p: any): string {
  return resolveGroupLabel(inferPageGroup(p))
}

function navRefs(p: any): string[] {
  const id = pageKey(p.id)
  return ((site.value.tabBar || []) as any[])
    .filter((t) => pageKey(t.pageId) === id && t.pageId)
    .map((t) => String(t.text || '未命名'))
}

function formatTime(v?: string | number | null): string {
  if (v == null || v === '') return '—'
  const d = typeof v === 'number' ? new Date(v) : new Date(String(v).replace(/-/g, '/'))
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('zh-CN', { hour12: false }).slice(5, 16)
}

/* ─────────────────────────── 抽屉 ─────────────────────────── */

function openDrawer(p: PageRecord) {
  editing.value = p
  const st = resolvePageStatus(p)
  form.value = {
    name: String(p.name || ''),
    shareTitle: String((p as any).shareTitle || ''),
    description: String((p as any).description || ''),
    entryExpireAt: String((p as any).entryExpireAt || ''),
    pageGroup: String((p as any).pageGroup || inferPageGroup(p as any) || 'decorate'),
    online: st !== 'offline' && st !== 'archived',
  }
  advancedOpen.value = false
  drawerOpen.value = true
}

/** 系统原生页：走它自己的沉浸式编辑面板，不进抽屉 */
function openSystem(row: any) {
  router.push(row.to)
}

async function saveDrawer() {
  if (!editing.value) return
  saving.value = true
  const wasOffline = resolvePageStatus(editing.value) === 'offline'
  try {
    // 1) 元数据 → 草稿（不影响线上）
    await updatePage(editing.value.id, {
      name: form.value.name.trim(),
      shareTitle: form.value.shareTitle.trim(),
      description: form.value.description.trim(),
      pageGroup: form.value.pageGroup,
      ...(form.value.entryExpireAt.trim()
        ? { entryExpireAt: form.value.entryExpireAt.trim() }
        : {}),
    } as any)

    // 2) 上下线 → 独立接口，**立即生效**（必须如实告知用户）
    let onlineChanged = false
    if (wasOffline && form.value.online) {
      await publishPage(editing.value.id)
      onlineChanged = true
    } else if (!wasOffline && !form.value.online) {
      await unpublishPage(editing.value.id)
      onlineChanged = true
    }

    void refreshMiniPending(true)
    await load()
    drawerOpen.value = false

    ElMessage.success(
      onlineChanged
        ? '已保存，上线状态已立即更新'
        : '已保存为草稿 · 到「发版中心」发布后生效',
    )
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    saving.value = false
  }
}

/* ─────────────────────────── 行操作 ─────────────────────────── */

function goEditor(p: any) {
  if (p.isSystem) return openSystem(p)
  router.push(`/page-builder/editor/${p.id}`)
}

async function copyPath(p: any) {
  const path = '/' + String(p.path || '').replace(/^\//, '')
  try {
    await navigator.clipboard.writeText(path)
    ElMessage.success(`已复制路径 ${path}`)
  } catch {
    // 剪贴板在非 https / 无权限下会失败，给出可手动复制的提示
    ElMessage.info(`页面路径：${path}`)
  }
}

async function onMore(p: any) {
  try {
    await ElMessageBox.confirm(
      `将复制「${p.name || p.path}」生成一个新页面。原页面不受影响。`,
      '复制页面',
      { confirmButtonText: '复制', cancelButtonText: '取消', type: 'info' },
    )
  } catch {
    return
  }
  try {
    await duplicatePage(p.id)
    ElMessage.success('已复制，请为新页面修改名称')
    await load()
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '复制失败')
  }
}

/* ─────────────────────────── 新建 ─────────────────────────── */

const createOpen = ref(false)
const createKind = ref<'blank' | 'template' | 'ai'>('blank')

function openCreate(kind: 'blank' | 'template' | 'ai') {
  createKind.value = kind
  createOpen.value = true
}

function goCreate() {
  createOpen.value = false
  if (createKind.value === 'template') {
    router.push({ path: '/mini/pages', query: { create: 'template' } })
  } else if (createKind.value === 'ai') {
    router.push('/mini/pages/new-ai')
  } else {
    router.push({ path: '/mini/pages', query: { create: 'blank' } })
  }
}

/* ─────────────────────────── 键盘 ─────────────────────────── */

function onKeydown(e: KeyboardEvent) {
  // ⌘K / Ctrl+K 聚焦搜索
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    searchRef.value?.focus()
    searchRef.value?.select()
    return
  }
  // Esc 关闭抽屉
  if (e.key === 'Escape' && drawerOpen.value) {
    drawerOpen.value = false
    return
  }
  // ↑↓ 移动行焦点，Enter 打开
  if (!visibleRows.value.length) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIdx.value = Math.min(activeIdx.value + 1, visibleRows.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIdx.value = Math.max(activeIdx.value - 1, 0)
  } else if (e.key === 'Enter') {
    const row = visibleRows.value[activeIdx.value]
    if (!row) return
    e.preventDefault()
    if (row.isSystem) openSystem(row)
    else openDrawer(row)
  }
}

watch(drawerOpen, (v) => {
  if (!v) activeIdx.value = -1
})

onMounted(async () => {
  await load()
  window.addEventListener('keydown', onKeydown)
  await nextTick()
  // 深链 ?open=<id> 直接打开抽屉（从别处跳回来时的上下文延续）
  const openId = String(router.currentRoute.value.query.open || '')
  if (openId) {
    const hit = pages.value.find((p) => pageKey(p.id) === openId)
    if (hit) openDrawer(hit)
  }
})

onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="pg-hub">
    <!-- ── 工具栏 ──────────────────────────────────────────────────────── -->
    <header class="pg-bar">
      <div class="pg-bar__l">
        <h1 class="saas-title">页面管理</h1>
        <span class="saas-cap">
          <template v-if="loadError">数据未加载</template>
          <template v-else>共 {{ counts.all }} 个页面</template>
        </span>
      </div>

      <div class="pg-bar__r">
        <label class="pg-search">
          <MiniIcon name="search" :size="14" />
          <input
            ref="searchRef"
            v-model="keyword"
            type="search"
            placeholder="搜索名称或路径"
            aria-label="搜索页面"
          />
          <kbd class="saas-kbd">⌘K</kbd>
        </label>
        <button
          v-if="pendingCount > 0"
          type="button"
          class="saas-pill saas-pill--warn pg-pending"
          @click="router.push('/mini/releases')"
        >
          <span class="saas-dot saas-dot--pulse" />{{ pendingCount }} 项待发布
        </button>
        <!-- Primary CTA：整个页面只此一个 -->
        <button type="button" class="saas-btn saas-btn--primary" @click="openCreate('blank')">
          <MiniIcon name="plus" :size="14" />新建页面
        </button>
      </div>
    </header>

    <!-- ── 分段筛选 ────────────────────────────────────────────────────── -->
    <nav class="saas-seg pg-seg" role="tablist" aria-label="页面分类">
      <button
        v-for="s in [
          { k: 'all', t: '全部' },
          { k: 'decorate', t: '装修页' },
          { k: 'system', t: '系统原生页' },
          { k: 'draft', t: '草稿候选' },
        ]"
        :key="s.k"
        type="button"
        role="tab"
        class="saas-seg__item"
        :aria-selected="scope === s.k"
        @click="scope = s.k as ScopeKey"
      >
        {{ s.t }}<span class="saas-seg__n">{{ counts[s.k as ScopeKey] }}</span>
      </button>
      <span class="saas-spacer" />
      <button
        type="button"
        class="saas-btn saas-btn--ghost saas-btn--sm"
        @click="router.push({ path: '/mini/pages', query: { tab: 'page' } })"
      >
        <MiniIcon name="grid" :size="14" />模板库
      </button>
    </nav>

    <!-- ── 读取失败：明确告知，绝不显示「共 0 个」 ────────────────────────── -->
    <div v-if="loadError" class="saas-note saas-note--danger pg-err">
      <MiniIcon name="warn" :size="15" />
      <div class="saas-grow">
        <b>页面列表读取失败：{{ loadError }}</b>
        <div>这是接口异常，不是「没有页面」。恢复后请重试，避免据此误判页面缺失。</div>
      </div>
      <button type="button" class="saas-btn saas-btn--sm" @click="load">重试</button>
    </div>

    <!-- ── 骨架屏 ──────────────────────────────────────────────────────── -->
    <div v-else-if="loading" class="saas-panel pg-skel">
      <div v-for="i in 8" :key="i" class="pg-skel__row">
        <div class="saas-skel" style="width: 32%; height: 12px" />
        <div class="saas-skel" style="width: 18%; height: 12px" />
        <div class="saas-skel" style="width: 14%; height: 12px" />
      </div>
    </div>

    <!-- ── 表格 ────────────────────────────────────────────────────────── -->
    <div v-else-if="visibleRows.length" class="saas-panel pg-tablewrap">
      <table class="saas-table">
        <thead>
          <tr>
            <th style="min-width: 240px">页面</th>
            <th style="width: 130px">类型</th>
            <th style="width: 200px">状态</th>
            <th style="width: 130px">导航引用</th>
            <th style="width: 116px">更新时间</th>
            <th style="width: 1%" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(p, i) in visibleRows"
            :key="pageKey(p.id)"
            :tabindex="activeIdx === i ? 0 : -1"
            :style="activeIdx === i ? 'outline:2px solid var(--saas-accent);outline-offset:-2px' : ''"
            @click="p.isSystem ? openSystem(p) : openDrawer(p)"
            @mouseenter="activeIdx = i"
          >
            <td class="is-main">
              <div class="pg-name">
                <span class="saas-trunc" :title="String(p.name || '')">{{
                  p.name || '（未命名页面）'
                }}</span>
                <span class="saas-mono pg-path saas-trunc" :title="String(p.path || '')">{{
                  p.path
                }}</span>
              </div>
            </td>
            <td>
              <span class="saas-cap">{{ p.isSystem ? p.desc : groupLabel(p) }}</span>
            </td>
            <td>
              <span
                class="saas-pill"
                :class="{
                  'saas-pill--success': statusPill(p).tone === 'success',
                  'saas-pill--warn': statusPill(p).tone === 'warn',
                }"
              >
                <span v-if="statusPill(p).tone === 'live'" class="saas-dot" />
                <span v-else-if="statusPill(p).tone === 'pending'" class="saas-dot saas-dot--pulse" />
                {{ statusPill(p).text }}
              </span>
            </td>
            <td>
              <span v-if="navRefs(p).length" class="saas-cap">{{ navRefs(p).join('、') }}</span>
              <span v-else-if="p.navText" class="saas-cap">{{ p.navText }}</span>
              <span v-else class="saas-cap" style="color: var(--saas-ink-3)">—</span>
            </td>
            <td class="saas-mono">{{ formatTime(p.updateTime || p.update_time) }}</td>
            <td class="is-shrink">
              <!-- 悬浮才出现的快捷操作：用 visibility 而非 opacity 占位，避免行宽抖动 -->
              <div class="saas-rowact pg-act">
                <button
                  type="button"
                  class="saas-btn saas-btn--sm"
                  :title="p.isSystem ? '打开配置面板' : '进入画布装修'"
                  @click.stop="goEditor(p)"
                >
                  {{ p.isSystem ? '配置' : '装修' }}
                </button>
                <button
                  v-if="!p.isSystem"
                  type="button"
                  class="saas-btn saas-btn--sm saas-btn--icon saas-btn--ghost"
                  title="复制页面路径"
                  @click.stop="copyPath(p)"
                >
                  <MiniIcon name="copy" :size="13" />
                </button>
                <button
                  v-if="!p.isSystem"
                  type="button"
                  class="saas-btn saas-btn--sm saas-btn--icon saas-btn--ghost"
                  title="更多操作"
                  @click.stop="onMore(p)"
                >
                  <MiniIcon name="more" :size="13" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── 空状态 ──────────────────────────────────────────────────────── -->
    <div v-else class="saas-panel">
      <div class="saas-empty">
        <span class="saas-empty__icon"><MiniIcon name="page" :size="22" /></span>
        <span class="saas-empty__title">
          {{ keyword ? '没有匹配的页面' : '还没有页面' }}
        </span>
        <span class="saas-empty__desc">
          {{
            keyword
              ? '换个关键词试试，或清空搜索看全部页面。'
              : '从空白页、模板或 AI 生成开始。创建后可在列表里装修、配置与发布。'
          }}
        </span>
        <button
          v-if="!keyword"
          type="button"
          class="saas-btn saas-btn--primary"
          @click="openCreate('blank')"
        >
          新建第一个页面
        </button>
      </div>
    </div>

    <!-- ── 抽屉 ────────────────────────────────────────────────────────── -->
    <template v-if="drawerOpen && editing">
      <div class="saas-scrim" @click="drawerOpen = false" />
      <aside class="saas-drawer" role="dialog" aria-label="页面配置">
        <header class="saas-drawer__hd">
          <div>
            <div class="saas-section">{{ editing.name || '（未命名页面）' }}</div>
            <div class="saas-mono">{{ editing.path }}</div>
          </div>
          <button
            type="button"
            class="saas-btn saas-btn--icon saas-btn--ghost"
            aria-label="关闭"
            @click="drawerOpen = false"
          >
            <MiniIcon name="x" :size="15" />
          </button>
        </header>

        <div class="saas-drawer__bd">
          <!-- 基础信息 -->
          <div class="saas-grouptitle">基础信息</div>
          <div class="saas-field">
            <label class="saas-label" for="pgf-name">页面标题</label>
            <input id="pgf-name" v-model="form.name" class="saas-input" placeholder="用户看到的名字" />
          </div>

          <div class="saas-field" style="margin-top: 12px">
            <label class="saas-label" for="pgf-group">页面分组</label>
            <select id="pgf-group" v-model="form.pageGroup" class="saas-select">
              <option v-for="g in ALL_STANDARD_GROUPS" :key="g" :value="g">
                {{ PAGE_GROUP_LABELS[g] || g }}
              </option>
            </select>
            <span class="saas-hint">分组只影响后台归类，不影响用户看到的路径。</span>
          </div>

          <div class="saas-field" style="margin-top: 12px">
            <div class="saas-row saas-between">
              <label class="saas-label">上线状态</label>
              <label class="saas-switch">
                <input v-model="form.online" type="checkbox" />
                <span class="saas-switch__track"><span class="saas-switch__dot" /></span>
              </label>
            </div>
            <!-- 🔴 上下线是立即生效的独立接口，不能说成"草稿" -->
            <div class="saas-note" :class="form.online ? '' : 'saas-note--warn'">
              <MiniIcon name="info" :size="13" />
              <span v-if="form.online">已上线，用户可访问。切换会<strong>立即生效</strong>，不需要发版。</span>
              <span v-else>下线后用户立即无法访问，页面内容保留。</span>
            </div>
          </div>

          <!-- 分享设置 -->
          <div class="saas-grouptitle">分享设置</div>
          <div class="saas-field">
            <label class="saas-label" for="pgf-st">分享标题</label>
            <input
              id="pgf-st"
              v-model="form.shareTitle"
              class="saas-input"
              placeholder="留空则用页面标题"
            />
          </div>
          <div class="saas-field" style="margin-top: 12px">
            <label class="saas-label" for="pgf-desc">分享描述</label>
            <textarea
              id="pgf-desc"
              v-model="form.description"
              class="saas-input pg-textarea"
              rows="3"
              placeholder="转发到微信时显示的摘要"
            />
          </div>

          <!-- 高级设置 -->
          <div class="saas-advanced">
            <button type="button" class="saas-advanced__hd" @click="advancedOpen = !advancedOpen">
              <MiniIcon :name="advancedOpen ? 'chev' : 'down'" :size="13" />
              高级设置
            </button>
            <div v-if="advancedOpen" class="saas-advanced__bd">
              <div class="saas-field">
                <label class="saas-label" for="pgf-exp">入口到期时间</label>
                <input
                  id="pgf-exp"
                  v-model="form.entryExpireAt"
                  class="saas-input"
                  placeholder="留空表示长期有效，如 2026-12-31 23:59:59"
                />
                <span class="saas-hint">到期后该页面的入口自动隐藏，页面数据保留。</span>
              </div>
              <div class="saas-field" style="margin-top: 12px">
                <span class="saas-label">页面路径</span>
                <div class="saas-mono pg-pathbox">{{ editing.path }}</div>
                <span class="saas-hint">
                  路径决定小程序内的访问地址，修改可能影响已有分享链接，暂不支持在此改动。
                </span>
              </div>
            </div>
          </div>
        </div>

        <footer class="saas-drawer__ft">
          <button type="button" class="saas-btn" @click="drawerOpen = false">取消</button>
          <button type="button" class="saas-btn" @click="goEditor(editing)">
            进入画布装修
          </button>
          <button type="button" class="saas-btn saas-btn--primary" :disabled="saving" @click="saveDrawer">
            {{ saving ? '保存中…' : '保存配置' }}
          </button>
        </footer>
      </aside>
    </template>

    <!-- ── 新建方式选择 ────────────────────────────────────────────────── -->
    <template v-if="createOpen">
      <div class="saas-scrim" @click="createOpen = false" />
      <div class="pg-modal" role="dialog" aria-label="新建页面">
        <div class="saas-section">新建页面</div>
        <div class="saas-cap" style="margin-top: 2px">选一种起点，之后随时能改。</div>
        <button type="button" class="pg-mode" @click="goCreate">
          <span class="pg-mode__t">空白页面</span>
          <span class="pg-mode__d">从零开始拖组件</span>
        </button>
        <button type="button" class="pg-mode" @click="createKind = 'template'; goCreate()">
          <span class="pg-mode__t">从模板开始</span>
          <span class="pg-mode__d">挑一套现成结构再改</span>
        </button>
        <button type="button" class="pg-mode" @click="createKind = 'ai'; goCreate()">
          <span class="pg-mode__t">AI 生成</span>
          <span class="pg-mode__d">描述需求，自动搭出初稿</span>
        </button>
        <button type="button" class="saas-btn saas-btn--block" @click="createOpen = false">
          取消
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.pg-hub {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

/* ── 工具栏 ────────────────────────────────────────────────────────────── */
.pg-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.pg-bar__l { display: flex; align-items: baseline; gap: 10px; min-width: 0; }
.pg-bar__r { display: flex; align-items: center; gap: 8px; }

.pg-search {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 8px 0 10px;
  min-width: 240px;
  border: 1px solid var(--saas-border);
  border-radius: var(--saas-r-sm);
  background: var(--saas-surface);
  color: var(--saas-ink-3);
  transition: border-color var(--saas-t) var(--saas-ease), box-shadow var(--saas-t) var(--saas-ease);

  &:focus-within {
    border-color: var(--saas-border-accent);
    box-shadow: var(--saas-ring);
  }
  input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: none;
    background: transparent;
    color: var(--saas-ink);
    font-size: var(--saas-fs-body);
    font-family: inherit;
    &::placeholder { color: var(--saas-ink-3); }
    /* 去掉 Safari/Chrome 原生 search 清除按钮，避免与自研样式打架 */
    &::-webkit-search-cancel-button { -webkit-appearance: none; }
  }
}

.pg-pending { cursor: pointer; border-style: solid; }
.pg-seg { align-self: flex-start; }
.pg-err { align-items: center; }

/* ── 表格 ──────────────────────────────────────────────────────────────── */
.pg-tablewrap { overflow-x: auto; }
.pg-name {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.pg-path { color: var(--saas-ink-3); font-size: var(--saas-fs-mono); }
.pg-act { justify-content: flex-end; min-width: 132px; }

/* ── 骨架屏 ────────────────────────────────────────────────────────────── */
.pg-skel { padding: 8px; }
.pg-skel__row {
  display: flex;
  align-items: center;
  gap: 24px;
  height: 48px;
  padding: 0 12px;
  border-bottom: 1px solid var(--saas-border);
  &:last-child { border-bottom: 0; }
}

/* ── 抽屉内 ────────────────────────────────────────────────────────────── */
.pg-textarea {
  height: auto;
  padding: 8px 10px;
  line-height: 1.6;
  resize: vertical;
  font-family: inherit;
}
.pg-pathbox {
  padding: 8px 10px;
  border: 1px solid var(--saas-border);
  border-radius: var(--saas-r-sm);
  background: var(--saas-sunken);
  word-break: break-all;
}

/* 开关：自绘，避免为了一个 toggle 拉 Element 组件的整包样式 */
.saas-switch {
  position: relative;
  display: inline-flex;
  cursor: pointer;
  input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }
  &__track {
    display: block;
    width: 36px;
    height: 20px;
    border-radius: var(--saas-r-full);
    background: var(--saas-neutral-line);
    transition: background-color var(--saas-t) var(--saas-ease);
    position: relative;
  }
  &__dot {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    box-shadow: var(--saas-shadow-xs);
    transition: transform var(--saas-t) var(--saas-spring);
  }
  input:checked + &__track { background: var(--saas-accent); }
  input:checked + &__track &__dot { transform: translateX(16px); }
  input:focus-visible + &__track { box-shadow: var(--saas-ring); }
}

/* ── 新建方式弹层 ──────────────────────────────────────────────────────── */
.pg-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 380px;
  max-width: calc(100vw - 32px);
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 20px;
  background: var(--saas-surface);
  border: 1px solid var(--saas-border);
  border-radius: var(--saas-r-lg);
  box-shadow: var(--saas-shadow-xl);
  z-index: 41;
  animation: pg-pop var(--saas-t-slow) var(--saas-spring);
}
@keyframes pg-pop {
  from { transform: translate(-50%, -48%) scale(0.98); opacity: 0; }
  to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
}
.pg-mode {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: flex-start;
  padding: 11px 13px;
  border: 1px solid var(--saas-border);
  border-radius: var(--saas-r-md);
  background: var(--saas-surface);
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  transition: border-color var(--saas-t) var(--saas-ease), background-color var(--saas-t) var(--saas-ease);
  &:hover { border-color: var(--saas-border-accent); background: var(--saas-subtle); }
}
.pg-mode__t { font-size: var(--saas-fs-body); font-weight: 600; color: var(--saas-ink); }
.pg-mode__d { font-size: var(--saas-fs-cap); color: var(--saas-ink-3); }

@media (max-width: 900px) {
  .pg-search { min-width: 160px; }
  .pg-act { min-width: 0; }
}
</style>