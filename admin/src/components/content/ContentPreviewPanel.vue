<template>
  <div class="content-preview-panel">
    <div class="phone-frame">
      <div class="phone-notch" />
      <div class="phone-screen" :class="{ 'phone-screen--note': contentType === 'note' }">
        <!-- 笔记：小红书图文详情 -->
        <template v-if="contentType === 'note'">
          <div class="pv-note-wrap">
            <div class="pv-note-scroll">
              <!-- 顶部作者栏（小红书详情页头部） -->
              <div class="pv-note-topbar">
                <div class="pv-av pv-av--sm">
                  <img v-if="authorAvatarUrl" :src="authorAvatarUrl" alt="" class="pv-av-img" />
                  <span v-else>{{ authorInitial }}</span>
                </div>
                <div class="pv-note-topbar__name">{{ authorName }}</div>
                <span class="pv-follow pv-follow--sm">关注</span>
                <span class="pv-note-topbar__share">⋯</span>
              </div>

              <!-- 图集：3:4 竖向视口 + 左右切换（对齐小程序笔记详情） -->
              <div class="pv-note-gallery">
                <div
                  class="pv-note-gallery__track"
                  :style="{ transform: `translateX(-${galleryIndex * 100}%)` }"
                >
                  <div
                    v-for="(url, idx) in galleryUrls"
                    :key="`${url}-${idx}`"
                    class="pv-note-gallery__slide"
                  >
                    <img :src="url" alt="" class="pv-note-slide" loading="lazy" />
                  </div>
                </div>
                <div v-if="!galleryUrls.length" class="pv-note-slide pv-note-slide--empty">
                  <span>📷</span>
                </div>
                <div v-if="galleryUrls.length > 1" class="pv-note-idx">
                  {{ galleryIndex + 1 }} / {{ galleryUrls.length }}
                </div>
                <div v-if="galleryUrls.length > 1" class="pv-note-dots">
                  <i
                    v-for="(_, idx) in galleryUrls"
                    :key="idx"
                    :class="{ on: idx === galleryIndex }"
                    @click="galleryIndex = idx"
                  />
                </div>
                <button
                  v-if="galleryUrls.length > 1"
                  type="button"
                  class="pv-note-nav pv-note-nav--prev"
                  aria-label="上一张"
                  @click="prevGallery"
                >‹</button>
                <button
                  v-if="galleryUrls.length > 1"
                  type="button"
                  class="pv-note-nav pv-note-nav--next"
                  aria-label="下一张"
                  @click="nextGallery"
                >›</button>
              </div>

              <div class="pv-note-body">
                <h1 class="pv-note-title">{{ titleText }}</h1>

                <div v-if="noteParagraphs.length" class="pv-note-paras">
                  <p v-for="(para, idx) in noteParagraphs" :key="idx">{{ para }}</p>
                </div>

                <div v-if="displayHashTags.length" class="pv-note-tags">
                  <span v-for="tag in displayHashTags" :key="tag">{{ tag }}</span>
                </div>

                <div class="pv-note-date">{{ dateLabel }} · 编辑于 {{ dateLabel }}</div>
              </div>

              <div class="pv-note-comments">
                <div class="pv-note-comments__head">共 {{ commentPreviewCount }} 条评论</div>
                <div v-for="item in commentPreview" :key="item.id" class="pv-note-comment">
                  <div class="pv-av pv-av--xs">{{ item.avatar }}</div>
                  <div class="pv-note-comment__main">
                    <div class="pv-note-comment__nick">{{ item.nick }}</div>
                    <div class="pv-note-comment__text">{{ item.text }}</div>
                  </div>
                  <div class="pv-note-comment__like">♡ {{ item.likes }}</div>
                </div>
              </div>
            </div>

            <!-- 底部栏：说点什么 + 赞/收藏/评论 -->
            <div class="pv-note-bottom">
              <div class="pv-note-bottom__input">说点什么...</div>
              <div class="pv-note-bottom__acts">
                <span class="pv-note-bottom__act">♡ {{ likeLabel }}</span>
                <span class="pv-note-bottom__act">☆</span>
                <span class="pv-note-bottom__act">💬 {{ commentPreviewCount }}</span>
              </div>
            </div>
          </div>
        </template>

        <!-- 长文 / 动态 -->
        <template v-else>
          <div class="pv-cover" :style="coverStyle">
            <img v-if="coverUrl" :src="coverUrl" alt="" class="pv-cover-img" />
            <span v-else class="pv-cover-glyph">{{ contentType === 'moment' ? '动' : '文' }}</span>
          </div>
          <div class="pv-body">
            <div class="pv-chips">
              <span class="pv-fmt">{{ contentType === 'moment' ? '动态' : '长文' }}</span>
              <span v-if="categoryLabel" class="pv-topic">{{ categoryLabel }}</span>
            </div>
            <h1 class="pv-title">{{ titleText }}</h1>
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
            <div v-if="contentType === 'moment' && noteBodyText" class="pv-content pv-content--plain">{{ noteBodyText }}</div>
            <div v-else-if="hasArticleBody" class="pv-content" v-html="contentHtml" />
            <div v-if="contentType === 'moment' && attachmentItems.length" class="pv-attachments">
              <div v-for="item in attachmentItems" :key="item.id || item.name" class="pv-attachment">
                <span>{{ item.icon }}</span>
                <span class="pv-attachment__name">{{ item.name }}</span>
              </div>
            </div>
            <div v-if="!(noteBodyText || hasArticleBody || attachmentItems.length)" class="pv-empty">暂无正文</div>
          </div>
        </template>
      </div>
    </div>
    <p v-if="showHint" class="preview-hint">模拟小程序笔记详情，样式供参考，实际以端上为准。</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  formatPreviewDateLabel,
  getPlainTextFromHtml,
  normalizePreviewMediaUrl,
  type ContentPreviewModel,
} from '@/utils/content-preview'
import { extractNoteParagraphs, noteHashTags } from '@/utils/note-content'
import { fileTypeIcon, formatFileSize } from '@/utils/content-attachment'

const props = withDefaults(
  defineProps<{
    model: ContentPreviewModel
    showHint?: boolean
  }>(),
  {
    showHint: true,
  },
)

const galleryIndex = ref(0)

const galleryUrls = computed(() =>
  (props.model.images || [])
    .map((url) => normalizePreviewMediaUrl(url))
    .filter(Boolean),
)

watch(
  () => props.model,
  () => {
    galleryIndex.value = 0
  },
  { deep: true },
)
const titleText = computed(() => props.model.title?.trim() || '未填写标题')
const categoryLabel = computed(() => props.model.categoryLabel?.replace(/^└\s*/, '') || '')
const authorName = computed(() => props.model.author?.trim() || '作者')
const authorInitial = computed(() => authorName.value.slice(0, 1))
const dateLabel = computed(() => formatPreviewDateLabel())
const contentHtml = computed(() => props.model.contentHtml || '')
const noteBodyText = computed(() => props.model.noteBody?.trim() || '')
const hasArticleBody = computed(() => getPlainTextFromHtml(contentHtml.value).length > 0)
const likeLabel = computed(() => '赞')

const commentPreviewCount = computed(() => 86)
const commentPreview = computed(() => [
  { id: 1, avatar: '用', nick: '跨境小白', text: '收藏了，正好在办 VAT', likes: 12 },
  { id: 2, avatar: '税', nick: '财税老司机', text: '第 3 张图讲得很清楚 👍', likes: 28 },
])

const contentType = computed(() => props.model.contentType || 'article')

const noteParagraphs = computed(() => {
  if (contentType.value !== 'note') return []
  const fromHtml = extractNoteParagraphs(contentHtml.value)
  if (fromHtml.length) return fromHtml
  return noteBodyText.value ? noteBodyText.value.split(/\n\n+/).map((s) => s.trim()).filter(Boolean) : []
})

const displayHashTags = computed(() => {
  const fromTags = noteHashTags(props.model.tags || [])
  if (fromTags.length) return fromTags
  if (categoryLabel.value) return [`#${categoryLabel.value}`]
  return []
})

const coverUrl = computed(() => {
  const fromCover = normalizePreviewMediaUrl(props.model.coverImage)
  if (fromCover) return fromCover
  const firstImage = props.model.images?.[0]
  return firstImage ? normalizePreviewMediaUrl(firstImage) : ''
})

const authorAvatarUrl = computed(() => normalizePreviewMediaUrl(props.model.authorAvatar))

const attachmentItems = computed(() =>
  (props.model.attachments || []).map((item) => ({
    id: item.id,
    name: item.name || '未命名文件',
    icon: fileTypeIcon(String(item.fileType || 'other')),
    sizeText: formatFileSize(Number(item.size || 0)),
  })),
)

const coverStyle = computed(() => {
  if (coverUrl.value) return {}
  return { background: 'linear-gradient(140deg, #5c7cff, #2f5bff)' }
})

function prevGallery() {
  const len = galleryUrls.value.length
  if (len <= 1) return
  galleryIndex.value = (galleryIndex.value - 1 + len) % len
}

function nextGallery() {
  const len = galleryUrls.value.length
  if (len <= 1) return
  galleryIndex.value = (galleryIndex.value + 1) % len
}
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

.phone-screen--note {
  background: #fff;
  overflow: hidden;
}

.pv-note-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 620px;
  background: #fff;
}

.pv-note-scroll {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 8px;
}

.pv-note-topbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #fff;
  border-bottom: 1px solid #f5f6f9;
}

.pv-note-topbar__name {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: #0f1219;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pv-note-topbar__share {
  font-size: 18px;
  color: #39404f;
  line-height: 1;
  padding: 0 4px;
}

.pv-follow--sm {
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 999px;
  background: #ff2442;
}

.pv-av--sm {
  width: 28px;
  height: 28px;
  font-size: 11px;
}

.pv-av--xs {
  width: 26px;
  height: 26px;
  font-size: 11px;
  flex-shrink: 0;
}

.pv-note-gallery {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  background: #111;
  overflow: hidden;
}

.pv-note-gallery__track {
  display: flex;
  height: 100%;
  transition: transform 0.28s ease;
}

.pv-note-gallery__slide {
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pv-note-slide {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.pv-note-slide--empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  background: linear-gradient(140deg, #2a3144, #1a1f2e);
}

.pv-note-idx {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.42);
  color: #fff;
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 999px;
  z-index: 3;
}

.pv-note-dots {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 5px;
  z-index: 3;
}

.pv-note-dots i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.2s ease;
}

.pv-note-dots i.on {
  width: 15px;
  border-radius: 3px;
  background: #fff;
}

.pv-note-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  z-index: 3;
}

.pv-note-nav--prev { left: 8px; }
.pv-note-nav--next { right: 8px; }

.pv-note-body {
  background: #fff;
  padding: 16px 14px 10px;
}

.pv-note-title {
  margin: 0 0 12px;
  font-size: 17px;
  line-height: 1.48;
  font-weight: 700;
  color: #0f1219;
  letter-spacing: -0.028em;
}

.pv-note-paras p {
  margin: 0 0 12px;
  font-size: 14px;
  line-height: 1.75;
  color: #333;
  white-space: pre-wrap;
}

.pv-note-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.pv-note-tags span {
  font-size: 14px;
  color: #13386c;
  font-weight: 500;
}

.pv-note-date {
  font-size: 11px;
  color: #a5abb9;
  margin-bottom: 8px;
}

.pv-note-comments {
  padding: 0 14px 12px;
  border-top: 8px solid #f7f8fc;
}

.pv-note-comments__head {
  padding: 12px 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: #0f1219;
}

.pv-note-comment {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 0;
}

.pv-note-comment__main {
  flex: 1;
  min-width: 0;
}

.pv-note-comment__nick {
  font-size: 12px;
  color: #727a8c;
  margin-bottom: 4px;
}

.pv-note-comment__text {
  font-size: 13px;
  line-height: 1.55;
  color: #0f1219;
}

.pv-note-comment__like {
  flex-shrink: 0;
  font-size: 11px;
  color: #a5abb9;
}

.pv-note-bottom {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px 12px;
  background: #fff;
  border-top: 1px solid #edeff4;
}

.pv-note-bottom__input {
  flex: 1;
  height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  background: #f5f6f9;
  color: #a5abb9;
  font-size: 13px;
  line-height: 34px;
}

.pv-note-bottom__acts {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
}

.pv-note-bottom__act {
  font-size: 12px;
  color: #39404f;
  white-space: nowrap;
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
}

.pv-content--plain {
  white-space: pre-wrap;
}

.pv-attachments {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pv-attachment {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #f5f6f9;
  font-size: 12px;
  color: #39404f;
}

.pv-attachment__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
