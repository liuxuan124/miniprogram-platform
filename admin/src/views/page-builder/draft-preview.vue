<template>
  <div class="draft-preview-page">
    <header class="draft-toolbar">
      <strong>手机草稿预览</strong>
      <el-tag size="small" type="warning">临时 · 关电脑预览后失效</el-tag>
    </header>

    <div v-loading="loading" class="draft-body">
      <el-alert
        v-if="errorMsg"
        class="draft-notice"
        type="error"
        :closable="false"
        show-icon
        :title="errorMsg"
      />
      <el-alert
        v-if="dataWarnings"
        class="draft-notice"
        type="warning"
        :closable="false"
        show-icon
        :title="dataWarnings"
      />

      <PreviewPhone
        v-if="!errorMsg"
        :page-title="pageTitle"
        :page-bg-color="pageBgColor"
      >
        <ComponentItem
          v-for="(comp, index) in components"
          :key="comp.id"
          :component="comp"
          :index="index"
          :selected="false"
          :preview-mode="true"
        />
        <div v-if="!loading && components.length === 0" class="draft-empty">
          暂无可预览内容
        </div>
      </PreviewPhone>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import PreviewPhone from '@/components/page-builder/PreviewPhone.vue'
import ComponentItem from '@/components/page-builder/ComponentItem.vue'
import { getPreviewDraft } from '@/api/preview-draft'
import type { ComponentInstance, PageDSL } from '@/types/page'
import { hydratePreviewDsl } from '@/utils/preview-datasource'

const route = useRoute()
const loading = ref(true)
const errorMsg = ref('')
const dataWarnings = ref('')
const components = ref<ComponentInstance[]>([])
const pageTitle = ref('草稿预览')
const pageBgColor = ref('#f5f5f5')

onMounted(async () => {
  const token = String(route.query.token || '').trim()
  if (!token) {
    errorMsg.value = '缺少预览凭证，请回电脑端重新生成二维码'
    loading.value = false
    return
  }
  try {
    const res = await getPreviewDraft(token)
    const payload = ((res as any)?.data || res) as { dsl?: PageDSL; pageTitle?: string }
    if (!payload?.dsl) {
      throw new Error('预览已关闭或过期，请回电脑端重新生成')
    }
    const { dsl: hydrated, warnings } = await hydratePreviewDsl(payload.dsl)
    pageTitle.value = payload.pageTitle || hydrated.page?.name || '草稿预览'
    pageBgColor.value = hydrated.page?.background_color || '#f5f5f5'
    components.value = Array.isArray(hydrated.components) ? hydrated.components : []
    dataWarnings.value = warnings.length ? warnings.join('；') : ''
  } catch (e: any) {
    errorMsg.value = e?.message || e?.msg || '预览已关闭或过期，请回电脑端重新生成'
    components.value = []
  } finally {
    loading.value = false
  }
})
</script>

<style scoped lang="scss">
.draft-preview-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #eef3fb 0%, #f7f9fc 100%);
}

.draft-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
}

.draft-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 12px 40px;
}

.draft-notice {
  width: min(100%, 420px);
  margin-bottom: 16px;
}

.draft-empty {
  padding: 48px 16px;
  text-align: center;
  color: #94a3b8;
}
</style>
