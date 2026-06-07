<template>
  <div class="page-editor">
    <div class="editor-body">
      <div class="editor-left">
        <ComponentPanel />
      </div>

      <div class="editor-center">
        <div class="builder-toolbar">
          <div class="toolbar-left">
            <button type="button" class="proto-btn sm" @click="handleBack">← 返回</button>
            <span class="builder-page-name">{{ pageStore.pageConfig.name || '首页' }}</span>
            <span class="builder-version">v{{ pageStore.currentPage?.currentVersion || pageStore.currentPage?.version || 18 }}</span>
            <span v-if="pageStore.isDirty" class="dirty-dot">未保存</span>
          </div>
          <div class="toolbar-actions">
            <button type="button" class="proto-btn sm" :disabled="pageStore.saving" @click="handleSaveDraft">💾 保存草稿</button>
            <button type="button" class="proto-btn sm" @click="handlePreview">👁 预览</button>
            <button type="button" class="proto-btn sm warning" @click="handleHistory">🕐 历史版本</button>
            <button type="button" class="proto-btn sm primary" @click="handlePublish">🚀 发布上线</button>
            <button type="button" class="proto-btn sm" @click="handleViewDSL">DSL</button>
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { usePageStore } from '@/stores/page'
import { getPageDetail, saveDraft, publishPage } from '@/api/page'
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

/** 保存草稿 */
async function handleSaveDraft() {
  if (!pageStore.currentPage) return
  pageStore.saving = true
  try {
    const expectedVersion = pageStore.currentPage.currentVersion ?? pageStore.currentPage.version
    const res = await saveDraft(pageStore.currentPage.id, pageStore.dsl, expectedVersion)
    pageStore.isDirty = false
    // 保存成功后同步最新版本号，避免下次保存触发冲突
    if (res.data) {
      pageStore.currentPage = { ...pageStore.currentPage, ...(res.data as PageRecord) }
    }
    ElMessage.success('草稿保存成功')
  } catch (err: any) {
    const msg = err?.response?.data?.message || err?.message || ''
    if (msg.includes('已被其他人修改') || msg.includes('300409')) {
      ElMessage.error('保存冲突：页面已被其他人修改，请刷新页面后重新编辑')
    } else {
      ElMessage.error('保存失败')
    }
  } finally {
    pageStore.saving = false
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
      const msg = err?.response?.data?.message || err?.message || ''
      if (msg.includes('已被其他人修改') || msg.includes('300409')) {
        ElMessage.error('保存冲突：页面已被其他人修改，请刷新页面后重新编辑')
      }
      return
    }
  }

  // 发布前预检
  const warnings = validateBeforePublish()
  const blocking = warnings.filter((w) => w.includes('占位'))
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
    await publishPage(pageStore.currentPage.id)
    await ElMessageBox.confirm(
      '小程序首页已同步，当前装修内容可在实时预览中查看。',
      '发布成功',
      {
        confirmButtonText: '查看小程序效果',
        cancelButtonText: '关闭',
        type: 'success',
      },
    ).then(() => {
      previewDialogRef.value?.openHome()
      previewVisible.value = true
    }).catch(() => {})
    await loadPage()
  } catch {
    ElMessage.error('发布失败')
  }
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

onMounted(() => {
  loadPage()
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
  color: #f59e0b;
  background: #fff7ed;
  border-color: #fed7aa;
}

.proto-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  padding: 0 12px;
  color: #172033;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  background: #fff;
  border: 1px solid #e3e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: 0.14s;

  &:hover {
    color: #1769ff;
    background: #eaf2ff;
    border-color: #1769ff;
  }

  &.sm {
    height: 30px;
    padding: 0 10px;
  }

  &.warning {
    color: #f59e0b;
    background: #fff7ed;
    border-color: #fed7aa;
  }

  &.primary {
    color: #fff;
    background: #1769ff;
    border-color: #1769ff;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }
}
</style>
