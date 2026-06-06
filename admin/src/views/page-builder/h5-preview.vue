<template>
  <div class="h5-preview-page">
    <header class="h5-toolbar">
      <div class="h5-toolbar__info">
        <strong>H5 预览</strong>
        <span v-if="semver">v{{ semver }}</span>
        <el-tag v-if="previewSource === 'snapshot'" size="small" type="success">
          {{ previewMode === 'template' ? '模板快照' : '版本快照' }}
        </el-tag>
        <el-tag v-else size="small" type="info">当前线上</el-tag>
      </div>
      <div class="h5-toolbar__actions">
        <el-button size="small" @click="copyPreviewLink">复制链接</el-button>
        <el-button size="small" type="primary" plain @click="handleClose">关闭</el-button>
      </div>
    </header>

    <div v-loading="loading" class="h5-body">
      <el-alert
        v-if="fallbackNotice"
        class="h5-notice"
        type="warning"
        :closable="false"
        show-icon
        :title="fallbackNotice"
      />

      <PreviewPhone
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
        <div v-if="!loading && components.length === 0" class="h5-empty">
          暂无可预览内容
        </div>
      </PreviewPhone>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getReleaseDetail } from '@/api/version'
import { isAuthenticated } from '@/utils/auth'
import PreviewPhone from '@/components/page-builder/PreviewPhone.vue'
import ComponentItem from '@/components/page-builder/ComponentItem.vue'
import type { PageComponent, PageDSL } from '@/types/page'

const route = useRoute()

const loading = ref(true)
const components = ref<PageComponent[]>([])
const pageTitle = ref('首页')
const pageBgColor = ref('#f5f5f5')
const semver = ref('')
const previewSource = ref<'snapshot' | 'live'>('live')
const fallbackNotice = ref('')

const pagePath = computed(() => String(route.query.path || 'pages/index/index'))
const previewMode = computed(() => String(route.query.mode || 'release'))
const releaseId = computed(() => {
  const value = Number(route.query.releaseId)
  return Number.isFinite(value) && value > 0 ? value : 0
})

function applyDsl(dsl: PageDSL) {
  pageTitle.value = dsl.page?.name || '首页'
  pageBgColor.value = dsl.page?.background_color || '#f5f5f5'
  components.value = Array.isArray(dsl.components) ? dsl.components : []
}

function extractDslFromSnapshot(snapshotJson: string, path: string): PageDSL | null {
  if (!snapshotJson) return null
  const snapshot = JSON.parse(snapshotJson) as { pages?: Array<{ path?: string; dslContent?: string }> }
  const page = snapshot.pages?.find((item) => item.path === path)
  if (!page?.dslContent) return null
  return JSON.parse(page.dslContent) as PageDSL
}

async function loadLivePreview() {
  const response = await fetch(`/api/v1/mp/pages?path=${encodeURIComponent(pagePath.value)}`)
  const payload = await response.json()
  if (payload.code !== 200 || !payload.data) {
    throw new Error(payload.message || '加载线上页面失败')
  }
  applyDsl(payload.data as PageDSL)
  previewSource.value = 'live'
}

async function loadReleaseSnapshot() {
  const res = await getReleaseDetail(releaseId.value)
  const release = ((res as any).data || res) as { semver?: string; snapshot?: string }
  semver.value = release.semver || semver.value
  const dsl = release.snapshot ? extractDslFromSnapshot(release.snapshot, pagePath.value) : null
  if (!dsl) {
    throw new Error('版本快照中没有可预览页面')
  }
  applyDsl(dsl)
  previewSource.value = 'snapshot'
}

async function loadPreview() {
  loading.value = true
  fallbackNotice.value = ''
  semver.value = String(route.query.semver || '')

  try {
    if (releaseId.value && isAuthenticated()) {
      await loadReleaseSnapshot()
      return
    }

    if (previewMode.value === 'template' && releaseId.value && !isAuthenticated()) {
      fallbackNotice.value = '模板预览需登录后台后打开链接，才能加载该模板快照。'
      components.value = []
      return
    }

    await loadLivePreview()
    if (releaseId.value && !isAuthenticated() && previewMode.value !== 'template') {
      fallbackNotice.value = '未登录时展示当前线上页面；登录后打开同一链接可查看对应版本快照。'
    }
  } catch (error: any) {
    try {
      await loadLivePreview()
      fallbackNotice.value = error?.message
        ? `${error.message}，已回退展示当前线上页面。`
        : '版本快照加载失败，已回退展示当前线上页面。'
    } catch {
      components.value = []
      ElMessage.error(error?.message || '预览加载失败')
    }
  } finally {
    loading.value = false
  }
}

function copyPreviewLink() {
  navigator.clipboard.writeText(window.location.href)
    .then(() => ElMessage.success('H5 预览链接已复制'))
    .catch(() => ElMessage.error('复制失败，请手动复制地址栏链接'))
}

function handleClose() {
  window.close()
}

onMounted(() => {
  loadPreview()
})
</script>

<style scoped lang="scss">
.h5-preview-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #eef3fb 0%, #f7f9fc 100%);
}

.h5-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 20px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 2px 10px rgba(15, 31, 60, 0.06);
}

.h5-toolbar__info {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #1f2937;
}

.h5-toolbar__actions {
  display: flex;
  gap: 8px;
}

.h5-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 16px 40px;
}

.h5-notice {
  width: min(100%, 420px);
  margin-bottom: 16px;
}

.h5-empty {
  padding: 48px 16px;
  text-align: center;
  color: #94a3b8;
}
</style>
