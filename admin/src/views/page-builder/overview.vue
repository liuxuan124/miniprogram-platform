<template>
  <div class="overview-page builder-studio">
    <StudioHeader title="搭建工作台" description="从页面开始设计，随时查看小程序的实际效果。">
      <template #actions>
        <el-button :loading="loading" aria-label="刷新工作台" @click="loadAll(true)"><el-icon><Refresh /></el-icon></el-button>
        <el-button @click="openLivePreview"><el-icon><View /></el-icon>完整预览</el-button>
        <el-button type="primary" @click="router.push({ path: '/page-builder/list', query: { create: '1' } })"><el-icon><Plus /></el-icon>新建页面</el-button>
      </template>
    </StudioHeader>

    <div v-if="loadErrors.length" class="studio-feedback is-error" role="alert">
      <span>部分数据未能读取：{{ loadErrors.join('、') }}。下方只展示已读取的状态。</span>
      <el-button size="small" @click="loadAll(true)">重新加载</el-button>
    </div>

    <div class="workbench-grid">
      <main class="workbench-main">
        <section class="studio-surface" v-loading="loading">
          <div class="workspace-app">
            <span class="workspace-app__icon"><el-icon><Cellphone /></el-icon></span>
            <div><span class="studio-muted">正在搭建</span><h2>{{ appName }}</h2></div>
            <el-button link type="primary" @click="router.push('/page-builder/start')">品牌与导航<el-icon><ArrowRight /></el-icon></el-button>
          </div>
          <div class="workspace-metadata">
            <div><span>页面</span><strong>{{ preflight ? preflight.pages.length : '—' }}</strong></div>
            <div><span>最新配置版本</span><strong>{{ latestSemver || '暂无' }}</strong></div>
            <div><span>最近上传代码</span><strong>{{ pushVersion || '暂无记录' }}</strong></div>
          </div>
          <div class="studio-section-head">
            <div><h2>导航与页面</h2><p>{{ tabCards.length ? `当前配置了 ${tabCards.length} 个底部入口，选择页面继续设计。` : '配置底部入口后，可在这里快速进入对应页面。' }}</p></div>
            <el-button link type="primary" @click="router.push('/page-builder/list')">全部页面</el-button>
          </div>
          <div class="workspace-pages">
            <div v-for="(tab, idx) in tabCards" :key="tab.key" class="workspace-page">
              <button type="button" class="workspace-page__main" @click="openTab(tab)">
                <span class="workspace-page__icon"><TabBarIconDisplay v-if="tab.icon" :icon="tab.icon" /><el-icon v-else><Document /></el-icon></span>
                <span class="workspace-page__text"><strong>{{ tab.text }}</strong><span>{{ tab.pageName }}</span></span>
                <span class="studio-state" :data-status="tab.statusKey">{{ tab.statusLabel }}</span>
                <el-icon class="workspace-page__arrow"><ArrowRight /></el-icon>
              </button>
              <el-tooltip content="在右侧预览这个入口"><el-button text aria-label="预览导航页面" @click="previewRef?.showTab(idx)"><el-icon><View /></el-icon></el-button></el-tooltip>
            </div>
            <el-empty v-if="!loading && !tabCards.length" description="还没有配置底部导航" :image-size="64">
              <el-button type="primary" @click="router.push('/page-builder/start')">配置导航</el-button>
            </el-empty>
          </div>
          <div class="workspace-footer"><el-icon><InfoFilled /></el-icon><span>页面内容需在编辑器中更新；品牌与导航保存后生效。代码上传是独立操作。</span></div>
        </section>

        <section class="studio-surface workspace-todos">
          <div class="studio-section-head"><h2>待处理</h2><span class="studio-muted">{{ preflight ? `${todos.length} 项` : '检查状态未读取' }}</span></div>
          <button v-for="(item, idx) in todos" :key="idx" class="workspace-todo" type="button" @click="goTodo(item)">
            <el-icon><Warning /></el-icon><span>{{ item.text }}</span><el-icon><ArrowRight /></el-icon>
          </button>
          <div v-if="!todos.length" class="workspace-no-todos">
            <el-icon><component :is="preflight ? CircleCheck : InfoFilled" /></el-icon>
            <div><strong>{{ preflight ? '暂未发现配置问题' : '尚未完成配置检查' }}</strong><p>{{ preflight ? '发布前仍需确认实际内容与小程序预览。' : '重新加载后查看检查结果。' }}</p></div>
          </div>
        </section>

        <div class="workspace-shortcuts">
          <button type="button" @click="router.push('/page-builder/template-center')"><el-icon><Collection /></el-icon><span><strong>从模板开始</strong><small>选择布局，替换成自己的内容</small></span><el-icon><ArrowRight /></el-icon></button>
          <button type="button" @click="openAiDraft"><el-icon><MagicStick /></el-icon><span><strong>生成页面初稿</strong><small>描述需求，再在编辑器中完善</small></span><el-icon><ArrowRight /></el-icon></button>
        </div>
      </main>

      <aside class="workspace-preview studio-surface">
        <div class="studio-section-head"><h2>小程序预览</h2><span class="preview-size">交互预览</span></div>
        <div class="workspace-preview__canvas" v-loading="previewLoading">
          <MiniappPreview v-if="previewReady && !loadErrors.includes('品牌与导航')" :key="previewReloadKey" ref="previewRef" :form="previewForm" :pages="previewPages" :mine-page-mode="previewMineMode" />
          <el-empty v-else description="配置未读取，暂不展示预览" :image-size="64" />
        </div>
        <div class="workspace-preview__foot"><el-icon><InfoFilled /></el-icon>预览用于检查布局；实际授权、支付请在真机验证。</div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onActivated, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, View, Plus, Cellphone, ArrowRight, Document, InfoFilled, Warning, CircleCheck, Collection, MagicStick } from '@element-plus/icons-vue'
import StudioHeader from '@/components/builder-studio/StudioHeader.vue'
import MiniappPreview from '@/components/miniapp-builder/MiniappPreview.vue'
import TabBarIconDisplay from '@/components/miniapp-builder/TabBarIconDisplay.vue'
import { useMiniappConfig } from '@/components/miniapp-builder/composables/useMiniappConfig'
import { getConfigByGroupSilent } from '@/api/system'
import { getPublishPreflight, getLatestRelease, getPushPreviewStatus } from '@/api/version'
import { post } from '@/api/request'
import { CONFIG_KEYS } from '@/types/miniapp'
import { buildWorkspaceTabs, buildWorkspaceTodos } from '@/utils/builder-workspace'
import type { WorkspaceTab } from '@/utils/builder-workspace'
import type { PublishPreflight } from '@/api/version'
import type { ReleaseRecord } from '@/types/page'

const router = useRouter()
const { form: previewForm, pages: previewPages, loading: previewLoading, configReady: previewReady, loadPages: reloadPreviewPages, loadConfig: reloadPreviewConfig } = useMiniappConfig()
const previewReloadKey = ref(0)
let overviewLoaded = false
onActivated(() => { if (overviewLoaded) loadAll(true) })
const previewRef = ref<{ showTab: (index: number) => void } | null>(null)
const previewMineMode = computed(() => (previewForm.mineConfig as Record<string, unknown>).mode === 'custom' ? 'custom' as const : 'config' as const)
const loading = ref(false)
const loadErrors = ref<string[]>([])
const appName = ref('我的小程序')
const preflight = ref<PublishPreflight | null>(null)
const latestRelease = ref<ReleaseRecord | null>(null)
const pushStatus = ref<any>(null)
const tabs = ref<Array<{ text?: string; icon?: string; pageId?: string | number; pageName?: string; pagePath?: string }>>([])
const latestSemver = computed(() => preflight.value?.latestSemver || latestRelease.value?.semver || '')
const pushVersion = computed(() => pushStatus.value?.version || pushStatus.value?.releaseSemver || '')
const tabCards = computed(() => buildWorkspaceTabs(tabs.value, preflight.value))
const todos = computed(() => buildWorkspaceTodos(tabs.value, preflight.value))

function openLivePreview() {
  const { href } = router.resolve({ path: '/h5/miniapp-preview', query: { view: 'config' } })
  window.open(href, '_blank', 'noopener,noreferrer')
}

async function openAiDraft() {
  try {
    const { value } = await ElMessageBox.prompt('描述页面的用途和重点内容', '生成页面初稿', {
      confirmButtonText: '生成初稿', cancelButtonText: '取消',
      inputPlaceholder: '例如：活动报名页，展示活动介绍、时间与报名入口',
      inputValidator: (v: string) => Boolean(v?.trim()) || '请先描述页面需求',
    })
    const res = await post('/api/v1/admin/pages/ai-draft', { prompt: value, industry: 'general' })
    const dsl = (res as any)?.data?.dsl
    if (!dsl) { ElMessage.error('未能生成初稿，请重试'); return }
    sessionStorage.setItem('ai_page_draft_dsl', JSON.stringify(dsl))
    ElMessage.success('初稿已准备好，请创建页面并确认内容')
    router.push({ path: '/page-builder/list', query: { create: '1' } })
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error('生成初稿失败，请稍后重试')
  }
}

function openTab(tab: WorkspaceTab) {
  if (tab.isMine && !/^\d+$/.test(tab.pageId)) { router.push('/page-builder/mine'); return }
  if (tab.pageId && /^\d+$/.test(tab.pageId)) { router.push(`/page-builder/editor/${tab.pageId}`); return }
  router.push({ path: '/page-builder/start', query: { group: 'tabbar' } })
}
function goTodo(item: { text: string; path: string }) { router.push(item.path) }

async function loadConfig() {
  const res = await getConfigByGroupSilent('basic')
  const configs = (res as any)?.data?.configs || (res as any)?.data || []
  const map: Record<string, any> = {}
  for (const c of configs) if (c?.configKey) map[c.configKey] = c.configValue
  appName.value = String(map[CONFIG_KEYS.SHARE_TITLE] || map.miniappName || '我的小程序')
  const raw = map[CONFIG_KEYS.TABBAR_ITEMS]
  const items = typeof raw === 'string' ? JSON.parse(raw) : raw
  tabs.value = Array.isArray(items) ? items : []
}

async function loadAll(reloadPreview = false) {
  loading.value = true
  loadErrors.value = []
  const tasks = [
    { label: '品牌与导航', run: loadConfig, reset: () => { tabs.value = [] } },
    { label: '页面检查', run: async () => { preflight.value = (await getPublishPreflight()).data || null }, reset: () => { preflight.value = null } },
    { label: '版本记录', run: async () => { latestRelease.value = (await getLatestRelease() as any).data || null }, reset: () => { latestRelease.value = null } },
    { label: '上传记录', run: async () => { pushStatus.value = (await getPushPreviewStatus() as any).data || null }, reset: () => { pushStatus.value = null } },
  ]
  try {
    await Promise.all(tasks.map(async (task) => {
      try { await task.run() } catch { task.reset(); loadErrors.value.push(task.label) }
    }))
    if (reloadPreview) {
      await reloadPreviewPages()
      await reloadPreviewConfig()
      previewReloadKey.value++
    }
  } finally { loading.value = false; overviewLoaded = true }
}
onMounted(loadAll)
</script>

<style scoped>
.workbench-grid { display: grid; grid-template-columns: minmax(0, 1fr) 420px; gap: 24px; align-items: start; }
.workbench-main { display: grid; gap: 20px; min-width: 0; }
.workspace-app { display: flex; align-items: center; gap: 14px; padding: 24px; }
.workspace-app h2 { margin: 2px 0 0; font-size: 1.375rem; font-weight: 650; }
.workspace-app > .el-button { margin-left: auto; }
.workspace-app__icon { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 12px; background: #edf2ff; color: var(--studio-blue); font-size: 24px; }
.workspace-metadata { display: grid; grid-template-columns: .65fr 1fr 1fr; padding: 0 24px 24px; gap: 16px; }
.workspace-metadata > div { display: grid; gap: 5px; border-left: 1px solid var(--studio-line); padding-left: 16px; }
.workspace-metadata > div:first-child { border: 0; padding: 0; }
.workspace-metadata span { font-size: .8125rem; color: var(--studio-muted); }
.workspace-metadata strong { font-size: 1.125rem; font-weight: 600; word-break: break-word; }
.workspace-pages { padding: 8px 12px; }
.workspace-page { display: flex; align-items: center; border-bottom: 1px solid #eef0f4; border-radius: 6px; }
.workspace-page:last-child { border: 0; }
.workspace-page:hover { background: #f7f9fd; }
.workspace-page__main { display: flex; align-items: center; gap: 14px; padding: 16px 12px; background: none; border: 0; text-align: left; cursor: pointer; flex: 1; min-width: 0; font: inherit; color: inherit; }
.workspace-page__icon { display: grid; place-items: center; width: 40px; height: 44px; color: var(--studio-blue); background: #f2f5fb; border-radius: 8px; flex: none; font-size: 22px; }
.workspace-page__icon :deep(img) { width: 22px; height: 22px; object-fit: contain; }
.workspace-page__text { display: grid; gap: 4px; flex: 1; min-width: 0; }
.workspace-page__text strong { font-size: .9375rem; font-weight: 600; }
.workspace-page__text > span { font-size: .8125rem; color: var(--studio-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.workspace-page__arrow { color: #8792a4; }
.workspace-footer { display: flex; align-items: flex-start; gap: 8px; background: #fafbfd; border-top: 1px solid var(--studio-line); padding: 14px 24px; color: var(--studio-muted); font-size: .8125rem; }
.workspace-footer .el-icon { margin-top: 3px; flex: none; }
.workspace-todo { display: flex; align-items: center; width: 100%; gap: 12px; border: 0; border-bottom: 1px solid #eef0f4; background: none; padding: 16px 24px; cursor: pointer; text-align: left; font: inherit; font-size: .875rem; color: inherit; }
.workspace-todo:hover { background: #fffaf1; }
.workspace-todo > span { flex: 1; }
.workspace-todo > .el-icon:first-child { color: #ac650f; }
.workspace-no-todos { display: flex; gap: 12px; padding: 24px; align-items: center; }
.workspace-no-todos > .el-icon { font-size: 24px; color: #187251; }
.workspace-no-todos strong { font-size: .875rem; font-weight: 600; }
.workspace-no-todos p { margin: 4px 0 0; font-size: .8125rem; color: var(--studio-muted); }
.workspace-shortcuts { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.workspace-shortcuts button { display: flex; align-items: center; gap: 12px; padding: 20px; background: #fff; border: 1px solid var(--studio-line); border-radius: 10px; font: inherit; text-align: left; cursor: pointer; color: var(--studio-ink); }
.workspace-shortcuts button:hover { border-color: #9dacd1; }
.workspace-shortcuts button > .el-icon:first-child { font-size: 22px; color: var(--studio-blue); }
.workspace-shortcuts span { flex: 1; }
.workspace-shortcuts strong { display: block; font-size: .875rem; font-weight: 600; }
.workspace-shortcuts small { display: block; font-size: .75rem; color: var(--studio-muted); margin-top: 4px; }
.workspace-preview { position: sticky; top: 20px; }
.workspace-preview .studio-section-head { padding: 16px 20px; }
.preview-size { font-family: ui-monospace, monospace; font-size: .75rem; color: var(--studio-muted); }
.workspace-preview__canvas { background: var(--studio-canvas); padding: 18px 10px 8px; }
.workspace-preview__canvas :deep(.preview-source-hint) { display: none; }
.workspace-preview__foot { padding: 12px 18px; font-size: .75rem; color: var(--studio-muted); display: flex; align-items: flex-start; gap: 6px; border-top: 1px solid var(--studio-line); }
.workspace-preview__foot .el-icon { flex: none; margin-top: 3px; }
@media (max-width: 1200px) { .workbench-grid { grid-template-columns: minmax(0, 1fr); } .workspace-preview { position: static; } .workspace-preview__canvas { display: flex; justify-content: center; } }
@media (max-width: 600px) { .workspace-shortcuts { grid-template-columns: 1fr; } .workspace-app { flex-wrap: wrap; padding: 20px; } .workspace-metadata { padding: 0 20px 20px; } .workspace-page__main { gap: 8px; } .workspace-page__arrow { display: none; } }
</style>
