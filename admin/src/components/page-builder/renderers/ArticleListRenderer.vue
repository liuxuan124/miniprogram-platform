<template>
  <div class="render-article-list split-text-typography" :class="{ 'render-article-list--preview': previewMode }">
    <div v-if="component.props.title" class="section-title">{{ component.props.title }}</div>
    <div v-if="showFailState" class="preview-data-empty preview-data-fail">
      {{ failMessage }}
    </div>
    <div v-else-if="showEmptyState" class="preview-data-empty">
      {{ previewMode ? '暂无文章数据，请确认内容已发布或稍后重试' : '当前筛选下没有已发布内容' }}
    </div>
    <div v-else-if="!previewMode && liveLoading" class="preview-data-empty">正在读取已发布内容…</div>
    <div
      v-else
      class="article-list-body"
      :class="`layout-${articleLayout}`"
    >
      <div
        v-for="(item, index) in visibleArticleItems"
        :key="`${item.title || 'article'}-${index}`"
        class="article-card"
        :class="`article-card--${articleLayout}`"
      >
        <div v-if="component.props.show_cover !== false" class="article-img">
          <img v-if="item.cover" :src="item.cover" alt="" class="article-cover" />
          <span v-else>📖</span>
        </div>
        <div class="article-info">
          <div class="article-title" :style="itemTitleStyle">{{ item.title || '文章标题' }}</div>
          <div v-if="component.props.show_date !== false" class="article-date" :style="itemMetaStyle">{{ item.meta || '品牌内容' }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ComponentInstance } from '@/types/page'
import { titleFontStyle } from '../composables/titleFontStyle'
import { useEditorLiveItems } from '../composables/useEditorLiveItems'

type ArticleItem = {
  id?: number | string
  title?: string
  meta?: string
  cover?: string
  link_url?: string
}

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const articleLayout = computed(() => {
  const raw = props.component.props?.layout || props.component.props?.style_type || 'list'
  return ['card', 'list', 'compact'].includes(raw) ? raw : 'list'
})

const itemTitleStyle = computed(() => titleFontStyle(props.component.props?.title_font_size, 13))
const itemMetaStyle = computed(() => titleFontStyle(props.component.props?.subtitle_font_size, 11))

defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()

const { items: liveItems, loading: liveLoading, empty: liveEmpty, failed: liveFailed } = useEditorLiveItems(
  () => props.component,
  () => !!props.previewMode,
)

const showFailState = computed(() => {
  if (props.previewMode) return !!props.component.props?._previewDataFailed
  return liveFailed.value
})

const failMessage = computed(() =>
  props.previewMode
    ? '文章数据加载失败，请确认内容已发布或稍后重试'
    : '文章数据请求失败，请检查网络或数据源配置',
)

const showEmptyState = computed(() => {
  if (showFailState.value) return false
  if (props.previewMode) {
    const items = props.component.props?.items
    return !Array.isArray(items) || items.length === 0
  }
  return !liveLoading.value && liveEmpty.value
})

const visibleArticleItems = computed<ArticleItem[]>(() => {
  const items = props.component.props?.items
  const limit = Math.max(Number(props.component.props?.limit || 6), 1)

  if (props.previewMode) {
    if (!Array.isArray(items) || items.length === 0) return []
    return items.slice(0, limit)
  }

  const source = liveItems.value.length ? liveItems.value : (Array.isArray(items) ? items : [])
  return source.slice(0, limit)
})
</script>

<style lang="scss" scoped>
.render-article-list {
  background: #fff;
  padding: 10px;

  &.render-article-list--preview {
    padding: 10px;
  }

  .section-title {
    font-size: 15px;
    font-weight: 600;
    color: #172033;
    margin-bottom: 8px;
  }

  .preview-data-empty {
    padding: 24px 12px;
    text-align: center;
    font-size: 12px;
    color: #909399;
    background: #f8faff;
    border-radius: var(--card-radius, 10px);
  }

  .preview-data-fail {
    color: #b45309;
    background: #fffbeb;
  }

  .article-list-body {
    &.layout-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    &.layout-card {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    &.layout-compact {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
  }

  .article-card {
    background: #f8faff;
    border-radius: var(--card-radius, 10px);

    &--list {
      display: flex;
      gap: 8px;
      padding: 8px;
    }

    &--card {
      display: flex;
      flex-direction: column;
      padding: 0;
      overflow: hidden;
      background: #fff;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
    }

    .article-img {
      width: 62px;
      height: 52px;
      border-radius: 4px;
      font-size: 22px;
      background: #eef2f7;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      overflow: hidden;

      .article-cover {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    &--card .article-img {
      width: 100%;
      height: 140px;
      border-radius: 0;
    }

    .article-info {
      flex: 1;
      min-width: 0;

      .article-title {
        font-size: 13px;
        color: #172033;
        font-weight: 500;
        line-height: 1.35;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .article-date {
        margin-top: 4px;
        color: #909399;
        font-size: 11px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
    }

    &--card .article-info {
      padding: 10px 12px;
    }

    &--compact {
      display: flex;
      gap: 8px;
      padding: 6px 0;
      background: transparent;

      .article-img {
        width: 40px;
        height: 40px;
        border-radius: 4px;
        font-size: 16px;
      }

      .article-title {
        -webkit-line-clamp: 1;
      }

      .article-date {
        margin-top: 2px;
      }
    }
  }
}
</style>
