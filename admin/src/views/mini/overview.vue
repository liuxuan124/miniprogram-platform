<template>
  <div class="mini-page" v-loading="loading">
    <div class="overview-layout">
      <div class="overview-main">
        <header class="site-head">
          <h1 class="site-head__title">{{ site.name || '小程序' }}</h1>
          <p class="site-head__meta">
            <span class="meta-ok">运营中</span>
            <span class="meta-dot">·</span>
            <span>{{ templateLabel }}</span>
            <template v-if="site.liveReleaseNo != null">
              <span class="meta-dot">·</span>
              <span>
                最近上线 · 第 {{ site.liveReleaseNo }} 次
                <template v-if="liveReleaseAtText"> · {{ liveReleaseAtText }}</template>
              </span>
            </template>
            <template v-if="site.wechatCodeVersion">
              <span class="meta-dot">·</span>
              <span>微信代码 {{ site.wechatCodeVersion }}</span>
            </template>
          </p>
        </header>

        <section class="create-cards">
          <button type="button" class="create-card create-card--ai" @click="router.push('/mini/pages/new-ai')">
            <span class="create-card__icon" aria-hidden="true">✦</span>
            <span class="create-card__body">
              <span class="create-card__title">AI 生成页面</span>
              <span class="create-card__desc">一句话描述，AI 出 3 套方案</span>
            </span>
          </button>
          <button
            type="button"
            class="create-card"
            @click="router.push({ path: '/mini/templates', query: { tab: 'page' } })"
          >
            <span class="create-card__icon" aria-hidden="true">▦</span>
            <span class="create-card__body">
              <span class="create-card__title">从模板新建</span>
              <span class="create-card__desc">按行业挑一页模板再改</span>
            </span>
          </button>
          <button type="button" class="create-card" @click="router.push('/mini/pages')">
            <span class="create-card__icon" aria-hidden="true">＋</span>
            <span class="create-card__body">
              <span class="create-card__title">空白页面</span>
              <span class="create-card__desc">从组件库一块一块搭</span>
            </span>
          </button>
        </section>

        <section class="panel">
          <div class="panel__head">
            <h2>底部导航</h2>
            <button type="button" class="text-btn" @click="openTabDrawer()">编辑导航</button>
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
              <span class="tab-card__grip" aria-hidden="true"></span>
              <span class="tab-card__name">
                <span v-if="isMineTab(tab)" class="tab-card__lock" title="固定页" aria-label="固定页" />
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
              <span class="tab-card__plus">＋</span>
              <span class="tab-card__hint">最多 5 个</span>
            </button>
          </div>
          <div v-else class="empty-block">
            <p>尚未配置底部导航</p>
            <button type="button" class="btn-primary" @click="addTabSlot">添加导航</button>
          </div>
        </section>

        <div class="info-grid">
          <section class="panel">
            <div class="panel__head">
              <div>
                <h2>待发布的改动</h2>
                <p class="panel__sub">{{ pendingCountText }}，发布后用户才能看到</p>
              </div>
              <button type="button" class="text-btn" @click="goPublish">去发布</button>
            </div>
            <ul v-if="pendingPreview.length" class="pending-list">
              <li
                v-for="item in pendingPreview"
                :key="String(item.id || item.pageId || item.name)"
                class="pending-row"
              >
                <span class="pending-tag" :data-verb="pendingVerb(item)">{{ pendingVerb(item) }}</span>
                <div class="pending-row__text">
                  <span class="pending-row__name">{{ item.name || '未命名' }}</span>
                  <span v-if="item.summary" class="pending-row__sum">{{ item.summary }}</span>
                </div>
              </li>
            </ul>
            <p v-else class="empty-inline">没有待发布的改动，线上就是你现在看到的样子</p>
          </section>

          <section class="panel">
            <div class="panel__head">
              <h2>微信生态</h2>
            </div>
            <ul class="wx-list">
              <li>
                <button type="button" class="wx-row" @click="router.push('/mini/publish')">
                  <span class="wx-row__label">正式版</span>
                  <span class="wx-row__value">
                    {{ site.wechatCodeVersion ? `代码 ${site.wechatCodeVersion}` : '尚未同步版本号' }}
                  </span>
                </button>
              </li>
              <li>
                <button type="button" class="wx-row" @click="router.push('/settings/wechat')">
                  <span class="wx-row__label">公众号菜单</span>
                  <span class="wx-row__value">去配置</span>
                </button>
              </li>
              <li>
                <button type="button" class="wx-row" @click="router.push('/settings/wechat')">
                  <span class="wx-row__label">小程序码</span>
                  <span class="wx-row__value">去生成</span>
                </button>
              </li>
            </ul>
          </section>
        </div>
      </div>

      <aside class="preview-col">
        <div class="preview-col__head">
          <h2>真机预览</h2>
          <div class="seg" role="tablist" aria-label="预览来源">
            <button
              type="button"
              role="tab"
              class="seg__btn"
              :class="{ active: previewSource === 'draft' }"
              @click="previewSource = 'draft'"
            >
              改动后
            </button>
            <button
              type="button"
              role="tab"
              class="seg__btn"
              :class="{ active: previewSource === 'live' }"
              @click="previewSource = 'live'"
            >
              线上
            </button>
          </div>
        </div>
        <div class="phone-shell">
          <div class="phone-shell__notch" aria-hidden="true" />
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
  const n = Number(site.value.pendingCount ?? pending.value.length ?? 0)
  return n > 0 ? `${n} 项` : '暂无改动'
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
    const pendingTotal =
      (p as any).pendingCount ?? (p as any).total ?? pending.value.length
    if (s.pendingCount == null) {
      site.value = { ...s, pendingCount: pendingTotal }
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
  --ink: #2c241c;
  --muted: #8a7d72;
  --bg: #f3efe9;
  --card: #ffffff;
  --line: #ebe3d9;
  --accent: #c45a30;
  --accent-deep: #a84c28;
  --ok: #2f6b3a;
  --ok-bg: #e7f1e8;
  --warn: #9a6b12;
  --warn-bg: #f8ecd2;
  --new: #2f5f8f;
  --new-bg: #e4eef7;
  min-height: 100%;
  margin: -16px;
  padding: 20px 20px 32px;
  background: var(--bg);
  color: var(--ink);
  font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
}

.overview-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 292px;
  gap: 20px;
  align-items: start;
  max-width: 1280px;
}

.site-head {
  margin-bottom: 16px;
}
.site-head__title {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.2;
  color: #2a211a;
}
.site-head__meta {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.6;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px 0;
}
.meta-ok {
  color: var(--ok);
  font-weight: 600;
}
.meta-dot {
  margin: 0 6px;
  color: #c5bbb0;
}

.create-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}
.create-card {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 72px;
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--card);
  cursor: pointer;
  text-align: left;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
  &:hover {
    transform: translateY(-1px);
    border-color: #dfcfc0;
    box-shadow: 0 8px 20px rgba(44, 36, 28, 0.06);
  }
}
.create-card--ai {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
  .create-card__desc { color: rgba(255, 255, 255, 0.82); }
  .create-card__icon {
    background: rgba(255, 255, 255, 0.18);
    color: #fff;
  }
  &:hover {
    background: var(--accent-deep);
    border-color: var(--accent-deep);
    box-shadow: 0 10px 22px rgba(196, 90, 48, 0.28);
  }
}
.create-card__icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: #f4ebe3;
  color: var(--accent);
  font-size: 16px;
  font-weight: 600;
}
.create-card__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.create-card__title {
  font-size: 14px;
  font-weight: 650;
  line-height: 1.3;
}
.create-card__desc {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.35;
}

.panel {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 14px 16px 16px;
  margin-bottom: 12px;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.7) inset;
}
.panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  h2 {
    margin: 0;
    font-size: 14px;
    font-weight: 650;
    letter-spacing: 0.01em;
  }
}
.panel__sub {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--muted);
}
.text-btn {
  border: 0;
  background: transparent;
  color: var(--accent);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  white-space: nowrap;
  &:hover { color: var(--accent-deep); }
}

.tab-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
  gap: 8px;
}
.tab-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  min-height: 78px;
  padding: 12px 12px 12px 18px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: #fbf8f4;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, background 0.15s;
  &:hover {
    border-color: #dfc3ae;
    background: #fff;
  }
  &.is-unbound {
    background: #fff5f3;
    border-color: #f0c7bf;
  }
}
.tab-card__grip {
  position: absolute;
  left: 7px;
  top: 50%;
  width: 4px;
  height: 16px;
  transform: translateY(-50%);
  background:
    radial-gradient(circle, #c9bdb2 1.2px, transparent 1.3px) 0 0 / 4px 5px repeat-y,
    radial-gradient(circle, #c9bdb2 1.2px, transparent 1.3px) 2.5px 0 / 4px 5px repeat-y;
  opacity: 0.9;
}
.tab-card__name {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 650;
  line-height: 1.2;
}
.tab-card__lock {
  width: 10px;
  height: 10px;
  border: 1.5px solid var(--muted);
  border-radius: 2px;
  position: relative;
  flex-shrink: 0;
  &::before {
    content: '';
    position: absolute;
    left: 1.5px;
    top: -4px;
    width: 5px;
    height: 4px;
    border: 1.5px solid var(--muted);
    border-bottom: 0;
    border-radius: 5px 5px 0 0;
  }
}
.tab-card__status {
  font-size: 11px;
  font-weight: 650;
  padding: 2px 7px;
  border-radius: 999px;
  line-height: 1.4;
  &[data-status='live'] { color: var(--ok); background: var(--ok-bg); }
  &[data-status='dirty'] { color: var(--warn); background: var(--warn-bg); }
  &[data-status='empty'] { color: #b42318; background: #fdeceb; }
}
.tab-card--add {
  align-items: center;
  justify-content: center;
  padding-left: 12px;
  border-style: dashed;
  color: var(--muted);
  background: transparent;
  gap: 4px;
}
.tab-card__plus { font-size: 18px; line-height: 1; }
.tab-card__hint { font-size: 11px; }

.info-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  gap: 12px;
  .panel { margin-bottom: 0; }
}

.pending-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.pending-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  padding: 10px 12px;
  border-radius: 10px;
  background: #faf6f1;
}
.pending-tag {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 6px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 650;
  flex-shrink: 0;
  &[data-verb='修改'] { color: var(--accent); background: #f8e8df; }
  &[data-verb='新增'] { color: var(--new); background: var(--new-bg); }
}
.pending-row__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.pending-row__name {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
}
.pending-row__sum {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.empty-inline {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--muted);
  line-height: 1.5;
}
.empty-block {
  text-align: center;
  padding: 24px 12px;
  color: var(--muted);
  font-size: 13px;
  p { margin: 0 0 12px; }
}
.btn-primary {
  border: 0;
  border-radius: 10px;
  background: var(--accent);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 14px;
  cursor: pointer;
  &:hover { background: var(--accent-deep); }
}

.wx-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.wx-row {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 12px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: #faf6f1;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s;
  &:hover { border-color: #dfc3ae; }
}
.wx-row__label {
  font-size: 13px;
  font-weight: 650;
}
.wx-row__value {
  font-size: 12px;
  color: var(--muted);
}

.preview-col {
  position: sticky;
  top: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 14px 16px;
  border-radius: 16px;
  background: var(--card);
  border: 1px solid var(--line);
}
.preview-col__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  h2 {
    margin: 0;
    font-size: 14px;
    font-weight: 650;
  }
}
.seg {
  display: inline-flex;
  padding: 2px;
  border-radius: 999px;
  background: #efe8e0;
}
.seg__btn {
  border: 0;
  background: transparent;
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
  padding: 5px 10px;
  border-radius: 999px;
  cursor: pointer;
  &.active {
    background: var(--accent);
    color: #fff;
  }
}
.phone-shell {
  position: relative;
  margin: 0 auto;
  width: 100%;
  max-width: 248px;
  aspect-ratio: 375 / 760;
  border-radius: 28px;
  overflow: hidden;
  background: #15100d;
  border: 9px solid #1c1511;
  box-shadow:
    0 18px 40px rgba(44, 36, 28, 0.18),
    inset 0 0 0 1px rgba(255, 255, 255, 0.06);
  iframe {
    width: 100%;
    height: 100%;
    border: 0;
    background: #fff;
  }
}
.phone-shell__notch {
  position: absolute;
  z-index: 2;
  top: 8px;
  left: 50%;
  width: 72px;
  height: 8px;
  transform: translateX(-50%);
  border-radius: 999px;
  background: #0d0a08;
  pointer-events: none;
}
.preview-scan {
  width: 100%;
  border: 1px dashed #d9cec2;
  border-radius: 10px;
  background: transparent;
  color: var(--muted);
  font-size: 13px;
  font-weight: 550;
  padding: 10px 12px;
  cursor: pointer;
  &:hover {
    color: var(--accent);
    border-color: #dfc3ae;
  }
}

.btn-terracotta {
  --el-button-bg-color: var(--accent);
  --el-button-border-color: var(--accent);
  --el-button-hover-bg-color: var(--accent-deep);
  --el-button-hover-border-color: var(--accent-deep);
}
.drawer-sort { display: flex; gap: 8px; }

@media (max-width: 1100px) {
  .overview-layout { grid-template-columns: 1fr; }
  .preview-col { position: static; max-width: 320px; margin: 0 auto; }
  .create-cards { grid-template-columns: 1fr; }
  .info-grid { grid-template-columns: 1fr; }
}
</style>
