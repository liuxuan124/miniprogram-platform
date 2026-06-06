<template>
  <div class="page-preview">
    <!-- 顶部工具栏 -->
    <div class="preview-toolbar">
      <div class="toolbar-left">
        <el-button icon="ArrowLeft" @click="handleBack">返回</el-button>
        <el-divider direction="vertical" />
        <span>页面预览</span>
      </div>
      <div class="toolbar-right">
        <el-radio-group v-model="previewMode" size="small">
          <el-radio-button value="phone">手机端</el-radio-button>
          <el-radio-button value="dsl">DSL</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <!-- 预览区域 -->
    <div class="preview-body">
      <!-- 手机端预览 -->
      <div v-if="previewMode === 'phone'" class="preview-phone-mode">
        <PreviewPhone
          :page-title="pageStore.pageConfig.name || '页面预览'"
          :page-bg-color="pageStore.pageConfig.background_color || '#f5f5f5'"
        >
          <ComponentItem
            v-for="(comp, index) in pageStore.components"
            :key="comp.id"
            :component="comp"
            :index="index"
            :selected="false"
            @select="() => {}"
          />
        </PreviewPhone>
      </div>

      <!-- DSL 预览 -->
      <div v-else class="preview-dsl-mode">
        <div class="dsl-container">
          <div class="dsl-header">
            <span>页面 DSL JSON</span>
            <el-button size="small" @click="handleCopyDSL">复制</el-button>
          </div>
          <pre class="dsl-content">{{ pageStore.serializeDSL() }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { usePageStore } from '@/stores/page'
import { getPageDetail } from '@/api/page'
import PreviewPhone from '@/components/page-builder/PreviewPhone.vue'
import ComponentItem from '@/components/page-builder/ComponentItem.vue'

const route = useRoute()
const router = useRouter()
const pageStore = usePageStore()

const previewMode = ref<'phone' | 'dsl'>('phone')

/** 加载页面数据 */
async function loadPage() {
  const id = Number(route.params.id)
  if (!id || isNaN(id)) return
  try {
    const res = await getPageDetail(id)
    if (res.data) {
      pageStore.setCurrentPage(res.data)
    }
  } catch {
    ElMessage.error('加载页面失败')
  }
}

/** 返回 */
function handleBack() {
  pageStore.resetEditor()
  router.push({ name: 'PageBuilderList' })
}

/** 复制 DSL */
function handleCopyDSL() {
  const dsl = pageStore.serializeDSL()
  navigator.clipboard.writeText(dsl).then(() => {
    ElMessage.success('已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

onMounted(() => {
  loadPage()
})

onBeforeUnmount(() => {
  pageStore.resetEditor()
})
</script>

<style lang="scss" scoped>
.page-preview {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  background: #f0f2f5;

  .preview-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 16px;
    background: #fff;
    border-bottom: 1px solid #e6e6e6;
    flex-shrink: 0;
    height: 52px;

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 15px;
      font-weight: 500;
      color: #303133;
    }
  }

  .preview-body {
    flex: 1;
    overflow-y: auto;
  }

  .preview-phone-mode {
    display: flex;
    justify-content: center;
    padding: 20px;
  }

  .preview-dsl-mode {
    padding: 20px;

    .dsl-container {
      max-width: 800px;
      margin: 0 auto;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
      overflow: hidden;

      .dsl-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid #e6e6e6;
        font-weight: 500;
      }

      .dsl-content {
        padding: 16px;
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 13px;
        line-height: 1.6;
        overflow-x: auto;
        white-space: pre-wrap;
        word-break: break-all;
        color: #303133;
        margin: 0;
      }
    }
  }
}
</style>
