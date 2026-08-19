<template>
  <div class="render-hot-news">
    <div class="hot-news-stack">
      <!-- 最下层：内容框 -->
      <div class="hot-news-content" :style="contentBoxStyle">
        <div class="hot-news-content__pad" />
        <div v-if="showFailState" class="hot-news-empty">{{ failMessage }}</div>
        <div v-else-if="showEmpty" class="hot-news-empty">
          {{ previewMode ? '暂无文章数据' : '当前筛选下没有已发布内容' }}
        </div>
        <div v-else-if="!previewMode && liveLoading" class="hot-news-empty">正在读取已发布内容…</div>
        <div
          v-else
          class="hot-news-body"
          :class="`layout-${layout}`"
          :style="{ gap: `${itemGap}px` }"
        >
          <div
            v-for="(item, index) in displayItems"
            :key="`${item.id || item.title}-${index}`"
            class="hot-news-item"
            :class="[`hot-news-item--${layout}`, { 'is-clickable': previewMode }]"
            @click.stop="onItemClick(item)"
          >
            <template v-if="layout === 'star'">
              <span class="hot-news-star">★</span>
              <div class="hot-news-item__title">{{ item.title || '文章标题' }}</div>
            </template>
            <template v-else>
              <div v-if="showCover" class="hot-news-cover">
                <img v-if="item.cover" :src="item.cover" alt="" />
                <span v-else>📰</span>
              </div>
              <div class="hot-news-item__info">
                <div class="hot-news-item__title">{{ item.title || '文章标题' }}</div>
                <div v-if="item.meta" class="hot-news-item__meta">{{ item.meta }}</div>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- 最上层左：标题框 -->
      <div class="hot-news-title-box" :style="titleBoxStyle">
        <div
          class="hot-news-title-box__bg"
          :style="{
            opacity: headerOpacity,
            background: `linear-gradient(180deg, ${headerFrom} 0%, ${headerTo} 100%)`,
            borderRadius: `${titleRadius}px`,
          }"
        />
        <div class="hot-news-title-box__main">
          <div class="hot-news-title">{{ titleText }}</div>
          <div class="hot-news-date">
            <span class="hot-news-date__box">{{ dateParts.month }}</span>
            <span class="hot-news-date__unit">月</span>
            <span class="hot-news-date__box">{{ dateParts.day }}</span>
            <span class="hot-news-date__unit">日</span>
            <span class="hot-news-date__week">{{ dateParts.week }}</span>
          </div>
        </div>
      </div>

      <!-- 右上：查看更多框 -->
      <button
        v-if="showMore"
        type="button"
        class="hot-news-more"
        :style="moreBoxStyle"
        @click.stop="onMore"
      >
        {{ moreText }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { ComponentInstance } from '@/types/page'
import { resolvePreviewLinkAction, runPreviewLinkAction } from '@/utils/preview-link'
import { useEditorLiveItems } from '../composables/useEditorLiveItems'

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const emit = defineEmits<{
  'preview-action': [payload: {
    tab: string
    message: string
    detailType?: string
    detailTitle?: string
    detailDesc?: string
    productId?: string | number
    previewPath?: string
  }]
}>()

const { items: liveItems, loading: liveLoading, failed } = useEditorLiveItems(
  () => props.component,
  () => !!props.previewMode,
)

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(n, max))
}

const titleText = computed(() => String(props.component.props?.title || '今日跨境头条').trim() || '今日跨境头条')
const layout = computed(() => (props.component.props?.layout === 'card' ? 'card' : 'star'))
const showCover = computed(() => props.component.props?.show_cover !== false)
const showMore = computed(() => props.component.props?.show_more !== false)
const moreText = computed(() => String(props.component.props?.more_text || '查看更多 >').trim() || '查看更多 >')
const headerFrom = computed(() => String(props.component.props?.header_from || '#4F7CFF'))
const headerTo = computed(() => String(props.component.props?.header_to || '#7BA3FF'))
const headerOpacity = computed(() => {
  const n = Number(props.component.props?.header_opacity)
  return clamp(Number.isFinite(n) ? n : 96, 40, 100) / 100
})
const titleRadius = computed(() => {
  const n = Number(props.component.props?.title_radius)
  return clamp(Number.isFinite(n) ? n : 12, 0, 40)
})
const titleWidth = computed(() => {
  const n = Number(props.component.props?.title_width)
  return clamp(Number.isFinite(n) ? n : 72, 40, 100)
})
const contentRadius = computed(() => {
  const n = Number(props.component.props?.content_radius)
  return clamp(Number.isFinite(n) ? n : 14, 0, 40)
})
const moreRadius = computed(() => {
  const n = Number(props.component.props?.more_radius)
  // 兼容旧配置 999（胶囊），映射为 20
  if (Number.isFinite(n) && n > 40) return 20
  return clamp(Number.isFinite(n) ? n : 20, 0, 40)
})
const moreBg = computed(() => String(props.component.props?.more_bg || '#EEF1FF'))
const moreColor = computed(() => String(props.component.props?.more_color || '#5B6CFF'))
const itemGap = computed(() => {
  const n = Number(props.component.props?.item_gap)
  return Number.isFinite(n) ? clamp(n, 0, 32) : 10
})
const limit = computed(() => {
  const n = Number(props.component.props?.limit)
  return Number.isFinite(n) ? clamp(n, 1, 20) : 3
})

const titleBoxStyle = computed(() => ({
  width: 'max-content',
  minWidth: `${titleWidth.value}%`,
  maxWidth: '100%',
  borderRadius: `${titleRadius.value}px`,
}))

const contentBoxStyle = computed(() => ({
  borderRadius: `${contentRadius.value}px`,
}))

const moreBoxStyle = computed(() => ({
  borderRadius: `${moreRadius.value}px`,
  background: moreBg.value,
  color: moreColor.value,
}))

const dateParts = computed(() => {
  const mode = props.component.props?.date_mode || 'today'
  let d = new Date()
  if (mode === 'fixed' && props.component.props?.header_date) {
    const raw = String(props.component.props.header_date).replace(/-/g, '/')
    const parsed = new Date(raw)
    if (!Number.isNaN(parsed.getTime())) d = parsed
  }
  return {
    month: String(d.getMonth() + 1),
    day: String(d.getDate()),
    week: WEEKDAYS[d.getDay()] || '',
  }
})

const displayItems = computed(() => {
  const normalize = (list: any[]) => list.slice(0, limit.value).map((item: any, index: number) => {
    const id = item.id ?? item.contentId ?? item.content_id
    const link = String(item.link_url || item.linkUrl || '').trim()
      || (id != null && !String(id).startsWith('hot_')
        ? `/pages/content-detail/content-detail?id=${id}`
        : '')
    return {
      id: id ?? `hot_${index + 1}`,
      title: item.title || item.name || '文章标题',
      cover: item.cover || item.coverUrl || item.image || '',
      meta: item.meta || '',
      link_url: link,
    }
  })

  if (props.previewMode) {
    const staticItems = Array.isArray(props.component.props?.items) ? props.component.props.items : []
    if (staticItems.length) return normalize(staticItems)
  }
  if (liveItems.value.length) return normalize(liveItems.value)
  if (!props.previewMode && liveLoading.value) return []
  return normalize([
    { title: '近亿元市值被烧光！上市家居大卖工厂突发大火……' },
    { title: '索赔100万！跨境大卖把店“卖给”了前员工' },
    { title: '小包税让中国电商包裹骤降20%？因关税问题……' },
  ])
})

const showFailState = computed(() => !props.previewMode && failed.value)
const failMessage = computed(() => '文章数据读取失败，请稍后重试')
const showEmpty = computed(() => {
  if (liveLoading.value) return false
  if (showFailState.value) return false
  if (props.previewMode) {
    const staticItems = Array.isArray(props.component.props?.items) ? props.component.props.items : []
    return staticItems.length === 0 && liveItems.value.length === 0
  }
  return liveItems.value.length === 0 && props.component.props?._previewDataFailed === true
})

function sanitizeLink(raw: string) {
  const link = String(raw || '').trim()
  if (!link) return ''
  if (/page-builder/i.test(link)) return ''
  if (/^https?:\/\/[^/]*localhost/i.test(link) && !/\/pages\//i.test(link)) return ''
  return link
}

function handlePreviewLink(link: string, label: string) {
  const action = resolvePreviewLinkAction({ link_type: 'page', link_url: link }, label)
  if (!action) {
    ElMessage.warning('未配置跳转链接')
    return
  }
  const message = runPreviewLinkAction(action, (payload) => emit('preview-action', payload))
  if (message) ElMessage.info(message)
}

function onMore() {
  if (!props.previewMode) return
  const link = sanitizeLink(String(props.component.props?.more_link || '').trim())
  if (!link) {
    ElMessage.warning('未配置更多链接')
    return
  }
  handlePreviewLink(link, '查看更多')
}

function onItemClick(item: { id?: string | number; title?: string; meta?: string; link_url?: string }) {
  if (!props.previewMode) return
  const title = String(item.title || '文章详情').trim() || '文章详情'
  let link = sanitizeLink(String(item.link_url || '').trim())
  if (!link && item.id != null && !String(item.id).startsWith('hot_')) {
    link = `/pages/content-detail/content-detail?id=${item.id}`
  }
  if (!link) {
    ElMessage.warning('未配置跳转链接')
    return
  }
  handlePreviewLink(link, title)
}
</script>

<style lang="scss" scoped>
.render-hot-news {
  width: 100%;
}

.hot-news-stack {
  position: relative;
  padding-top: 8px;
}

/* 内容框：最下层 */
.hot-news-content {
  position: relative;
  z-index: 1;
  background: #fff;
  box-shadow: 0 6px 18px rgba(47, 84, 160, 0.08);
  overflow: hidden;
}

.hot-news-content__pad {
  /* 避开叠在上方的标题框，避免挡住首条文章 */
  height: 52px;
}

/* 标题框：最上层左侧 */
.hot-news-title-box {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 8px 14px;
  color: #fff;
  box-sizing: border-box;
  overflow: visible;
}

.hot-news-title-box__bg {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.hot-news-title-box__main {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 10px;
  min-width: 0;
  white-space: nowrap;
}

.hot-news-title {
  flex-shrink: 0;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
}

.hot-news-date {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  white-space: nowrap;
}

.hot-news-date__box {
  min-width: 18px;
  padding: 1px 4px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 4px;
  color: #4f7cff;
  font-weight: 700;
  text-align: center;
}

.hot-news-date__unit,
.hot-news-date__week {
  color: rgba(255, 255, 255, 0.95);
}

/* 查看更多：右上 */
.hot-news-more {
  position: absolute;
  top: 14px;
  right: 12px;
  z-index: 3;
  padding: 4px 10px;
  border: none;
  font-size: 11px;
  line-height: 1.4;
  cursor: pointer;
  white-space: nowrap;
}

.hot-news-body {
  display: flex;
  flex-direction: column;
  padding: 0 12px 14px;
}

.hot-news-item--star {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
}

.hot-news-item.is-clickable {
  cursor: pointer;
}

.hot-news-item.is-clickable:hover .hot-news-item__title {
  color: #4f7cff;
}

.hot-news-star {
  flex-shrink: 0;
  margin-top: 1px;
  color: #4f7cff;
  font-size: 13px;
  line-height: 1.4;
}

.hot-news-item__title {
  flex: 1;
  min-width: 0;
  color: #334155;
  font-size: 13px;
  line-height: 1.45;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hot-news-item--card {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px;
  background: #f8fafc;
  border-radius: 10px;
}

.hot-news-cover {
  width: 64px;
  height: 48px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: #e8eefc;
  border-radius: 8px;
  color: #7b8798;
  font-size: 18px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.hot-news-item__info {
  min-width: 0;
  flex: 1;
}

.hot-news-item--card .hot-news-item__title {
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.hot-news-item__meta {
  margin-top: 4px;
  color: #94a3b8;
  font-size: 11px;
}

.hot-news-empty {
  padding: 18px 12px;
  color: #94a3b8;
  font-size: 12px;
  text-align: center;
}
</style>
