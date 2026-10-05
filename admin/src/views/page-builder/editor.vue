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
          <!-- 左：导航（收起面板 / 返回 / 页面名 / 版本） -->
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

          <!-- 中：画布控制（撤销/重做 + 保存状态）；缩放与设备切换已下移到画布正上方控制条 -->
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

          <!-- 右：操作流（草稿状态 / 预览 / 保存 / 发布） -->
          <div class="toolbar-group toolbar-actions">
            <el-button v-if="!toolbarCompact" size="small" @click="handlePreview">
              <el-icon><View /></el-icon>
              <span class="toolbar-text">扫码预览</span>
            </el-button>
            <el-button size="small" :loading="pageStore.saving" @click="handleSaveDraft">
              <span class="toolbar-text">保存草稿</span>
            </el-button>
            <el-button type="primary" size="small" class="ed-pub-btn" :loading="pageStore.saving || publishCheck.publishing" @click="handleSyncToLive">
              <el-icon><Upload /></el-icon>
              <span class="toolbar-text">保存并同步</span>
              <span class="ed-pub-live-badge" title="此操作会直接发布到线上小程序">上线</span>
            </el-button>
            <el-dropdown trigger="click">
              <el-button size="small">
                更多
                <el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-if="toolbarCompact" @click="handlePreview">扫码预览</el-dropdown-item>
                  <el-dropdown-item @click="handleSaveDraft">立即保存草稿</el-dropdown-item>
                  <el-dropdown-item @click="handlePublishCheck">同步前检查</el-dropdown-item>
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

        <!-- 顶部公告条：多条提示合并为单条轮播，保存冲突等阻断性提示优先展示 -->
        <div v-if="activeBanner" class="top-banner" :class="`top-banner--${activeBanner.tone}`">
          <el-icon><WarningFilled /></el-icon>
          <span class="top-banner__text">{{ activeBanner.text }}</span>
          <div class="top-banner__actions">
            <template v-if="activeBanner.key === 'conflict'">
              <el-button size="small" @click="handleReloadFromConflict">载入最新</el-button>
              <el-button size="small" type="warning" :loading="pageStore.saving" @click="handleForceOverwriteFromConflict">
                覆盖保存
              </el-button>
              <el-button size="small" type="primary" :loading="savingAsNew" @click="handleSaveAsNewDraft">
                另存副本
              </el-button>
            </template>
            <el-button v-else-if="activeBanner.key === 'warm'" size="small" type="primary" @click="expandWarmHomeBlocks">
              展开为可编辑区块
            </el-button>
          </div>
          <div v-if="topBanners.length > 1" class="top-banner__nav">
            <button type="button" :disabled="bannerIndex <= 0" aria-label="上一条" @click="bannerIndex--">‹</button>
            <span>{{ bannerIndex + 1 }}/{{ topBanners.length }}</span>
            <button type="button" :disabled="bannerIndex >= topBanners.length - 1" aria-label="下一条" @click="bannerIndex++">›</button>
          </div>
          <button
            v-if="activeBanner.closable"
            type="button"
            class="top-banner__close"
            aria-label="关闭提示"
            @click="dismissBanner(activeBanner.key)"
          >
            ×
          </button>
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
          <el-tab-pane label="内容" name="content">
            <PropsPanel section="content" />
          </el-tab-pane>
          <el-tab-pane label="样式" name="style">
            <PropsPanel section="style" />
          </el-tab-pane>
          <el-tab-pane label="页面" name="page">
            <PropsPanel section="page" />
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>

    <!-- AI 助手入口：贴右侧边缘的竖排 Dock Tab（默认收起只留图标，悬停/点击展开），
         不占用画布与属性面板的内容流，避免遮挡右侧面板底部表单与保存按钮 -->
    <div
      class="ai-dock"
      :class="{
        'is-open': aiDockOpen,
        'is-busy': aiRunning,
        'has-badge': !!aiPatchTotal,
        'is-hidden': aiChatVisible,
      }"
    >
      <button
        type="button"
        class="ai-dock__toggle"
        :aria-label="aiDockOpen ? '收起 AI 助手' : '展开 AI 助手'"
        :aria-expanded="aiDockOpen"
        @click="aiDockOpen = !aiDockOpen"
      >
        <el-icon class="ai-dock__caret" :class="{ 'is-open': aiDockOpen }">
          <ArrowLeft v-if="aiDockOpen" />
          <ArrowRight v-else />
        </el-icon>
      </button>
      <button
        type="button"
        class="ai-dock__main"
        :aria-label="aiRunning ? 'AI 助手（生成中）' : '打开 AI 助手'"
        @click="openAiChat"
      >
        <span class="ai-dock__halo" aria-hidden="true"></span>
        <span class="ai-dock__icon" aria-hidden="true">
          <el-icon><MagicStick /></el-icon>
        </span>
        <span class="ai-dock__label">AI 助手</span>
        <span v-if="aiPatchTotal" class="ai-dock__badge">{{ aiPatchTotal }}</span>
      </button>
    </div>

    <!-- AI 助手对话框
         🔴 modal=false 并不等于「不拦截」：EP 的 el-overlay 在 mask=false 时仍会渲染一个
            `position:fixed; inset:0` 的 div（overlay.mjs 的 else 分支，只有 zIndex 没有
            pointer-events:none）→ 小窗模式下这层透明容器会吃掉整屏点击与拖拽，
            表现为「画布/组件库完全点不动」。修法见下方 :global(.ai-chat-dialog--mini) 的
            pointer-events 穿透链（大窗保持 modal=true 不受影响）。 -->
    <el-dialog
      ref="aiChatRef"
      v-model="aiChatVisible"
      class="ai-chat-dialog"
      :class="{ 'ai-chat-dialog--mini': aiMini }"
      :width="aiMini ? 'min(400px, 92vw)' : 'min(720px, 94vw)'"
      :top="aiMini ? undefined : '8vh'"
      :show-close="false"
      :close-on-click-modal="!aiMini"
      :close-on-press-escape="true"
      :modal="!aiMini"
      :modal-penetrable="aiMini"
      :draggable="aiMini"
      :overflow="false"
      :modal-class="aiMini ? 'ai-chat-overlay' : ''"
      append-to-body
      destroy-on-close
    >
      <template #header="{ close }">
        <div class="ai-chat__head">
          <span class="ai-chat__head-icon" aria-hidden="true">
            <el-icon><MagicStick /></el-icon>
          </span>
          <div class="ai-chat__head-text">
            <div class="ai-chat__head-title">AI 装修助手</div>
            <div class="ai-chat__head-sub">{{ aiMini ? '小窗模式 · 可拖动，边改边聊' : '描述想改的地方，AI 给出可直接应用的修改' }}</div>
          </div>
          <button
            type="button"
            class="ai-chat__head-btn"
            :aria-label="aiMini ? '放大 AI 助手' : '缩小为小窗，边改边聊'"
            :title="aiMini ? '放大' : '缩小'"
            @click="toggleAiMini"
          >
            <el-icon>
              <FullScreen v-if="aiMini" />
              <Crop v-else />
            </el-icon>
          </button>
          <button type="button" class="ai-chat__head-close" aria-label="关闭 AI 助手" @click="close()">×</button>
        </div>
      </template>

      <div ref="aiThreadRef" class="ai-chat__thread">
        <div v-if="!aiMessages.length" class="ai-chat__empty">
          <div class="ai-chat__empty-icon" aria-hidden="true">
            <el-icon><MagicStick /></el-icon>
          </div>
          <div class="ai-chat__empty-title">我可以帮你改页面</div>
          <div class="ai-chat__empty-desc">
            说清想要的效果即可。我会给出改页面设置、插组件等建议，点「应用」即时生效且可撤销；保存草稿后才会同步到线上小程序。
          </div>
          <div class="ai-chat__pills">
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
        </div>

        <div
          v-for="msg in aiMessages"
          :key="msg.id"
          class="ai-msg"
          :class="msg.role === 'user' ? 'ai-msg--user' : 'ai-msg--ai'"
        >
          <span v-if="msg.role === 'ai'" class="ai-msg__avatar" aria-hidden="true">
            <el-icon><MagicStick /></el-icon>
          </span>
          <div class="ai-msg__main">
            <div class="ai-msg__bubble">
              <span v-if="msg.pending" class="ai-msg__thinking">
                <i class="ai-msg__dot"></i><i class="ai-msg__dot"></i><i class="ai-msg__dot"></i>
                正在思考…
              </span>
              <template v-else>{{ msg.text }}</template>
            </div>

            <div v-if="msg.patches && msg.patches.length" class="ai-patch-list">
              <div class="ai-patch-list__title">可应用的改动</div>
              <div v-for="patch in msg.patches" :key="patch.id" class="ai-patch-row">
                <div class="ai-patch-row__text">{{ patch.summary }}</div>
                <div class="ai-patch-row__actions">
                  <el-button size="small" type="primary" plain @click="applyAiPatch(patch)">应用</el-button>
                  <el-button size="small" text @click="dismissAiPatch(patch.id)">忽略</el-button>
                </div>
              </div>
              <div class="ai-patch-list__foot">
                <el-button size="small" text @click="applyAllAiPatches">全部应用</el-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 撤销入口独立于建议列表：建议全用完后仍然可以回退 -->
      <div v-if="aiApplyUndoStack.length" class="ai-chat__undo">
        <el-button size="small" text @click="undoLastAiApply">撤销上次应用</el-button>
        <span class="ai-chat__undo-hint">共 {{ aiApplyUndoStack.length }} 次可撤销</span>
      </div>

      <div class="ai-chat__composer">
        <el-input
          v-model="aiPrompt"
          type="textarea"
          :rows="2"
          maxlength="300"
          resize="none"
          placeholder="例如：把首屏轮播换成节日氛围，底色偏暖一点"
          @keydown.enter.exact.prevent="runAiAssist"
        />
        <div class="ai-chat__composer-foot">
          <span class="ai-chat__hint">Enter 发送 · Shift+Enter 换行</span>
          <el-button
            type="primary"
            class="ai-chat__send"
            :loading="aiRunning"
            :disabled="!aiPrompt.trim()"
            @click="runAiAssist"
          >
            发送
          </el-button>
        </div>
      </div>
    </el-dialog>

    <el-drawer v-model="leftDrawerOpen" title="组件与结构" direction="ltr" size="min(320px, 88vw)" class="editor-drawer">
      <ComponentPanel />
    </el-drawer>
    <el-drawer v-model="rightDrawerOpen" title="组件与页面设置" direction="rtl" size="min(380px, 92vw)" class="editor-drawer">
      <el-tabs v-model="rightTab" class="right-tabs" stretch>
        <el-tab-pane label="内容" name="content">
          <PropsPanel section="content" />
        </el-tab-pane>
        <el-tab-pane label="样式" name="style">
          <PropsPanel section="style" />
        </el-tab-pane>
        <el-tab-pane label="页面" name="page">
          <PropsPanel section="page" />
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
      title="同步到线上配置"
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
            {{ publishCheck.blocking.length ? '阻断' : (publishCheck.warnings.length ? '提醒' : '通过') }}
            — {{ publishCheck.blocking.length ? '须先处理下列问题' : (publishCheck.warnings.length ? '可同步，建议先确认' : '可以写入线上配置') }}
          </div>
          <div class="publish-check-desc">
            {{ pageStore.components.length }} 个组件 · {{ publishCheck.blocking.length }} 项阻断 · {{ publishCheck.warnings.length }} 项提醒
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
          <div><b>保存状态</b><span>草稿已是最新（同步仅更新服务端线上配置）</span></div>
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
          {{ publishCheck.warnings.length ? '确认并同步' : '同步到线上' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- C3：发布结果面板，替代原来信息密度过高的单个确认弹窗 -->
    <el-dialog v-model="publishResult.visible" title="已同步到线上配置" width="440px" :close-on-click-modal="false">
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
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch, provide, nextTick } from 'vue'
import { useEditorLayout } from '@/composables/useEditorLayout'
import { useEditorDeleteUndo } from '@/composables/useEditorDeleteUndo'
import { applyConservativePublishFixes, runPublishHealthCheck } from '@/utils/publishHealthCheck'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import {
  useEditorPersist,
  readDraftBackup,
  clearDraftBackup,
} from '@/composables/useEditorPersist'
import { findLegacyDemoMarkersInText } from '@/constants/brand-defaults'
import { isCanvasShortcutBlocked } from '@/utils/editorKeyboardGuard'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, ArrowRight, View, Upload, ArrowDown, RefreshLeft, RefreshRight, WarningFilled, CircleCheckFilled, Menu, Setting, MagicStick, FullScreen, Crop } from '@element-plus/icons-vue'
import { usePageStore } from '@/stores/page'
import { getPageDetail, saveDraft, publishPage, createPage, updatePage, runAiPagePipeline, getPageList } from '@/api/page'
import { collectPageLinks, validatePageLinks } from '@/components/page-builder/linkValidation'
import { publishMiniSite } from '@/api/miniSite'
import { refreshMiniPendingGlobal } from '@/composables/useMiniPending'
import { validateComponent, getComponentDef } from '@/components/page-builder/componentRegistry'
import { collectDataSourceIssues } from '@/components/page-builder/dataSourceValidation'
import ComponentPanel from '@/components/page-builder/ComponentPanel.vue'
import CanvasArea from '@/components/page-builder/CanvasArea.vue'
import PropsPanel from '@/components/page-builder/PropsPanel.vue'
import MiniPreviewDialog from './MiniPreviewDialog.vue'
import { ComponentType, type PageDSL, type PageRecord } from '@/types/page'
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

/** 页面加载失败态（FP-UI-028）。注意：必须声明在 topBanners computed 之前——
    watch(computed) 创建时会立即求值一次收集依赖，后置声明会触发 TDZ 白屏 */
const pageLoadError = ref('')
const pageLoadRetrying = ref(false)

/** C5：保存冲突状态（顶部提示条，不再用弹窗打断编辑现场）。同上，必须先于 topBanners 声明 */
const conflict = reactive({ visible: false })

/** 顶部公告条：冲突/暖家提示等多条合并为单条轮播，阻断性（冲突）优先且不可关闭 */
type TopBanner = { key: string; tone: 'danger' | 'info'; text: string; closable: boolean }
const dismissedBanners = ref(new Set<string>())
const bannerIndex = ref(0)
const topBanners = computed<TopBanner[]>(() => {
  const list: TopBanner[] = []
  if (conflict.visible) {
    list.push({
      key: 'conflict',
      tone: 'danger',
      text: '页面已被其他人修改，直接保存会覆盖对方的改动。',
      closable: false,
    })
  }
  if (showWarmHomeBanner.value && !pageLoadError.value) {
    list.push({
      key: 'warm',
      tone: 'info',
      text: '当前是暖阁首页壳：真机会自动展开默认区块。若要逐块改文案和顺序，可先展开再编辑。',
      closable: true,
    })
  }
  return list.filter((b) => !(b.closable && dismissedBanners.value.has(b.key)))
})
const activeBanner = computed(() => {
  if (!topBanners.value.length) return null
  return topBanners.value[Math.min(bannerIndex.value, topBanners.value.length - 1)]
})
watch(topBanners, (list) => {
  if (bannerIndex.value > list.length - 1) bannerIndex.value = 0
})
function dismissBanner(key: string) {
  dismissedBanners.value.add(key)
}

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
  rightTab.value = 'content'
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

const rightTab = ref<'content' | 'style' | 'page'>('content')

/** AI 助手：右侧边缘竖排 Dock Tab（收起=窄条，展开=横向胶囊）+ 对话弹窗 */
const aiChatVisible = ref(false)
/** dialog 实例：切回大窗时用它 resetPosition() 清掉 draggable 写进 inline style 的位移 */
const aiChatRef = ref<{ resetPosition?: () => void } | null>(null)
/** Dock 是否展开；默认收起，只贴右边缘一条 34px 窄条，不遮属性面板 */
const aiDockOpen = ref(false)
/**
 * 小窗模式：弹窗收成可拖动的小窗、无遮罩，
 * 用来「边在左侧/画布操作，边和 AI 对话」。默认不缩小。
 */
const aiMini = ref(false)
const aiPills = ['改成节日氛围', '精简首屏', '补空状态'] as const
const aiPrompt = ref('')
const aiRunning = ref(false)
const aiThreadRef = ref<HTMLElement | null>(null)
const aiHighlightIds = ref<string[]>([])
provide('aiHighlightIds', aiHighlightIds)

type AiPatch = { id: string; summary: string; apply: () => void }
type AiMessage = { id: string; role: 'user' | 'ai'; text: string; pending?: boolean; patches?: AiPatch[] }
const aiMessages = ref<AiMessage[]>([])
/** 角标：所有消息里还没处理的建议数 */
const aiPatchTotal = computed(() =>
  aiMessages.value.reduce((sum, m) => sum + (m.patches?.length || 0), 0),
)
const aiApplyUndoStack = ref<Array<() => void>>([])
let aiMsgSeq = 0

function openAiChat() {
  aiChatVisible.value = true
}

/**
 * 切换大窗 ↔ 小窗。
 * ⚠️ 必须调 resetPosition()：EP 的 draggable 会把拖动位移写进 dialog 的 inline style
 * （translateX/translateY），切回大窗时不清掉就会带着旧位移跑到视口外左上角。
 * 关闭时也复位，避免下次打开残留小窗样式。
 */
async function toggleAiMini() {
  aiMini.value = !aiMini.value
  await nextTick()
  if (!aiMini.value) aiChatRef.value?.resetPosition?.()
}

watch(aiChatVisible, (visible) => {
  if (!visible) {
    aiMini.value = false
    aiChatRef.value?.resetPosition?.()
  }
})
async function scrollAiThreadToBottom() {
  await nextTick()
  const el = aiThreadRef.value
  if (el) el.scrollTop = el.scrollHeight
}

function sanitizeAiText(text: string) {
  return String(text || '')
    .replace(/pageId\s*=\s*[\w-]+/gi, '其他草稿页')
    .replace(/\bpageId\b/gi, '页面编号')
}

function applyAiPill(pill: string) {
  aiPrompt.value = pill
  void runAiAssist()
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
    const def = matched ? getComponentDef(matched as ComponentType) : undefined
    if (def) {
      // 可执行建议：把 AI 匹配到的组件直接插到当前页底部（应用后可撤销）
      patches.push({
        id: `report-insert-${idx}`,
        summary: `插入组件「${def.label}」${title && title !== def.label ? `（${sanitizeAiText(title)}）` : ''}`,
        apply: () => {
          pageStore.addComponent(def.type)
        },
      })
      if (note) {
        patches.push({
          id: `report-note-${idx}`,
          summary: sanitizeAiText(note),
          apply: () => {},
        })
      }
      return
    }
    const line = note || title
    if (!line) return
    patches.push({
      id: `report-${idx}`,
      summary: sanitizeAiText(line),
      apply: () => {},
    })
  })
  return patches
}

/**
 * 把本次生成的建议挂到对应 AI 消息上。
 * 必须走 aiMessages.value[index] 拿到响应式代理来写：
 * 直接改 push 进去的原始对象不会触发依赖更新，aiPatchTotal 角标会停在旧值。
 */
function attachAiPatches(index: number, patches: AiPatch[]) {
  const target = aiMessages.value[index]
  if (target) target.patches = patches
}

function findPatch(id: string): AiMessage | undefined {
  return aiMessages.value.find((m) => m.patches?.some((p) => p.id === id))
}

function dismissAiPatch(id: string) {
  const msg = findPatch(id)
  if (!msg?.patches) return
  msg.patches = msg.patches.filter((p) => p.id !== id)
  if (!msg.patches.length) msg.patches = undefined
}

/** @param silent 批量应用时传 true，避免十几条 toast 刷屏（由调用方统一提示一次） */
function applyAiPatch(patch: AiPatch, silent = false) {
  const snapshot = JSON.parse(JSON.stringify(pageStore.dsl))
  patch.apply()
  aiApplyUndoStack.value.push(() => pageStore.applyTemplate(snapshot))
  dismissAiPatch(patch.id)
  if (!silent) ElMessage.success('已应用一条建议')
}

function applyAllAiPatches() {
  const list = aiMessages.value.flatMap((m) => [...(m.patches || [])])
  if (!list.length) return
  list.forEach((p) => applyAiPatch(p, true))
  ElMessage.success(`已应用 ${list.length} 条建议`)
}

function undoLastAiApply() {
  const fn = aiApplyUndoStack.value.pop()
  if (!fn) return
  fn()
  ElMessage.info('已撤销上次 AI 应用')
}

async function runAiAssist() {
  const text = aiPrompt.value.trim()
  if (!text || aiRunning.value) return
  aiChatVisible.value = true
  aiPrompt.value = ''
  aiRunning.value = true

  const userMsg: AiMessage = { id: `u-${++aiMsgSeq}`, role: 'user', text }
  const aiMsg: AiMessage = { id: `a-${++aiMsgSeq}`, role: 'ai', text: '', pending: true }
  aiMessages.value.push(userMsg, aiMsg)
  // 关键：从数组里取回响应式代理来写。直接改上面那个原始对象 aiMsg 不会触发更新，
  // 表现为建议卡片要等下一次重渲染才出现、悬浮按钮角标一直不显示。
  const liveMsg = aiMessages.value[aiMessages.value.length - 1]
  void scrollAiThreadToBottom()

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
    let reply = sanitizeAiText(summary || '已收到建议，可按提示在属性面板手动调整。')
    if (draft?.pageId && pageId && Number(draft.pageId) !== Number(pageId)) {
      reply += '\n\n当前不会自动跳转到其他页面，避免串页覆盖。'
    }
    liveMsg.text = reply
    liveMsg.pending = false
    attachAiPatches(aiMessages.value.length - 1, buildAiPatchesFromResponse(data))
  } catch {
    liveMsg.text = '暂未接通，请稍后重试。'
    liveMsg.pending = false
  } finally {
    aiRunning.value = false
    void scrollAiThreadToBottom()
  }
}

function handlePublishCheck() {
  void handlePublish()
}

const {
  saveStatus,
  saveStatusText,
  retryNow: retrySaveNow,
  resetPersistState,
  bindAutoSaveWatch,
  updateStatusText,
  lastSavedAt: lastPersistSavedAt,
} = useEditorPersist(async () => performAutoSaveCore())

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
    '/pkg-content/content-list/content-list',
    '/pkg-content/product-list/product-list',
    '/pages/mine/mine',
    '/pages/login/login',
    '/pages/search/search',
    '/pkg-content/product-detail/product-detail',
    '/pkg-content/content-detail/content-detail',
    '/pkg-content/cart/cart',
    '/pkg-content/order-create/order-create',
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
      await maybeRestoreLocalBackup(id)
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

/** 保存前死链校验：扫整页站内链接，对照页面清单（不存在=error / 未发布=warn），接口失败时放行不阻塞 */
async function collectLinkIssues(): Promise<string[]> {
  try {
    const res = await getPageList({ current: 1, size: 500 })
    const rows = (res as any)?.data?.records || (res as any)?.data?.list || []
    const refs = collectPageLinks(pageStore.components)
    return validatePageLinks(refs, Array.isArray(rows) ? rows : []).map((i) => i.message)
  } catch {
    return []
  }
}

/** 保存草稿（手动点击） */
async function handleSaveDraft() {
  if (!pageStore.currentPage) return
  const jumpIssues = collectJumpIssues(pageStore.components)
  if (jumpIssues.length) {
    ElMessage.error(jumpIssues[0])
    return
  }
  const linkIssues = await collectLinkIssues()
  if (linkIssues.length) {
    const shown = linkIssues.slice(0, 6)
    const html = `<div style="text-align:left">检测到 ${linkIssues.length} 个疑似死链/未发布链接：<br>${shown.join('<br>')}${linkIssues.length > shown.length ? `<br>…共 ${linkIssues.length} 条` : ''}<br><br>保存后小程序端点击这些位置会无响应。</div>`
    try {
      await ElMessageBox.confirm(html, '保存前请确认', {
        confirmButtonText: '仍要保存',
        cancelButtonText: '返回修改',
        type: 'warning',
        dangerouslyUseHTMLString: true,
      })
    } catch {
      return
    }
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

async function maybeRestoreLocalBackup(pageId: number) {
  const backup = readDraftBackup(pageId)
  if (!backup?.dsl) return
  const serverKey = JSON.stringify(pageStore.dsl)
  const backupKey = JSON.stringify(backup.dsl)
  if (serverKey === backupKey) {
    clearDraftBackup(pageId)
    return
  }
  const when = new Date(backup.savedAt)
  const timeLabel = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}-${String(when.getDate()).padStart(2, '0')} ${String(when.getHours()).padStart(2, '0')}:${String(when.getMinutes()).padStart(2, '0')}`
  try {
    await ElMessageBox.confirm(
      `检测到本机有未同步草稿（${timeLabel}），是否恢复？选「使用服务器版本」将丢弃本机备份。`,
      '恢复本地草稿',
      {
        confirmButtonText: '恢复本地草稿',
        cancelButtonText: '使用服务器版本',
        type: 'warning',
      },
    )
    pageStore.restoreLocalDraft(backup.dsl)
    saveStatus.value = 'pending'
    updateStatusText()
    ElMessage.info('已恢复本地草稿，将自动尝试保存')
  } catch {
    clearDraftBackup(pageId)
  }
}

/** C5：放弃本地修改，直接刷新为服务端最新版本 */
async function handleReloadFromConflict() {
  conflict.visible = false
  await loadPage()
  ElMessage.success('已刷新为最新版本')
}

/** C5：忽略版本校验，用当前画布覆盖服务端草稿 */
async function handleForceOverwriteFromConflict() {
  if (!pageStore.currentPage) return
  const jumpIssues = collectJumpIssues(pageStore.components)
  if (jumpIssues.length) {
    ElMessage.warning(jumpIssues[0])
    return
  }
  pageStore.saving = true
  try {
    await syncPageMetaToServer()
    const res = await saveDraft(pageStore.currentPage.id, pageStore.dsl)
    pageStore.markSavedToServer()
    conflict.visible = false
    clearDraftBackup(pageStore.currentPage.id)
    saveStatus.value = 'saved'
    lastPersistSavedAt.value = new Date()
    updateStatusText()
    if (res.data) {
      syncSavedDraftVersion(res.data)
    }
    ElMessage.success('已覆盖保存为最新草稿')
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || err?.message || '覆盖保存失败')
  } finally {
    pageStore.saving = false
  }
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
  const legacyHits = findLegacyDemoMarkersInText(JSON.stringify(pageStore.dsl))
  if (legacyHits.length) {
    warnings.push(`页面仍含演示品牌文案（${legacyHits.slice(0, 4).join('、')}${legacyHits.length > 4 ? ' 等' : ''}），建议在外观/内容库替换后再发布`)
  }
  return [...new Set(warnings)]
}

/** 保存草稿后打开同步前检查 */
async function handleSyncToLive() {
  if (pageStore.hasUnpersistedChanges && pageStore.currentPage) {
    await handleSaveDraft()
    if (pageStore.hasUnpersistedChanges) return
  }
  handlePublishCheck()
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
    const pageId = pageStore.currentPage.id
    const res = await publishPage(pageId)
    try {
      await publishMiniSite({ pageIds: [pageId], includeSite: false })
    } catch {
      /* 旧后端可能仅有 publishPage */
    }
    await refreshMiniPendingGlobal(true)
    const published = res.data as PageRecord | undefined
    // C3：发布成功后用结果面板展示版本、变更规模和下一步建议，替代信息密度过高的单个确认弹窗
    publishResult.version = published?.currentVersion ?? published?.version ?? (pageStore.currentPage.currentVersion ?? pageStore.currentPage.version ?? 1)
    publishResult.componentCount = pageStore.components.length
    publishResult.path = toMiniappOpenPath(pageStore.currentPage.path || pageStore.pageConfig.path || '')
    publishCheck.visible = false
    publishResult.visible = true
    await loadPage()
  } catch (err: any) {
    ElMessage.error(`同步失败：${err?.response?.data?.message || err?.message || '未知错误'}`)
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
  const key = event.key.toLowerCase()

  if (isMod && key === 'z') {
    event.preventDefault()
    if (event.shiftKey) {
      pageStore.redo()
    } else {
      pageStore.undo()
    }
    return
  }

  // 复制组件：Ctrl/Cmd + D。与浏览器「收藏网页」冲突，但装修器场景下更常用；
  // shift 版Ctrl+Shift+D 交给浏览器（不拦截）。
  if (isMod && key === 'd' && !event.shiftKey) {
    if (!pageStore.selectedComponentId) return
    event.preventDefault()
    pageStore.duplicateComponent(pageStore.selectedComponentId)
    ElMessage.success('已复制一份，可拖到目标位置')
    return
  }

  // 取消选中：Esc。输入框/文本域里正在打字时不抢焦点。
  if (key === 'escape') {
    const el = document.activeElement as HTMLElement | null
    const typing =
      el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
    if (typing) return
    if (!pageStore.selectedComponentId) return
    pageStore.selectComponent('')
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
  background: var(--wb-bg);
  font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;

  .editor-body {
    display: grid;
    grid-template-columns: 250px minmax(0, 1fr) 380px;
    height: 100vh;
    overflow: hidden;
    max-width: 100vw;
    background: var(--wb-bg);

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
      overflow: hidden;
      background: #fff;
      border-right: 1px solid var(--wb-line);
      padding: 0;
    }

    .editor-left--rail {
      padding: 0;
      overflow: visible;
      position: relative;
      z-index: 12;

      &:hover {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 250px;
        padding: 0;
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
      border-left: 1px solid var(--wb-line);
    }
  }
}

.right-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
  /* 注意：这里曾有一行 `--el-color-primary: var(--el-color-primary);`（变量自引用）。
   * CSS 变量自引用会被判为「invalid at computed-value time」，整条声明失效，
   * 导致该容器内所有 Element 组件（开关/按钮/单选）拿不到主题主色、
   * 回落到冷灰蓝，在暖棕主题下就会出现「右边蓝色、左边暖色」的割裂。
   * 正确做法是不覆盖，让变量自然继承 html[data-admin-theme] 的值。 */

  :deep(.el-tabs__header) {
    margin: 0;
    padding: 0;
    background: #fff;
    border-bottom: 1px solid var(--wb-line);
  }
  :deep(.el-tabs__nav-wrap::after) {
    background-color: transparent;
  }
  :deep(.el-tabs__item) {
    flex: 1;
    justify-content: center;
    height: 42px;
    font-size: 12.5px;
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
    color: var(--el-color-primary);
    font-weight: 600;
  }
  :deep(.el-tabs__active-bar) {
    background-color: var(--el-color-primary);
    height: 2px;
  }
}

/* 属性面板内所有 el-form 统一 label-width:72px，而 size=small 时 label 字号只有 12px，
 * 72px 扣掉 label 自带的 12px padding 只剩 60px ≈ 5 个汉字。一旦 label 超过 5 个汉字
 * （如「渐变起/中/止」=6 字+2 斜杠、「页面左右边距」=6 字），由于 element-plus 的
 * .el-form-item__label 是 display:inline-flex 且没有 white-space:nowrap，
 * 文字会折成两行、把该项 label 撑高并与右侧控件上下错位。
 *
 * 🔴 修法必须用 min-width + !important，不能用 overflow:hidden：
 * ① element-plus 的 labelStyle 是**行内内联样式** `{ width: '72px' }`
 *    （见 form-item.vue_vue_type_script_setup_true_lang.mjs 的 labelStyle computed），
 *    行内样式优先级高于任何类选择器，普通 `.right-tabs :deep(...)` 压不住它 → 必须 !important。
 * ② overflow:hidden 更糟：label 是 inline-flex 容器，text-overflow:ellipsis 对其不生效，
 *    overflow:hidden 会把超出的 12px 直接**裁掉**（实测 scrollW=84 / clientW=72），
 *    「渐变起/中/止」被切成「l变起/中/止」，比折行更糟。
 * 改成 min-width:72px + width:auto 后，label 按内容自然撑到 84px，长文案完整可见，
 * 且同 form 内所有行因 min-width 一致仍然左对齐。
 * ⚠️ 扫描器：scripts/scan-props-label-overflow.py（改 label 文案后跑一遍）。 */
.right-tabs :deep(.el-form-item__label) {
  flex: 0 0 auto;
  width: auto !important;
  min-width: 72px;
  white-space: nowrap;
}

/* ============ AI 助手：右侧边缘竖排 Dock Tab ============ */
/* 原来停在画布右下角（fixed bottom:64px），属性面板展开时正好压住面板右下角的
   表单尾部与保存区。改为贴视口右边缘的竖排 dock：收起态只有一条 32px 宽的窄条
   （hover 微微内缩提示可点），不与任何内容流重叠；展开态向左浮出胶囊。 */
.ai-dock {
  position: fixed;
  top: 50%;
  right: 0;
  z-index: 1010;
  display: flex;
  align-items: stretch;
  transform: translateY(-50%);
  font-family: inherit;
  border-radius: 8px 0 0 8px;
  box-shadow: 0 8px 20px -10px rgb(15 23 42 / 30%);
  transition: right 0.22s cubic-bezier(0.34, 1.2, 0.64, 1), opacity 0.18s ease, visibility 0.18s ease;
}

/* 对话窗（含小窗）打开时隐藏 Dock：同一功能不留两个入口 */
.ai-dock.is-hidden {
  right: -60px;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

/* 收起态：整条贴边，只露出图标与竖排文字 */
.ai-dock__main {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 34px;
  padding: 12px 0 14px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1px;
  color: #fff;
  background: linear-gradient(180deg, var(--el-color-primary) 0%, var(--el-color-primary-light-3) 58%, #7b5cf0 100%);
  border: 0;
  border-radius: 8px 0 0 8px;
  cursor: pointer;
  overflow: hidden;
  transition: width 0.22s cubic-bezier(0.34, 1.2, 0.64, 1), padding 0.22s ease;
}
.ai-dock__label {
  writing-mode: vertical-rl;
  line-height: 1;
  white-space: nowrap;
  letter-spacing: 2px;
}

.ai-dock__icon {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  flex: none;
  font-size: 15px;
  color: #fff;
  background: rgb(255 255 255 / 22%);
  border-radius: 50%;
  backdrop-filter: blur(2px);
}

/* 展开态：向左浮出横向胶囊 */
.ai-dock.is-open .ai-dock__main {
  flex-direction: row;
  width: auto;
  padding: 6px 18px 6px 6px;
  gap: 9px;
  letter-spacing: 0.2px;
  cursor: default;
}
.ai-dock.is-open .ai-dock__icon {
  width: 32px;
  height: 32px;
  font-size: 17px;
}
.ai-dock.is-open .ai-dock__label {
  writing-mode: horizontal-tb;
  letter-spacing: 0.2px;
}

/* 左侧的展开/收起小箭头：始终露在最左边，收起态是「把人拉出来」的暗示 */
.ai-dock__toggle {
  position: absolute;
  top: 50%;
  left: -15px;
  display: grid;
  place-items: center;
  width: 15px;
  height: 34px;
  padding: 0;
  color: var(--el-color-primary);
  background: #fff;
  border: 1px solid var(--el-border-color, #dcdfe6);
  border-right: 0;
  border-radius: 6px 0 0 6px;
  transform: translateY(-50%);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.18s ease;
}
.ai-dock:hover .ai-dock__toggle,
.ai-dock.is-open .ai-dock__toggle {
  opacity: 1;
}
.ai-dock__toggle:hover {
  background: var(--el-fill-color-light, #f5f7fa);
}
.ai-dock__caret {
  font-size: 11px;
}
.ai-dock__toggle:hover .ai-dock__caret.is-open {
  transform: translateX(-1px);
}

/* 收起态贴边仅 34px，hover 时右移一点提示「可展开」，仍不压内容 */
.ai-dock:not(.is-open):hover {
  right: 4px;
}
.ai-dock:not(.is-open):hover .ai-dock__main {
  width: 40px;
}

/* 未处理建议数角标 */
.ai-dock__badge {
  display: grid;
  place-items: center;
  min-width: 19px;
  height: 19px;
  padding: 0 5px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  color: var(--el-color-primary);
  background: #fff;
  border-radius: 999px;
  box-shadow: 0 1px 3px rgb(15 23 42 / 25%);
}

/* 生成中：呼吸光环 */
.ai-dock__halo {
  position: absolute;
  inset: -3px;
  border-radius: inherit;
  background: inherit;
  opacity: 0;
  pointer-events: none;
}
.ai-dock.is-busy .ai-dock__halo {
  animation: ai-fab-pulse 1.6s ease-out infinite;
}
.ai-dock.is-busy .ai-dock__icon {
  animation: ai-fab-spin 2.4s linear infinite;
}
/* 收起态角标：贴右上角小圆点，不占竖排空间 */
.ai-dock:not(.is-open).has-badge .ai-dock__badge {
  position: absolute;
  top: 6px;
  right: 3px;
  min-width: 15px;
  height: 15px;
  padding: 0 3px;
  font-size: 10px;
}
@keyframes ai-fab-pulse {
  0% { opacity: 0.5; transform: scale(1); }
  100% { opacity: 0; transform: scale(1.28); }
}
@keyframes ai-fab-spin {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(180deg); }
}

@media (max-width: 900px) {
  .ai-dock__main {
    width: 30px;
    padding: 10px 0 12px;
    font-size: 11px;
  }
  .ai-dock.is-open .ai-dock__main {
    padding: 5px 14px 5px 5px;
  }
  .ai-dock__icon {
    width: 24px;
    height: 24px;
    font-size: 14px;
  }
  .ai-dock.is-open .ai-dock__icon {
    width: 28px;
    height: 28px;
    font-size: 15px;
  }
}

/* ============ AI 助手对话框（append-to-body，需 :global） ============ */
/* 注意：这里必须用扁平选择器，不要写成 `:global(.ai-chat-dialog) { ... .el-dialog__header { ... } }`。
 * SCSS 嵌套编译后会额外产出一条 `.ai-chat-dialog { margin: 0 }`（来自 reset 的 margin 归零），
 *  specificity 与 .el-dialog 相同但顺序在后，会把 el-dialog 自带的
 * `margin: var(--el-dialog-margin-top) auto 50px` 覆盖成 0 —— 表现为弹窗贴左上角、无法水平居中。 */
:global(.ai-chat-dialog) {
  --el-dialog-border-radius: 16px;
  border-radius: 16px;
  box-shadow: 0 24px 60px -20px rgb(15 23 42 / 35%);
  overflow: hidden;
}
:global(.ai-chat-dialog .el-dialog__header) {
  padding: 0;
  margin: 0;
}
:global(.ai-chat-dialog .el-dialog__body) {
  padding: 0;
  color: var(--wb-ink, #2a1f17);
}

/* ---------- 小窗模式（ai-chat-dialog--mini） ----------
 * 目标：边在画布/属性面板操作，边和 AI 对话（真正的 modeless）。
 * 关键点：① draggable 生效（EP 2.14 只绑 header 拖）② 靠右固定，避开左组件面板与右属性面板
 *        ③ **事件穿透**（见下）。
 * ⚠️ 小窗不要给 margin（EP 靠 margin:auto 居中），这里要显式覆盖为固定定位。 */

/* 🔴🔴 事件穿透链（Modeless 的核心，缺一层就点不动画布）
 *
 * 坑：`:modal="false"` **不等于**「不拦截」。EP 的 `el-overlay` 在 mask=false 时走
 *   `overlay.mjs` 的 else 分支，仍渲染一个 `position:fixed; inset:0` 的 div ——
 *   **只有 zIndex，没有 pointer-events:none**。于是：
 *     el-overlay(全屏fixed) → el-overlay-dialog(全屏fixed) → .el-dialog
 *   这两层透明容器把整屏点击/拖拽全部吃掉（实测 `elementFromPoint` 命中 `.el-overlay-dialog`
 *   而非画布元素），表现为「画布、组件库、属性面板完全点不动」。
 *
 * 修法：从 `modal-class` 打上的标记类 `.ai-chat-overlay` 一路穿透到卡片本身：
 *   第1层 `.el-overlay.ai-chat-overlay`      → none（EP 挂 modal-class 的那一层）
 *   第2层 `.el-overlay-dialog`               → none（EP 内部全屏容器）
 *   第3层 `.el-overlay-dialog > .el-dialog`  → none（兜底，防 EP 结构变化）
 *   终端 `.ai-chat-dialog--mini`            → auto（小窗卡片自己恢复交互）
 * 只要第 4 条生效，卡片内的输入框/按钮/拖拽头就都能正常工作。
 * 大窗走 `modal=true` 有真实遮罩，不加这段、不受影响。 */
:global(.el-overlay.ai-chat-overlay),
:global(.el-overlay.ai-chat-overlay .el-overlay-dialog),
:global(.el-overlay.ai-chat-overlay .el-dialog) {
  pointer-events: none !important;
  background: transparent !important;
}
:global(.ai-chat-dialog--mini) {
  /* 卡片自身恢复交互，否则输入框/发送键/拖拽头全部失效 */
  pointer-events: auto !important;
}
:global(.ai-chat-dialog--mini) {
  position: fixed;
  top: auto !important;
  right: 46px;
  bottom: 20px;
  left: auto;
  width: min(400px, 92vw);
  max-height: 82vh;
  margin: 0;
  border-radius: 14px;
  box-shadow: 0 18px 48px -16px rgb(15 23 42 / 42%), 0 2px 8px rgb(15 23 42 / 14%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 小窗头更紧凑，并给出「可拖动」的视觉暗示 */
:global(.ai-chat-dialog--mini .ai-chat__head) {
  padding: 10px 12px;
  cursor: grab;
  user-select: none;
}
:global(.ai-chat-dialog--mini .ai-chat__head:active) { cursor: grabbing; }
:global(.ai-chat-dialog--mini .ai-chat__head-icon) {
  width: 28px;
  height: 28px;
  font-size: 15px;
  border-radius: 9px;
}
:global(.ai-chat-dialog--mini .ai-chat__head-title) { font-size: 13.5px; }
:global(.ai-chat-dialog--mini .ai-chat__head-sub) { font-size: 11.5px; }

/* 小窗对话区变矮，把屏幕留给画布 */
:global(.ai-chat-dialog--mini .ai-chat__thread) {
  height: min(34vh, 300px);
  padding: 12px;
  gap: 12px;
}
:global(.ai-chat-dialog--mini .ai-msg__main) { max-width: 92%; }
:global(.ai-chat-dialog--mini .ai-msg__bubble) { padding: 8px 11px; font-size: 12.5px; }
:global(.ai-chat-dialog--mini .ai-chat__composer) { padding: 10px 12px 11px; }
:global(.ai-chat-dialog--mini .ai-chat__empty) { padding: 0; }
:global(.ai-chat-dialog--mini .ai-chat__empty-icon) {
  width: 40px;
  height: 40px;
  font-size: 20px;
  border-radius: 13px;
  margin-bottom: 8px;
}
:global(.ai-chat-dialog--mini .ai-chat__empty-title) { font-size: 13.5px; }
:global(.ai-chat-dialog--mini .ai-chat__empty-desc) {
  font-size: 11.5px;
  line-height: 1.55;
  margin-bottom: 11px;
}
:global(.ai-chat-dialog--mini .ai-chat__undo) { padding: 5px 12px 0; }

/* 小窗宽度只有 400px，建议行改成「文案在上、按钮在下」，避免长文案把按钮挤到换行 */
:global(.ai-chat-dialog--mini .ai-patch-row) {
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  padding: 7px 0;
}
:global(.ai-chat-dialog--mini .ai-patch-row__actions) {
  justify-content: flex-end;
  gap: 4px;
}
:global(.ai-chat-dialog--mini .ai-patch-row__actions .el-button) {
  padding: 4px 10px;
  height: 24px;
}

@media (max-width: 900px) {
  :global(.ai-chat-dialog--mini) {
    right: 12px;
    bottom: 12px;
    max-height: 88vh;
  }
}

:global(.ai-chat__head) {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--el-color-primary) 92%, #000) 0%,
    var(--el-color-primary) 45%,
    var(--el-color-primary-light-3) 100%);
  color: #fff;
}

:global(.ai-chat__head-icon) {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  flex: none;
  font-size: 19px;
  color: #fff;
  background: rgb(255 255 255 / 20%);
  border: 1px solid rgb(255 255 255 / 28%);
  border-radius: 11px;
}

:global(.ai-chat__head-text) { min-width: 0; flex: 1; }
:global(.ai-chat__head-title) { font-size: 15px; font-weight: 700; line-height: 1.3; }
:global(.ai-chat__head-sub) {
  margin-top: 2px;
  font-size: 12px;
  line-height: 1.4;
  color: rgb(255 255 255 / 82%);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* 缩小/放大按钮与关闭按钮同一视觉族 */
:global(.ai-chat__head-btn) {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  flex: none;
  font-size: 15px;
  color: #fff;
  background: rgb(255 255 255 / 14%);
  border: 0;
  border-radius: 9px;
  cursor: pointer;
  transition: background 0.18s ease;
}
:global(.ai-chat__head-btn:hover) { background: rgb(255 255 255 / 28%); }

:global(.ai-chat__head-close) {
  width: 30px;
  height: 30px;
  flex: none;
  font-size: 20px;
  line-height: 1;
  color: #fff;
  background: rgb(255 255 255 / 14%);
  border: 0;
  border-radius: 9px;
  cursor: pointer;
  transition: background 0.18s ease;
}
:global(.ai-chat__head-close:hover) { background: rgb(255 255 255 / 28%); }

:global(.ai-chat__thread) {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: min(52vh, 440px);
  padding: 18px;
  overflow-y: auto;
  background:
    radial-gradient(circle at 12% 0%, color-mix(in srgb, var(--el-color-primary) 6%, transparent), transparent 42%),
    var(--wb-soft, #fbf8f4);
}

/* 空态引导 */
:global(.ai-chat__empty) { margin: auto; padding: 8px 6px; text-align: center; }
:global(.ai-chat__empty-icon) {
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  margin: 0 auto 12px;
  font-size: 26px;
  color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 10%, #fff);
  border: 1px solid color-mix(in srgb, var(--el-color-primary) 22%, #fff);
  border-radius: 17px;
}
:global(.ai-chat__empty-title) { font-size: 15px; font-weight: 700; }
:global(.ai-chat__empty-desc) {
  max-width: 460px;
  margin: 6px auto 16px;
  font-size: 12.5px;
  line-height: 1.65;
  color: var(--wb-mute, #6b5b4e);
}

/* 快捷胶囊 */
:global(.ai-chat__pills) { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
:global(.ai-pill) {
  padding: 6px 14px;
  font-family: inherit;
  font-size: 12.5px;
  color: var(--wb-ink, #2a1f17);
  background: #fff;
  border: 1px solid var(--wb-line, #e8dfd3);
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.18s ease;
}
:global(.ai-pill:hover) {
  color: var(--el-color-primary);
  border-color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 7%, #fff);
  transform: translateY(-1px);
}

/* 消息气泡 */
:global(.ai-msg) { display: flex; gap: 9px; align-items: flex-start; }
:global(.ai-msg--user) { justify-content: flex-end; }
:global(.ai-msg__avatar) {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  flex: none;
  margin-top: 2px;
  font-size: 14px;
  color: #fff;
  background: linear-gradient(135deg, var(--el-color-primary), var(--el-color-primary-light-3));
  border-radius: 9px;
}
:global(.ai-msg__main) { min-width: 0; max-width: 84%; display: flex; flex-direction: column; gap: 8px; }
:global(.ai-msg--user .ai-msg__main) { align-items: flex-end; }
:global(.ai-msg__bubble) {
  padding: 10px 14px;
  font-size: 13px;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
  border-radius: 13px;
}
:global(.ai-msg--ai .ai-msg__bubble) {
  color: var(--wb-ink, #2a1f17);
  background: #fff;
  border: 1px solid var(--wb-line, #e8dfd3);
  border-top-left-radius: 4px;
}
:global(.ai-msg--user .ai-msg__bubble) {
  color: #fff;
  background: var(--el-color-primary);
  border-top-right-radius: 4px;
  box-shadow: 0 4px 12px -6px color-mix(in srgb, var(--el-color-primary) 70%, transparent);
}

:global(.ai-msg__thinking) { display: inline-flex; align-items: center; gap: 4px; color: var(--wb-mute, #6b5b4e); }
:global(.ai-msg__dot) {
  width: 5px;
  height: 5px;
  background: var(--el-color-primary);
  border-radius: 50%;
  animation: ai-msg-blink 1.2s ease-in-out infinite;
}
:global(.ai-msg__dot:nth-child(2)) { animation-delay: 0.16s; }
:global(.ai-msg__dot:nth-child(3)) { animation-delay: 0.32s; }
@keyframes ai-msg-blink {
  0%, 100% { opacity: 0.25; transform: translateY(0); }
  50% { opacity: 1; transform: translateY(-2px); }
}

/* 建议改动卡片 */
:global(.ai-patch-list) {
  width: 100%;
  padding: 11px 12px 9px;
  background: color-mix(in srgb, var(--el-color-primary) 5%, #fff);
  border: 1px dashed color-mix(in srgb, var(--el-color-primary) 30%, #fff);
  border-radius: 12px;
}
:global(.ai-patch-list__title) {
  margin-bottom: 7px;
  font-size: 12px;
  font-weight: 700;
  color: var(--el-color-primary);
}
:global(.ai-patch-row) {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
  border-top: 1px solid color-mix(in srgb, var(--el-color-primary) 12%, transparent);
}
:global(.ai-patch-row:first-of-type) { border-top: 0; }
:global(.ai-patch-row__text) { flex: 1; min-width: 0; font-size: 12.5px; line-height: 1.5; }
:global(.ai-patch-row__actions) { display: flex; flex: none; gap: 2px; }
:global(.ai-patch-list__foot) {
  display: flex;
  gap: 4px;
  margin-top: 4px;
  padding-top: 6px;
  border-top: 1px solid color-mix(in srgb, var(--el-color-primary) 12%, transparent);
}

/* 撤销条：独立于建议列表，建议全用完后仍可回退 */
:global(.ai-chat__undo) {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 16px 0;
  background: #fff;
}
:global(.ai-chat__undo-hint) { font-size: 11.5px; color: var(--wb-faint, #7a6a5c); }

/* 输入区 */
:global(.ai-chat__composer) {
  padding: 12px 16px 14px;
  background: #fff;
  border-top: 1px solid var(--wb-line, #e8dfd3);
}
:global(.ai-chat__composer .el-textarea__inner) { border-radius: 11px; }
:global(.ai-chat__composer-foot) {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 9px;
}
:global(.ai-chat__hint) { flex: 1; font-size: 11.5px; color: var(--wb-faint, #7a6a5c); }
:global(.ai-chat__send) {
  min-width: 88px;
  border-radius: 9px;
  font-weight: 600;
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
  border-bottom: 1px solid var(--wb-line);
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
  --el-button-bg-color: var(--el-color-primary);
  --el-button-border-color: var(--el-color-primary);
  --el-button-hover-bg-color: var(--el-color-primary-dark-2);
  --el-button-hover-border-color: var(--el-color-primary-dark-2);
}

.autosave-error {
  color: var(--danger);
  font-size: 12px;
}

/* C5：保存冲突提示条 */
.top-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 16px;
  font-size: 13px;
  border-bottom: 1px solid;

  .el-icon {
    flex-shrink: 0;
    font-size: 16px;
  }

  &--danger {
    color: #92400e;
    background: var(--warning-soft);
    border-color: #fed7aa;

    .el-icon { color: var(--warning); }
  }

  &--info {
    color: var(--mute);
    background: var(--accsoft);
    border-color: var(--line2);
  }
}

.top-banner__text {
  flex: 1;
  min-width: 0;
}

.top-banner__actions {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
}

.top-banner__nav {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 4px;
  font-size: 12px;

  button {
    width: 20px;
    height: 20px;
    padding: 0;
    line-height: 1;
    background: transparent;
    border: 0;
    border-radius: 4px;
    cursor: pointer;
    color: inherit;

    &:disabled { opacity: 0.35; cursor: not-allowed; }
    &:not(:disabled):hover { background: rgb(0 0 0 / 6%); }
  }
}

.top-banner__close {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  padding: 0;
  font-size: 14px;
  line-height: 1;
  background: transparent;
  border: 0;
  border-radius: 4px;
  cursor: pointer;
  color: inherit;
  opacity: 0.7;

  &:hover { opacity: 1; background: rgb(0 0 0 / 6%); }
}

/* 「保存并同步」上线角标：与保存草稿拉开风险层级 */
.ed-pub-live-badge {
  margin-left: 6px;
  padding: 0 5px;
  font-size: 10px;
  line-height: 16px;
  border-radius: 4px;
  background: #a32d2d;
  color: #fff;
}

/* 注：原「AI 助手底部抽屉」(.ai-drawer) 已下线，改为右下角悬浮按钮 + 对话弹窗，
   样式见上方 .ai-fab / :global(.ai-chat-dialog)。 */

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
