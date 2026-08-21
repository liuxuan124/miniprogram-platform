<template>
  <div class="content-preview-panel">
    <div class="phone-frame">
      <div class="phone-notch" />
      <div class="phone-screen">
        <div class="pv-cover" :style="coverStyle">
          <img v-if="coverUrl" :src="coverUrl" alt="" class="pv-cover-img" />
          <span v-else class="pv-cover-glyph">{{ contentType === 'note' ? '笔' : '文' }}</span>
        </div>
        <div class="pv-body">
          <div class="pv-chips">
            <span class="pv-fmt">{{ contentType === 'note' ? '笔记' : '长文' }}</span>
            <span v-if="categoryLabel" class="pv-topic">{{ categoryLabel }}</span>
          </div>
          <h1 class="pv-title">{{ titleText }}</h1>
          <div v-if="contentType === 'note' && galleryImages.length" class="pv-note-gallery">
            <img v-for="(url, idx) in galleryImages.slice(0, 3)" :key="`${url}-${idx}`" :src="url" alt="" />
          </div>
          <div class="pv-meta">
            <div class="pv-av">
              <img v-if="authorAvatarUrl" :src="authorAvatarUrl" alt="" class="pv-av-img" />
              <span v-else>{{ authorInitial }}</span>
            </div>
            <div class="pv-meta-txt">
              <div class="pv-nm">{{ authorName }}</div>
              <div class="pv-dt">{{ dateLabel }} · 预计阅读</div>
            </div>
            <span class="pv-follow">+ 关注</span>
          </div>
          <div v-if="contentType === 'note' && noteBodyText" class="pv-content pv-content--plain">{{ noteBodyText }}</div>
          <div v-else-if="hasArticleBody" class="pv-content" v-html="contentHtml" />
          <div v-else class="pv-empty">暂无正文</div>
        </div>
      </div>
    </div>
    <p v-if="showHint" class="preview-hint">模拟小程序详情页，样式供参考，实际以端上为准。</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  formatPreviewDateLabel,
  getPlainTextFromHtml,
  normalizePreviewMediaUrl,
  type ContentPreviewModel,
} from '@/utils/content-preview'

const props = withDefaults(
  defineProps<{
    model: ContentPreviewModel
    showHint?: boolean
  }>(),
  {
    showHint: true,
  },
)

const contentType = computed(() => props.model.contentType || 'article')
const titleText = computed(() => props.model.title?.trim() || '未填写标题')
const categoryLabel = computed(() => props.model.categoryLabel?.replace(/^└\s*/, '') || '')
const authorName = computed(() => props.model.author?.trim() || '作者')
const authorInitial = computed(() => authorName.value.slice(0, 1))
const dateLabel = computed(() => formatPreviewDateLabel())
const contentHtml = computed(() => props.model.contentHtml || '')
const noteBodyText = computed(() => props.model.noteBody?.trim() || '')
const hasArticleBody = computed(() => getPlainTextFromHtml(contentHtml.value).length > 0)

const coverUrl = computed(() => {
  const fromCover = normalizePreviewMediaUrl(props.model.coverImage)
  if (fromCover) return fromCover
  const firstImage = props.model.images?.[0]
  return firstImage ? normalizePreviewMediaUrl(firstImage) : ''
})

const galleryImages = computed(() =>
  (props.model.images || [])
    .map((url) => normalizePreviewMediaUrl(url))
    .filter(Boolean),
)

const authorAvatarUrl = computed(() => normalizePreviewMediaUrl(props.model.authorAvatar))

const coverStyle = computed(() => {
  if (coverUrl.value) return {}
  return { background: 'linear-gradient(140deg, #5c7cff, #2f5bff)' }
})
</script>

<style lang="scss" scoped>
.content-preview-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.phone-frame {
  width: 100%;
  max-width: 340px;
  border-radius: 28px;
  border: 3px solid #1a1f2e;
  background: #0f1219;
  padding: 10px 8px 14px;
  box-shadow: 0 16px 40px rgba(23, 32, 51, 0.18);
}

.phone-notch {
  width: 96px;
  height: 8px;
  margin: 0 auto 8px;
  border-radius: 999px;
  background: #2a3144;
}

.phone-screen {
  height: 620px;
  overflow: auto;
  border-radius: 18px;
  background: #f5f6f9;
}

.pv-cover {
  height: 168px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.pv-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pv-cover-glyph {
  font-size: 42px;
  color: rgba(255, 255, 255, 0.92);
  font-weight: 700;
}

.pv-body {
  margin-top: -18px;
  position: relative;
  z-index: 1;
  background: #fff;
  border-radius: 20px 20px 0 0;
  padding: 18px 16px 28px;
  min-height: calc(100% - 150px);
}

.pv-chips {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.pv-fmt {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: #e7f5ea;
  color: #2f9350;
}

.pv-topic {
  font-size: 11px;
  color: #727a8c;
  background: #f5f6f9;
  padding: 2px 8px;
  border-radius: 999px;
}

.pv-title {
  margin: 0 0 14px;
  font-size: 20px;
  line-height: 1.4;
  font-weight: 700;
  color: #0f1219;
  letter-spacing: -0.02em;
}

.pv-note-gallery {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
  overflow-x: auto;
}

.pv-note-gallery img {
  width: 88px;
  height: 88px;
  object-fit: cover;
  border-radius: 8px;
}

.pv-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 14px;
  margin-bottom: 14px;
  border-bottom: 1px solid #edeff4;
}

.pv-av {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(140deg, #5c7cff, #2f5bff);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.pv-av-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pv-meta-txt {
  flex: 1;
  min-width: 0;
}

.pv-nm {
  font-size: 13px;
  font-weight: 600;
  color: #0f1219;
}

.pv-dt {
  margin-top: 2px;
  font-size: 11px;
  color: #a5abb9;
}

.pv-follow {
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  background: #2f5bff;
  padding: 6px 12px;
  border-radius: 999px;
}

.pv-content {
  font-size: 14px;
  line-height: 1.9;
  color: #39404f;
  word-break: break-word;

  :deep(img) {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
  }

  :deep(p) {
    margin: 0 0 12px;
  }

  :deep(h1),
  :deep(h2),
  :deep(h3) {
    margin: 12px 0 8px;
    line-height: 1.35;
    color: #0f1219;
  }

  :deep(ul),
  :deep(ol) {
    padding-left: 1.6em;
    margin: 0 0 12px;
    list-style-position: outside;
  }

  :deep(ul) {
    list-style-type: disc;
  }

  :deep(ol) {
    list-style-type: decimal;
  }

  :deep(li) {
    display: list-item;
    margin: 0.15em 0;
  }

  :deep(a) {
    color: #2f5bff;
  }
}

.pv-content--plain {
  white-space: pre-wrap;
}

.pv-empty {
  padding: 28px 8px;
  text-align: center;
  color: #a5abb9;
  font-size: 13px;
}

.preview-hint {
  margin: 0;
  font-size: 12px;
  color: #8a94a6;
  text-align: center;
}
</style>
