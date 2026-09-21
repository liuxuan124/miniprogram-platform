<template>
  <div class="mini-page" v-loading="loading">
    <header class="site-head">
      <div class="site-head__main">
        <div class="site-head__kicker">小程序 · 概览</div>
        <h1 class="site-head__title">{{ site.name || '小程序' }}</h1>
        <p class="site-head__meta">
          模板：{{ templateLabel }}
          <span v-if="site.liveReleaseNo != null"> · 已发布第 {{ site.liveReleaseNo }} 次</span>
          <span v-if="site.pendingCount"> · {{ site.pendingCount }} 项待发布</span>
        </p>
      </div>
      <div class="site-head__actions">
        <el-button @click="load">刷新</el-button>
        <el-button type="primary" class="btn-terracotta" @click="goPublish">
          去发布{{ site.pendingCount ? `（${site.pendingCount}）` : '' }}
        </el-button>
      </div>
    </header>

    <section class="create-cards">
      <button type="button" class="create-card" @click="router.push('/mini/pages/new-ai')">
        <div class="create-card__title">AI 生成一页</div>
        <div class="create-card__desc">一句话描述，生成草稿页</div>
      </button>
      <button type="button" class="create-card" @click="router.push({ path: '/mini/templates', query: { tab: 'page' } })">
        <div class="create-card__title">从模板新建</div>
        <div class="create-card__desc">打开模板库 · 页面模板</div>
      </button>
      <button type="button" class="create-card" @click="router.push('/mini/pages')">
        <div class="create-card__title">空白新建</div>
        <div class="create-card__desc">从页面列表创建空白页</div>
      </button>
    </section>

    <div class="overview-grid">
      <div class="overview-main">
        <section class="panel">
          <div class="panel__head">
            <h2>底部导航</h2>
            <div class="panel__head-actions">
              <el-button link type="primary" @click="openTabDrawer()">编辑导航</el-button>
              <el-button link @click="router.push('/page-builder/appearance')">高级</el-button>
            </div>
          </div>
          <div v-if="tabBar.length" class="tab-list">
            <div
              v-for="(tab, i) in tabBar"
              :key="i"
              class="tab-row"
              :class="{ 'is-unbound': isTabUnbound(tab) }"
              role="button"
              tabindex="0"
              @click="openTabDrawer(i)"
              @keydown.enter="openTabDrawer(i)"
            >
              <span class="tab-row__idx">{{ i + 1 }}</span>
              <span class="tab-row__name">{{ tab.text || `导航 ${i + 1}` }}</span>
              <span class="tab-row__page">{{ tab.pageName || tab.pagePath || '未绑定' }}</span>
              <span v-if="isTabUnbound(tab)" class="tab-row__warn">未绑定</span>
              <div class="tab-row__sort" @click.stop>
                <el-button
                  link
                  size="small"
                  :disabled="i === 0 || savingTabs"
                  @click="moveTab(i, -1)"
                >
                  上移
                </el-button>
                <el-button
                  link
                  size="small"
                  :disabled="i === tabBar.length - 1 || savingTabs"
                  @click="moveTab(i, 1)"
                >
                  下移
                </el-button>
              </div>
            </div>
          </div>
          <el-empty v-else description="尚未配置底部导航" :image-size="64">
            <el-button type="primary" class="btn-terracotta" @click="openTabDrawer()">添加导航</el-button>
          </el-empty>
        </section>

        <section class="panel">
          <div class="panel__head">
            <h2>待发布（前 5 条）</h2>
            <el-button link type="primary" @click="goPublish">全部</el-button>
          </div>
          <div v-if="pendingPreview.length" class="pending-list">
            <div v-for="item in pendingPreview" :key="String(item.id || item.name)" class="pending-row">
              <div class="pending-row__main">
                <span class="pending-row__name">{{ item.name || '未命名' }}</span>
                <span class="pending-row__sum">{{ item.summary || item.path || '' }}</span>
              </div>
              <PageStatusTag :status="(item.status as any) || 'pending'" />
            </div>
          </div>
          <el-empty
            v-else
            description="没有待发布的改动，线上就是你现在看到的样子"
            :image-size="64"
          />
        </section>
      </div>

      <aside class="panel preview-panel">
        <div class="panel__head">
          <h2>预览</h2>
          <div class="panel__head-actions">
            <el-radio-group v-model="previewSource" size="small" class="preview-toggle">
              <el-radio-button value="draft">改动后</el-radio-button>
              <el-radio-button value="live">线上</el-radio-button>
            </el-radio-group>
            <el-button link type="primary" @click="openLivePreview">新窗口</el-button>
          </div>
        </div>
        <div class="phone-frame">
          <iframe :key="previewSource" :src="previewUrl" title="小程序预览" loading="lazy" />
        </div>
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

const templateLabel = computed(() => site.value.templateName || '自定义（未使用整店模板）')
const tabBar = computed(() => site.value.tabBar || [])
const pendingPreview = computed(() => pending.value.slice(0, 5))

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

function isTabUnbound(tab: MiniTabBarItem) {
  return !(tab.pageId || tab.pagePath)
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
      list.push({ text: '首页', pagePath: '' })
      drawerIndex.value = 0
    } else {
      drawerIndex.value = 0
    }
  } else {
    drawerIndex.value = index
  }
  const idx = drawerIndex.value ?? 0
  const current = list[idx] || { text: '', pagePath: '' }
  editTab.value = { ...current }
  editPageId.value = current.pageId != null && current.pageId !== '' ? Number(current.pageId) : null
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

async function moveTab(index: number, delta: number) {
  const target = index + delta
  const list = [...(site.value.tabBar || [])]
  if (target < 0 || target >= list.length) return
  const tmp = list[index]
  list[index] = list[target]
  list[target] = tmp
  await persistTabBar(list, '顺序已更新')
}

async function load() {
  loading.value = true
  try {
    const [s, p, pageRes] = await Promise.all([
      getMiniSite('draft'),
      getPendingChanges(),
      getPageList({ current: 1, size: 200 }),
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

.site-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}
.site-head__kicker {
  font-size: 12px;
  color: var(--mini-muted);
  margin-bottom: 4px;
}
.site-head__title {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.02em;
}
.site-head__meta {
  margin: 6px 0 0;
  color: var(--mini-muted);
  font-size: 13px;
}
.site-head__actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.btn-terracotta {
  --el-button-bg-color: var(--mini-terracotta);
  --el-button-border-color: var(--mini-terracotta);
  --el-button-hover-bg-color: #9a390d;
  --el-button-hover-border-color: #9a390d;
  --el-button-active-bg-color: #85310b;
  --el-button-active-border-color: #85310b;
}

.create-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}
.create-card {
  text-align: left;
  padding: 16px 18px;
  border: 1px solid var(--mini-border);
  border-radius: 10px;
  background: var(--mini-card);
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.create-card:hover {
  border-color: #d4a88a;
  box-shadow: 0 4px 14px rgba(180, 67, 15, 0.08);
}
.create-card__title {
  font-size: 15px;
  font-weight: 600;
}
.create-card__desc {
  margin-top: 4px;
  font-size: 12px;
  color: var(--mini-muted);
}

.overview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 16px;
  align-items: start;
}
.panel {
  background: var(--mini-card);
  border: 1px solid var(--mini-border);
  border-radius: 12px;
  padding: 16px 18px;
  margin-bottom: 14px;
}
.panel__head {
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
.panel__head-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.tab-list, .pending-list { display: flex; flex-direction: column; gap: 8px; }
.tab-row, .pending-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f8f4ee;
}
.tab-row {
  cursor: pointer;
  transition: background 0.15s;
  &:hover { background: #f0e6da; }
  &.is-unbound {
    background: #fef3f2;
    border: 1px solid #fecdca;
  }
}
.tab-row__idx {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #e8ddd0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
}
.tab-row__name { font-weight: 600; min-width: 64px; }
.tab-row__page { color: var(--mini-muted); font-size: 13px; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tab-row__warn {
  font-size: 11px;
  color: #b42318;
  flex-shrink: 0;
}
.tab-row__sort { display: flex; gap: 0; flex-shrink: 0; }
.pending-row { justify-content: space-between; }
.pending-row__main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.pending-row__name { font-weight: 600; }
.pending-row__sum { font-size: 12px; color: var(--mini-muted); }

.preview-panel { position: sticky; top: 12px; }
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
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--mini-border);
  background: #1a1410;
  aspect-ratio: 375 / 720;
  max-height: 560px;
  iframe {
    width: 100%;
    height: 100%;
    border: 0;
    background: #fff;
  }
}

@media (max-width: 1100px) {
  .overview-grid { grid-template-columns: 1fr; }
  .preview-panel { position: static; }
  .create-cards { grid-template-columns: 1fr; }
}
</style>
