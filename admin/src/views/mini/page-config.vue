<template>
  <div class="mini-wb mw-page" v-loading="loading && loaded">
    <MiniSkeleton v-if="!loaded" kind="list" />
    <div v-else>
      <div class="head-row">
        <div>
          <h1 class="h1">页面配置</h1>
          <div class="sub">
            页面的标题、路径、分享信息、分组、入口到期与上下线。
            组件编排请去「页面搭建」的装修器。
          </div>
        </div>
        <div class="actions">
          <button type="button" class="btn soft" @click="router.push('/mini/pages')">
            <MiniIcon name="page" :size="15" />页面搭建
          </button>
          <button type="button" class="btn soft" @click="router.push('/mini/appearance?tab=nav')">
            <MiniIcon name="tab" :size="15" />导航配置
          </button>
        </div>
      </div>

      <!-- 能力边界说明：系统页与装修页能改的东西本来就不一样 -->
      <section class="card">
        <div class="scope-row">
          <div class="scope-item">
            <span class="scope-ic sys"><MiniIcon name="gear" :size="15" /></span>
            <div>
              <b>系统原生页</b>
              <span class="faint">由小程序内置模板渲染（如「我的」「登录」）。不能改结构，只能改文案与开关，或换绑导航位。</span>
            </div>
            <button type="button" class="btn sm soft" @click="router.push('/mini/appearance?tab=flags')">配置入口</button>
          </div>
          <div class="scope-item">
            <span class="scope-ic dec"><MiniIcon name="palette" :size="15" /></span>
            <div>
              <b>可装修页面</b>
              <span class="faint">本页配置标题、路径、分享、访问权限与上下线；组件结构在装修器里改。</span>
            </div>
            <button type="button" class="btn sm soft" @click="router.push('/mini/pages')">去装修</button>
          </div>
        </div>
      </section>

      <!-- 🔴 加载失败必须显式告知：绝不能让「读取失败」显示成「0 个页面」 -->
      <section v-if="loadError" class="card err-card">
        <div class="err-row">
          <MiniIcon name="warn" :size="15" />
          <div class="err-body">
            <strong>页面列表读取失败</strong>
            <span class="faint">{{ loadError }}</span>
            <span class="faint">下面的列表与计数不代表真实数据，请先解决读取问题再配置页面。</span>
          </div>
          <button type="button" class="btn sm" @click="load">重新加载</button>
        </div>
      </section>

      <!-- 筛选 -->
      <section class="card">
        <div class="filters">
          <input v-model="keyword" class="search" placeholder="搜索页面名称或路径" :disabled="!!loadError" />
          <!-- 🔴 读取失败时 chip 上的计数全是 0，会被误读成「真的没有页面」 -->
          <div v-if="!loadError" class="chips">
            <button
              v-for="c in FILTERS"
              :key="c.key"
              type="button"
              class="chip"
              :class="{ on: filter === c.key }"
              @click="filter = c.key"
            >
              {{ c.label }}
              <span class="chip-n">{{ countBy(c.key) }}</span>
            </button>
          </div>
          <p v-else class="faint" style="margin: 0; font-size: 12px">
            页面列表读取失败，暂不提供分类筛选与计数。
          </p>
        </div>
      </section>

      <!-- 列表 -->
      <section class="card">
        <div class="head" style="margin-bottom: 10px">
          <div>
            <h2 class="h2">{{ currentFilterLabel }}</h2>
            <!-- 🔴 读取失败时不能显示计数：上方已提示「读取失败」，
                 这里再写「共 0 个页面」就是自相矛盾（2026-10-06 自检实测到）。 -->
            <div v-if="loadError" class="sub err-sub">数据未加载，计数不可用</div>
            <div v-else class="sub">共 {{ filtered.length }} 个页面</div>
          </div>
          <button v-if="loadError" type="button" class="btn sm" @click="load">重新加载</button>
        </div>

        <div v-if="!filtered.length" class="empty-mini">
          <span v-if="loadError" class="muted">读取失败，无法列出页面（不是「没有页面」）</span>
          <span v-else class="muted">没有符合条件的页面</span>
          <button v-if="!loadError" type="button" class="btn sm" @click="router.push('/mini/pages?create=1')">去创建</button>
        </div>

        <!--
          🔴 2026-10-06 列表改造：原来每行只有「名称+几个标签」和两个按钮，
          任务书要求的「类型 / 导航引用 / 草稿线上状态 / 更新时间」都没地方显示。
          改成表格化列表：各占一列、对齐，长名称截断并可看全，
          「装修」与「配置」作为同一页面对象的两个操作并排。
        -->
        <div v-else class="pc-table">
          <div class="pc-tr pc-tr--head">
            <span class="pc-td pc-td--name">页面名称</span>
            <span class="pc-td">类型</span>
            <span class="pc-td">状态</span>
            <span class="pc-td">导航引用</span>
            <span class="pc-td">更新时间</span>
            <span class="pc-td pc-td--ops">操作</span>
          </div>
          <div v-for="p in filtered" :key="String(p.id)" class="pc-tr">
            <span class="pc-td pc-td--name">
              <el-tooltip
                :content="p.name || '（未命名页面）'"
                placement="top"
                :disabled="!String(p.name || '').length || String(p.name || '').length <= 22"
              >
                <b class="pc-name">{{ p.name || '（未命名页面）' }}</b>
              </el-tooltip>
              <span class="faint pc-path">{{ p.path }}</span>
              <span v-if="referencedBy(p).length" class="faint pc-ref">
                {{ referencedBy(p).join('、') }}
              </span>
            </span>
            <span class="pc-td">
              <span class="tag t-slot">{{ groupLabel(p) }}</span>
              <span v-if="Number((p as any).isTest) === 1" class="tag t-draft">测试</span>
            </span>
            <span class="pc-td"><PageStatusTag :row="p" /></span>
            <span class="pc-td">
              <template v-if="usedByNav(p).length">
                <span v-for="(u, i) in usedByNav(p)" :key="i" class="tag t-acc">{{ u }}</span>
              </template>
              <span v-else class="faint">—</span>
            </span>
            <span class="pc-td faint pc-time">{{ formatTime(p.updated_at || p.updateTime) }}</span>
            <span class="pc-td pc-td--ops">
              <!-- 同一页面对象的两个操作：改结构 vs 改属性 -->
              <el-tooltip content="进入装修器编排组件与内容（改的是原页面，不会新建副本）" placement="top">
                <button type="button" class="btn sm" @click="openEditor(p)">装修</button>
              </el-tooltip>
              <el-tooltip content="改标题、分享、分组、到期时间与上下线" placement="top">
                <button type="button" class="btn sm soft" @click="openSettings(p)">配置</button>
              </el-tooltip>
            </span>
          </div>
        </div>
      </section>
    </div>

    <!-- 配置抽屉 -->
    <el-drawer v-model="panelVisible" size="460px" class="mini-wb-overlay" :title="`配置：${editing?.name || '未命名'}`">
      <div v-if="editing" class="panel">
        <div class="panel-scope">
          <MiniIcon name="info" :size="13" />
          <span class="faint">{{ editableHint }}</span>
        </div>

        <el-form label-position="top" class="panel-form">
          <el-form-item label="页面标题">
            <el-input v-model="form.name" maxlength="30" show-word-limit placeholder="展示在导航与列表" />
          </el-form-item>

          <el-form-item label="页面路径">
            <el-input v-model="form.path" :disabled="true" />
            <p class="faint" style="margin:6px 0 0;font-size:11.5px;line-height:1.5">
              路径由系统分配，创建后不可修改。改路径会导致已分享的链接失效。
            </p>
          </el-form-item>

          <el-form-item label="分享标题">
            <el-input v-model="form.shareTitle" maxlength="60" placeholder="留空则用全局默认分享标题" />
          </el-form-item>

          <el-form-item label="分享描述">
            <el-input v-model="form.description" maxlength="120" placeholder="选填" />
          </el-form-item>

          <el-form-item label="入口到期时间">
            <el-input
              v-model="form.entryExpireAt"
              placeholder="留空表示长期有效，例如 2026-12-31 23:59:59"
            />
            <p class="faint" style="margin:6px 0 0;font-size:11.5px;line-height:1.5">
              到期后该页面入口自动隐藏，页面数据保留。
            </p>
          </el-form-item>

          <el-form-item label="页面分组">
            <el-select v-model="form.pageGroup" filterable allow-create style="width:100%">
              <el-option
                v-for="g in ALL_STANDARD_GROUPS"
                :key="g"
                :label="PAGE_GROUP_LABELS[g]"
                :value="g"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="上线状态">
            <div class="switch-row">
              <DsSwitch v-model="form.online" />
              <span class="faint">{{ form.online ? '已上线，用户可访问' : '已下线，用户访问不到' }}</span>
            </div>
            <p class="faint" style="margin:6px 0 0;font-size:11.5px;line-height:1.5">
              ⚠️上下线是<b>立即生效</b>的操作，不进草稿、不需要发布配置：
              它直接改变线上页面的可访问状态。所以这里不用「保存草稿」的口径。
            </p>
          </el-form-item>
        </el-form>

        <div class="panel-ops">
          <button type="button" class="btn" @click="panelVisible = false">取消</button>
          <button type="button" class="btn primary" :disabled="saving" @click="save">
            {{ saving ? '保存中…' : '保存' }}
          </button>
        </div>
        <p class="faint panel-tip">
          标题 / 分享 / 分组 / 到期时间进草稿，需要发布配置才对线上生效；
          上线状态是立即生效的。
        </p>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
/**
 * 页面配置（工作流第 4 环）
 *
 * 与「页面搭建」(/mini/pages) 的分工：
 *   页面搭建 = 页面从哪来（空白/模板/AI）+ 组件编排（进装修器）
 *   页面配置 = 页面属性能改成什么（标题/分享/权限/上下线/分组）
 * 原来这两件事都挤在页面列表里，且模板预览占了大量位置，导致「改什么」不清晰。
 *
 * 写入说明：所有字段写进 mp_page，改动进草稿（status/current_version），
 * 需要到「发布与版本」才会对线上生效。分享信息的落库方式见 save()。
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import MiniIcon from '@/components/mini/MiniIcon.vue'
import MiniSkeleton from '@/components/mini/MiniSkeleton.vue'
import PageStatusTag from '@/components/mini/PageStatusTag.vue'
import { updatePage, publishPage, unpublishPage } from '@/api/page'
import { loadAllPages } from '@/composables/usePageCatalog'
import { getMiniSite, type MiniSiteVO } from '@/api/miniSite'
import { refreshMiniPending } from '@/composables/useMiniPending'
import {
  resolvePageStatus,
  inferPageGroup,
  resolveGroupLabel,
  PAGE_GROUP_LABELS,
  ALL_STANDARD_GROUPS,
} from '@/utils/pageStatus'
import type { PageRecord } from '@/types/page'

defineOptions({ name: 'MiniPageConfig' })

type FilterKey = 'all' | 'live' | 'pending' | 'draft' | 'offline' | 'archived' | 'test' | 'noname'

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'live', label: '已上线' },
  { key: 'pending', label: '有改动' },
  { key: 'draft', label: '草稿' },
  { key: 'offline', label: '已下线' },
  { key: 'archived', label: '已归档' },
  { key: 'test', label: '测试页' },
  { key: 'noname', label: '缺名称' },
]

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const loaded = ref(false)
const saving = ref(false)
/** 🔴 读取失败信息。非空时页面数据不可信，界面必须显式提示而不是显示 0 */
const loadError = ref('')
const pages = ref<PageRecord[]>([])
const site = ref<MiniSiteVO>({})
const keyword = ref('')
const filter = ref<FilterKey>('all')
const panelVisible = ref(false)
const editing = ref<PageRecord | null>(null)

const form = ref({
  name: '',
  path: '',
  shareTitle: '',
  description: '',
  entryExpireAt: '',
  pageGroup: 'decorate',
  online: true,
})

const currentFilterLabel = computed(() => FILTERS.find((f) => f.key === filter.value)?.label || '全部')

function groupLabel(p: PageRecord) {
  return resolveGroupLabel(inferPageGroup(p as any))
}

/** 更新时间：后端可能给 ISO 串或时间戳，这里统一成「YYYY-MM-DD HH:mm」 */
function formatTime(v?: string | number | null): string {
  if (v == null || v === '') return '—'
  const d = typeof v === 'number' ? new Date(v) : new Date(String(v).replace(/-/g, '/'))
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('zh-CN', { hour12: false }).slice(0, 16)
}

/** 该页面被哪些导航入口占用 */
function usedByNav(p: PageRecord): string[] {
  return ((site.value.tabBar || []) as any[])
    .filter((t) => String(t.pageId || '') === String(p.id))
    .map((t) => String(t.text || '未命名'))
}

/** 除导航外的其他引用：这里只有真实可查的来源才显示，不编 */
function referencedBy(p: PageRecord): string[] {
  const out: string[] = []
  if (Number((p as any).isTest) === 1) out.push('标记为测试页')
  if ((p as any).entryExpireAt) out.push('设置过入口到期时间')
  return out
}

/** 关键词过滤（与状态过滤正交），计数与列表共用同一套判定，避免数字和列表对不上 */
function matchKeyword(p: any) {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return true
  return `${p.name || ''} ${p.path || ''}`.toLowerCase().includes(kw)
}

function matchFilter(p: any, key: FilterKey) {
  const st = resolvePageStatus(p)
  switch (key) {
    case 'live': return st === 'live'
    case 'pending': return st === 'pending'
    case 'draft': return st === 'draft'
    case 'offline': return st === 'offline'
    case 'archived': return st === 'archived'
    case 'test': return Number(p.isTest) === 1
    case 'noname': return !String(p.name || '').trim()
    default: return true
  }
}

const filtered = computed(() =>
  pages.value.filter((p: any) => matchKeyword(p) && matchFilter(p, filter.value)),
)

/** 计数跟随当前关键词，这样 chip 上的数字和列表条数天然一致 */
function countBy(key: FilterKey) {
  return pages.value.filter((p: any) => matchKeyword(p) && matchFilter(p, key)).length
}

const editableHint = computed(() => {
  const st = editing.value ? resolvePageStatus(editing.value) : 'draft'
  if (st === 'archived') {
    return '这是已归档的页面。它仍可配置，但要先恢复为可用状态才会出现在小程序里。'
  }
  return '本页改的是页面属性。组件结构（区块、样式、内容绑定）请到装修器里改。'
})

function openEditor(p: PageRecord) {
  // 🔴 进装修器一定带页面 id，不走「新建」——避免产生同名副本
  router.push(`/page-builder/editor/${p.id}`)
}

function openSettings(p: PageRecord) {
  editing.value = p
  const st = resolvePageStatus(p)
  form.value = {
    name: String(p.name || ''),
    path: String(p.path || ''),
    shareTitle: String((p as any).shareTitle || ''),
    description: String((p as any).description || ''),
    entryExpireAt: String((p as any).entryExpireAt || ''),
    pageGroup: String((p as any).pageGroup || inferPageGroup(p as any) || 'decorate'),
    online: st !== 'offline' && st !== 'archived',
  }
  panelVisible.value = true
}

async function save() {
  if (!editing.value) return
  saving.value = true
  try {
    // 🔔 注意字段口径（对齐 backend PageUpdateDTO）：
    // - 分享描述字段是 description，不是 shareDesc
    // - 上线状态**不在**这个 DTO 里，上下行走独立接口 publishPage / unpublishPage
    // - 归档也走同一个接口的 archived 字段，与下线是两件事
    await updatePage(editing.value.id, {
      name: form.value.name.trim(),
      shareTitle: form.value.shareTitle.trim(),
      description: form.value.description.trim(),
      pageGroup: form.value.pageGroup,
      entryExpireAt: form.value.entryExpireAt.trim() || null,
    } as any)

    const wasOffline = resolvePageStatus(editing.value) === 'offline'
    const wantOnline = form.value.online
    // 🔴 unpublish = 下架（不是上架）。重新上线要用 publishPage，别搞反。
    if (wasOffline && wantOnline) {
      await publishPage(editing.value.id)
    } else if (!wasOffline && !wantOnline) {
      await unpublishPage(editing.value.id)
    }

    ElMessage.success(
      wasOffline === wantOnline
        ? '已保存草稿，发布配置后生效'
        : `已保存，并已${wantOnline ? '上架' : '下架'}该页面`,
    )
    panelVisible.value = false
    void refreshMiniPending(true)
    await load()
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    saving.value = false
  }
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    // 🔴 统一走 loadAllPages。原来这里写 size:300，后端 normalize() 直接抛
    // 100101（每页上限 100），响应结构看不懂 → 被 `|| []` 降级成空数组 →
    // 「页面配置」分类计数全 0、看起来像没有页面可配置。
    const cat = await loadAllPages()
    if (cat.status === 'error') {
      loadError.value = cat.error || '页面列表读取失败'
      pages.value = []
    } else {
      pages.value = cat.pages
    }
    const siteData = await getMiniSite('draft').catch(() => ({}))
    site.value = siteData || {}
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : '页面配置读取失败'
  } finally {
    loading.value = false
    loaded.value = true
  }
}

onMounted(() => {
  const f = String(route.query.filter || '')
  if (FILTERS.some((x) => x.key === f)) filter.value = f as FilterKey
  void load()
})
</script>

<style scoped lang="scss">
/* 🔴 读取失败提示：必须比普通空态更醒目，避免被误读成「没有页面」 */
.err-card {
  border-left: 3px solid #b42828;
  background: rgba(180, 40, 40, 0.04);
}

.err-row {
  display: flex;
  align-items: center;
  gap: 11px;
  color: #972626;
}

.err-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;

  strong { font-size: 13.5px; }

  .faint { font-size: 11.5px; line-height: 1.5; }
}

.err-sub { color: #972626; }

.scope-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 12px;
}

.scope-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 11px 12px;
  border: 1px solid var(--wb-line, #e6e0d6);
  border-radius: 10px;

  > div {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  b { font-size: 13.5px; }

  .faint { font-size: 11.5px; line-height: 1.55; }
}

.scope-ic {
  flex: none;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &.sys { background: rgba(120, 110, 95, 0.13); color: #6f6659; }
  &.dec { background: rgba(180, 67, 15, 0.12); color: var(--acc, #b4430f); }
}

.filters {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.chips {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border-radius: 999px;
  border: 1px solid var(--wb-line, #e6e0d6);
  background: transparent;
  font-size: 12.5px;
  cursor: pointer;

  &.on {
    border-color: var(--acc, #b4430f);
    background: rgba(180, 67, 15, 0.08);
    color: var(--acc, #b4430f);
    font-weight: 600;
  }
}

.chip-n {
  font-size: 11px;
  color: var(--wb-muted, #8a8276);
}

/* 🔴 2026-10-06 页面列表：表格化，各信息占一列、可对齐、可扫读 */
.pc-table {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--wb-line, #e6e0d6);
  border-radius: 10px;
  overflow: hidden;
}

.pc-tr {
  display: grid;
  grid-template-columns: minmax(0, 2.1fr) 108px 108px 128px 118px 116px;
  gap: 12px;
  align-items: center;
  padding: 9px 12px;
  border-bottom: 1px solid var(--wb-line, #e6e0d6);
  font-size: 12.5px;

  &:last-child { border-bottom: 0; }

  &:hover:not(.pc-tr--head) { background: rgba(180, 67, 15, 0.025); }
}

.pc-tr--head {
  background: rgba(0, 0, 0, 0.025);
  font-weight: 600;
  color: var(--acc, #b4430f);
  font-size: 12px;
}

.pc-td {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}

.pc-td--name {
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
}

/* 长名称截断（tooltip 里看全文），不让一行把表格撑歪 */
.pc-name {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 500;
}

.pc-path {
  font-size: 11px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-ref { font-size: 11px; }

.pc-time { font-size: 11.5px; }

.pc-td--ops {
  justify-content: flex-end;
  gap: 6px;
}

@media (max-width: 1280px) {
  .pc-tr {
    grid-template-columns: minmax(0, 1.8fr) 96px 96px 112px 104px;
  }
  .pc-td--ops { grid-column: 1 / -1; justify-content: flex-start; }
}

.panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.panel-scope {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.03);

  .faint { font-size: 11.5px; line-height: 1.55; }
}

.panel-form { max-height: 62vh; overflow-y: auto; padding-right: 4px; }

.switch-row {
  display: flex;
  align-items: center;
  gap: 9px;

  .faint { font-size: 11.5px; }
}

.panel-ops {
  display: flex;
  justify-content: flex-end;
  gap: 9px;
  padding-top: 10px;
  border-top: 1px solid var(--wb-line, #e6e0d6);
}

.panel-tip {
  font-size: 11px;
  line-height: 1.6;
  margin: 0;
}
</style>