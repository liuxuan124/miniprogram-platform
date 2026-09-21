<template>
  <div class="mini-wb mw-page overview" v-loading="loading">
    <header class="mw-head">
      <div>
        <h1 class="mw-title">{{ site.name || '小程序' }}</h1>
        <p class="meta-row">
          <span class="live-pill">运营中</span>
          <span>整店模板：{{ templateLabel }}</span>
          <span v-if="site.liveReleaseNo != null">
            线上：第 {{ site.liveReleaseNo }} 次发布
            <template v-if="site.liveReleaseAt"> · {{ formatShort(site.liveReleaseAt) }}</template>
          </span>
          <span v-else>线上：尚未发布</span>
          <span>微信代码 {{ site.wechatCodeVersion || wechatVerFallback || '—' }}</span>
        </p>
      </div>
    </header>

    <section class="create-cards">
      <button type="button" class="create-card create-card--ai" @click="router.push('/mini/pages/new-ai')">
        <div class="create-card__icon">✦</div>
        <div class="create-card__title">AI 生成页面</div>
        <div class="create-card__desc">说出需求，AI 出 3 套方案，再手动微调</div>
      </button>
      <button
        type="button"
        class="create-card"
        @click="router.push({ path: '/mini/templates', query: { tab: 'page' } })"
      >
        <div class="create-card__icon">▦</div>
        <div class="create-card__title">从模板新建</div>
        <div class="create-card__desc">按行业场景挑选页面模板或整店模板</div>
      </button>
      <button type="button" class="create-card" :disabled="creatingBlank" @click="createBlank">
        <div class="create-card__icon">+</div>
        <div class="create-card__title">空白页面</div>
        <div class="create-card__desc">从组件开始自由搭建</div>
      </button>
    </section>

    <div class="overview-grid">
      <div class="overview-main">
        <section class="mw-panel nav-panel">
          <div class="panel-head">
            <h2>底部导航</h2>
            <button type="button" class="mw-link" @click="openTabDrawer()">编辑导航</button>
          </div>
          <div class="tab-cards-wrap">
            <draggable
              v-model="sortableTabBar"
              item-key="__key"
              handle=".drag"
              class="tab-cards"
              :animation="180"
              @end="onTabDragEnd"
            >
              <template #item="{ element: tab, index: i }">
                <button
                  type="button"
                  class="tab-card"
                  :class="{ 'is-locked': isMineTab(tab), 'is-unbound': isTabUnbound(tab) }"
                  @click="openTabDrawer(i)"
                >
                  <div class="tab-card__top">
                    <span>导航 {{ i + 1 }}</span>
                    <span v-if="isMineTab(tab)" class="lock" title="我的为固定壳页">🔒</span>
                    <span v-else class="drag" title="拖拽排序" @click.stop>⠿</span>
                  </div>
                  <div class="tab-card__name">{{ tab.text || `导航 ${i + 1}` }}</div>
                  <div class="tab-card__bind">
                    → {{ tab.pageName || tab.pagePath || '未绑定' }}
                  </div>
                  <div class="tab-card__status">
                    <PageStatusTag v-if="tabPageStatus(tab)" :status="tabPageStatus(tab)!" />
                    <span v-else-if="isTabUnbound(tab)" class="unbound">未绑定</span>
                  </div>
                </button>
              </template>
            </draggable>
            <button
              v-if="tabBar.length < 5"
              type="button"
              class="tab-card tab-card--add"
              @click="addTabSlot"
            >
              <span class="add-plus">+</span>
              <span>最多 5 个</span>
            </button>
          </div>
        </section>

        <div class="lower-grid">
          <section class="mw-panel">
            <div class="panel-head">
              <h2>待发布的改动</h2>
              <button type="button" class="mw-link" @click="goPublish">去发布 ›</button>
            </div>
            <div v-if="pendingPreview.length" class="pending-list">
              <div v-for="item in pendingPreview" :key="String(item.id || item.name)" class="pending-row">
                <span :class="changeKindClass(item)">{{ changeKindLabel(item) }}</span>
                <div class="pending-row__main">
                  <span class="pending-row__name">{{ item.name || '未命名' }}</span>
                  <span class="pending-row__time">{{ item.summary || relativeHint(item) }}</span>
                </div>
              </div>
            </div>
            <p v-else class="empty-hint">没有待发布的改动，线上就是你现在看到的样子</p>
          </section>

          <section class="mw-panel">
            <div class="panel-head">
              <h2>微信生态</h2>
            </div>
            <p class="mw-kicker" style="margin: 0 0 10px">小程序正式版与分发渠道</p>
            <div class="eco-list">
              <div class="eco-row">
                <span>正式版</span>
                <span class="eco-val">代码 {{ site.wechatCodeVersion || wechatVerFallback || '—' }}</span>
              </div>
              <button type="button" class="eco-row eco-row--btn" @click="router.push('/settings/wechat')">
                <span>公众号菜单</span>
                <span class="eco-val">{{ mpMenuConfigured ? '已配置 ›' : '未配置 ›' }}</span>
              </button>
              <button type="button" class="eco-row eco-row--btn" @click="goPublish">
                <span>小程序码</span>
                <span class="eco-val">{{ boundPageCount }} 个页面已绑定 ›</span>
              </button>
            </div>
          </section>
        </div>
      </div>

      <aside class="mw-panel preview-panel">
        <div class="panel-head">
          <h2>真机预览</h2>
          <div class="preview-toggle">
            <button
              type="button"
              :class="{ active: previewSource === 'draft' }"
              @click="previewSource = 'draft'"
            >
              改动后
            </button>
            <button
              type="button"
              :class="{ active: previewSource === 'live' }"
              @click="previewSource = 'live'"
            >
              线上
            </button>
          </div>
        </div>
        <div class="phone-frame">
          <iframe :key="previewSource" :src="previewUrl" title="小程序预览" loading="lazy" />
        </div>
        <el-button class="scan-btn" @click="openLivePreview">扫码在手机上看</el-button>
      </aside>
    </div>

    <el-drawer
      v-model="drawerVisible"
      :title="drawerIndex == null ? '编辑底部导航' : `编辑导航 ${drawerIndex + 1}`"
      size="400px"
      destroy-on-close
    >
      <el-form v-if="editTab" label-position="top" @submit.prevent>
        <el-form-item label="标题">
          <el-input v-model="editTab.text" maxlength="8" show-word-limit placeholder="例如：首页" />
        </el-form-item>
        <el-form-item label="绑定页面">
          <el-select
            v-model="editPageId"
            filterable
            clearable
            placeholder="选择页面（不含归档）"
            style="width: 100%"
            @change="onBindPage"
          >
            <el-option
              v-for="p in bindablePages"
              :key="String(p.id)"
              :label="`${p.name}（${p.path}）`"
              :value="Number(p.id)"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="editTab.pagePath" label="路径">
          <el-input :model-value="editTab.pagePath" disabled />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="drawerVisible = false">取消</el-button>
        <el-button type="primary" class="mw-btn-primary" :loading="savingTabs" @click="saveTabEdit">
          保存
        </el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import draggable from 'vuedraggable'
import PageStatusTag from '@/components/mini/PageStatusTag.vue'
import {
  getMiniSite,
  getPendingChanges,
  updateMiniSite,
  type MiniSiteVO,
  type MiniTabBarItem,
  type PendingChangeItem,
} from '@/api/miniSite'
import { createPage, getPageList } from '@/api/page'
import { getLatestRelease } from '@/api/version'
import { getConfigByGroupSilent } from '@/api/system'
import { resolvePageStatus, type MiniPageStatus } from '@/utils/pageStatus'
import type { PageRecord as PageRow } from '@/types/page'

defineOptions({ name: 'MiniOverview' })

const router = useRouter()
const loading = ref(false)
const savingTabs = ref(false)
const creatingBlank = ref(false)
const site = ref<MiniSiteVO>({})
const pending = ref<PendingChangeItem[]>([])
const previewSource = ref<'draft' | 'live'>('draft')
const pageOptions = ref<PageRow[]>([])

const drawerVisible = ref(false)
const drawerIndex = ref<number | null>(null)
const editTab = ref<MiniTabBarItem | null>(null)
const editPageId = ref<number | null>(null)

const templateLabel = computed(() => site.value.templateName || '自定义（未使用整店模板）')
const tabBar = computed(() => site.value.tabBar || [])
const pendingPreview = computed(() => pending.value.slice(0, 5))

/** vuedraggable 需要稳定 key */
type SortableTab = MiniTabBarItem & { __key: string }
const sortableTabBar = ref<SortableTab[]>([])

function syncSortableFromSite() {
  sortableTabBar.value = (site.value.tabBar || []).map((t, i) => ({
    ...t,
    __key: `${t.pageId || t.pagePath || t.text || 'tab'}-${i}`,
  }))
}

const wechatVerFallback = ref('')
const mpMenuConfigured = ref(false)
const boundPageCount = computed(() =>
  (site.value.tabBar || []).filter((t) => t.pageId || t.pagePath).length,
)

const pageById = computed(() => {
  const map = new Map<number, PageRow>()
  for (const p of pageOptions.value) map.set(Number(p.id), p)
  return map
})

const bindablePages = computed(() =>
  pageOptions.value.filter((p) => {
    const st = resolvePageStatus(p)
    return st === 'live' || st === 'pending' || st === 'draft'
  }),
)

const previewUrl = computed(() => {
  const source = previewSource.value === 'live' ? 'live' : 'draft'
  const { href } = router.resolve({
    path: '/h5/miniapp-preview',
    query: { view: 'config', source, embed: '1' },
  })
  return href
})

function formatShort(t?: string | null) {
  if (!t) return ''
  const s = String(t).replace('T', ' ')
  return s.length >= 16 ? s.slice(5, 16) : s.slice(0, 16)
}

function isMineTab(tab: MiniTabBarItem) {
  const path = String(tab.pagePath || '')
  const name = String(tab.text || '')
  return path.includes('mine/mine') || name === '我的'
}

function isTabUnbound(tab: MiniTabBarItem) {
  return !(tab.pageId || tab.pagePath)
}

function tabPageStatus(tab: MiniTabBarItem): MiniPageStatus | null {
  if (tab.pageId == null || tab.pageId === '') return null
  const row = pageById.value.get(Number(tab.pageId))
  return row ? resolvePageStatus(row) : null
}

function changeKindLabel(item: PendingChangeItem) {
  if (item.type === 'site') return '修改'
  const st = String(item.status || '')
  if (st === 'draft' || /尚未|新增|新建/.test(String(item.summary || ''))) return '新增'
  return '修改'
}

function changeKindClass(item: PendingChangeItem) {
  return changeKindLabel(item) === '新增' ? 'mw-tag-new' : 'mw-tag-mod'
}

function relativeHint(_item: PendingChangeItem) {
  return '待发布'
}

function goPublish() {
  router.push('/mini/publish')
}

function openLivePreview() {
  const source = previewSource.value === 'live' ? 'live' : 'draft'
  const { href } = router.resolve({ path: '/h5/miniapp-preview', query: { view: 'config', source } })
  window.open(href, '_blank', 'noopener,noreferrer')
  ElMessage.success('已打开预览页；可用微信扫码或手机浏览器查看（开发环境请确保可访问）')
}

async function onTabDragEnd() {
  const next = sortableTabBar.value.map(({ __key: _k, ...rest }) => rest)
  await persistTabBar(next, '导航顺序已保存')
}

function openTabDrawer(index?: number) {
  const list = [...(site.value.tabBar || [])]
  if (index == null) {
    drawerIndex.value = list.length ? 0 : 0
    if (!list.length) list.push({ text: '首页', pagePath: '' })
  } else {
    drawerIndex.value = index
  }
  const idx = drawerIndex.value ?? 0
  const current = list[idx] || { text: '', pagePath: '' }
  editTab.value = { ...current }
  editPageId.value = current.pageId != null && current.pageId !== '' ? Number(current.pageId) : null
  drawerVisible.value = true
}

async function addTabSlot() {
  const list = [...(site.value.tabBar || [])]
  if (list.length >= 5) {
    ElMessage.warning('底部导航最多 5 个')
    return
  }
  list.push({ text: `导航 ${list.length + 1}`, pagePath: '' })
  site.value = { ...site.value, tabBar: list }
  openTabDrawer(list.length - 1)
}

function onBindPage(id: number | null) {
  if (!editTab.value) return
  if (id == null) {
    editTab.value = { ...editTab.value, pageId: undefined, pagePath: '', pageName: '' }
    return
  }
  const hit = pageOptions.value.find((p) => Number(p.id) === Number(id))
  if (!hit) return
  editTab.value = {
    ...editTab.value,
    pageId: hit.id,
    pagePath: String(hit.path || '').replace(/^\//, ''),
    pageName: hit.name,
  }
}

async function persistTabBar(next: MiniTabBarItem[], successMsg = '导航已保存') {
  savingTabs.value = true
  try {
    const updated = await updateMiniSite({ tabBar: next })
    site.value = { ...site.value, ...updated, tabBar: updated.tabBar || next }
    ElMessage.success(successMsg)
    await load()
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '保存导航失败')
  } finally {
    savingTabs.value = false
  }
}

async function saveTabEdit() {
  if (!editTab.value || drawerIndex.value == null) return
  if (isTabUnbound(editTab.value)) {
    ElMessage.warning('请先绑定页面')
    return
  }
  const next = [...(site.value.tabBar || [])]
  while (next.length <= drawerIndex.value) next.push({ text: '', pagePath: '' })
  next[drawerIndex.value] = {
    ...next[drawerIndex.value],
    text: editTab.value.text,
    pagePath: editTab.value.pagePath,
    pageId: editTab.value.pageId,
    pageName: editTab.value.pageName,
  }
  await persistTabBar(next)
  drawerVisible.value = false
}

async function createBlank() {
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
    const [s, p, pageRes, latestRes, cfgRes] = await Promise.all([
      getMiniSite('draft'),
      getPendingChanges(),
      getPageList({ current: 1, size: 200 }),
      getLatestRelease().catch(() => null),
      getConfigByGroupSilent('basic').catch(() => null),
    ])
    site.value = s
    pending.value = p.items || []
    syncSortableFromSite()
    const data = (pageRes as { data?: { records?: PageRow[]; list?: PageRow[] } })?.data
    pageOptions.value = (data?.records || data?.list || []) as PageRow[]
    if (s.pendingCount == null) {
      site.value = { ...s, pendingCount: p.pendingCount ?? pending.value.length }
    }
    const latest = (latestRes as { data?: { semver?: string; version?: string } })?.data
    wechatVerFallback.value = String(latest?.semver || latest?.version || '')
    // 公众号菜单：有 AppID / 菜单相关配置则视为已配置
    try {
      const configs = (cfgRes as any)?.data?.configs || (cfgRes as any)?.data || []
      const map = Array.isArray(configs)
        ? Object.fromEntries(configs.map((c: any) => [c.configKey || c.key, c.configValue ?? c.value]))
        : {}
      mpMenuConfigured.value = !!(
        map.mp_app_id || map.mpAppId || map.wechat_mp_appid || map.officialAccountAppId
        || map.mp_menu || map.mpMenu
      )
    } catch {
      mpMenuConfigured.value = false
    }
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '加载概览失败')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped lang="scss">
.meta-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--mw-muted);
}
.live-pill {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  color: var(--mw-green);
  background: var(--mw-green-bg);
}

.create-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}
.create-card {
  text-align: left;
  padding: 18px 20px;
  border: 1px solid var(--mw-border);
  border-radius: 14px;
  background: var(--mw-card);
  cursor: pointer;
  color: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
  &:hover {
    border-color: #d4a88a;
    box-shadow: 0 4px 14px rgba(180, 67, 15, 0.08);
  }
  &:disabled { opacity: 0.6; cursor: wait; }
}
.create-card--ai {
  background: var(--mw-terracotta);
  border-color: var(--mw-terracotta);
  color: #fff;
  .create-card__desc { color: rgba(255, 255, 255, 0.82); }
  &:hover {
    border-color: var(--mw-terracotta-hover);
    background: var(--mw-terracotta-hover);
    box-shadow: 0 6px 18px rgba(180, 67, 15, 0.28);
  }
}
.create-card__icon {
  font-size: 18px;
  margin-bottom: 10px;
  opacity: 0.9;
}
.create-card__title {
  font-size: 16px;
  font-weight: 650;
}
.create-card__desc {
  margin-top: 6px;
  font-size: 12px;
  color: var(--mw-muted);
  line-height: 1.45;
}

.overview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 16px;
  align-items: start;
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
  h2 {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
  }
}

.tab-cards-wrap {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
  gap: 10px;
  align-items: stretch;
}
.tab-cards {
  display: contents;
}
.drag {
  font-size: 12px;
  cursor: grab;
  user-select: none;
  &:active { cursor: grabbing; }
}
.tab-card {
  text-align: left;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--mw-border);
  background: #faf6f1;
  cursor: pointer;
  color: inherit;
  min-height: 118px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  &:hover { border-color: #d4a88a; }
  &.is-unbound { border-color: #fecdca; background: #fef6f4; }
}
.tab-card--add {
  border-style: dashed;
  align-items: center;
  justify-content: center;
  color: var(--mw-muted);
  .add-plus { font-size: 22px; line-height: 1; }
}
.tab-card__top {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--mw-muted);
}
.tab-card__name { font-size: 15px; font-weight: 650; margin-top: 2px; }
.tab-card__bind {
  font-size: 12px;
  color: var(--mw-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tab-card__status { margin-top: auto; padding-top: 6px; }
.unbound { font-size: 12px; color: #b42318; }
.lock, .drag { font-size: 12px; }

.lower-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 14px;
  margin-top: 14px;
}
.pending-list { display: flex; flex-direction: column; gap: 8px; }
.pending-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--mw-border);
  &:last-child { border-bottom: 0; }
}
.pending-row__main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.pending-row__name { font-weight: 600; font-size: 14px; }
.pending-row__time { font-size: 12px; color: var(--mw-muted); }
.empty-hint { margin: 0; font-size: 13px; color: var(--mw-muted); }

.eco-list { display: flex; flex-direction: column; gap: 4px; }
.eco-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--mw-border);
  font-size: 13px;
  &:last-child { border-bottom: 0; }
}
.eco-row--btn {
  width: 100%;
  background: none;
  border-left: 0;
  border-right: 0;
  border-top: 0;
  cursor: pointer;
  color: inherit;
  text-align: left;
}
.eco-val { color: var(--mw-muted); font-size: 12px; }

.preview-panel { position: sticky; top: 12px; }
.preview-toggle {
  display: inline-flex;
  border: 1px solid var(--mw-border);
  border-radius: 999px;
  overflow: hidden;
  button {
    border: 0;
    background: transparent;
    padding: 4px 10px;
    font-size: 12px;
    cursor: pointer;
    color: var(--mw-muted);
    &.active {
      background: var(--mw-terracotta);
      color: #fff;
    }
  }
}
.phone-frame {
  border-radius: 22px;
  overflow: hidden;
  border: 8px solid #1a1410;
  background: #1a1410;
  aspect-ratio: 375 / 720;
  max-height: 520px;
  iframe {
    width: 100%;
    height: 100%;
    border: 0;
    background: #fff;
  }
}
.scan-btn {
  width: 100%;
  margin-top: 12px;
}

@media (max-width: 1100px) {
  .overview-grid { grid-template-columns: 1fr; }
  .preview-panel { position: static; }
  .create-cards, .lower-grid { grid-template-columns: 1fr; }
}
</style>
