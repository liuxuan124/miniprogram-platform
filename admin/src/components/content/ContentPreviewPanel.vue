<template>
  <div class="content-preview-panel">
    <div class="phone-frame">
      <div class="phone-notch" />
      <div class="phone-screen" :class="phoneScreenClass" @scroll="onPhoneScroll">
        <!-- 公众号贴图 -->
        <template v-if="contentType === 'note' && isWechatNewspic">
          <div class="pv-wx-wrap">
            <div class="pv-wx-gallery">
              <div
                class="pv-wx-gallery__track"
                :style="{ transform: `translateX(-${galleryIndex * 100}%)` }"
              >
                <div
                  v-for="(url, idx) in galleryUrls"
                  :key="`${url}-${idx}`"
                  class="pv-wx-gallery__slide"
                >
                  <img :src="url" alt="" class="pv-wx-slide" loading="lazy" />
                </div>
              </div>
              <div v-if="!galleryUrls.length" class="pv-wx-slide pv-wx-slide--empty">📷</div>
              <button
                v-if="galleryUrls.length > 1"
                type="button"
                class="pv-wx-nav pv-wx-nav--prev"
                aria-label="上一张"
                @click="prevGallery"
              >‹</button>
              <button
                v-if="galleryUrls.length > 1"
                type="button"
                class="pv-wx-nav pv-wx-nav--next"
                aria-label="下一张"
                @click="nextGallery"
              >›</button>
              <div v-if="galleryUrls.length > 1" class="pv-wx-thumbs">
                <button
                  v-for="(url, idx) in galleryUrls"
                  :key="`thumb-${url}-${idx}`"
                  type="button"
                  class="pv-wx-thumb"
                  :class="{ on: idx === galleryIndex }"
                  @click="galleryIndex = idx"
                >
                  <img :src="url" alt="" />
                  <span>{{ idx + 1 }}</span>
                </button>
              </div>
            </div>

            <div class="pv-wx-body">
              <h1 class="pv-wx-title">{{ titleText }}</h1>
              <div v-if="noteParagraphs.length" class="pv-wx-paras">
                <p v-for="(para, idx) in noteParagraphs" :key="idx">{{ para }}</p>
              </div>
            </div>
          </div>
        </template>

        <!-- 笔记：小红书图文详情 -->
        <template v-else-if="contentType === 'note'">
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
          <div class="pv-article">
            <div v-if="isArticleMode" class="pv-read-progress">
              <div class="pv-read-progress__bar" :style="{ width: `${readProgress}%` }" />
            </div>
            <div
              v-if="!isArticleMode"
              class="pv-cover"
              :style="coverStyle"
            >
              <img v-if="coverUrl" :src="coverUrl" alt="" class="pv-cover-img" />
              <span v-else class="pv-cover-glyph">动</span>
            </div>
            <div
              class="pv-body"
              :class="{
                'pv-body--article': isArticleMode,
                'pv-body--moment-cover': !isArticleMode && coverUrl,
              }"
            >
              <div class="pv-chips">
                <span class="pv-fmt">{{ contentType === 'moment' ? '动态' : '长文' }}</span>
                <span v-if="showCategoryLabel" class="pv-topic">{{ categoryLabel }}</span>
              </div>
              <h1 class="pv-title" :class="{ 'pv-title--article': isArticleMode }">{{ titleText }}</h1>
              <p v-if="isArticleMode && articleLede" class="pv-lede">{{ articleLede }}</p>
              <div class="pv-meta" :class="{ 'pv-meta--compact': isArticleMode }">
                <div class="pv-av">
                  <img v-if="authorAvatarUrl" :src="authorAvatarUrl" alt="" class="pv-av-img" />
                  <span v-else>{{ authorInitial }}</span>
                </div>
                <div class="pv-meta-txt">
                  <div v-if="!isArticleMode" class="pv-nm">{{ authorName }}</div>
                  <div class="pv-dt">{{ metaSubtitle }}</div>
                </div>
                <span v-if="!isArticleMode" class="pv-follow pv-follow--decorative" aria-hidden="true">+ 关注</span>
              </div>
              <div v-if="contentType === 'moment' && noteBodyText" class="pv-content pv-content--plain">{{ noteBodyText }}</div>
              <div v-else-if="hasArticleBody" class="pv-content pv-content--article" v-html="articleContentHtml" />
            <div v-if="contentType === 'moment' && attachmentItems.length" class="pv-attachments">
              <div v-for="item in attachmentItems" :key="item.id || item.name" class="pv-attachment">
                <span>{{ item.icon }}</span>
                <span class="pv-attachment__name">{{ item.name }}</span>
              </div>
            </div>
            <div v-if="!(noteBodyText || hasArticleBody || attachmentItems.length)" class="pv-empty">暂无正文</div>
          </div>
          </div>
        </template>
      </div>
    </div>
    <p v-if="showHint" class="preview-hint">{{ previewHintText }}</p>
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
import {
  estimateReadMinutes,
  extractArticleSummary,
  formatReadTimeLabel,
  isDisplayableCategory,
  prepareArticleContentHtml,
} from '@/utils/article-content'
import { extractNoteParagraphs, noteHashTags } from '@/utils/note-content'
import { inferWechatNewspic } from '@/utils/content-format'
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
const readProgress = ref(0)

const galleryUrls = computed(() =>
  (props.model.images || [])
    .map((url) => normalizePreviewMediaUrl(url))
    .filter(Boolean),
)

watch(
  () => props.model,
  () => {
    galleryIndex.value = 0
    readProgress.value = 0
  },
  { deep: true },
)
const titleText = computed(() => props.model.title?.trim() || '未填写标题')
const categoryLabel = computed(() => props.model.categoryLabel?.replace(/^└\s*/, '') || '')
const showCategoryLabel = computed(() => isDisplayableCategory(categoryLabel.value))
const authorName = computed(() => props.model.author?.trim() || '作者')
const authorInitial = computed(() => authorName.value.slice(0, 1))
const dateLabel = computed(() => formatPreviewDateLabel())
const contentType = computed(() => props.model.contentType || 'article')
const contentHtml = computed(() => props.model.contentHtml || '')
const coverUrl = computed(() => {
  const fromCover = normalizePreviewMediaUrl(props.model.coverImage)
  if (fromCover) return fromCover
  const firstImage = props.model.images?.[0]
  return firstImage ? normalizePreviewMediaUrl(firstImage) : ''
})
const articleContentHtml = computed(() => {
  if (contentType.value !== 'article' && contentType.value !== 'rich') return contentHtml.value
  return prepareArticleContentHtml(
    contentHtml.value,
    props.model.coverImage || coverUrl.value,
    titleText.value,
  )
})
const isArticleMode = computed(() => contentType.value === 'article' || contentType.value === 'rich')
const articleLede = computed(() => {
  if (!isArticleMode.value) return ''
  return extractArticleSummary(articleContentHtml.value, 88)
})
const hasArticleBody = computed(() => getPlainTextFromHtml(articleContentHtml.value).length > 0)
const readTimeLabel = computed(() => {
  if (!isArticleMode.value) return ''
  return formatReadTimeLabel(estimateReadMinutes(articleContentHtml.value))
})
const metaSubtitle = computed(() => {
  if (isArticleMode.value) {
    const parts = [authorName.value, dateLabel.value, readTimeLabel.value].filter(Boolean)
    return parts.join(' · ')
  }
  if (readTimeLabel.value) {
    return `${dateLabel.value} · ${readTimeLabel.value}`
  }
  return dateLabel.value
})
const noteBodyText = computed(() => props.model.noteBody?.trim() || '')

function onPhoneScroll(event: Event) {
  if (!isArticleMode.value) return
  const el = event.target as HTMLElement | null
  if (!el) return
  const maxScroll = Math.max(1, el.scrollHeight - el.clientHeight)
  readProgress.value = Math.min(100, Math.round((el.scrollTop / maxScroll) * 100))
}

const likeLabel = computed(() => '赞')

const commentPreviewCount = computed(() => 86)
const commentPreview = computed(() => [
  { id: 1, avatar: '用', nick: '跨境小白', text: '收藏了，正好在办 VAT', likes: 12 },
  { id: 2, avatar: '税', nick: '财税老司机', text: '第 3 张图讲得很清楚 👍', likes: 28 },
])

const isWechatNewspic = computed(() => {
  if (props.model.isWechatNewspic != null) return Boolean(props.model.isWechatNewspic)
  if (contentType.value !== 'note') return false
  return inferWechatNewspic({
    tags: props.model.tags,
    source: props.model.source,
    title: props.model.title,
    content: props.model.contentHtml,
    images: props.model.images,
    coverImage: props.model.coverImage,
  } as Record<string, unknown>)
})

const phoneScreenClass = computed(() => ({
  'phone-screen--note': contentType.value === 'note' && !isWechatNewspic.value,
  'phone-screen--wechat': isWechatNewspic.value,
  'phone-screen--article': isArticleMode.value,
}))

const previewHintText = computed(() => {
  if (isWechatNewspic.value) {
    return '公众号贴图预览 · 实际以小程序为准'
  }
  if (isArticleMode.value) {
    return '长文详情预览 · 封面仅用于分享，正文不展示'
  }
  return '笔记详情预览 · 实际以小程序为准'
})

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

.phone-screen--article {
  height: 680px;
  background: #fff;
}

.pv-article {
  position: relative;
  background: #fff;
}

.phone-screen--wechat {
  background: #1f1f1f;
  overflow: auto;
}

.pv-wx-wrap {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: #1f1f1f;
  color: #f2f2f2;
}

.pv-wx-gallery {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  background: #111;
  overflow: hidden;
}

.pv-wx-gallery__track {
  display: flex;
  height: 100%;
  transition: transform 0.28s ease;
}

.pv-wx-gallery__slide {
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
}

.pv-wx-slide {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.pv-wx-slide--empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  background: #2a2a2a;
}

.pv-wx-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  z-index: 3;
}

.pv-wx-nav--prev { left: 10px; }
.pv-wx-nav--next { right: 10px; }

.pv-wx-thumbs {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  overflow-x: auto;
  background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.72));
  z-index: 3;
}

.pv-wx-thumb {
  position: relative;
  flex: 0 0 auto;
  width: 44px;
  height: 58px;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 4px;
  overflow: hidden;
  background: #333;
  cursor: pointer;
}

.pv-wx-thumb.on {
  border-color: #07c160;
}

.pv-wx-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.pv-wx-thumb span {
  position: absolute;
  right: 3px;
  bottom: 3px;
  min-width: 14px;
  padding: 0 3px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 9px;
  line-height: 14px;
  text-align: center;
}

.pv-wx-body {
  flex: none;
  overflow: visible;
  padding: 16px 14px 28px;
}

.pv-wx-title {
  margin: 0 0 12px;
  font-size: 17px;
  line-height: 1.48;
  font-weight: 700;
  color: #f5f5f5;
}

.pv-wx-paras p {
  margin: 0 0 12px;
  font-size: 14px;
  line-height: 1.75;
  color: rgba(255, 255, 255, 0.78);
  white-space: pre-wrap;
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

.pv-cover--article {
  height: auto;
  min-height: 0;
  background: #111;
}

.pv-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pv-cover--article .pv-cover-img {
  height: auto;
  max-height: 180px;
  object-fit: contain;
  display: block;
}

.pv-article {
  position: relative;
}

.pv-read-progress {
  position: sticky;
  top: 0;
  z-index: 5;
  height: 4px;
  background: #e8ecef;
}

.pv-read-progress__bar {
  height: 100%;
  background: linear-gradient(90deg, #2f9350, #3eb86a);
  border-radius: 0 2px 2px 0;
  transition: width 0.12s ease-out;
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

.pv-body--article {
  margin-top: 0;
  border-radius: 0;
  padding: 20px 20px 36px;
  min-height: calc(100% - 12px);
  background: #fff;
}

.pv-body--moment-cover {
  margin-top: -8px;
}

.pv-chips {
  margin-bottom: 14px;
}

.pv-title--article {
  font-size: 22px;
  line-height: 1.36;
  margin-bottom: 10px;
  letter-spacing: -0.02em;
}

.pv-lede {
  margin: 0 0 16px;
  font-size: 14px;
  line-height: 1.7;
  color: #727a8c;
}

.pv-meta--compact {
  padding-bottom: 18px;
  margin-bottom: 20px;
  border-bottom: 1px solid #eef1f5;

  .pv-av {
    width: 26px;
    height: 26px;
    font-size: 11px;
  }

  .pv-dt {
    font-size: 12px;
    color: #8a94a6;
    margin-top: 0;
    line-height: 1.4;
  }
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
  padding-bottom: 12px;
  margin-bottom: 16px;
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

.pv-follow--decorative {
  opacity: 0.42;
  pointer-events: none;
  font-size: 11px;
  padding: 5px 10px;
}

.pv-content {
  font-size: 15px;
  line-height: 1.85;
  color: #39404f;
  word-break: break-word;

  :deep(img) {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 8px 0 14px;
  }

  :deep(p) {
    margin: 0 0 14px;
  }
}

.pv-content--article {
  max-width: 100%;

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
    margin: 28px 0 12px;
    font-size: 17px;
    line-height: 1.45;
    font-weight: 700;
    color: #0f1219;
    padding-left: 12px;
    border-left: 3px solid #c8973a;
    background: transparent !important;
  }

  :deep(h2:first-child),
  :deep(h3:first-child) {
    margin-top: 0;
  }

  :deep(p) {
    margin: 0 0 16px;
    font-size: 15px;
    line-height: 1.85;
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
    margin: 14px 0;
    padding: 12px 14px;
    border-left: 3px solid #2f9350;
    background: #f7faf8;
    color: #4a5568;
    border-radius: 0 8px 8px 0;
  }

  :deep(ul),
  :deep(ol) {
    margin: 0 0 16px 1.2em;
    padding: 0;
  }

  :deep(li) {
    margin-bottom: 8px;
    line-height: 1.75;
  }

  :deep(img) {
    max-width: 100%;
    height: auto;
    border-radius: 10px;
    margin: 12px 0 18px;
    display: block;
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
