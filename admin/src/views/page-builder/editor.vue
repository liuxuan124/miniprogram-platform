<template>
  <div class="page-editor">
    <div class="editor-body" :class="{ 'left-collapsed': leftCollapsed, 'right-collapsed': rightCollapsed }">
      <div v-show="!leftCollapsed" class="editor-left">
        <ComponentPanel />
      </div>

      <div class="editor-center">
        <div class="builder-toolbar">
          <div class="toolbar-left">
            <el-tooltip :content="leftCollapsed ? '展开组件面板' : '收起组件面板'" placement="bottom">
              <el-button text size="small" aria-label="切换组件面板" @click="leftCollapsed = !leftCollapsed">
                <el-icon><Menu /></el-icon>
              </el-button>
            </el-tooltip>
            <el-button size="small" @click="handleBack">
              <el-icon><ArrowLeft /></el-icon>
              返回
            </el-button>
            <span class="builder-page-name">{{ pageStore.pageConfig.name || '首页' }}</span>
            <span class="builder-version">v{{ pageStore.currentPage?.currentVersion || pageStore.currentPage?.version || 1 }}</span>
            <span v-if="pageStore.isDirty" class="dirty-dot">未保存</span>
            <span v-if="autoSaveError" class="autosave-error">{{ autoSaveError }}</span>
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
              发布此页
            </el-button>
            <el-dropdown trigger="click">
              <el-button size="small">
                更多
                <el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="handleHistory">历史版本</el-dropdown-item>
                  <el-dropdown-item @click="handleImportDSL">导入 DSL</el-dropdown-item>
                  <el-dropdown-item divided @click="handleViewDSL">高级：查看 DSL</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-tooltip :content="rightCollapsed ? '展开属性面板' : '收起属性面板'" placement="bottom">
              <el-button text size="small" aria-label="切换属性面板" @click="rightCollapsed = !rightCollapsed">
                <el-icon><Setting /></el-icon>
              </el-button>
            </el-tooltip>
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

        <!-- 页面加载失败提示条 -->
        <div v-if="pageLoadError" class="load-error-banner">
          <el-icon><WarningFilled /></el-icon>
          <span class="load-error-text">{{ pageLoadError }}</span>
          <div class="load-error-actions">
            <el-button size="small" :loading="pageLoadRetrying" @click="loadPage">重试加载</el-button>
            <el-button size="small" @click="handleBack">返回列表</el-button>
          </div>
        </div>

        <CanvasArea v-if="!pageLoadError" />
        <div v-else class="load-error-placeholder">
          <div class="load-error-placeholder__title">装修器暂不可用</div>
          <div class="load-error-placeholder__desc">页面数据未能从服务器读取，请重试或返回列表</div>
        </div>
      </div>

      <div v-show="!rightCollapsed" class="editor-right">
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

    <el-dialog
      v-model="publishCheck.visible"
      title="发布前检查"
      width="560px"
      :close-on-click-modal="false"
      class="publish-check-dialog"
    >
      <div class="publish-check-summary">
        <div class="publish-check-score" :class="{ 'has-blocking': publishCheck.blocking.length }">
          <el-icon><component :is="publishCheck.blocking.length ? WarningFilled : CircleCheckFilled" /></el-icon>
        </div>
        <div>
          <div class="publish-check-title">
            {{ publishCheck.blocking.length ? '还有问题需要处理' : (publishCheck.warnings.length ? '可以发布，但建议先确认' : '检查通过，可以发布') }}
          </div>
          <div class="publish-check-desc">
            共 {{ pageStore.components.length }} 个组件 · {{ publishCheck.warnings.length }} 项提醒
          </div>
        </div>
      </div>

      <div class="publish-check-list">
        <div class="check-row is-success">
          <el-icon><CircleCheckFilled /></el-icon>
          <div><b>页面结构</b><span>{{ pageStore.components.length }} 个组件已加载</span></div>
        </div>
        <div class="check-row is-success">
          <el-icon><CircleCheckFilled /></el-icon>
          <div><b>保存状态</b><span>草稿已保存为最新版本</span></div>
        </div>
        <div
          v-for="warning in publishCheck.warnings"
          :key="warning"
          class="check-row"
          :class="publishCheck.blocking.includes(warning) ? 'is-error' : 'is-warning'"
        >
          <el-icon><WarningFilled /></el-icon>
          <div>
            <b>{{ publishCheck.blocking.includes(warning) ? '必须修改' : '建议确认' }}</b>
            <span>{{ warning }}</span>
          </div>
        </div>
        <div v-if="publishCheck.warnings.length === 0" class="check-row is-success">
          <el-icon><CircleCheckFilled /></el-icon>
          <div><b>内容与数据</b><span>未发现影响发布的问题</span></div>
        </div>
      </div>
      <template #footer>
        <el-button @click="publishCheck.visible = false">返回修改</el-button>
        <el-button type="primary" :loading="publishCheck.publishing" :disabled="publishCheck.blocking.length > 0" @click="executePublish">
          {{ publishCheck.warnings.length ? '确认并发布' : '立即发布' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- C3：发布结果面板，替代原来信息密度过高的单个确认弹窗 -->
    <el-dialog v-model="publishResult.visible" title="此页已发布" width="440px" :close-on-click-modal="false">
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
        此页已上线。打开「导航与外观」即可看到同步后的效果，不用再整包发布。
      </div>
      <template #footer>
        <el-button @click="publishResult.visible = false">继续装修</el-button>
        <el-button @click="handlePreviewAfterPublish">预览效果</el-button>
        <el-button type="primary" @click="handleGotoMiniappConfig">去导航与外观</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Document, View, Upload, ArrowDown, RefreshLeft, RefreshRight, WarningFilled, CircleCheckFilled, Menu, Setting } from '@element-plus/icons-vue'
import { usePageStore } from '@/stores/page'
import { getPageDetail, saveDraft, publishPage, createPage, updatePage } from '@/api/page'
import { validateComponent } from '@/components/page-builder/componentRegistry'
import { collectDataSourceIssues } from '@/components/page-builder/dataSourceValidation'
import ComponentPanel from '@/components/page-builder/ComponentPanel.vue'
import CanvasArea from '@/components/page-builder/CanvasArea.vue'
import PropsPanel from '@/components/page-builder/PropsPanel.vue'
import MiniPreviewDialog from './MiniPreviewDialog.vue'
import type { PageDSL, PageRecord } from '@/types/page'
import { isHomePathLocked, normalizeBuilderPath, validatePathSlug, splitEditablePath } from '@/utils/page-path'

function isConflictError(err: unknown): boolean {
  const e = err as { response?: { status?: number; data?: { code?: number } }; code?: number }
  const code = e?.response?.data?.code ?? e?.code
  const status = e?.response?.status
  return status === 409 || code === 300409 || code === 409
}

const route = useRoute()
const router = useRouter()
const pageStore = usePageStore()

const dslDialogVisible = ref(false)
const dslEditorValue = ref('')
const previewVisible = ref(false)
const previewDialogRef = ref<InstanceType<typeof MiniPreviewDialog>>()
const leftCollapsed = ref(false)
const rightCollapsed = ref(false)

/** 页面加载失败态（FP-UI-028） */
const pageLoadError = ref('')
const pageLoadRetrying = ref(false)

/** B3：自动保存 */
const lastAutoSavedAt = ref('')
const autoSaveError = ref('')
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
const publishCheck = reactive({
  visible: false,
  warnings: [] as string[],
  blocking: [] as string[],
  publishing: false,
})

function currentExpectedVersion() {
  const page = pageStore.currentPage
  if (!page) return undefined
  return page.latestVersion ?? page.currentVersion ?? page.version
}

function toMiniappOpenPath(path: string) {
  const raw = String(path || '').trim()
  if (!raw) return ''
  const normalized = raw.startsWith('/') ? raw : `/${raw}`
  const pathname = normalized.split('?')[0]
  const registered = new Set([
    '/pages/index/index',
    '/pages/content-list/content-list',
    '/pages/product-list/product-list',
    '/pages/mine/mine',
    '/pages/login/login',
    '/pages/search/search',
    '/pages/product-detail/product-detail',
    '/pages/content-detail/content-detail',
    '/pages/cart/cart',
    '/pages/order-create/order-create',
    '/pages/custom/custom',
  ])
  if (registered.has(pathname)) return normalized
  const logical = pathname.replace(/^\//, '')
  return `/pages/custom/custom?path=${encodeURIComponent(logical)}`
}

const JUMP_TYPES = ['page', 'webview', 'url', 'miniapp', 'phone', 'none']
const JUMP_NEED_TARGET = new Set(['page', 'webview', 'url', 'miniapp', 'phone'])

function resolveJump(item: Record<string, any>) {
  const legacyLink = String(item.link || '').trim()
  let type = String(item.link_type || item.type || item.jump_type || item.action || '').trim()
  let target = String(item.link_url || item.target || item.jump_url || item.url || item.phone || '').trim()
  // 兼容旧 DSL：仅有 link 无 link_type
  if (!type && legacyLink) {
    type = legacyLink.startsWith('http') ? 'webview' : 'page'
    target = target || legacyLink
  }
  if (!target && legacyLink) target = legacyLink
  return { type, target }
}

const FLOAT_ACTION_TYPES = ['link', 'top', 'phone', 'ai', 'url']

function collectJumpIssues(components: any[]): string[] {
  const issues: string[] = []
  components.forEach((comp) => {
    const label = comp.type === 'banner' ? '轮播图' : (comp.type === 'float_button' ? '悬浮按钮' : '组件')
    const items = comp.type === 'banner'
      ? (comp.props?.images || [])
      : comp.type === 'nav' || comp.type === 'category_nav'
        ? (comp.props?.items || [])
        : [comp.props || {}]
    items.forEach((item: any, index: number) => {
      if (!item || typeof item !== 'object') return
      const prefix = items.length > 1 ? `${label}第 ${index + 1} 项` : label

      // 悬浮按钮使用 action_type（link/top/phone/ai），不是 banner/image 的 link_type
      if (comp.type === 'float_button') {
        const action = String(
          item.action_type
          || (item.link_url ? 'link' : '')
          || (item.phone ? 'phone' : '')
          || 'ai',
        ).trim()
        if (!FLOAT_ACTION_TYPES.includes(action)) {
          issues.push(`${prefix}动作类型不合法`)
          return
        }
        if ((action === 'link' || action === 'url') && !String(item.link_url || '').trim()) {
          issues.push(`${prefix}缺少跳转地址`)
        }
        if (action === 'phone' && !String(item.phone || '').trim()) {
          issues.push(`${prefix}缺少电话号码`)
        }
        return
      }

      const hasJumpField = item.link_type || item.type || item.jump_type || item.link_url || item.target || item.link
      if (comp.type !== 'banner' && comp.type !== 'image' && !hasJumpField) return
      if (comp.type !== 'banner' && comp.type !== 'image') return
      // 轮播图有图就必须声明跳转类型（允许 none）
      const hasImage = Boolean(item.image || item.url || item.src)
      if (comp.type === 'banner' && hasImage && !item.link_type && !item.type && !item.jump_type && !item.link) {
        issues.push(`${prefix}缺少跳转类型`)
        return
      }
      const { type, target } = resolveJump(item)
      if (!type) {
        issues.push(`${prefix}缺少跳转类型`)
        return
      }
      if (!JUMP_TYPES.includes(type)) {
        issues.push(`${prefix}跳转类型不合法`)
        return
      }
      if (JUMP_NEED_TARGET.has(type) && !target) {
        issues.push(`${prefix}缺少跳转地址`)
      }
    })
  })
  return issues
}

/** 加载页面数据 */
async function loadPage() {
  const id = Number(route.params.id)
  if (!id || isNaN(id)) {
    pageLoadError.value = '页面 ID 无效'
    ElMessage.error('页面ID无效')
    return
  }
  pageLoadRetrying.value = true
  pageLoadError.value = ''
  try {
    const res = await getPageDetail(id)
    if (res.data) {
      pageStore.setCurrentPage(res.data)
    } else {
      pageLoadError.value = '服务器未返回页面数据'
      pageStore.resetEditor()
    }
  } catch (err: any) {
    pageLoadError.value = err?.response?.data?.message || err?.message || '无法加载页面数据，请检查网络连接'
    pageStore.resetEditor()
    ElMessage.error('页面加载失败')
  } finally {
    pageLoadRetrying.value = false
  }
}

/** 草稿接口返回 PageVersionDTO，不能把版本记录 id 覆盖成页面 id */
function syncSavedDraftVersion(saved: any) {
  if (!pageStore.currentPage || !saved) return
  const version = Number(saved.version ?? pageStore.currentPage.currentVersion ?? pageStore.currentPage.version ?? 0)
  pageStore.currentPage = {
    ...pageStore.currentPage,
    id: Number(saved.pageId ?? pageStore.currentPage.id),
    currentVersion: version,
    latestVersion: version,
    version,
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

/** 保存草稿时同步名称/路径到页面表（列表展示依赖库表，不依赖 DSL） */
async function syncPageMetaToServer() {
  const page = pageStore.currentPage
  if (!page?.id) return
  const name = String(pageStore.pageConfig.name || page.name || '').trim()
  if (!name) {
    throw new Error('页面名称不能为空')
  }
  const type = Number(page.type || 3)
  let path = normalizeBuilderPath(page.path || pageStore.pageConfig.path || '')
  if (isHomePathLocked(type)) {
    path = '/pages/index/index'
  } else {
    const { slug } = splitEditablePath(path, type)
    const slugErr = validatePathSlug(slug, type)
    if (slugErr) throw new Error(slugErr)
  }
  if (!path) throw new Error('访问路径不能为空')

  await updatePage(page.id, { name, path })
  page.name = name
  page.path = path
  pageStore.updatePageConfig({ name, path })
}

/** 保存草稿（手动点击） */
async function handleSaveDraft() {
  if (!pageStore.currentPage) return
  const jumpIssues = collectJumpIssues(pageStore.components)
  if (jumpIssues.length) {
    ElMessage.error(jumpIssues[0])
    return
  }
  pageStore.saving = true
  try {
    await syncPageMetaToServer()
    const expectedVersion = currentExpectedVersion()
    const res = await saveDraft(pageStore.currentPage.id, pageStore.dsl, expectedVersion)
    pageStore.isDirty = false
    conflict.visible = false
    autoSaveError.value = ''
    // 保存成功后同步最新版本号，避免下次保存触发冲突
    if (res.data) {
      syncSavedDraftVersion(res.data)
    }
    ElMessage.closeAll()
    ElMessage.success('草稿保存成功')
  } catch (err: any) {
    if (isConflictError(err)) {
      conflict.visible = true
    } else {
      const message = err?.response?.data?.message || err?.message || '未知错误'
      autoSaveError.value = '自动保存失败'
      ElMessage.error(`保存失败：${message}`)
    }
  } finally {
    pageStore.saving = false
  }
}

/** B3：自动保存（静默）。已发布页不做自动保存，避免清空/误改后无离开确认。 */
async function performAutoSave() {
  if (!pageStore.currentPage || pageStore.saving || savingAsNew.value) return
  if (collectJumpIssues(pageStore.components).length) return
  const published = ['1', 'published'].includes(String(pageStore.currentPage.status))
  if (published) {
    // 已发布页必须手动保存；保留 isDirty 以便返回/跳转时二次确认
    return
  }
  if (pageStore.components.length === 0) {
    autoSaveError.value = '空白页面不会自动保存，请手动确认'
    return
  }
  try {
    await syncPageMetaToServer()
    const expectedVersion = currentExpectedVersion()
    const res = await saveDraft(pageStore.currentPage.id, pageStore.dsl, expectedVersion)
    pageStore.isDirty = false
    autoSaveError.value = ''
    if (res.data) {
      syncSavedDraftVersion(res.data)
    }
    lastAutoSavedAt.value = new Date().toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' })
    ElMessage.closeAll()
  } catch (err: any) {
    if (isConflictError(err)) {
      conflict.visible = true
      autoSaveError.value = '自动保存冲突'
    } else {
      autoSaveError.value = '自动保存失败，请手动重试'
    }
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
  const jumpIssues = collectJumpIssues(pageStore.components)
  if (jumpIssues.length) {
    ElMessage.warning(jumpIssues[0])
    return
  }
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
    if (comp.type === 'product_list' && !comp.props.data_source) {
      warnings.push('商品列表未配置真实数据源，发布后该区域可能为空')
    }
    if (comp.type === 'article_list' && !comp.props.data_source) {
      warnings.push('文章列表未配置真实数据源，发布后该区域可能为空')
    }
    if (comp.type === 'form_entry' && !(comp.props.formId || comp.props.formTemplateId)) {
      warnings.push('表单入口未关联表单')
    }
  }
  warnings.push(...collectJumpIssues(components))
  warnings.push(...collectDataSourceIssues(components))
  return [...new Set(warnings)]
}

/** 发布 */
async function handlePublish() {
  if (!pageStore.currentPage) return
  const jumpIssues = collectJumpIssues(pageStore.components)
  if (jumpIssues.length) {
    ElMessage.error(jumpIssues[0])
    return
  }
  if (pageStore.isDirty) {
    try {
      pageStore.saving = true
      await syncPageMetaToServer()
      const expectedVersion = currentExpectedVersion()
      const res = await saveDraft(pageStore.currentPage.id, pageStore.dsl, expectedVersion)
      pageStore.isDirty = false
      autoSaveError.value = ''
      if (res.data) {
        syncSavedDraftVersion(res.data)
      }
    } catch (err: any) {
      if (isConflictError(err)) {
        conflict.visible = true
      } else {
        autoSaveError.value = '保存失败，暂时无法发布'
        ElMessage.error(`保存失败：${err?.response?.data?.message || err?.message || '未知错误'}`)
      }
      return
    } finally {
      pageStore.saving = false
    }
  }

  const warnings = validateBeforePublish()
  const blocking = warnings.filter((w) =>
    w.includes('占位') || w.includes('不支持') || w.includes('未关联表单') || w.includes('没有任何组件')
    || w.includes('缺少跳转') || w.includes('跳转类型不合法') || w.includes('未配置数据源')
    || w.includes('数据源 type') || w.includes('数据源 query'),
  )
  publishCheck.warnings = warnings
  publishCheck.blocking = blocking
  publishCheck.visible = true
}

async function executePublish() {
  if (!pageStore.currentPage || publishCheck.blocking.length > 0) return
  publishCheck.publishing = true
  try {
    const res = await publishPage(pageStore.currentPage.id)
    const published = res.data as PageRecord | undefined
    // C3：发布成功后用结果面板展示版本、变更规模和下一步建议，替代信息密度过高的单个确认弹窗
    publishResult.version = published?.currentVersion ?? published?.version ?? (pageStore.currentPage.currentVersion ?? pageStore.currentPage.version ?? 1)
    publishResult.componentCount = pageStore.components.length
    publishResult.path = toMiniappOpenPath(pageStore.currentPage.path || pageStore.pageConfig.path || '')
    publishCheck.visible = false
    publishResult.visible = true
    await loadPage()
  } catch (err: any) {
    ElMessage.error(`发布失败：${err?.response?.data?.message || err?.message || '未知错误'}`)
  } finally {
    publishCheck.publishing = false
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
    && typeof value.schema_version === 'string'
    && value.schema_version.length > 0
    && !!value.page
    && typeof value.page === 'object'
    && typeof value.page.name === 'string'
    && Array.isArray(value.components)
    && !!value.global_config
    && typeof value.global_config === 'object'
}

function handleImportDSL() {
  dslEditorValue.value = ''
  dslDialogVisible.value = true
}

function handleApplyDSL() {
  try {
    const parsed = JSON.parse(dslEditorValue.value)
    if (!parsed?.schema_version || !parsed?.page || !Array.isArray(parsed?.components)) {
      ElMessage.error('DSL 结构不完整，必须包含 schema_version、page、components')
      return
    }
    if (!isValidImportDSL(parsed)) {
      ElMessage.error('DSL 结构不完整，至少需要 schema_version、page、components、global_config')
      return
    }
    if (pageStore.currentPage) {
      parsed.page.id = String(pageStore.currentPage.id)
      parsed.page.path = pageStore.currentPage.path || parsed.page.path
    }
    pageStore.applyTemplate(parsed)
    dslDialogVisible.value = false
    ElMessage.success('DSL 已导入，请保存草稿后发布此页')
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

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (!pageStore.isDirty) return
  event.preventDefault()
  event.returnValue = ''
}

onMounted(() => {
  loadPage()
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('beforeunload', handleBeforeUnload)
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
  window.removeEventListener('beforeunload', handleBeforeUnload)
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
  background: #f1f3f7;

  .editor-body {
    display: flex;
    height: 100vh;
    overflow: hidden;
    background: #f1f3f7;

    .editor-left {
      width: 224px;
      min-width: 224px;
      flex-shrink: 0;
      overflow: hidden;
    }

    .editor-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
      overflow-y: auto;
      padding: 0 14px 14px;
    }

    .editor-right {
      width: 360px;
      min-width: 360px;
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
  min-height: 58px;
  padding: 9px 14px;
  background: #fff;
  border: 1px solid #e3e8f0;
  border-top: 0;
  border-radius: 0 0 12px 12px;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05);
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

.autosave-error {
  color: var(--danger);
  font-size: 12px;
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

.load-error-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 16px;
  color: #991b1b;
  background: #fef2f2;
  border-bottom: 1px solid #fecaca;

  .el-icon {
    flex-shrink: 0;
    color: var(--danger);
    font-size: 16px;
  }
}

.load-error-text {
  flex: 1;
  font-size: 13px;
}

.load-error-actions {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
}

.load-error-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 420px;
  color: #64748b;
  background: #f8fafc;
}

.load-error-placeholder__title {
  font-size: 16px;
  font-weight: 600;
  color: #334155;
}

.load-error-placeholder__desc {
  margin-top: 8px;
  font-size: 13px;
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

.publish-check-summary {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 4px 0 18px;
}

.publish-check-score {
  display: grid;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  color: #16a34a;
  font-size: 24px;
  background: #dcfce7;
  border-radius: 14px;
  place-items: center;

  &.has-blocking {
    color: #dc2626;
    background: #fee2e2;
  }
}

.publish-check-title {
  color: #172033;
  font-size: 16px;
  font-weight: 800;
}

.publish-check-desc {
  margin-top: 3px;
  color: #7b8798;
  font-size: 12px;
}

.publish-check-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 360px;
  overflow-y: auto;
}

.check-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 11px 12px;
  color: #d97706;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 10px;

  > .el-icon {
    margin-top: 2px;
    flex-shrink: 0;
  }

  div {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  b {
    color: #172033;
    font-size: 12px;
  }

  span {
    color: #64748b;
    font-size: 12px;
    line-height: 1.45;
  }

  &.is-success {
    color: #16a34a;
    background: #f0fdf4;
    border-color: #bbf7d0;
  }

  &.is-error {
    color: #dc2626;
    background: #fef2f2;
    border-color: #fecaca;
  }
}
</style>
