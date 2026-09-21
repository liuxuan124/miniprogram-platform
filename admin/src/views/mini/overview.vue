<template>
  <div class="mini-wb mw-page overview" v-loading="loading">
    <div class="ov">
      <div class="ov__main">
        <header class="ov-head">
          <h1 class="mw-title">{{ site.name || '小程序' }}</h1>
          <p class="ov-meta">
            <span class="live-pill">运营中</span>
            <span class="dot">·</span>
            <span>{{ templateLabel }}</span>
            <template v-if="site.liveReleaseNo != null">
              <span class="dot">·</span>
              <span>
                最近上线 · 第 {{ site.liveReleaseNo }} 次
                <template v-if="liveReleaseAtText"> · {{ liveReleaseAtText }}</template>
              </span>
            </template>
            <template v-else>
              <span class="dot">·</span>
              <span>线上：尚未发布</span>
            </template>
            <span class="dot">·</span>
            <span>微信代码 {{ wechatCodeLabel }}</span>
          </p>
        </header>

        <section class="create-row">
          <button type="button" class="create create--ai" @click="router.push('/mini/pages/new-ai')">
            <span class="create__ico" aria-hidden="true">✦</span>
            <span class="create__txt">
              <span class="create__title">AI 生成页面</span>
              <span class="create__desc">一句话描述，AI 出 3 套方案</span>
            </span>
          </button>
          <button
            type="button"
            class="create"
            @click="router.push({ path: '/mini/templates', query: { tab: 'page' } })"
          >
            <span class="create__ico" aria-hidden="true">▦</span>
            <span class="create__txt">
              <span class="create__title">从模板新建</span>
              <span class="create__desc">按行业挑一页模板再改</span>
            </span>
          </button>
          <button type="button" class="create" :disabled="creatingBlank" @click="createBlank">
            <span class="create__ico" aria-hidden="true">+</span>
            <span class="create__txt">
              <span class="create__title">空白页面</span>
              <span class="create__desc">从组件库一块一块搭</span>
            </span>
          </button>
        </section>

        <section class="mw-panel">
          <div class="panel-head">
            <h2>底部导航</h2>
            <button type="button" class="mw-link" @click="openTabDrawer()">编辑导航</button>
          </div>
          <div v-if="tabBar.length" class="tab-row">
            <button
              v-for="(tab, i) in tabBar"
              :key="i"
              type="button"
              class="tab"
              :class="{ 'is-unbound': isTabUnbound(tab) }"
              @click="openTabDrawer(i)"
            >
              <span class="tab__grip" aria-hidden="true" />
              <span class="tab__name">
                <span v-if="isMineTab(tab)" class="tab__lock" title="固定页" />
                {{ tab.text || `导航 ${i + 1}` }}
              </span>
              <span class="tab__st" :data-st="tabStatus(tab).key">{{ tabStatus(tab).label }}</span>
            </button>
            <button
              v-if="tabBar.length < 5"
              type="button"
              class="tab tab--add"
              @click="addTabSlot"
            >
              <span class="tab__plus">+</span>
              <span>最多 5 个</span>
            </button>
          </div>
          <div v-else class="empty">
            <p>尚未配置底部导航</p>
            <button type="button" class="mw-btn-primary el-button el-button--primary" @click="addTabSlot">
              添加导航
            </button>
          </div>
        </section>

        <div class="lower">
          <section class="mw-panel">
            <div class="panel-head">
              <div>
                <h2>待发布的改动</h2>
                <p class="panel-sub">{{ pendingCountText }}，发布后用户才能看到</p>
              </div>
              <button type="button" class="mw-link" @click="goPublish">去发布</button>
            </div>
            <ul v-if="pendingPreview.length" class="pend">
              <li v-for="item in pendingPreview" :key="String(item.id || item.pageId || item.name)" class="pend__row">
                <span :class="pendingVerb(item) === '新增' ? 'mw-tag-new' : 'mw-tag-mod'">
                  {{ pendingVerb(item) }}
                </span>
                <div class="pend__body">
                  <span class="pend__title">
                    {{ item.name || '未命名' }}
                    <template v-if="item.summary"> · {{ item.summary }}</template>
                  </span>
                </div>
                <span v-if="pendingTime(item)" class="pend__time">{{ pendingTime(item) }}</span>
              </li>
            </ul>
            <p v-else class="empty-hint">没有待发布的改动，线上就是你现在看到的样子</p>
          </section>

          <section class="mw-panel">
            <div class="panel-head">
              <h2>微信生态</h2>
            </div>
            <ul class="eco">
              <li>
                <button type="button" class="eco__row" @click="router.push('/mini/publish')">
                  <span>正式版</span>
                  <span class="eco__val">代码 {{ wechatCodeLabel }}</span>
                </button>
              </li>
              <li>
                <button type="button" class="eco__row" @click="router.push('/settings/wechat')">
                  <span>公众号菜单</span>
                  <span class="eco__val">{{ mpMenuLabel }}</span>
                </button>
              </li>
              <li>
                <button type="button" class="eco__row" @click="router.push('/settings/wechat')">
                  <span>小程序码</span>
                  <span class="eco__val">{{ qrCodeLabel }}</span>
                </button>
              </li>
            </ul>
          </section>
        </div>
      </div>

      <aside class="ov__preview mw-panel">
        <div class="panel-head">
          <h2>真机预览</h2>
          <div class="seg" role="tablist">
            <button
              type="button"
              class="seg__btn"
              :class="{ active: previewSource === 'draft' }"
              @click="previewSource = 'draft'"
            >
              改动后
            </button>
            <button
              type="button"
              class="seg__btn"
              :class="{ active: previewSource === 'live' }"
              @click="previewSource = 'live'"
            >
              线上
            </button>
          </div>
        </div>
        <div class="phone">
          <div class="phone__notch" aria-hidden="true" />
          <iframe :key="previewSource" class="phone__frame" :src="previewUrl" title="小程序预览" loading="lazy" />
        </div>
        <button type="button" class="scan" @click="openLivePreview">扫码在手机上看</button>
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
            <el-button size="small" :disabled="drawerIndex === 0 || savingTabs" @click="moveTab(drawerIndex, -1)">
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
import '@/styles/mini-workbench.scss'
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
import { resolvePageStatus } from '@/utils/pageStatus'
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
const wechatVerFallback = ref('')
const mpMenuConfigured = ref(false)

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
const wechatCodeLabel = computed(
  () => site.value.wechatCodeVersion || wechatVerFallback.value || '—',
)
const homeTabText = computed(() => {
  const t = (site.value.tabBar || [])[0]
  return t?.text || '首页'
})
const boundPageCount = computed(
  () => (site.value.tabBar || []).filter((t) => t.pageId || t.pagePath).length,
)
const mpMenuLabel = computed(() =>
  mpMenuConfigured.value ? `已绑${homeTabText.value}` : '去配置',
)
const qrCodeLabel = computed(() =>
  boundPageCount.value > 0 ? `已生成 ${boundPageCount.value} 页` : '去生成',
)

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

/** 有时间字段才展示；无则隐藏（不对齐假数据） */
function pendingTime(item: PendingChangeItem) {
  const raw = (item as any).updatedAt || (item as any).updateTime || (item as any).createdAt
  if (!raw) return ''
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return ''
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  return formatReleaseAt(String(raw))
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
  if (item.status === 'draft' || /尚未|新增|新建/.test(String(item.summary || ''))) return '新增'
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
      getPageList({ current: 1, size: 100 }),
      getLatestRelease().catch(() => null),
      getConfigByGroupSilent('basic').catch(() => null),
    ])
    site.value = s
    pending.value = p.items || []
    const data = (pageRes as { data?: { records?: PageRow[]; list?: PageRow[] } })?.data
    pageOptions.value = (data?.records || data?.list || []) as PageRow[]
    const pendingTotal =
      (p as { pendingCount?: number; total?: number }).pendingCount
      ?? (p as { total?: number }).total
      ?? pending.value.length
    if (s.pendingCount == null) {
      site.value = { ...s, pendingCount: pendingTotal }
    }
    const latest = (latestRes as { data?: { semver?: string; version?: string } })?.data
    wechatVerFallback.value = String(latest?.semver || latest?.version || '')
    try {
      const configs = (cfgRes as any)?.data?.configs || (cfgRes as any)?.data || []
      const map = Array.isArray(configs)
        ? Object.fromEntries(configs.map((c: any) => [c.configKey || c.key, c.configValue ?? c.value]))
        : {}
      mpMenuConfigured.value = !!(
        map.mp_app_id
        || map.mpAppId
        || map.wechat_mp_appid
        || map.officialAccountAppId
        || map.mp_menu
        || map.mpMenu
      )
    } catch {
      mpMenuConfigured.value = false
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
.overview.mw-page {
  margin: -16px;
}

.ov {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 18px;
  align-items: start;
  max-width: 1240px;
}

.ov-head { margin-bottom: 14px; }
.mw-title {
  margin: 0 !important;
  font-size: 28px !important;
  line-height: 1.2;
}
.ov-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--mw-muted);
  line-height: 1.6;
}
.dot {
  margin: 0 6px;
  color: #c5bbb0;
}
.live-pill {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: var(--mw-green);
  background: var(--mw-green-bg);
}

.create-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}
.create {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 76px;
  padding: 14px 16px;
  border: 1px solid var(--mw-border);
  border-radius: 14px;
  background: var(--mw-card);
  text-align: left;
  cursor: pointer;
  color: inherit;
  transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
  &:hover {
    transform: translateY(-1px);
    border-color: #d4a88a;
    box-shadow: 0 6px 16px rgba(44, 36, 28, 0.06);
  }
  &:disabled { opacity: 0.6; cursor: wait; }
}
.create--ai {
  background: var(--mw-terracotta);
  border-color: var(--mw-terracotta);
  color: #fff;
  .create__desc { color: rgba(255, 255, 255, 0.85); }
  .create__ico {
    background: rgba(255, 255, 255, 0.18);
    color: #fff;
  }
  &:hover {
    background: var(--mw-terracotta-hover);
    border-color: var(--mw-terracotta-hover);
    box-shadow: 0 8px 20px rgba(180, 67, 15, 0.28);
  }
}
.create__ico {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: #f3ebe3;
  color: var(--mw-terracotta);
  font-size: 16px;
  font-weight: 650;
}
.create__txt {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.create__title { font-size: 14px; font-weight: 650; }
.create__desc { font-size: 12px; color: var(--mw-muted); line-height: 1.35; }

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
  h2 {
    margin: 0;
    font-size: 14px;
    font-weight: 650;
  }
}
.panel-sub {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--mw-muted);
}

.tab-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 8px;
}
.tab {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  min-height: 82px;
  padding: 12px 12px 12px 18px;
  border-radius: 12px;
  border: 1px solid var(--mw-border);
  background: #faf6f1;
  cursor: pointer;
  text-align: left;
  color: inherit;
  transition: border-color 0.15s, background 0.15s;
  &:hover {
    border-color: #d4a88a;
    background: #fff;
  }
  &.is-unbound {
    background: #fff5f3;
    border-color: #f0c7bf;
  }
}
.tab__grip {
  position: absolute;
  left: 7px;
  top: 50%;
  width: 4px;
  height: 18px;
  transform: translateY(-50%);
  background:
    radial-gradient(circle, #c9bdb2 1.15px, transparent 1.25px) 0 0 / 4px 6px repeat-y,
    radial-gradient(circle, #c9bdb2 1.15px, transparent 1.25px) 2.5px 0 / 4px 6px repeat-y;
}
.tab__name {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  font-weight: 650;
  line-height: 1.2;
}
.tab__lock {
  width: 10px;
  height: 10px;
  border: 1.5px solid var(--mw-muted);
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
    border: 1.5px solid var(--mw-muted);
    border-bottom: 0;
    border-radius: 5px 5px 0 0;
  }
}
.tab__st {
  font-size: 11px;
  font-weight: 650;
  padding: 2px 7px;
  border-radius: 999px;
  line-height: 1.4;
  &[data-st='live'] { color: var(--mw-green); background: var(--mw-green-bg); }
  &[data-st='dirty'] { color: var(--mw-amber); background: var(--mw-amber-bg); }
  &[data-st='empty'] { color: #b42318; background: #fdeceb; }
}
.tab--add {
  align-items: center;
  justify-content: center;
  padding-left: 12px;
  border-style: dashed;
  color: var(--mw-muted);
  background: transparent;
  gap: 4px;
  font-size: 12px;
}
.tab__plus { font-size: 18px; line-height: 1; }

.lower {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  gap: 12px;
  margin-top: 12px;
}

.pend {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.pend__row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 10px 2px;
  border-bottom: 1px solid var(--mw-border);
  &:last-child { border-bottom: 0; }
}
.pend__title {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--mw-ink);
}
.pend__time {
  font-size: 12px;
  color: var(--mw-muted);
  white-space: nowrap;
}
.empty-hint {
  margin: 0;
  font-size: 13px;
  color: var(--mw-muted);
}
.empty {
  text-align: center;
  padding: 20px 8px;
  color: var(--mw-muted);
  font-size: 13px;
}

.eco {
  list-style: none;
  margin: 0;
  padding: 0;
}
.eco__row {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border: 0;
  border-bottom: 1px solid var(--mw-border);
  background: transparent;
  cursor: pointer;
  text-align: left;
  color: inherit;
  font-size: 13px;
  font-weight: 600;
  &:last-child { border-bottom: 0; }
  &:hover .eco__val { color: var(--mw-terracotta); }
}
.eco__val {
  font-weight: 500;
  color: var(--mw-muted);
  font-size: 12px;
}

.ov__preview {
  position: sticky;
  top: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
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
  color: var(--mw-muted);
  font-size: 12px;
  font-weight: 600;
  padding: 5px 11px;
  border-radius: 999px;
  cursor: pointer;
  &.active {
    background: var(--mw-terracotta);
    color: #fff;
  }
}
.phone {
  position: relative;
  margin: 0 auto;
  width: 100%;
  max-width: 252px;
  aspect-ratio: 375 / 760;
  border-radius: 30px;
  overflow: hidden;
  background: #15100d;
  border: 9px solid #1c1511;
  box-shadow:
    0 18px 40px rgba(44, 36, 28, 0.18),
    inset 0 0 0 1px rgba(255, 255, 255, 0.06);
}
.phone__notch {
  position: absolute;
  z-index: 2;
  top: 9px;
  left: 50%;
  width: 78px;
  height: 8px;
  transform: translateX(-50%);
  border-radius: 999px;
  background: #0d0a08;
  pointer-events: none;
}
.phone__frame {
  width: 100%;
  height: 100%;
  border: 0;
  background: #fff;
}
.scan {
  width: 100%;
  border: 1px dashed #d9cec2;
  border-radius: 10px;
  background: transparent;
  color: var(--mw-muted);
  font-size: 13px;
  font-weight: 550;
  padding: 10px 12px;
  cursor: pointer;
  &:hover {
    color: var(--mw-terracotta);
    border-color: #dfc3ae;
  }
}
.drawer-sort { display: flex; gap: 8px; }

@media (max-width: 1100px) {
  .ov { grid-template-columns: 1fr; }
  .ov__preview { position: static; max-width: 320px; margin: 0 auto; }
  .create-row { grid-template-columns: 1fr; }
  .lower { grid-template-columns: 1fr; }
}
</style>
