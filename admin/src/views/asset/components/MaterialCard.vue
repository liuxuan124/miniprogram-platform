<template>
  <div
    class="material-card"
    :class="{
      'is-selected': selected,
      'is-image': record.type === MaterialType.Image,
      'is-video': record.type === MaterialType.Video,
      'is-audio': record.type === MaterialType.Audio,
      'is-richtext': record.type === MaterialType.RichText,
    }"
    @click="handleClick"
    @dblclick="$emit('preview', record)"
  >
    <div class="card-thumb">
      <img
        v-if="record.type === MaterialType.Image && (record.thumbUrl || record.url)"
        :src="resolveUrl(record.thumbUrl || record.url)"
        :alt="record.name"
        loading="lazy"
      />
      <div v-else-if="record.type === MaterialType.RichText && record.richTextContent?.coverUrl" class="richtext-cover">
        <img :src="resolveUrl(record.richTextContent.coverUrl)" :alt="record.name" loading="lazy" />
        <span class="richtext-badge">图文</span>
      </div>
      <div v-else class="type-placeholder" :style="{ background: bgColor }">
        <el-icon :size="32"><component :is="typeIcon" /></el-icon>
        <span class="placeholder-label">{{ typeLabel }}</span>
      </div>
      <div class="card-check">
        <div class="check-circle" :class="{ checked: selected }">
          <span v-if="selected">✓</span>
        </div>
      </div>
      <div v-if="record.syncStatus === SyncStatus.Synced" class="sync-badge" title="已同步到微信">
        <span>✓ 微信</span>
      </div>
    </div>
    <div class="card-meta">
      <div class="card-name" :title="record.name">{{ record.name || '未命名' }}</div>
      <div class="card-detail">
        <span>{{ typeLabel }}</span>
        <span v-if="record.duration" class="card-duration">{{ formatDuration(record.duration) }}</span>
        <span v-if="record.size">{{ formatSize(record.size) }}</span>
      </div>
      <div class="card-actions">
        <el-button text size="small" @click.stop="$emit('preview', record)">预览</el-button>
        <el-button text size="small" @click.stop="$emit('edit', record)">编辑</el-button>
        <el-dropdown trigger="click" @command="(cmd: string) => $emit('action', cmd, record)">
          <el-button text size="small" @click.stop>
            <el-icon><MoreFilled /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="rename">重命名</el-dropdown-item>
              <el-dropdown-item command="move">移动到</el-dropdown-item>
              <el-dropdown-item v-if="record.syncStatus !== SyncStatus.Synced" command="sync">同步到微信</el-dropdown-item>
              <el-dropdown-item command="copy-url">复制链接</el-dropdown-item>
              <el-dropdown-item command="delete" divided class="danger-item">删除</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MoreFilled } from '@element-plus/icons-vue'
import {
  MaterialType,
  MaterialTypeLabels,
  MaterialTypeColors,
  SyncStatus,
  type MaterialRecord,
} from '@/types/asset'

const props = defineProps<{
  record: MaterialRecord
  selected: boolean
}>()

const emit = defineEmits<{
  select: [record: MaterialRecord, event: MouseEvent]
  preview: [record: MaterialRecord]
  edit: [record: MaterialRecord]
  action: [command: string, record: MaterialRecord]
}>()

const typeLabel = computed(() => MaterialTypeLabels[props.record.type] || '素材')
const typeIcon = computed(() => {
  const icons: Record<string, string> = {
    [MaterialType.Image]: 'Picture',
    [MaterialType.Video]: 'VideoCamera',
    [MaterialType.Audio]: 'Headset',
    [MaterialType.RichText]: 'Document',
  }
  return icons[props.record.type] || 'FolderOpened'
})
const bgColor = computed(() => MaterialTypeColors[props.record.type] || '#666')

function resolveUrl(url: string) {
  if (!url) return ''
  if (/^(https?:\/\/|data:)/i.test(url)) return url
  if (url.startsWith('/')) return `${window.location.origin}${url}`
  return `${window.location.origin}/${url}`
}

function formatSize(bytes?: number) {
  if (!bytes) return ''
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

function handleClick(event: MouseEvent) {
  emit('select', props.record, event)
}
</script>

<style lang="scss" scoped>
.material-card {
  position: relative;
  border: 1px solid #edf0f5;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
  background: #fff;

  &:hover {
    border-color: #b3c9ff;
    box-shadow: 0 4px 16px rgba(36, 105, 240, 0.08);
    transform: translateY(-1px);
    .card-check { opacity: 1; }
    .card-actions { opacity: 1; }
  }

  &.is-selected {
    border-color: #2469f0;
    box-shadow: 0 0 0 1px #2469f0;
    .card-check { opacity: 1; }
    .check-circle { background: #2469f0; border-color: #2469f0; }
  }
}

.card-thumb {
  position: relative;
  aspect-ratio: 1;
  background: #f6f8fb;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
}

.type-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.9);
}

.placeholder-label {
  font-size: 13px;
  font-weight: 600;
}

.card-check {
  position: absolute;
  top: 8px;
  left: 8px;
  opacity: 0;
  transition: opacity 0.15s;
}

.check-circle {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  color: #fff;
  transition: all 0.15s;
}

.sync-badge {
  position: absolute;
  bottom: 6px;
  right: 6px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(16, 185, 129, 0.9);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
}

.richtext-cover {
  position: relative;
  width: 100%;
  height: 100%;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.richtext-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(16, 185, 129, 0.9);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
}

.card-meta {
  padding: 10px 12px;
}

.card-name {
  font-size: 12px;
  font-weight: 600;
  color: #222;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 4px;
}

.card-detail {
  font-size: 11px;
  color: #999;
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-duration {
  color: #666;
  font-weight: 500;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-top: 6px;
  opacity: 0;
  transition: opacity 0.15s;
}

.danger-item {
  color: #f56c6c !important;
}
</style>
