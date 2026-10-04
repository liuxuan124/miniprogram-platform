<template>
  <article class="art-read" :class="{ 'is-dense': dense }">
    <div v-if="coverUrl" class="art-read__cover">
      <img :src="coverUrl" alt="" />
    </div>

    <div class="art-read__inner">
      <div class="art-read__chips">
        <span class="art-read__fmt">长文</span>
        <span v-if="categoryLabel" class="art-read__topic">{{ categoryLabel }}</span>
      </div>

      <h1 class="art-read__title">{{ title }}</h1>
      <p v-if="lede" class="art-read__lede">{{ lede }}</p>

      <div class="art-read__meta">
        <span class="art-read__av">
          <img v-if="authorAvatarUrl" :src="authorAvatarUrl" alt="" />
          <span v-else>{{ authorInitial }}</span>
        </span>
        <span class="art-read__meta-txt">{{ metaLine }}</span>
      </div>

      <div class="art-read__rule" />

      <div v-if="hasBody" class="art-read__body" v-html="bodyHtml" />
      <div v-else class="art-read__empty">暂无正文</div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  formatPreviewDateLabel,
  getPlainTextFromHtml,
  normalizePreviewMediaUrl,
  type ContentPreviewModel,
} from '@/utils/content-preview'
import {
  estimateReadMinutes,
  extractArticleSummary,
  formatReadTimeLabel,
  prepareArticleContentHtml,
} from '@/utils/article-content'

const props = withDefaults(
  defineProps<{
    model: ContentPreviewModel
    /** 窄容器（右侧栏）模式：压缩标题/正文/封面尺寸 */
    dense?: boolean
  }>(),
  { dense: false },
)

const title = computed(() => props.model.title?.trim() || '未命名')
const coverUrl = computed(() => normalizePreviewMediaUrl(props.model.coverImage))
const categoryLabel = computed(() => props.model.categoryLabel?.replace(/^└\s*/, '') || '')
const authorName = computed(() => props.model.author?.trim() || '作者')
const authorInitial = computed(() => authorName.value.slice(0, 1))
const authorAvatarUrl = computed(() => normalizePreviewMediaUrl(props.model.authorAvatar))
const dateLabel = computed(() => formatPreviewDateLabel())

const bodyHtml = computed(() =>
  prepareArticleContentHtml(props.model.contentHtml || '', props.model.coverImage, props.model.title),
)
const hasBody = computed(() => getPlainTextFromHtml(bodyHtml.value).length > 0)
const lede = computed(() => extractArticleSummary(bodyHtml.value, 120))
const readTimeLabel = computed(() =>
  formatReadTimeLabel(estimateReadMinutes(bodyHtml.value)),
)
const metaLine = computed(() =>
  [authorName.value, dateLabel.value, readTimeLabel.value].filter(Boolean).join(' · '),
)
</script>

<style lang="scss" scoped>
.art-read {
  width: 100%;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #eef1f5;
}

.art-read__cover {
  width: 100%;
  max-height: 320px;
  overflow: hidden;
  background: #f0f2f6;

  img {
    width: 100%;
    height: 320px;
    object-fit: cover;
    display: block;
  }
}

.art-read__inner {
  padding: 28px 32px 40px;
  max-width: 720px;
  margin: 0 auto;
}

.art-read__chips {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.art-read__fmt {
  font-size: 12px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 999px;
  background: #e7f5ea;
  color: #2f9350;
}

.art-read__topic {
  font-size: 12px;
  color: #727a8c;
  background: #f5f6f9;
  padding: 3px 10px;
  border-radius: 999px;
}

.art-read__title {
  margin: 0 0 14px;
  font-size: 30px;
  line-height: 1.38;
  font-weight: 800;
  color: #0f1219;
  letter-spacing: -0.02em;
}

.art-read__lede {
  margin: 0 0 18px;
  font-size: 15px;
  line-height: 1.75;
  color: #727a8c;
}

.art-read__meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.art-read__av {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(140deg, #5c7cff, #2f5bff);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.art-read__meta-txt {
  font-size: 13px;
  color: #8a94a6;
}

.art-read__rule {
  height: 1px;
  background: #eef1f5;
  margin: 20px 0 24px;
}

.art-read__body {
  font-size: 16px;
  line-height: 1.9;
  color: #3d4554;
  word-break: break-word;

  :deep(section) {
    background: transparent !important;
    padding: 0 !important;
    margin: 0 !important;
    border: none !important;
    box-sizing: border-box;
  }

  :deep(h1) {
    display: none !important;
  }

  :deep(h2),
  :deep(h3),
  :deep(h4) {
    margin: 32px 0 14px;
    font-size: 20px;
    line-height: 1.5;
    font-weight: 700;
    color: #0f1219;
    padding-left: 14px;
    border-left: 4px solid #c8973a;
    background: transparent !important;
  }

  :deep(h2:first-child),
  :deep(h3:first-child) {
    margin-top: 0;
  }

  :deep(p) {
    margin: 0 0 18px;
    font-size: 16px;
    line-height: 1.9;
    color: #3d4554 !important;
    background: transparent !important;
  }

  :deep(span) {
    color: inherit !important;
    background: transparent !important;
  }

  :deep(strong) {
    color: #0f1219;
    font-weight: 700;
  }

  :deep(blockquote) {
    margin: 20px 0;
    padding: 14px 18px;
    border-left: 4px solid #2f9350;
    background: #f7faf8;
    color: #4a5568;
    border-radius: 0 10px 10px 0;
  }

  :deep(ul),
  :deep(ol) {
    margin: 0 0 20px 1.3em;
    padding: 0;
  }

  :deep(li) {
    margin-bottom: 8px;
    line-height: 1.85;
  }

  :deep(img) {
    max-width: 100%;
    height: auto;
    border-radius: 12px;
    margin: 16px 0 24px;
    display: block;
  }
}

.art-read__empty {
  padding: 40px 0;
  text-align: center;
  color: #a5abb9;
  font-size: 14px;
}

.art-read.is-dense {
  .art-read__cover img {
    height: 200px;
  }

  .art-read__inner {
    padding: 20px 18px 28px;
  }

  .art-read__title {
    font-size: 22px;
    line-height: 1.45;
  }

  .art-read__body {
    font-size: 15px;
    line-height: 1.85;

    :deep(p) {
      font-size: 15px;
      line-height: 1.85;
      margin-bottom: 14px;
    }

    :deep(h2),
    :deep(h3),
    :deep(h4) {
      font-size: 17px;
      margin: 24px 0 12px;
      padding-left: 12px;
      border-left-width: 3px;
    }
  }
}
</style>
