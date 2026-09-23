<template>
  <div class="page-editor">
    <div
      class="editor-body"
      :class="{
        'left-collapsed': leftCollapsed && isDesktop,
        'right-collapsed': rightCollapsed && !isMobile,
        'editor-body--mobile': isMobile,
        'editor-body--tablet-rail': leftRailMode,
      }"
    >
      <div v-if="showLeftColumn" class="editor-left" :class="{ 'editor-left--rail': leftRailMode }">
        <ComponentPanel />
      </div>

      <div class="editor-center">
        <div class="builder-toolbar">
          <div class="toolbar-group toolbar-left">
            <el-tooltip v-if="isMobile" content="组件库" placement="bottom">
              <el-button text size="small" aria-label="打开组件库" @click="leftDrawerOpen = true">
                <el-icon><Menu /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip v-else :content="leftCollapsed ? '展开组件面板' : '收起组件面板'" placement="bottom">
              <el-button text size="small" aria-label="切换组件面板" @click="leftCollapsed = !leftCollapsed">
                <el-icon><Menu /></el-icon>
              </el-button>
            </el-tooltip>
            <el-button size="small" @click="handleBack">
              <el-icon><ArrowLeft /></el-icon>
              <span class="toolbar-text">页面</span>
            </el-button>
            <span class="builder-page-name">{{ pageStore.pageConfig.name || '首页' }}</span>
            <span class="builder-version">v{{ pageStore.currentPage?.currentVersion || pageStore.currentPage?.version || 1 }}</span>
          </div>
          <div class="toolbar-group toolbar-center">
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
            <button
              v-if="saveStatus === 'error'"
              type="button"
              class="save-status save-status--error"
              @click="retrySaveNow()"
            >
              {{ saveStatusText }}
            </button>
            <span
              v-else-if="saveStatusText"
              class="save-status"
              :class="{
                'save-status--pending': saveStatus === 'pending' || saveStatus === 'saving',
              }"
            >
              {{ saveStatusText }}
            </span>
          </div>
          <div class="toolbar-group toolbar-actions">
            <el-button v-if="!toolbarCompact" size="small" @click="handlePreview">
              <el-icon><View /></el-icon>
              <span class="toolbar-text">扫码预览</span>
            </el-button>
            <el-tooltip content="自动保存草稿后去发布页" placement="bottom">
              <el-button type="primary" size="small" class="ed-pub-btn" :loading="pageStore.saving" @click="goMiniPublish">
                <el-icon><Upload /></el-icon>
                <span class="toolbar-text">去发布</span>
              </el-button>
            </el-tooltip>
            <el-dropdown trigger="click">
              <el-button size="small">
                更多
                <el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-if="toolbarCompact" @click="handlePreview">扫码预览</el-dropdown-item>
                  <el-dropdown-item @click="handleSaveDraft">立即保存草稿</el-dropdown-item>
                  <el-dropdown-item @click="handlePublishCheck">发布前体检</el-dropdown-item>
                  <el-dropdown-item @click="handleHistory">历史版本</el-dropdown-item>
                  <el-dropdown-item @click="handleImportDSL">导入 DSL</el-dropdown-item>
                  <el-dropdown-item divided @click="handleViewDSL">高级：查看 DSL</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-tooltip :content="rightCollapsed ? '展开属性面板' : '收起属性面板'" placement="bottom">
              <el-button
                text
                size="small"
                aria-label="切换属性面板"
                @click="isMobile ? (rightDrawerOpen = true) : (rightCollapsed = !rightCollapsed)"
              >
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

        <div v-if="showWarmHomeBanner && !pageLoadError" class="warm-expand-banner">
          <span>当前是暖阁首页壳：真机会自动展开默认区块。若要逐块改文案和顺序，可先展开再编辑。</span>
          <el-button size="small" type="primary" @click="expandWarmHomeBlocks">展开为可编辑区块</el-button>
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

      <div v-if="showRightColumn" class="editor-right">
        <el-tabs v-model="rightTab" class="right-tabs" stretch>
          <el-tab-pane label="属性" name="props">
            <PropsPanel />
          </el-tab-pane>
          <el-tab-pane label="AI 助手" name="ai">
            <div class="ai-assistant">
              <div class="ai-assistant__hint">描述想改的地方，一期先给提示与草稿建议。</div>
              <div class="ai-assistant__pills">
                <button
                  v-for="pill in aiPills"
                  :key="pill"
                  type="button"
                  class="ai-pill"
                  @click="applyAiPill(pill)"
                >
                  {{ pill }}
                </button>
              </div>
              <el-input
                v-model="aiPrompt"
                type="textarea"
                :rows="3"
                maxlength="300"
                show-word-limit
                placeholder="例如：把首屏轮播换成节日氛围…"
              />
              <el-button
                type="primary"
                class="ai-assistant__send"
                :loading="aiRunning"
                :disabled="!aiPrompt.trim()"
                @click="runAiAssist"
              >
                生成建议
              </el-button>
              <div class="ai-assistant__reply" v-loading="aiRunning">
                <template v-if="aiReply">{{ aiReply }}</template>
                <template v-else>
                  <span class="ai-assistant__placeholder">回复会出现在这里</span>
                </template>
              </div>
              <div v-if="aiPatches.length" class="ai-patch-list">
                <div class="ai-patch-list__title">建议改动</div>
                <div v-for="patch in aiPatches" :key="patch.id" class="ai-patch-row">
                  <div class="ai-patch-row__text">{{ patch.summary }}</div>
                  <div class="ai-patch-row__actions">
                    <el-button size="small" type="primary" plain @click="applyAiPatch(patch)">应用</el-button>
                    <el-button size="small" text @click="dismissAiPatch(patch.id)">忽略</el-button>
                  </div>
                </div>
                <el-button size="small" text @click="applyAllAiPatches">应用全部</el-button>
                <el-button size="small" text @click="undoLastAiApply" :disabled="!aiApplyUndoStack.length">撤销上次应用</el-button>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>

    <el-drawer v-model="leftDrawerOpen" title="组件与结构" direction="ltr" size="min(320px, 88vw)" class="editor-drawer">
      <ComponentPanel />
    </el-drawer>
    <el-drawer v-model="rightDrawerOpen" title="属性与 AI" direction="rtl" size="min(380px, 92vw)" class="editor-drawer">
      <el-tabs v-model="rightTab" class="right-tabs" stretch>
        <el-tab-pane label="属性" name="props">
          <PropsPanel />
        </el-tab-pane>
        <el-tab-pane label="AI 助手" name="ai">
          <div class="ai-assistant ai-assistant--drawer">
            <div class="ai-assistant__hint">描述想改的地方，可逐条应用建议。</div>
            <el-input v-model="aiPrompt" type="textarea" :rows="3" maxlength="300" show-word-limit placeholder="例如：把首屏轮播换成节日氛围…" />
            <el-button type="primary" class="ai-assistant__send" :loading="aiRunning" :disabled="!aiPrompt.trim()" @click="runAiAssist">生成建议</el-button>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-drawer>

    <transition name="delete-snack">
      <div v-if="deleteSnackVisible" class="editor-delete-snack" role="status">
        <span>{{ deleteSnackLabel }}</span>
        <button type="button" @click="undoDelete()">撤销</button>
        <button type="button" class="muted" @click="dismissDeleteSnack()">关闭</button>
      </div>
    </transition>

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
      title="上线前检查"
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
            {{ publishCheck.blocking.length ? '还有问题需要处理' : (publishCheck.warnings.length ? '可以上线，但建议先确认' : '检查通过，可以上线') }}
          </div>
          <div class="publish-check-desc">
            体检分 {{ publishCheck.score }} · {{ pageStore.components.length }} 个组件 · {{ publishCheck.warnings.length }} 项提醒
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
          <div><b>内容与数据</b><span>未发现影响上线的问题</span></div>
        </div>
      </div>
      <template #footer>
        <el-button @click="publishCheck.visible = false">返回修改</el-button>
        <el-button
          v-if="publishCheck.warnings.length"
          type="warning"
          plain
          @click="runPublishAutoFix"
        >
          一键修复（安全项）
        </el-button>
        <el-button type="primary" :loading="publishCheck.publishing" :disabled="publishCheck.blocking.length > 0" @click="executePublish">
          {{ publishCheck.warnings.length ? '确认并上线' : '立即上线' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- C3：发布结果面板，替代原来信息密度过高的单个确认弹窗 -->
    <el-dialog v-model="publishResult.visible" title="已上线" width="440px" :close-on-click-modal="false">
      <div class="publish-result">
        <div class="publish-result__row">
          <span class="label">当前版本</span>
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
        已上线，小程序里刷新即可看到。
      </div>
      <template #footer>
        <el-button @click="publishResult.visible = false">继续装修</el-button>
        <el-button type="primary" @click="handlePreviewAfterPublish">预览效果</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch, provide } from 'vue'
import { useEditorLayout } from '@/composables/useEditorLayout'
import { useEditorDeleteUndo } from '@/composables/useEditorDeleteUndo'
import { applyConservativePublishFixes, runPublishHealthCheck } from '@/utils/publishHealthCheck'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { useEditorPersist } from '@/composables/useEditorPersist'
import { isCanvasShortcutBlocked } from '@/utils/editorKeyboardGuard'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, View, Upload, ArrowDown, RefreshLeft, RefreshRight, WarningFilled, CircleCheckFilled, Menu, Setting } from '@element-plus/icons-vue'
import { usePageStore } from '@/stores/page'
import { getPageDetail, saveDraft, publishPage, createPage, updatePage, runAiPagePipeline } from '@/api/page'
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

const showWarmHomeBanner = computed(() => pageStore.isWarmHomeShellOnly())

function expandWarmHomeBlocks() {
  if (pageStore.expandWarmHomeFromShell()) {
    ElMessage.success('已展开为可编辑区块，记得保存草稿')
  }
}

const dslDialogVisible = ref(false)
const dslEditorValue = ref('')
const previewVisible = ref(false)
const previewDialogRef = ref<InstanceType<typeof MiniPreviewDialog>>()
const leftCollapsed = ref(false)
const rightCollapsed = ref(typeof window !== 'undefined' ? window.innerWidth < 1100 : false)

const {
  isDesktop,
  isTablet,
  isMobile,
  leftDrawerOpen,
  rightDrawerOpen,
  leftRailCollapsed,
  onComponentSelected,
  viewportWidth,
} = useEditorLayout(() => {
  rightTab.value = 'props'
})

const {
  snackVisible: deleteSnackVisible,
  snackLabel: deleteSnackLabel,
  undoDelete,
  dismissSnack: dismissDeleteSnack,
} = useEditorDeleteUndo()

const showLeftColumn = computed(() => !isMobile.value && !leftCollapsed.value)
const showRightColumn = computed(() => !isMobile.value && !rightCollapsed.value)
const leftRailMode = computed(() => isTablet.value && leftRailCollapsed.value && showLeftColumn.value)
const toolbarCompact = computed(() => viewportWidth.value < 1180)

watch(isMobile, (narrow) => {
  if (narrow) rightCollapsed.value = true
})

watch(
  () => pageStore.selectedComponentId,
  (id) => {
    if (id) onComponentSelected()
  },
)

const rightTab = ref<'props' | 'ai'>('props')

/** 右栏 AI 助手壳（一期：快捷胶囊 + 输入 + 占位回复） */
const aiPills = ['改成节日氛围', '精简首屏', '补空状态'] as const
const aiPrompt = ref('')
const aiReply = ref('')
const aiRunning = ref(false)
const aiHighlightIds = ref<string[]>([])
provide('aiHighlightIds', aiHighlightIds)

type AiPatch = { id: string; summary: string; apply: () => void }
const aiPatches = ref<AiPatch[]>([])
const aiApplyUndoStack = ref<Array<() => void>>([])

function sanitizeAiText(text: string) {
  return String(text || '')
    .replace(/pageId\s*=\s*[\w-]+/gi, '其他草稿页')
    .replace(/\bpageId\b/gi, '页面编号')
}

function applyAiPill(pill: string) {
  aiPrompt.value = pill
  rightTab.value = 'ai'
}

function buildAiPatchesFromResponse(data: any) {
  const patches: AiPatch[] = []
  const design = data?.design as Record<string, any> | undefined
  const designPage = (design?.page || {}) as Record<string, any>
  const pageName = String(design?.pageName || designPage?.name || '').trim()
  if (pageName) {
    patches.push({
      id: 'design-page-name',
      summary: `页面名称改为「${pageName}」`,
      apply: () => pageStore.updatePageConfig({ name: pageName }),
    })
  }
  const bg = String(designPage.background_color || designPage.backgroundColor || '').trim()
  if (bg) {
    patches.push({
      id: 'design-page-bg',
      summary: `页面背景色 → ${bg}`,
      apply: () => pageStore.updatePageConfig({ background_color: bg }),
    })
  }
  const globalCfg = (design?.global_config || design?.globalConfig) as Record<string, any> | undefined
  if (globalCfg && typeof globalCfg.pull_refresh === 'boolean') {
    patches.push({
      id: 'design-pull-refresh',
      summary: `下拉刷新 → ${globalCfg.pull_refresh ? '开启' : '关闭'}`,
      apply: () => pageStore.updateGlobalConfig({ pull_refresh: globalCfg.pull_refresh }),
    })
  }
  const report = Array.isArray(data?.report) ? data.report : []
  report.forEach((row: any, idx: number) => {
    const note = String(row?.note || row?.reason || '').trim()
    const title = String(row?.title || row?.matchedLabel || '').trim()
    const matched = String(row?.matchedType || '').trim()
    const line = note || (title && matched ? `建议组件「${title}」(${matched})` : title)
    if (!line) return
    patches.push({
      id: `report-${idx}`,
      summary: sanitizeAiText(line),
      apply: () => {},
    })
  })
  aiPatches.value = patches
}

function dismissAiPatch(id: string) {
  aiPatches.value = aiPatches.value.filter((p) => p.id !== id)
}

function applyAiPatch(patch: AiPatch) {
  const snapshot = JSON.parse(JSON.stringify(pageStore.dsl))
  patch.apply()
  aiApplyUndoStack.value.push(() => pageStore.applyTemplate(snapshot))
  dismissAiPatch(patch.id)
  ElMessage.success('已应用一条建议')
}

function applyAllAiPatches() {
  const list = [...aiPatches.value]
  list.forEach((p) => applyAiPatch(p))
}

function undoLastAiApply() {
  const fn = aiApplyUndoStack.value.pop()
  fn?.()
}

async function runAiAssist() {
  const text = aiPrompt.value.trim()
  if (!text) return
  aiRunning.value = true
  aiReply.value = ''
  aiPatches.value = []
  try {
    const pageName = pageStore.pageConfig.name || '当前页'
    const pageId = pageStore.currentPage?.id
    const prompt = `针对装修页「${pageName}」（当前编辑页 id=${pageId}）给出改造建议（不要直接改线上）：${text}`
    const res = await runAiPagePipeline(prompt)
    const data = (res as any)?.data ?? res
    const draft = data?.draft
    const summary =
      data?.message ||
      data?.summary ||
      data?.designNotes ||
      (draft?.pageId ? '已生成相关草稿，请到页面列表打开对应草稿继续编辑。' : '')
    aiReply.value = sanitizeAiText(summary || '已收到建议，可按提示在属性面板手动调整。')
    if (draft?.pageId && pageId && Number(draft.pageId) !== Number(pageId)) {
      aiReply.value += '\n\n当前不会自动跳转到其他页面，避免串页覆盖。'
    }
    buildAiPatchesFromResponse(data)
  } catch {
    aiReply.value = '暂未接通'
  } finally {
    aiRunning.value = false
  }
}

function handlePublishCheck() {
  void handlePublish()
}

/** 页面加载失败态（FP-UI-028） */
const pageLoadError = ref('')
const pageLoadRetrying = ref(false)

const {
  saveStatus,
  saveStatusText,
  retryNow: retrySaveNow,
  resetPersistState,
  bindAutoSaveWatch,
  updateStatusText,
  lastSavedAt: lastPersistSavedAt,
} = useEditorPersist(async () => performAutoSaveCore())

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
  score: 100,
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
      resetPersistState()
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
  if (pageStore.hasUnpersistedChanges) {
    try {
      await ElMessageBox.confirm('页面有未保存的修改，确定离开？', '提示', {
        type: 'warning',
      })
    } catch {
      return
    }
  }
  pageStore.resetEditor()
  await router.push({ path: '/mini/pages' })
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
  pageStore.updatePageConfigSilent({ name, path })
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
    pageStore.markSavedToServer()
    conflict.visible = false
    saveStatus.value = 'saved'
    lastPersistSavedAt.value = new Date()
    updateStatusText()
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
      saveStatus.value = 'error'
      updateStatusText()
      ElMessage.error(`保存失败：${message}`)
    }
  } finally {
    pageStore.saving = false
  }
}

/** 自动/静默保存核心逻辑，成功返回 true */
async function performAutoSaveCore(): Promise<boolean> {
  if (!pageStore.currentPage || pageStore.saving || savingAsNew.value) return false
  if (!pageStore.hasUnpersistedChanges) return true
  if (collectJumpIssues(pageStore.components).length) return false
  if (pageStore.components.length === 0) return false
  pageStore.saving = true
  try {
    await syncPageMetaToServer()
    const expectedVersion = currentExpectedVersion()
    const res = await saveDraft(pageStore.currentPage.id, pageStore.dsl, expectedVersion)
    pageStore.markSavedToServer()
    conflict.visible = false
    if (res.data) {
      syncSavedDraftVersion(res.data)
    }
    return true
  } catch (err: any) {
    if (isConflictError(err)) {
      conflict.visible = true
    }
    return false
  } finally {
    pageStore.saving = false
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
    pageStore.markSavedToServer()
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
    if (comp.type === 'hot_news' && !comp.props.data_source) {
      warnings.push('今日热门资讯未配置真实数据源，发布后该区域可能为空')
    }
    if (comp.type === 'form_entry' && !(comp.props.formId || comp.props.formTemplateId)) {
      warnings.push('表单入口未关联表单')
    }
  }
  warnings.push(...collectJumpIssues(components))
  warnings.push(...collectDataSourceIssues(components))
  const health = runPublishHealthCheck(components)
  warnings.push(...health.warnings)
  return [...new Set(warnings)]
}

/** 去统一发布页：有脏改动先自动保存，再跳转 */
async function goMiniPublish() {
  if (pageStore.hasUnpersistedChanges && pageStore.currentPage) {
    try {
      pageStore.saving = true
      await syncPageMetaToServer()
      const expectedVersion = currentExpectedVersion()
      const res = await saveDraft(pageStore.currentPage.id, pageStore.dsl, expectedVersion)
      pageStore.markSavedToServer()
      saveStatus.value = 'saved'
      lastPersistSavedAt.value = new Date()
      updateStatusText()
      if (res.data) {
        syncSavedDraftVersion(res.data)
      }
    } catch (err: any) {
      if (isConflictError(err)) {
        conflict.visible = true
      } else {
        ElMessage.error(`保存失败，暂时无法去发布：${err?.response?.data?.message || err?.message || '未知错误'}`)
      }
      return
    } finally {
      pageStore.saving = false
    }
  }
  const id = pageStore.currentPage?.id
  router.push({
    path: '/mini/publish',
    query: id != null ? { pageId: String(id) } : undefined,
  })
}

/** 单页立即上线（已从顶栏移除；保留函数供结果面板等内部调用） */
async function handlePublish() {
  if (!pageStore.currentPage) return
  const jumpIssues = collectJumpIssues(pageStore.components)
  if (jumpIssues.length) {
    ElMessage.error(jumpIssues[0])
    return
  }
  if (pageStore.hasUnpersistedChanges) {
    try {
      pageStore.saving = true
      await syncPageMetaToServer()
      const expectedVersion = currentExpectedVersion()
      const res = await saveDraft(pageStore.currentPage.id, pageStore.dsl, expectedVersion)
      pageStore.markSavedToServer()
      if (res.data) {
        syncSavedDraftVersion(res.data)
      }
    } catch (err: any) {
      if (isConflictError(err)) {
        conflict.visible = true
      } else {
        ElMessage.error(`保存失败：${err?.response?.data?.message || err?.message || '未知错误'}`)
      }
      return
    } finally {
      pageStore.saving = false
    }
  }

  const warnings = validateBeforePublish()
  const health = runPublishHealthCheck(pageStore.components)
  publishCheck.score = health.score
  const blocking = [
    ...health.blocking,
    ...warnings.filter((w) =>
      w.includes('占位') || w.includes('不支持') || w.includes('未关联表单') || w.includes('没有任何组件')
      || w.includes('缺少跳转') || w.includes('跳转类型不合法') || w.includes('未配置数据源')
      || w.includes('数据源 type') || w.includes('数据源 query'),
    ),
  ]
  publishCheck.warnings = warnings
  publishCheck.blocking = blocking
  publishCheck.visible = true
}

function runPublishAutoFix() {
  const { components, applied } = applyConservativePublishFixes(pageStore.components)
  if (!applied.length) {
    ElMessage.info('未发现可自动修复的安全项')
    return
  }
  pageStore.dsl.components = components
  const warnings = validateBeforePublish()
  const health = runPublishHealthCheck(pageStore.components)
  publishCheck.score = health.score
  const blocking = [
    ...health.blocking,
    ...warnings.filter((w) =>
      w.includes('占位') || w.includes('不支持') || w.includes('未关联表单') || w.includes('没有任何组件')
      || w.includes('缺少跳转') || w.includes('跳转类型不合法') || w.includes('未配置数据源')
      || w.includes('数据源 type') || w.includes('数据源 query'),
    ),
  ]
  publishCheck.warnings = warnings
  publishCheck.blocking = blocking
  ElMessage.success(`已应用 ${applied.length} 项安全修复，请确认后保存或上线`)
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
    ElMessage.error(`上线失败：${err?.response?.data?.message || err?.message || '未知错误'}`)
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
    ElMessage.success('DSL 已导入，请保存后上线')
  } catch {
    ElMessage.error('DSL JSON 解析失败，请检查格式')
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (isCanvasShortcutBlocked(event)) return
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
  if (!pageStore.hasUnpersistedChanges) return
  event.preventDefault()
  event.returnValue = ''
}

onMounted(() => {
  if (window.innerWidth < 1100) rightCollapsed.value = true
  loadPage()
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('beforeunload', handleBeforeUnload)
  bindAutoSaveWatch(computed(() => pageStore.dsl))
})

watch(
  () => route.params.id,
  () => {
    loadPage()
  },
)

// 路由离开拦截：有未保存修改时弹出确认（覆盖侧边栏导航等所有跳转路径）
onBeforeRouteLeave(async (_to, _from, next) => {
  if (!pageStore.hasUnpersistedChanges) {
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
  resetPersistState()
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
  background: #f6f2ec;
  font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;

  .editor-body {
    display: grid;
    grid-template-columns: 250px minmax(0, 1fr) 380px;
    height: 100vh;
    overflow: hidden;
    max-width: 100vw;
    background: #f6f2ec;

    &.left-collapsed {
      grid-template-columns: 0 minmax(0, 1fr) 380px;
    }
    &.right-collapsed {
      grid-template-columns: 250px minmax(0, 1fr) 0;
    }
    &.left-collapsed.right-collapsed {
      grid-template-columns: 0 minmax(0, 1fr) 0;
    }

    &.editor-body--mobile {
      grid-template-columns: minmax(0, 1fr);
    }

    &.editor-body--tablet-rail:not(.left-collapsed) {
      grid-template-columns: 64px minmax(0, 1fr) 380px;
    }

    .editor-left {
      width: auto;
      min-width: 0;
      flex-shrink: 0;
      overflow-y: auto;
      background: #fff;
      border-right: 1px solid #e8dfd3;
      padding: 14px;
    }

    .editor-left--rail {
      padding: 8px 4px;
      overflow: visible;
      position: relative;
      z-index: 12;

      &:hover {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 250px;
        padding: 14px;
        box-shadow: 8px 0 24px rgba(42, 31, 23, 0.12);
      }
    }

    .editor-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
      overflow-y: auto;
      padding: 0 16px 16px;
      min-width: 0;
    }

    .editor-right {
      width: auto;
      min-width: 0;
      flex-shrink: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      background: #fff;
      border-left: 1px solid #e8dfd3;
    }
  }
}

.right-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
  --el-color-primary: #b4430f;

  :deep(.el-tabs__header) {
    margin: 0;
    padding: 0;
    background: #fff;
    border-bottom: 1px solid #e8dfd3;
  }
  :deep(.el-tabs__nav-wrap::after) {
    background-color: transparent;
  }
  :deep(.el-tabs__item) {
    flex: 1;
    justify-content: center;
    height: 48px;
    color: #6b5b4e;
    border-bottom: 2px solid transparent;
  }
  :deep(.el-tabs__content) {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    padding: 0;
  }
  :deep(.el-tab-pane) {
    height: 100%;
    overflow: auto;
  }
  :deep(.el-tabs__item.is-active) {
    color: #b4430f;
    font-weight: 600;
  }
  :deep(.el-tabs__active-bar) {
    background-color: #b4430f;
    height: 2px;
  }
}

.ai-assistant {
  padding: 12px 14px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 100%;
  background: #f6f2ec;
}
.ai-assistant__hint {
  font-size: 12px;
  color: #7a6e64;
  line-height: 1.45;
}
.ai-assistant__pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.ai-pill {
  border: 1px solid #e5ddd2;
  background: #fffcf8;
  color: #2c241c;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  cursor: pointer;
  &:hover {
    border-color: #d4a88a;
    color: #b4430f;
  }
}
.ai-assistant__send {
  align-self: flex-start;
  --el-button-bg-color: #b4430f;
  --el-button-border-color: #b4430f;
  --el-button-hover-bg-color: #9a390d;
  --el-button-hover-border-color: #9a390d;
}
.ai-assistant__reply {
  flex: 1;
  min-height: 120px;
  padding: 12px;
  border-radius: 10px;
  background: #fffcf8;
  border: 1px solid #e5ddd2;
  font-size: 13px;
  line-height: 1.55;
  color: #2c241c;
  white-space: pre-wrap;
}
.ai-assistant__placeholder {
  color: #7a6e64;
}

.builder-toolbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  width: 100%;
  min-height: 60px;
  height: 60px;
  padding: 0 16px;
  background: #fff;
  border: 0;
  border-bottom: 1px solid #e8dfd3;
  border-radius: 0;
  box-shadow: none;
  gap: 8px;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.toolbar-left {
  justify-self: start;
}

.toolbar-center {
  justify-self: center;
}

.toolbar-actions {
  justify-self: end;
  flex-wrap: nowrap;
}

.toolbar-text {
  white-space: nowrap;
}

@media (max-width: 1179px) {
  .builder-toolbar {
    grid-template-columns: 1fr auto;
  }
  .toolbar-center {
    grid-column: 1 / -1;
    justify-self: center;
    order: 3;
  }
}

.history-controls {
  margin-right: 4px;
}

.builder-page-name {
  color: #2a1f17;
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
}

.save-status {
  font-size: 12px;
  color: #6b5b4e;
  margin-left: 4px;
  white-space: nowrap;
  &--pending {
    color: #b45309;
  }
  &--error {
    margin-left: 4px;
    padding: 0;
    border: 0;
    background: none;
    color: #b91c1c;
    font-size: 12px;
    cursor: pointer;
    text-decoration: underline;
    font-family: inherit;
  }
}

.builder-version,
.dirty-dot {
  padding: 2px 8px;
  color: #5e5146;
  font-size: 12px;
  font-weight: 500;
  background: #efeae3;
  border: 0;
  border-radius: 999px;
}

.dirty-dot {
  color: #8f5400;
  background: #fdf1d8;
}

.autosave-dot {
  padding: 0;
  color: #6b5b4e;
  font-size: 12px;
  background: transparent;
  border: 0;
}

.autosave-hint {
  color: #7a6a5c;
  font-size: 12px;
}

.ed-pub-btn {
  --el-button-bg-color: #b4430f;
  --el-button-border-color: #b4430f;
  --el-button-hover-bg-color: #8c3208;
  --el-button-hover-border-color: #8c3208;
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

.warm-expand-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 16px;
  font-size: 13px;
  color: var(--mute);
  background: var(--accsoft);
  border-bottom: 1px solid var(--line2);
  span {
    flex: 1;
  }
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

.editor-delete-snack {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  z-index: 2001;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  color: #fff;
  background: #2a1f17;
  border-radius: 999px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  font-size: 13px;

  button {
    border: 0;
    background: transparent;
    color: #fbeadf;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
  }

  button.muted {
    color: #a1968b;
    font-weight: 400;
  }
}

.ai-patch-list {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #e5ddd2;
}

.ai-patch-list__title {
  font-size: 12px;
  font-weight: 600;
  color: #6b5b4e;
  margin-bottom: 6px;
}

.ai-patch-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 0;
  border-bottom: 1px solid #efeae3;
}

.ai-patch-row__text {
  font-size: 12px;
  line-height: 1.45;
  color: #2c241c;
}

.ai-patch-row__actions {
  display: flex;
  gap: 6px;
}
</style>
