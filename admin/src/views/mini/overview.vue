<template>
  <div class="mini-page" v-loading="loading">
    <header class="site-head">
      <div class="site-head__main">
        <h1 class="site-head__title">{{ site.name || '小程序' }}</h1>
        <div class="site-chips">
          <span class="chip chip--ok">运营中</span>
          <span class="chip">{{ templateLabel }}</span>
          <span v-if="site.liveReleaseNo != null" class="chip">
            最近上线 · 第 {{ site.liveReleaseNo }} 次
            <template v-if="liveReleaseAtText"> · {{ liveReleaseAtText }}</template>
          </span>
          <span v-if="site.wechatCodeVersion" class="chip">微信代码 {{ site.wechatCodeVersion }}</span>
        </div>
      </div>
      <div class="site-head__actions">
        <el-button @click="load">刷新</el-button>
        <el-button type="primary" class="btn-terracotta" @click="goPublish">
          去发布{{ site.pendingCount ? `（${site.pendingCount}）` : '' }}
        </el-button>
      </div>
    </header>

    <section class="create-cards">
      <button type="button" class="create-card create-card--ai" @click="router.push('/mini/pages/new-ai')">
        <el-icon class="create-card__icon"><MagicStick /></el-icon>
        <div>
          <div class="create-card__title">AI 生成一页</div>
          <div class="create-card__desc">一句话描述，生成 3 套方案草稿</div>
        </div>
      </button>
      <button
        type="button"
        class="create-card"
        @click="router.push({ path: '/mini/templates', query: { tab: 'page' } })"
      >
        <el-icon class="create-card__icon"><Grid /></el-icon>
        <div>
          <div class="create-card__title">从模板新建</div>
          <div class="create-card__desc">按行业挑一页模板再改</div>
        </div>
      </button>
      <button type="button" class="create-card" @click="router.push('/mini/pages')">
        <el-icon class="create-card__icon"><Plus /></el-icon>
        <div>
          <div class="create-card__title">空白新建</div>
          <div class="create-card__desc">从组件库一块一块搭</div>
        </div>
      </button>
    </section>

    <div class="overview-grid">
      <div class="overview-main">
        <section class="panel">
          <div class="panel__head">
            <h2>底部导航</h2>
            <el-button link type="primary" @click="openTabDrawer()">编辑导航</el-button>
          </div>
          <div v-if="tabBar.length" class="tab-strip">
            <button
              v-for="(tab, i) in tabBar"
              :key="i"
              type="button"
              class="tab-card"
              :class="{ 'is-unbound': isTabUnbound(tab) }"
              @click="openTabDrawer(i)"
            >
              <span class="tab-card__grip" aria-hidden="true">⋮⋮</span>
              <span class="tab-card__name">
                <el-icon v-if="isMineTab(tab)" class="tab-card__lock"><Lock /></el-icon>
                {{ tab.text || `导航 ${i + 1}` }}
              </span>
              <span class="tab-card__status" :data-status="tabStatus(tab).key">
                {{ tabStatus(tab).label }}
              </span>
            </button>
            <button
              v-if="tabBar.length < 5"
              type="button"
              class="tab-card tab-card--add"
              @click="addTabSlot"
            >
              <el-icon><Plus /></el-icon>
              <span>最多 5 个</span>
            </button>
          </div>
          <el-empty v-else description="尚未配置底部导航" :image-size="64">
            <el-button type="primary" class="btn-terracotta" @click="addTabSlot">添加导航</el-button>
          </el-empty>
        </section>

        <div class="info-grid">
          <section class="panel">
            <div class="panel__head">
              <div>
                <h2>待发布的改动</h2>
                <p class="panel__sub">
                  {{ pendingCountText }}，发布后用户才能看到
                </p>
              </div>
              <el-button link type="primary" @click="goPublish">去发布</el-button>
            </div>
            <div v-if="pendingPreview.length" class="pending-list">
              <div
                v-for="item in pendingPreview"
                :key="String(item.id || item.pageId || item.name)"
                class="pending-row"
              >
                <div class="pending-row__main">
                  <span class="pending-row__name">
                    <em>{{ pendingVerb(item) }}</em>
                    {{ item.name || '未命名' }}
                    <template v-if="item.summary"> · {{ item.summary }}</template>
                  </span>
                  <span v-if="item.path" class="pending-row__sum">{{ item.path }}</span>
                </div>
                <PageStatusTag :status="(item.status as any) || 'pending'" />
              </div>
            </div>
            <el-empty
              v-else
              description="没有待发布的改动，线上就是你现在看到的样子"
              :image-size="56"
            />
          </section>

          <section class="panel">
            <div class="panel__head">
              <h2>微信生态</h2>
            </div>
            <div class="wx-list">
              <button type="button" class="wx-row" @click="router.push('/mini/publish')">
                <span class="wx-row__label">正式版</span>
                <span class="wx-row__value">
                  {{ site.wechatCodeVersion ? `代码 ${site.wechatCodeVersion}` : '去查看发布状态' }}
                </span>
              </button>
              <button type="button" class="wx-row" @click="router.push('/settings/wechat')">
                <span class="wx-row__label">公众号菜单</span>
                <span class="wx-row__value">去配置</span>
              </button>
              <button type="button" class="wx-row" @click="router.push('/settings/wechat')">
                <span class="wx-row__label">小程序码</span>
                <span class="wx-row__value">去生成 / 查看</span>
              </button>
            </div>
          </section>
        </div>
      </div>

      <aside class="panel preview-panel">
        <div class="panel__head">
          <h2>真机预览</h2>
          <el-radio-group v-model="previewSource" size="small" class="preview-toggle">
            <el-radio-button value="draft">改动后</el-radio-button>
            <el-radio-button value="live">线上</el-radio-button>
          </el-radio-group>
        </div>
        <div class="phone-frame">
          <iframe :key="previewSource" :src="previewUrl" title="小程序预览" loading="lazy" />
        </div>
        <button type="button" class="preview-scan" @click="openLivePreview">
          扫码在手机上看
        </button>
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
        <el-form-item v-if="drawerIndex != null && tabBar.length > 1" label="顺序">
          <div class="drawer-sort">
            <el-button
              size="small"
              :disabled="drawerIndex === 0 || savingTabs"
              @click="moveTab(drawerIndex, -1)"
            >
              上移
            </el-button>
            <el-button
              size="small"
              :disabled="drawerIndex >= tabBar.length - 1 || savingTabs"
              @click="moveTab(drawerIndex, 1)"
            >
              下移
            </el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="drawerVisible = false">取消</el-button>
        <el-button type="primary" class="btn-terracotta" :loading="savingTabs" @click="saveTabEdit">
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
import { Grid, Lock, MagicStick, Plus } from '@element-plus/icons-vue'
import PageStatusTag from '@/components/mini/PageStatusTag.vue'
import {
  getMiniSite,
  getPendingChanges,
  updateMiniSite,
  type MiniSiteVO,
  type MiniTabBarItem,
  type PendingChangeItem,
} from '@/api/miniSite'
import { getPageList } from '@/api/page'
import { resolvePageStatus } from '@/utils/pageStatus'
import type { PageRecord as PageRow } from '@/types/page'

defineOptions({ name: 'MiniOverview' })

const router = useRouter()
const loading = ref(false)
const savingTabs = ref(false)
const site = ref<MiniSiteVO>({})
const pending = ref<PendingChangeItem[]>([])
const previewSource = ref<'draft' | 'live'>('draft')
const pageOptions = ref<PageRow[]>([])

const drawerVisible = ref(false)
const drawerIndex = ref<number | null>(null)
const editTab = ref<MiniTabBarItem | null>(null)
const editPageId = ref<number | null>(null)

const templateLabel = computed(() => site.value.templateName || '自定义模板')
const tabBar = computed(() => site.value.tabBar || [])
const pendingPreview = computed(() => pending.value.slice(0, 5))
const pendingCountText = computed(() => {
  const n = site.value.pendingCount ?? pending.value.length
  return n ? `${n} 项` : '暂无改动'
})

const liveReleaseAtText = computed(() => formatReleaseAt(site.value.liveReleaseAt))

const bindablePages = computed(() =>
  pageOptions.value.filter((p) => {
    const st = resolvePageStatus(p as any)
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

function formatReleaseAt(v?: string | null) {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return String(v)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${mm}-${dd} ${hh}:${mi}`
}

function isTabUnbound(tab: MiniTabBarItem) {
  return !(tab.pageId || tab.pagePath)
}

function isMineTab(tab: MiniTabBarItem) {
  const path = String(tab.pagePath || '').toLowerCase()
  const text = String(tab.text || '')
  return text.includes('我的') || /mine|pkg-user/.test(path)
}

function tabStatus(tab: MiniTabBarItem): { key: string; label: string } {
  if (isTabUnbound(tab)) return { key: 'empty', label: '未绑定' }
  const hit = pageOptions.value.find((p) => {
    if (tab.pageId != null && Number(p.id) === Number(tab.pageId)) return true
    const path = String(p.path || '').replace(/^\//, '')
    return path && path === String(tab.pagePath || '').replace(/^\//, '')
  })
  if (!hit) return { key: 'live', label: '已上线' }
  const st = resolvePageStatus(hit as any)
  if (st === 'pending' || st === 'draft') return { key: 'dirty', label: '有改动' }
  if (st === 'offline') return { key: 'empty', label: '已下架' }
  return { key: 'live', label: '已上线' }
}

function pendingVerb(item: PendingChangeItem) {
  if (item.type === 'site') return '修改'
  if (item.status === 'draft') return '新增'
  return '修改'
}

function goPublish() {
  router.push('/mini/publish')
}

function openLivePreview() {
  const source = previewSource.value === 'live' ? 'live' : 'draft'
  const { href } = router.resolve({ path: '/h5/miniapp-preview', query: { view: 'config', source } })
  window.open(href, '_blank', 'noopener,noreferrer')
}

function openTabDrawer(index?: number) {
  const list = [...(site.value.tabBar || [])]
  if (index == null) {
    if (!list.length) {
      drawerIndex.value = 0
      editTab.value = { text: '首页', pagePath: '' }
      editPageId.value = null
      drawerVisible.value = true
      return
    }
    drawerIndex.value = 0
  } else {
    drawerIndex.value = index
  }
  const idx = drawerIndex.value ?? 0
  const current = list[idx] || { text: '', pagePath: '' }
  editTab.value = { ...current }
  editPageId.value = current.pageId != null && current.pageId !== '' ? Number(current.pageId) : null
  drawerVisible.value = true
}

function addTabSlot() {
  const list = site.value.tabBar || []
  if (list.length >= 5) {
    ElMessage.warning('底部导航最多 5 个')
    return
  }
  drawerIndex.value = list.length
  editTab.value = { text: '', pagePath: '' }
  editPageId.value = null
  drawerVisible.value = true
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
  } catch (e: any) {
    ElMessage.error(e?.message || '保存导航失败')
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
  if (!String(editTab.value.text || '').trim()) {
    ElMessage.warning('请填写导航标题')
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
  if (next.length > 5) {
    ElMessage.warning('底部导航最多 5 个')
    return
  }
  await persistTabBar(next)
  drawerVisible.value = false
}

async function moveTab(index: number, delta: number) {
  const target = index + delta
  const list = [...(site.value.tabBar || [])]
  if (target < 0 || target >= list.length) return
  const tmp = list[index]
  list[index] = list[target]
  list[target] = tmp
  await persistTabBar(list, '顺序已更新')
  drawerIndex.value = target
  editTab.value = { ...list[target] }
  editPageId.value =
    list[target].pageId != null && list[target].pageId !== '' ? Number(list[target].pageId) : null
}

async function load() {
  loading.value = true
  try {
    const [s, p, pageRes] = await Promise.all([
      getMiniSite('draft'),
      getPendingChanges(),
      getPageList({ current: 1, size: 100 }),
    ])
    site.value = s
    pending.value = p.items || []
    pageOptions.value = ((pageRes as any)?.data?.records || (pageRes as any)?.data?.list || []) as PageRow[]
    if (s.pendingCount == null) {
      site.value = { ...s, pendingCount: p.pendingCount ?? pending.value.length }
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '加载概览失败')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped lang="scss">
.mini-page {
  --mini-bg: #f7f4f0;
  --mini-terracotta: #c45a30;
  --mini-ink: #2c241c;
  --mini-muted: #7a6e64;
  --mini-card: #ffffff;
  --mini-border: #e8e0d6;
  min-height: 100%;
  margin: -16px;
  padding: 20px 24px 40px;
  background: var(--mini-bg);
  color: var(--mini-ink);
}

.site-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}
.site-head__title {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.25;
}
.site-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}
.chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--mini-muted);
  background: #efe8e0;
  border: 1px solid transparent;
}
.chip--ok {
  color: #2f6b3a;
  background: #e8f2e9;
  border-color: #b7d4bc;
}
.site-head__actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  align-items: flex-start;
}
.btn-terracotta {
  --el-button-bg-color: var(--mini-terracotta);
  --el-button-border-color: var(--mini-terracotta);
  --el-button-hover-bg-color: #a84c28;
  --el-button-hover-border-color: #a84c28;
  --el-button-active-bg-color: #8f4122;
  --el-button-active-border-color: #8f4122;
}

.create-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}
.create-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  text-align: left;
  padding: 16px 18px;
  border: 1px solid var(--mini-border);
  border-radius: 12px;
  background: var(--mini-card);
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
}
.create-card:hover {
  border-color: #d4a88a;
  box-shadow: 0 4px 14px rgba(196, 90, 48, 0.08);
  transform: translateY(-1px);
}
.create-card--ai {
  background: linear-gradient(135deg, #c45a30 0%, #d9784a 100%);
  border-color: transparent;
  color: #fff;
  .create-card__desc { color: rgba(255, 255, 255, 0.85); }
  .create-card__icon { color: #fff; background: rgba(255, 255, 255, 0.18); }
  &:hover {
    border-color: transparent;
    box-shadow: 0 6px 18px rgba(196, 90, 48, 0.28);
  }
}
.create-card__icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #f3ebe3;
  color: var(--mini-terracotta);
  font-size: 18px;
  flex-shrink: 0;
}
.create-card__title {
  font-size: 15px;
  font-weight: 600;
}
.create-card__desc {
  margin-top: 4px;
  font-size: 12px;
  color: var(--mini-muted);
  line-height: 1.4;
}

.overview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 16px;
  align-items: start;
}
.panel {
  background: var(--mini-card);
  border: 1px solid var(--mini-border);
  border-radius: 14px;
  padding: 16px 18px;
  margin-bottom: 14px;
}
.panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
  h2 {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
  }
}
.panel__sub {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--mini-muted);
}

.tab-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.tab-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  min-width: 104px;
  padding: 12px 14px 12px 22px;
  border-radius: 12px;
  border: 1px solid var(--mini-border);
  background: #faf7f3;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, background 0.15s;
  &:hover { border-color: #d4a88a; background: #fff; }
  &.is-unbound {
    background: #fef3f2;
    border-color: #fecdca;
  }
}
.tab-card__grip {
  position: absolute;
  left: 6px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 10px;
  letter-spacing: -2px;
  color: #c4b8ac;
  line-height: 1;
}
.tab-card__name {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  font-size: 14px;
}
.tab-card__lock {
  font-size: 12px;
  color: var(--mini-muted);
}
.tab-card__status {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 999px;
  &[data-status='live'] { color: #2f6b3a; background: #e8f2e9; }
  &[data-status='dirty'] { color: #9a6b12; background: #fdf0d8; }
  &[data-status='empty'] { color: #b42318; background: #fef3f2; }
}
.tab-card--add {
  align-items: center;
  justify-content: center;
  color: var(--mini-muted);
  border-style: dashed;
  min-height: 72px;
  padding-left: 14px;
  gap: 4px;
  .el-icon { font-size: 16px; }
  span { font-size: 12px; }
}

.info-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
  gap: 14px;
  .panel { margin-bottom: 0; }
}

.pending-list { display: flex; flex-direction: column; gap: 8px; }
.pending-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #f8f4ee;
}
.pending-row__main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.pending-row__name {
  font-weight: 600;
  font-size: 13px;
  em {
    font-style: normal;
    color: var(--mini-terracotta);
    margin-right: 2px;
  }
}
.pending-row__sum { font-size: 12px; color: var(--mini-muted); }

.wx-list { display: flex; flex-direction: column; gap: 8px; }
.wx-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid var(--mini-border);
  background: #faf7f3;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s;
  &:hover { border-color: #d4a88a; }
}
.wx-row__label { font-weight: 600; font-size: 13px; }
.wx-row__value { font-size: 12px; color: var(--mini-muted); }

.preview-panel {
  position: sticky;
  top: 12px;
  margin-bottom: 0;
}
.preview-toggle {
  :deep(.el-radio-button__inner) {
    padding: 5px 10px;
  }
  :deep(.el-radio-button.is-active .el-radio-button__inner) {
    background: var(--mini-terracotta);
    border-color: var(--mini-terracotta);
    box-shadow: none;
  }
}
.phone-frame {
  border-radius: 28px;
  overflow: hidden;
  border: 8px solid #1a1410;
  background: #1a1410;
  aspect-ratio: 375 / 720;
  max-height: 520px;
  box-shadow: 0 12px 32px rgba(44, 36, 28, 0.18);
  iframe {
    width: 100%;
    height: 100%;
    border: 0;
    background: #fff;
  }
}
.preview-scan {
  display: block;
  width: 100%;
  margin-top: 12px;
  padding: 10px 12px;
  border: 1px dashed var(--mini-border);
  border-radius: 10px;
  background: transparent;
  color: var(--mini-muted);
  font-size: 13px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  &:hover {
    color: var(--mini-terracotta);
    border-color: #d4a88a;
  }
}

.drawer-sort { display: flex; gap: 8px; }

@media (max-width: 1100px) {
  .overview-grid { grid-template-columns: 1fr; }
  .preview-panel { position: static; }
  .create-cards { grid-template-columns: 1fr; }
  .info-grid { grid-template-columns: 1fr; }
}
</style>
