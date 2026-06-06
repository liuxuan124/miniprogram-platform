<template>
  <el-dialog
    v-model="visibleProxy"
    :title="record?.name || '预览'"
    width="min(90vw, 900px)"
    :close-on-click-modal="true"
    destroy-on-close
    @closed="handleClosed"
  >
    <div v-if="record" class="preview-body">
      <!-- 图片预览 -->
      <div v-if="record.type === MaterialType.Image" class="preview-media">
        <img :src="resolveUrl(record.url)" :alt="record.name" class="preview-image" />
      </div>

      <!-- 视频预览 -->
      <div v-else-if="record.type === MaterialType.Video" class="preview-media">
        <video :src="resolveUrl(record.url)" controls class="preview-video">
          您的浏览器不支持视频播放
        </video>
      </div>

      <!-- 音频预览 -->
      <div v-else-if="record.type === MaterialType.Audio" class="preview-media preview-audio-wrapper">
        <div class="audio-visual">
          <el-icon :size="64" color="#f59e0b"><Headset /></el-icon>
          <span class="audio-name">{{ record.name }}</span>
          <span class="audio-format">{{ record.format || 'mp3' }}</span>
        </div>
        <audio :src="resolveUrl(record.url)" controls class="preview-audio">
          您的浏览器不支持音频播放
        </audio>
      </div>

      <!-- 图文素材预览 -->
      <div v-else-if="record.type === MaterialType.RichText" class="preview-richtext">
        <div v-if="record.richTextContent?.coverUrl" class="richtext-cover">
          <img :src="resolveUrl(record.richTextContent.coverUrl)" alt="封面" />
        </div>
        <div class="richtext-header">
          <h2 class="richtext-title">{{ record.name }}</h2>
          <div v-if="record.richTextContent?.author" class="richtext-author">
            作者：{{ record.richTextContent.author }}
          </div>
        </div>
        <div v-if="record.richTextContent?.summary" class="richtext-summary">
          {{ record.richTextContent.summary }}
        </div>
        <div
          v-if="record.richTextContent?.html"
          class="richtext-body"
          v-html="record.richTextContent.html"
        ></div>
        <div v-else-if="record.richTextContent?.text" class="richtext-body richtext-plain">
          {{ record.richTextContent.text }}
        </div>
      </div>

      <!-- 素材信息面板 -->
      <div class="preview-info">
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">类型</span>
            <span class="info-value">
              <el-tag :type="tagType" size="small">{{ typeLabel }}</el-tag>
            </span>
          </div>
          <div v-if="record.size" class="info-item">
            <span class="info-label">大小</span>
            <span class="info-value">{{ formatSize(record.size) }}</span>
          </div>
          <div v-if="record.duration" class="info-item">
            <span class="info-label">时长</span>
            <span class="info-value">{{ formatDuration(record.duration) }}</span>
          </div>
          <div v-if="record.format" class="info-item">
            <span class="info-label">格式</span>
            <span class="info-value">{{ record.format }}</span>
          </div>
          <div v-if="record.width && record.height" class="info-item">
            <span class="info-label">尺寸</span>
            <span class="info-value">{{ record.width }} × {{ record.height }}px</span>
          </div>
          <div v-if="record.groupName" class="info-item">
            <span class="info-label">分组</span>
            <span class="info-value">{{ record.groupName }}</span>
          </div>
          <div v-if="record.createdAt" class="info-item">
            <span class="info-label">上传时间</span>
            <span class="info-value">{{ formatDate(record.createdAt) }}</span>
          </div>
          <div v-if="record.syncStatus !== undefined" class="info-item">
            <span class="info-label">微信同步</span>
            <span class="info-value">
              <el-tag :type="syncTagType" size="small">{{ syncLabel }}</el-tag>
            </span>
          </div>
        </div>
        <div class="info-url">
          <span class="info-label">素材链接</span>
          <div class="url-row">
            <el-input :model-value="fullUrl" readonly size="small" />
            <el-button size="small" :icon="CopyDocument" @click="copyUrl">复制</el-button>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="visibleProxy = false">关闭</el-button>
      <el-button v-if="record" type="primary" :icon="CopyDocument" @click="copyUrl">复制链接</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Headset, CopyDocument } from '@element-plus/icons-vue'
import {
  MaterialType,
  MaterialTypeLabels,
  SyncStatus,
  SyncStatusLabels,
  type MaterialRecord,
} from '@/types/asset'

const props = defineProps<{
  visible: boolean
  record: MaterialRecord | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  closed: []
}>()

const visibleProxy = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
})

const typeLabel = computed(() => props.record ? MaterialTypeLabels[props.record.type] : '')
const syncLabel = computed(() => props.record ? SyncStatusLabels[props.record.syncStatus ?? SyncStatus.NotSynced] : '')
const syncTagType = computed(() => {
  const s = props.record?.syncStatus
  if (s === SyncStatus.Synced) return 'success'
  if (s === SyncStatus.Failed) return 'danger'
  if (s === SyncStatus.Syncing) return 'warning'
  return 'info'
})
const tagType = computed(() => {
  const type = props.record?.type
  if (type === MaterialType.Image) return 'primary'
  if (type === MaterialType.Video) return ''
  if (type === MaterialType.Audio) return 'warning'
  if (type === MaterialType.RichText) return 'success'
  return 'info'
})
const fullUrl = computed(() => props.record ? resolveUrl(props.record.url) : '')

function resolveUrl(url: string) {
  if (!url) return ''
  if (/^(https?:\/\/|data:)/i.test(url)) return url
  if (url.startsWith('/')) return `${window.location.origin}${url}`
  return `${window.location.origin}/${url}`
}

function formatSize(bytes?: number) {
  if (!bytes) return '未知'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDuration(seconds?: number) {
  if (!seconds) return ''
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

async function copyUrl() {
  try {
    await navigator.clipboard.writeText(fullUrl.value)
    ElMessage.success('链接已复制')
  } catch {
    ElMessage.warning('复制失败，请手动复制')
  }
}

function handleClosed() {
  emit('closed')
}
</script>

<style lang="scss" scoped>
.preview-body {
  display: grid;
  gap: 16px;
}

.preview-media {
  border-radius: 8px;
  overflow: hidden;
  background: #f6f8fb;
}

.preview-image {
  width: 100%;
  max-height: 60vh;
  object-fit: contain;
  display: block;
}

.preview-video {
  width: 100%;
  max-height: 60vh;
  display: block;
  background: #000;
}

.preview-audio-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 40px 20px;
}

.audio-visual {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.audio-name {
  font-size: 16px;
  font-weight: 600;
  color: #222;
}

.audio-format {
  font-size: 12px;
  color: #999;
  text-transform: uppercase;
}

.preview-audio {
  width: 100%;
  max-width: 500px;
}

.preview-richtext {
  border: 1px solid #edf0f5;
  border-radius: 8px;
  overflow: hidden;
}

.richtext-cover {
  img {
    width: 100%;
    max-height: 300px;
    object-fit: cover;
    display: block;
  }
}

.richtext-header {
  padding: 20px 24px 0;
}

.richtext-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #111;
  line-height: 1.4;
}

.richtext-author {
  margin-top: 8px;
  font-size: 13px;
  color: #999;
}

.richtext-summary {
  padding: 12px 24px;
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  background: #f8f9fb;
  margin: 16px 0;
  border-left: 3px solid #10b981;
}

.richtext-body {
  padding: 0 24px 24px;
  font-size: 14px;
  line-height: 1.8;
  color: #333;

  :deep(img) {
    max-width: 100%;
    border-radius: 6px;
  }

  :deep(p) {
    margin: 0 0 12px;
  }
}

.richtext-plain {
  white-space: pre-wrap;
}

.preview-info {
  background: #f8f9fb;
  border-radius: 8px;
  padding: 16px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-label {
  font-size: 11px;
  color: #999;
}

.info-value {
  font-size: 13px;
  color: #333;
  font-weight: 500;
}

.info-url {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;

  .info-label {
    font-size: 11px;
    color: #999;
  }
}

.url-row {
  display: flex;
  gap: 8px;
}
</style>
