<template>
  <div class="page-editor">
    <div class="editor-body">
      <div class="editor-left">
        <ComponentPanel />
      </div>

      <div class="editor-center">
        <div class="builder-toolbar">
          <div class="toolbar-left">
            <el-button size="small" @click="handleBack">
              <el-icon><ArrowLeft /></el-icon>
              返回
            </el-button>
            <span class="builder-page-name">{{ pageStore.pageConfig.name || '首页' }}</span>
            <span class="builder-version">v{{ pageStore.currentPage?.currentVersion || pageStore.currentPage?.version || 1 }}</span>
            <span v-if="pageStore.isDirty" class="dirty-dot">未保存</span>
            <span v-else-if="lastAutoSavedAt" class="autosave-dot">已自动保存 {{ lastAutoSavedAt }}</span>
          </div>
          <div class="toolbar-actions">
            <el-button-group class="history-controls">
              <el-tooltip content="撤销 (Ctrl+Z)" placement="bottom">
                <el-button size="small" aria-label="撤销" :disabled="!pageStore.canUndo" @click="pageStore.undo()">
                  <el-icon><RefreshLeft /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="重做 (Ctrl+Shift+Z)" placement="bottom">
                <el-button size="small" aria-label="重做" :disabled="!pageStore.canRedo" @click="pageStore.redo()">
                  <el-icon><RefreshRight /></el-icon>
                </el-button>
              </el-tooltip>
            </el-button-group>
            <el-button size="small" :loading="pageStore.saving" @click="handleSaveDraft">
              <el-icon><Document /></el-icon>
              保存草稿
            </el-button>
            <el-button size="small" @click="handlePreview">
              <el-icon><View /></el-icon>
              预览
            </el-button>
            <el-button type="primary" size="small" @click="handlePublish">
              <el-icon><Upload /></el-icon>
              发布页面
            </el-button>
            <el-dropdown trigger="click">
              <el-button size="small">
                更多
                <el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="handleHistory">历史版本</el-dropdown-item>
                  <el-dropdown-item divided @click="handleViewDSL">高级：查看 DSL</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>

        <!-- C5：保存冲突不再用弹窗打断编辑，改为顶部常驻提示条，保留操作现场 -->
        <div v-if="conflict.visible" class="conflict-banner">
          <el-icon><WarningFilled /></el-icon>
          <span class="conflict-text">页面已被其他人修改，直接保存会覆盖对方的改动。</span>
          <div class="conflict-actions">
            <el-button size="small" @click="handleReloadFromConflict">放弃我的修改，刷新页面</el-button>
            <el-button size="small" type="primary" :loading="savingAsNew" @click="handleSaveAsNewDraft">
              保留我的修改，另存为新草稿
            </el-button>
          </div>
        </div>

        <CanvasArea />
      </div>

      <div class="editor-right">
        <PropsPanel />
      </div>
    </div>

    <!-- DSL 查看/导入弹窗 -->
    <el-dialog v-model="dslDialogVisible" title="页面 DSL" width="700px" destroy-on-close>
      <el-input
        v-model="dslEditorValue"
        type="textarea"
        :rows="20"
        style="font-family: monospace"
      />
      <template #footer>
        <el-button @click="dslDialogVisible = false">关闭</el-button>
        <el-button @click="handleResetDSL">恢复当前 DSL</el-button>
        <el-button type="primary" @click="handleCopyDSL">复制</el-button>
        <el-button type="success" @click="handleApplyDSL">导入并应用</el-button>
      </template>
    </el-dialog>

    <!-- 原型一致：预览不跳新窗口，直接进入小程序端实时预览 -->
    <MiniPreviewDialog ref="previewDialogRef" v-model="previewVisible" />

    <!-- C3：发布结果面板，替代原来信息密度过高的单个确认弹窗 -->
    <el-dialog v-model="publishResult.visible" title="页面发布成功" width="440px" :close-on-click-modal="false">
      <div class="publish-result">
        <div class="publish-result__row">
          <span class="label">发布版本</span>
          <span class="value">v{{ publishResult.version }}</span>
        </div>
        <div class="publish-result__row">
          <span class="label">本次组件数</span>
          <span class="value">{{ publishResult.componentCount }} 个</span>
        </div>
        <div class="publish-result__row">
          <span class="label">小程序端生效路径</span>
          <span class="value mono">{{ publishResult.path || '—' }}</span>
        </div>
      </div>
      <div class="publish-result__tip">
        若要让用户通过底部导航打开它，请再到「搭建小程序」完成导航绑定并发布。
      </div>
      <template #footer>
        <el-button @click="publishResult.visible = false">继续装修</el-button>
        <el-button @click="handlePreviewAfterPublish">预览效果</el-button>
        <el-button type="primary" @click="handleGotoMiniappConfig">去搭建小程序</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Document, View, Upload, ArrowDown, RefreshLeft, RefreshRight, WarningFilled } from '@element-plus/icons-vue'
import { usePageStore } from '@/stores/page'
import { getPageDetail, saveDraft, publishPage, createPage } from '@/api/page'
import { validateComponent } from '@/components/page-builder/componentRegistry'
import ComponentPanel from '@/components/page-builder/ComponentPanel.vue'
import CanvasArea from '@/components/page-builder/CanvasArea.vue'
import PropsPanel from '@/components/page-builder/PropsPanel.vue'
import MiniPreviewDialog from './MiniPreviewDialog.vue'
import type { PageDSL, PageRecord } from '@/types/page'

const route = useRoute()
const router = useRouter()
const pageStore = usePageStore()

const dslDialogVisible = ref(false)
const dslEditorValue = ref('')
const previewVisible = ref(false)
const previewDialogRef = ref<InstanceType<typeof MiniPreviewDialog>>()

/** B3：自动保存 */
const lastAutoSavedAt = ref('')
let autoSaveTimer: ReturnType<typeof setInterval> | null = null

/** C5：保存冲突状态（顶部提示条，不再用弹窗打断编辑现场） */
const conflict = reactive({ visible: false })
const savingAsNew = ref(false)

/** C3：发布结果面板 */
const publishResult = reactive({
  visible: false,
  version: 1,
  componentCount: 0,
  path: '',
})

function isConflictError(err: any): boolean {
  const msg = err?.response?.data?.message || err?.message || ''
  return msg.includes('已被其他人修改') || msg.includes('300409')
}

/** 加载页面数据 */
async function loadPage() {
  const id = Number(route.params.id)
  if (!id || isNaN(id)) {
    ElMessage.error('页面ID无效')
    router.push({ name: 'PageBuilderList' })
    return
  }
  try {
    const res = await getPageDetail(id)
    if (res.data) {
      pageStore.setCurrentPage(res.data)
    } else {
      pageStore.setCurrentPage(createFallbackHomePage(id))
    }
  } catch {
    pageStore.setCurrentPage(createFallbackHomePage(id))
    ElMessage.warning('未读取到后端页面数据，已打开本地首页装修画布')
  }
}

function createFallbackHomePage(id: number): PageRecord {
  const now = new Date().toLocaleString('zh-CN', { hour12: false })
  return {
    id,
    name: '首页',
    type: 'home',
    path: 'pages/index/index',
    status: 'draft',
    version: 0,
    created_at: now,
    updated_at: now,
  }
}

/** 返回列表 */
async function handleBack() {
  if (pageStore.isDirty) {
    try {
      await ElMessageBox.confirm('页面有未保存的修改，确定离开？', '提示', {
        type: 'warning',
      })
    } catch {
      return
    }
  }
  pageStore.resetEditor()
  await router.push({ name: 'PageBuilderList' })
}

/** 保存草稿（手动点击） */
async function handleSaveDraft() {
  if (!pageStore.currentPage) return
  pageStore.saving = true
  try {
    const expectedVersion = pageStore.currentPage.currentVersion ?? pageStore.currentPage.version
    const res = await saveDraft(pageStore.currentPage.id, pageStore.dsl, expectedVersion)
    pageStore.isDirty = false
    conflict.visible = false
    // 保存成功后同步最新版本号，避免下次保存触发冲突
    if (res.data) {
      pageStore.currentPage = { ...pageStore.currentPage, ...(res.data as PageRecord) }
    }
    ElMessage.success('草稿保存成功')
  } catch (err: any) {
    if (isConflictError(err)) {
      conflict.visible = true
    } else {
      ElMessage.error('保存失败')
    }
  } finally {
    pageStore.saving = false
  }
}

/** B3：自动保存（静默，不弹提示，不与手动保存冲突提示抢注意力） */
async function performAutoSave() {
  if (!pageStore.currentPage || pageStore.saving || savingAsNew.value) return
  try {
    const expectedVersion = pageStore.currentPage.currentVersion ?? pageStore.currentPage.version
    const res = await saveDraft(pageStore.currentPage.id, pageStore.dsl, expectedVersion)
    pageStore.isDirty = false
    if (res.data) {
      pageStore.currentPage = { ...pageStore.currentPage, ...(res.data as PageRecord) }
    }
    lastAutoSavedAt.value = new Date().toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' })
  } catch (err: any) {
    if (isConflictError(err)) {
      conflict.visible = true
    }
    // 自动保存的非冲突失败静默忽略，避免频繁打扰；用户仍可手动保存重试
  }
}

/** C5：放弃本地修改，直接刷新为服务端最新版本 */
async function handleReloadFromConflict() {
  conflict.visible = false
  await loadPage()
  ElMessage.success('已刷新为最新版本')
}

/** C5：保留本地修改，另存为一个新页面草稿，不覆盖对方的改动 */
async function handleSaveAsNewDraft() {
  if (!pageStore.currentPage) return
  savingAsNew.value = true
  try {
    const source = pageStore.currentPage
    const res = await createPage({
      name: `${pageStore.pageConfig.name || source.name || '未命名页面'}（副本）`,
      type: source.type,
      path: '',
      dsl: pageStore.dsl,
    })
    conflict.visible = false
    pageStore.isDirty = false
    ElMessage.success('已另存为新草稿，正在跳转')
    const newId = (res.data as PageRecord | undefined)?.id
    if (newId) {
      pageStore.resetEditor()
      router.push({ name: 'PageBuilderEditor', params: { id: newId } })
    }
  } catch {
    ElMessage.error('另存为新草稿失败，请稍后重试')
  } finally {
    savingAsNew.value = false
  }
}

/** 发布前预检：使用组件注册表的 validate 校验 */
function validateBeforePublish(): string[] {
  const warnings: string[] = []
  const components = pageStore.components

  if (components.length === 0) {
    warnings.push('页面没有任何组件，发布后将展示空页面')
    return warnings
  }

  for (const comp of components) {
    const compWarnings = validateComponent(comp.type, comp.props)
    warnings.push(...compWarnings)
  }
  return warnings
}

/** 发布 */
async function handlePublish() {
  if (!pageStore.currentPage) return
  if (pageStore.isDirty) {
    try {
      await ElMessageBox.confirm('页面有未保存的修改，是否先保存再发布？', '提示', {
        confirmButtonText: '保存并发布',
        cancelButtonText: '取消',
        type: 'warning',
      })
      const expectedVersion = pageStore.currentPage.currentVersion ?? pageStore.currentPage.version
      const res = await saveDraft(pageStore.currentPage.id, pageStore.dsl, expectedVersion)
      pageStore.isDirty = false
      if (res.data) {
        pageStore.currentPage = { ...pageStore.currentPage, ...(res.data as PageRecord) }
      }
    } catch (err: any) {
      if (isConflictError(err)) {
        conflict.visible = true
      }
      return
    }
  }

  // 发布前预检：占位内容未替换 / 小程序端不支持渲染 均为阻断级问题，不能仅提示
  const warnings = validateBeforePublish()
  const blocking = warnings.filter((w) => w.includes('占位') || w.includes('不支持'))
  if (blocking.length > 0) {
    ElMessage.error(`发布被拦截：${blocking.join('；')}`)
    return
  }
  if (warnings.length > 0) {
    try {
      await ElMessageBox.confirm(
        `发现以下问题，发布后可能影响小程序展示效果：\n\n${warnings.map((w) => `• ${w}`).join('\n')}\n\n确定继续发布？`,
        '发布前检查',
        {
          confirmButtonText: '忽略并发布',
          cancelButtonText: '返回修改',
          type: 'warning',
        },
      )
    } catch {
      return
    }
  }

  try {
    const res = await publishPage(pageStore.currentPage.id)
    const published = res.data as PageRecord | undefined
    // C3：发布成功后用结果面板展示版本、变更规模和下一步建议，替代信息密度过高的单个确认弹窗
    publishResult.version = published?.currentVersion ?? published?.version ?? (pageStore.currentPage.currentVersion ?? pageStore.currentPage.version ?? 1)
    publishResult.componentCount = pageStore.components.length
    publishResult.path = pageStore.currentPage.path || pageStore.pageConfig.path || ''
    publishResult.visible = true
    await loadPage()
  } catch {
    ElMessage.error('发布失败')
  }
}

function handleGotoMiniappConfig() {
  publishResult.visible = false
  router.push('/page-builder/start')
}

function handlePreviewAfterPublish() {
  publishResult.visible = false
  handlePreview()
}

/** 预览 */
function handlePreview() {
  if (!pageStore.currentPage) {
    ElMessage.warning('页面数据还在加载，请稍后再预览')
    return
  }
  previewDialogRef.value?.open()
  previewVisible.value = true
}

/** 查看 DSL */
function handleViewDSL() {
  dslEditorValue.value = pageStore.serializeDSL()
  dslDialogVisible.value = true
}

function handleHistory() {
  if (!pageStore.currentPage) return
  router.push({ name: 'PageBuilderVersion', params: { id: pageStore.currentPage.id } })
}

/** 复制 DSL */
function handleCopyDSL() {
  const dsl = dslEditorValue.value || pageStore.serializeDSL()
  navigator.clipboard.writeText(dsl).then(() => {
    ElMessage.success('已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

function handleResetDSL() {
  dslEditorValue.value = pageStore.serializeDSL()
}

function isValidImportDSL(value: any): value is PageDSL {
  return !!value
    && typeof value === 'object'
    && !!value.page
    && typeof value.page === 'object'
    && typeof value.page.name === 'string'
    && Array.isArray(value.components)
    && !!value.global_config
    && typeof value.global_config === 'object'
}

function handleApplyDSL() {
  try {
    const parsed = JSON.parse(dslEditorValue.value)
    if (!isValidImportDSL(parsed)) {
      ElMessage.error('DSL 结构不完整，至少需要 page、components、global_config')
      return
    }
    if (pageStore.currentPage) {
      parsed.page.id = String(pageStore.currentPage.id)
      parsed.page.path = pageStore.currentPage.path || parsed.page.path
    }
    pageStore.applyTemplate(parsed)
    dslDialogVisible.value = false
    ElMessage.success('DSL 已导入，请保存草稿后发布上线')
  } catch {
    ElMessage.error('DSL JSON 解析失败，请检查格式')
  }
}

/** B1：撤销/重做快捷键。输入框内的 Ctrl+Z 交给浏览器原生文本撤销，不拦截 */
function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable
}

function handleKeydown(event: KeyboardEvent) {
  if (isEditableTarget(event.target)) return
  const isMod = event.ctrlKey || event.metaKey
  if (!isMod || event.key.toLowerCase() !== 'z') return
  event.preventDefault()
  if (event.shiftKey) {
    pageStore.redo()
  } else {
    pageStore.undo()
  }
}

onMounted(() => {
  loadPage()
  window.addEventListener('keydown', handleKeydown)
  // B3：每 30 秒检查一次，若有未保存修改则静默存草稿，避免刷新/关闭页面丢失编辑
  autoSaveTimer = setInterval(() => {
    if (pageStore.isDirty) performAutoSave()
  }, 30000)
})

watch(
  () => route.params.id,
  () => {
    loadPage()
  },
)

// 路由离开拦截：有未保存修改时弹出确认（覆盖侧边栏导航等所有跳转路径）
onBeforeRouteLeave(async (_to, _from, next) => {
  if (!pageStore.isDirty) {
    next()
    return
  }
  try {
    await ElMessageBox.confirm(
      '页面有未保存的修改，离开后修改将丢失，确定离开？',
      '未保存的修改',
      {
        confirmButtonText: '离开',
        cancelButtonText: '继续编辑',
        type: 'warning',
      },
    )
    next()
  } catch {
    next(false)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer)
    autoSaveTimer = null
  }
  pageStore.resetEditor()
})
</script>

<style lang="scss" scoped>
.page-editor {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  overflow: hidden;
  background: #eaedf5;

  .editor-body {
    display: flex;
    height: 100vh;
    overflow: hidden;
    background: #eaedf5;

    .editor-left {
      width: 210px;
      min-width: 210px;
      flex-shrink: 0;
      overflow: hidden;
    }

    .editor-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
      overflow-y: auto;
      padding: 14px;
    }

    .editor-right {
      width: 265px;
      min-width: 265px;
      flex-shrink: 0;
      overflow: hidden;
    }
  }
}

.builder-toolbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 16px;
  background: #fff;
  border-bottom: 1px solid #e3e8f0;
  gap: 8px;
}

.toolbar-left,
.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.history-controls {
  margin-right: 4px;
}

.builder-page-name {
  color: #172033;
  font-size: 14px;
  font-weight: 800;
}

.builder-version,
.dirty-dot {
  padding: 2px 7px;
  color: #7b8798;
  font-size: 11px;
  background: #f8faff;
  border: 1px solid #e3e8f0;
  border-radius: 6px;
}

.dirty-dot {
  color: var(--warning);
  background: var(--warning-soft);
  border-color: #fed7aa;
}

.autosave-dot {
  padding: 2px 7px;
  color: var(--success);
  font-size: 11px;
  background: var(--success-soft);
  border: 1px solid var(--success);
  border-radius: 6px;
}

/* C5：保存冲突提示条 */
.conflict-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 16px;
  color: #92400e;
  background: var(--warning-soft);
  border-bottom: 1px solid #fed7aa;

  .el-icon {
    flex-shrink: 0;
    color: var(--warning);
    font-size: 16px;
  }
}

.conflict-text {
  flex: 1;
  font-size: 13px;
}

.conflict-actions {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
}

/* C3：发布结果面板 */
.publish-result {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-2) 0;
}

.publish-result__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: var(--space-2);
  border-bottom: 1px dashed var(--border);

  .label {
    color: var(--text-muted);
    font-size: var(--font-caption);
  }

  .value {
    color: var(--text);
    font-size: var(--font-body);
    font-weight: 600;

    &.mono {
      font-family: monospace;
      font-size: var(--font-caption);
    }
  }
}

.publish-result__tip {
  margin-top: var(--space-2);
  padding: var(--space-3);
  color: var(--text-secondary);
  font-size: var(--font-caption);
  line-height: 1.6;
  background: var(--bg-page);
  border-radius: var(--radius);
}
</style>
