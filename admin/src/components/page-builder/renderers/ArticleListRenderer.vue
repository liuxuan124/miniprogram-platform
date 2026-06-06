<template>
  <div class="render-article-list">
    <div v-if="component.props.title" class="section-title">{{ component.props.title }}</div>
    <div
      class="article-list-body"
      :class="`cols-${component.props.columns || 1}`"
    >
      <div
        v-for="(item, index) in visibleArticleItems"
        :key="`${item.title || 'article'}-${index}`"
        class="article-card"
      >
        <div v-if="component.props.show_cover !== false" class="article-img">
          <img v-if="item.cover" :src="item.cover" alt="" class="article-cover" />
          <span v-else>📖</span>
        </div>
        <div class="article-info">
          <div class="article-title">{{ item.title || '文章标题' }}</div>
          <div class="article-date">{{ item.meta || '品牌内容 · 1280阅读' }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ComponentInstance } from '@/types/page'

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

defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()

const visibleArticleItems = computed<ArticleItem[]>(() => {
  const items = props.component.props?.items
  const fallbackItems: ArticleItem[] = [
    { title: '品牌故事：从内容到交易闭环', meta: '品牌内容 · 1280阅读', cover: '' },
    { title: '选品指南：活动与商品联动', meta: '品牌内容 · 1280阅读', cover: '' },
  ]
  const normalized = Array.isArray(items) && items.length > 0 ? items : fallbackItems
  const limit = Math.max(Number(props.component.props?.limit || normalized.length), 1)
  return normalized.slice(0, limit)
})
</script>

<style lang="scss" scoped>
.render-article-list {
  background: #fff;
  padding: 10px;

  .section-title {
    font-size: 15px;
    font-weight: 600;
    color: #172033;
    margin-bottom: 8px;
  }

  .article-list-body {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;

    &.cols-2 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  .article-card {
    display: flex;
    gap: 8px;
    padding: 8px;
    background: #f8faff;
    border-radius: 10px;

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

    .article-info {
      flex: 1;
      min-width: 0;

      .article-title {
        font-size: 13px;
        color: #172033;
        font-weight: 500;
        line-height: 1.35;
      }

      .article-date {
        margin-top: 4px;
        color: #909399;
        font-size: 11px;
      }
    }
  }
}
</style>
