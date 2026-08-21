<template>
  <div class="render-moments-feed" :class="{ 'render-moments-feed--preview': previewMode }">
    <div v-if="showFailState" class="preview-data-empty preview-data-fail">{{ failMessage }}</div>
    <div v-else-if="showEmpty" class="preview-data-empty">暂无已发布动态</div>
    <div v-else class="moments-list" :style="{ gap: `${itemGap}px` }">
      <div v-for="(item, index) in momentItems" :key="`${item.id}-${index}`" class="moment-card">
        <div v-if="showAuthor" class="moment-head">
          <span class="moment-av">{{ item.authorInitial }}</span>
          <div class="moment-meta">
            <div class="moment-name">{{ item.author }}</div>
            <div v-if="showPublishTime" class="moment-time">{{ item.timeText }}</div>
          </div>
        </div>
        <div class="moment-text">{{ item.summary }}</div>
        <div v-if="item.images.length" class="moment-images" :class="`grid-${Math.min(item.images.length, 3)}`">
          <img v-for="(url, idx) in item.images.slice(0, 3)" :key="idx" :src="url" alt="" />
        </div>
        <div v-if="item.attachmentCount > 0" class="moment-files">📎 {{ item.attachmentCount }} 个资料文件</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ComponentType, type ComponentInstance } from '@/types/page'
import { useEditorLiveItems } from '../composables/useEditorLiveItems'
import { resolveMediaUrl } from '@/utils/media-url'

const props = defineProps<{ component: ComponentInstance; previewMode?: boolean }>()

const config = computed(() => props.component.props || {})
const itemGap = computed(() => Number(config.value.item_gap ?? 12))
const showAuthor = computed(() => config.value.show_author !== false)
const showPublishTime = computed(() => config.value.show_publish_time !== false)

const { items: liveItems, loading: liveLoading, error: liveError } = useEditorLiveItems(
  () => props.component,
  () => props.previewMode === true,
)

const momentItems = computed(() => {
  const source = props.previewMode ? liveItems.value : (props.component.runtimeData?.items || liveItems.value || [])
  return (Array.isArray(source) ? source : []).map((raw: Record<string, any>, index: number) => {
    const author = String(raw.author || '博主').trim() || '博主'
    const images = (Array.isArray(raw.images) ? raw.images : []).map((u: string) => resolveMediaUrl(String(u))).filter(Boolean)
    const cover = resolveMediaUrl(String(raw.coverImage || raw.cover_image || images[0] || ''))
    if (cover && !images.length) images.push(cover)
    const body = String(raw.summary || raw.content || raw.title || '').replace(/<[^>]+>/g, '').slice(0, 120)
    return {
      id: raw.id || index,
      author,
      authorInitial: author.slice(0, 1),
      summary: body || raw.title || '动态内容',
      images,
      attachmentCount: Number(raw.attachmentCount ?? raw.attachment_count ?? (Array.isArray(raw.attachments) ? raw.attachments.length : 0)),
      timeText: String(raw.publishedAt || raw.updateTime || '刚刚').slice(0, 10),
    }
  })
})

const showFailState = computed(() => Boolean(liveError.value))
const failMessage = computed(() => String(liveError.value || '加载失败'))
const showEmpty = computed(() => !liveLoading.value && momentItems.value.length === 0)
</script>

<style scoped lang="scss">
.moments-list { display: flex; flex-direction: column; }
.moment-card { background: #fff; border: 1px solid #e8edf5; border-radius: 12px; padding: 12px; }
.moment-head { display: flex; gap: 10px; align-items: center; margin-bottom: 8px; }
.moment-av { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(140deg, #5c7cff, #2f5bff); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; }
.moment-name { font-size: 13px; font-weight: 700; color: #1f2d3d; }
.moment-time { font-size: 11px; color: #94a3b8; margin-top: 2px; }
.moment-text { font-size: 13px; line-height: 1.6; color: #334155; margin-bottom: 8px; white-space: pre-wrap; }
.moment-images { display: grid; gap: 4px; margin-bottom: 8px; }
.moment-images.grid-1 { grid-template-columns: 1fr; }
.moment-images.grid-2, .moment-images.grid-3 { grid-template-columns: repeat(3, 1fr); }
.moment-images img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 6px; background: #eef2f7; }
.moment-files { font-size: 12px; color: #64748b; background: #f8fafc; border-radius: 8px; padding: 6px 8px; }
.preview-data-empty { padding: 24px 12px; text-align: center; color: #94a3b8; font-size: 12px; }
.preview-data-fail { color: #ef4444; }
</style>
