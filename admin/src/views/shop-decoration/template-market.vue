<template>
  <div class="template-market">
    <!-- Header -->
    <div class="market-header">
      <div class="header-left">
        <h1>📦 模板市场</h1>
        <p class="header-desc">6套精选预设模板，支持筛选、预览、快速编辑、一键应用</p>
      </div>
      <div class="header-right">
        <el-button text @click="showHelp = !showHelp">💡 使用指南</el-button>
      </div>
    </div>

    <!-- Help panel -->
    <transition name="slide-down">
      <div v-if="showHelp" class="help-panel">
        <div class="help-steps">
          <div class="help-step"><strong>1️⃣ 筛选</strong> 按分类/风格/功能特性筛选适合的模板</div>
          <div class="help-step"><strong>2️⃣ 预览</strong> 点击「👁 预览」查看模板完整效果</div>
          <div class="help-step"><strong>3️⃣ 编辑</strong> 点击「✏️ 编辑」快速修改文字、图片、颜色等</div>
          <div class="help-step"><strong>4️⃣ 应用</strong> 点击「✨ 使用」一键创建页面并跳转装修器</div>
          <div class="help-step"><strong>5️⃣ 导出</strong> 编辑完成后可导出JSON配置文件</div>
        </div>
      </div>
    </transition>

    <!-- Filter bar -->
    <TemplateFilterBar v-model="filter" :result-count="filteredTemplates.length" @reset="onFilterReset" />

    <!-- Template grid -->
    <div class="template-grid">
      <TransitionGroup name="tpl-list" tag="div" class="grid-container">
        <div
          v-for="tpl in filteredTemplates"
          :key="tpl.key"
          class="grid-item"
        >
          <TemplateCard
            :template="tpl"
            :selected="selectedKey === tpl.key"
            @select="selectedKey = tpl.key"
            @preview="openPreview(tpl)"
            @apply="applyTemplate(tpl)"
            @edit="openEditor(tpl)"
          />
        </div>
      </TransitionGroup>
      
      <div v-if="filteredTemplates.length === 0" class="empty-state">
        <span class="empty-icon">🔍</span>
        <p>没有找到匹配的模板</p>
        <el-button text type="primary" @click="onFilterReset">重置筛选条件</el-button>
      </div>
    </div>

    <!-- Preview dialog -->
    <el-dialog
      v-model="previewVisible"
      :title="previewTemplate?.name || '模板预览'"
      width="900px"
      destroy-on-close
      class="preview-dialog"
    >
      <div class="preview-layout">
        <div class="preview-info">
          <h3>{{ previewTemplate?.name }}</h3>
          <p>{{ previewTemplate?.description }}</p>
          <div class="info-features">
            <span v-if="previewTemplate?.features.hasBanner">🖼 轮播图</span>
            <span v-if="previewTemplate?.features.hasNavGrid">📱 宫格导航</span>
            <span v-if="previewTemplate?.features.hasProductList">🛒 商品列表</span>
            <span v-if="previewTemplate?.features.hasCoupon">🎫 优惠券</span>
            <span v-if="previewTemplate?.features.hasMemberCard">💳 会员卡</span>
            <span v-if="previewTemplate?.features.hasCountdown">⏰ 倒计时</span>
            <span v-if="previewTemplate?.features.hasRichText">📝 富文本</span>
            <span v-if="previewTemplate?.features.hasVideo">🎬 视频</span>
          </div>
          <div class="info-scenarios">
            <strong>适用场景：</strong>
            <span v-for="(s, i) in previewTemplate?.scenarios" :key="i">{{ s }}{{ i < (previewTemplate?.scenarios?.length||0)-1 ? ' / ' : '' }}</span>
          </div>
        </div>
        <div class="preview-phone">
          <div class="phone-frame">
            <div class="phone-notch"></div>
            <div class="phone-screen" :style="{ background: previewDsl?.page?.background_color || '#f6f8fb' }">
              <div v-if="!previewDsl" class="preview-loading">
                <el-icon class="is-loading"><Loading /></el-icon>
                <span>加载中...</span>
              </div>
              <div v-else class="preview-dsl-content">
                <ComponentItem
                  v-for="(comp, idx) in previewDsl.components"
                  :key="comp.id"
                  :component="comp"
                  :index="idx"
                  :selected="false"
                  :preview-mode="true"
                />
                <div v-if="!previewDsl.components?.length" class="preview-empty">暂无组件</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="previewVisible = false">关闭</el-button>
        <el-button type="primary" @click="applyFromPreview">✨ 使用此模板</el-button>
      </template>
    </el-dialog>

    <!-- Editor dialog (full page style) -->
    <el-dialog
      v-model="editorVisible"
      :title="'✏️ 快速编辑：' + (editingTemplate?.name || '')"
      width="1200px"
      fullscreen
      destroy-on-close
      class="editor-dialog"
    >
      <TemplateQuickEditor
        v-if="editorVisible && editorDsl"
        :dsl="editorDsl"
        :editable-fields="editingTemplate?.editableFields || []"
        @save="onEditorSave"
        @export="handleExport"
      />
      <template #footer>
        <el-button @click="editorVisible = false">取消</el-button>
        <el-button @click="handleExport(editorDsl)">📥 导出配置</el-button>
        <el-button type="primary" @click="handleSaveAndApply">保存并应用 →</el-button>
      </template>
    </el-dialog>

    <!-- Apply confirm dialog -->
    <el-dialog v-model="applyConfirmVisible" title="确认应用模板" width="500px">
      <div class="apply-confirm">
        <div class="confirm-icon">✨</div>
        <h3>即将创建新页面</h3>
        <p>使用模板：<strong>{{ applyingTemplate?.name }}</strong></p>
        <p class="confirm-hint">创建后将自动跳转到页面装修器，您可以继续调整布局和组件</p>
        <el-form label-width="100px" size="small" style="margin-top:16px">
          <el-form-item label="页面名称">
            <el-input v-model="newPageName" placeholder="输入页面名称" />
          </el-form-item>
          <el-form-item label="页面类型">
            <el-select v-model="newPageType" style="width:100%">
              <el-option label="首页" value="home" />
              <el-option label="活动页" value="activity" />
              <el-option label="商品页" value="product" />
              <el-option label="会员页" value="member" />
              <el-option label="内容页" value="content" />
              <el-option label="自定义" value="custom" />
            </el-select>
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="applyConfirmVisible = false">取消</el-button>
        <el-button type="primary" :loading="applying" @click="confirmApply">确认创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import ComponentItem from '@/components/page-builder/ComponentItem.vue'
import TemplateCard from '@/components/page-templates/TemplateCard.vue'
import TemplateFilterBar from '@/components/page-templates/TemplateFilterBar.vue'
import TemplateQuickEditor from '@/components/page-templates/TemplateQuickEditor.vue'
import { getPresetTemplates } from '@/data/pageTemplates'
import type { PageTemplate, TemplateFilter } from '@/types/pageTemplate'
import { createEmptyFilter } from '@/types/pageTemplate'
import { createPage, saveDraft } from '@/api/page'

const router = useRouter()

// Data
const showHelp = ref(false)
const selectedKey = ref('')
const filter = ref<TemplateFilter>(createEmptyFilter())
const allTemplates = ref<PageTemplate[]>(getPresetTemplates())

// Preview state
const previewVisible = ref(false)
const previewTemplate = ref<PageTemplate | null>(null)
const previewDsl = ref<any>(null)

// Editor state
const editorVisible = ref(false)
const editingTemplate = ref<PageTemplate | null>(null)
const editorDsl = ref<any>(null)

// Apply state
const applyConfirmVisible = ref(false)
const applyingTemplate = ref<PageTemplate | null>(null)
const applying = ref(false)
const newPageName = ref('')
const newPageType = ref('custom')

// Filtered templates
const filteredTemplates = computed(() => {
  const f = filter.value
  let list = [...allTemplates.value]

  // Keyword search
  if (f.keyword) {
    const kw = f.keyword.toLowerCase()
    list = list.filter(t =>
      t.name.toLowerCase().includes(kw) ||
      t.description.toLowerCase().includes(kw) ||
      t.tags.some(tag => tag.toLowerCase().includes(kw))
    )
  }

  // Category filter
  if (f.categories.length > 0) {
    list = list.filter(t => f.categories.includes(t.category))
  }

  // Style filter
  if (f.styles.length > 0) {
    list = list.filter(t => f.styles.includes(t.style))
  }

  // Feature filter
  if (f.features.length > 0) {
    list = list.filter(t =>
      f.features.every(feat => (t.features as any)[feat] === true)
    )
  }

  return list
})

function onFilterReset() {
  filter.value = createEmptyFilter()
}

function openPreview(tpl: PageTemplate) {
  previewTemplate.value = tpl
  previewDsl.value = JSON.parse(JSON.stringify(tpl.dsl))
  previewVisible.value = true
}

function applyTemplate(tpl: PageTemplate) {
  applyingTemplate.value = tpl
  newPageName.value = tpl.name + ' - 副本'
  newPageType.value = tpl.category
  applyConfirmVisible.value = true
}

function applyFromPreview() {
  if (previewTemplate.value) {
    applyTemplate(previewTemplate.value)
    previewVisible.value = false
  }
}

async function confirmApply() {
  const tpl = applyingTemplate.value
  if (!tpl) return

  applying.value = true
  try {
    const PAGE_TYPE_MAP: Record<string, number> = { home: 1, activity: 2 }
    const pageTypeNum = PAGE_TYPE_MAP[newPageType.value] ?? 3

    const res = await createPage({
      name: newPageName.value,
      type: pageTypeNum,
      path: `/pages/custom/${Date.now()}`,
      shareTitle: tpl.name,
    })

    const pageId = (res.data as any)?.id
    if (!pageId) throw new Error('创建页面失败：未返回页面ID')

    const dslData = editorDsl.value || tpl.dsl
    await saveDraft(pageId as number, dslData)

    ElMessage.success('页面创建成功！正在跳转到装修器...')

    applyConfirmVisible.value = false
    setTimeout(() => {
      router.push(`/page-builder/editor?id=${pageId}`)
    }, 500)
  } catch (e: any) {
    ElMessage.error('创建失败：' + (e?.message || '未知错误'))
  } finally {
    applying.value = false
  }
}

function openEditor(tpl: PageTemplate) {
  editingTemplate.value = tpl
  editorDsl.value = JSON.parse(JSON.stringify(tpl.dsl))
  editorVisible.value = true
}

function onEditorSave(updatedDsl: any) {
  editorDsl.value = updatedDsl
  ElMessage.success('修改已暂存')
}

function handleExport(dsl: any) {
  const json = JSON.stringify(dsl, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `template-${editingTemplate.value?.key}-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('配置已导出')
}

async function handleSaveAndApply() {
  if (editingTemplate.value) {
    applyTemplate(editingTemplate.value)
    editorVisible.value = false
  }
}
</script>

<style lang="scss" scoped>
.template-market { padding: 20px; max-width: 1400px; margin: 0 auto; }

.market-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  margin-bottom: 20px;
}
.header-left h1 { font-size: 24px; font-weight: 800; margin: 0 0 4px; }
.header-desc { color: #7b8798; font-size: 14px; margin: 0; }

.help-panel {
  background: linear-gradient(135deg, #eff6ff, #f0fdf4);
  border: 1px solid #d9e2ef; border-radius: 12px;
  padding: 16px 20px; margin-bottom: 16px;
}
.help-steps { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
.help-step { font-size: 12px; color: #4a5568; line-height: 1.5; }

.template-grid { min-height: 300px; }
.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 18px;
}
.grid-item { break-inside: avoid; }

/* Transitions */
.tpl-list-enter-active { transition: all 0.3s ease; }
.tpl-list-leave-active { transition: all 0.2s ease; }
.tpl-list-enter-from { opacity: 0; transform: translateY(12px); }
.tpl-list-leave-to { opacity: 0; transform: scale(0.95); }
.tpl-list-move { transition: transform 0.3s ease; }

.slide-down-enter-active { transition: all 0.25s ease; overflow: hidden; }
.slide-down-leave-active { transition: all 0.15s ease; overflow: hidden; }
.slide-down-enter-from, .slide-down-leave-to { max-height: 0; opacity: 0; margin: 0; padding: 0; }

.empty-state {
  text-align: center; padding: 60px 20px; color: #a0b4d0;
}
.empty-icon { font-size: 48px; display: block; margin-bottom: 12px; }

/* Preview dialog */
.preview-layout { display: flex; gap: 24px; }
.preview-info { flex: 1; min-width: 280px; }
.preview-info h3 { margin: 0 0 8px; font-size: 18px; }
.preview-info p { color: #7b8798; font-size: 13px; margin: 0 0 12px; line-height: 1.5; }
.info-features { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
.info-features span { padding: 3px 10px; background: #f0f4ff; border-radius: 99px; font-size: 12px; color: #1769ff; }
.info-scenarios { font-size: 13px; color: #607187; }
.info-scenarios strong { color: #172033; }

.preview-phone { flex-shrink: 0; }
.phone-frame {
  width: 320px; height: 600px; background: #111827;
  border-radius: 36px; padding: 10px; box-shadow: 0 12px 40px rgba(0,0,0,0.25);
}
.phone-notch { height: 26px; display: flex; align-items: center; justify-content: center; }
.phone-notch::after {
  content: ''; width: 70px; height: 5px; background: #1f2937; border-radius: 3px;
}
.phone-screen {
  border-radius: 28px; overflow-y: auto; height: calc(100% - 26px);
  background: #f6f8fb;
}
.preview-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 200px; gap: 10px; color: #a0b4d0; font-size: 13px; }
.preview-dsl-content { padding: 8px; min-height: 100%; }
.preview-empty { text-align: center; padding: 40px; color: #c0c8d4; font-size: 13px; }

/* Editor dialog */
.editor-dialog :deep(.el-dialog__body) { padding: 0 !important; height: calc(90vh - 110px); overflow: hidden; }

/* Apply confirm */
.apply-confirm { text-align: center; padding: 10px 0; }
.confirm-icon { font-size: 48px; margin-bottom: 8px; }
.apply-confirm h3 { margin: 0 0 8px; font-size: 18px; }
.apply-confirm p { color: #7b8798; font-size: 13px; margin: 4px 0; }
.confirm-hint { color: #a0b4d0 !important; font-size: 12px !important; }
</style>
