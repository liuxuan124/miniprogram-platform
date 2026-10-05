<template>
  <div class="shp">
    <!-- 🔴 高保真模拟微信转发卡片：圆角白卡 + 5:4 封面 + 标题/描述/来源行。
         刻意做成「所见即所得」——运营填完就能确认分享出去长什么样，
         不用先发布再转发一次才知道效果。 -->
    <div class="shp__card">
      <div class="shp__cover" :style="coverStyle">
        <img v-if="config.image" :src="config.image" alt="" class="shp__cover-img" />
        <div v-else class="shp__cover-empty">
          <span class="shp__cover-ratio">{{ RATIO.label }}</span>
          <span class="shp__cover-text">未设置封面</span>
        </div>
        <!-- 5:4 裁剪指引框：封面图设成别的比例时，一眼看出会被裁掉哪部分 -->
        <div v-if="config.image" class="shp__ratio-frame" aria-hidden="true"></div>
      </div>

      <div class="shp__body">
        <div class="shp__title">{{ shownTitle || '（未设置标题）' }}</div>
        <div v-if="config.desc" class="shp__desc">{{ shownDesc }}</div>
        <div v-else class="shp__desc shp__desc--empty">（未设置描述，分享时将不显示摘要）</div>
      </div>

      <div class="shp__foot">
        <span class="shp__dot"></span>
        <span class="shp__source">{{ sourceText }}</span>
      </div>
    </div>

    <p class="shp__hint">
      实时预览 · 标题留空时继承页面名称
      <template v-if="overLimit"> · 标题超 {{ RATIO.titleMax }} 字将自动截断</template>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { SHARE_IMAGE_RATIO, SHARE_TITLE_MAX, type PageShareConfig } from './pageConfigSchema'

/**
 * 分享卡片微型预览（2026-10-06 新增）。
 *
 * 卡片比例按微信转发卡片的视觉特征做**等比缩小**（不是直接缩放真图）：
 * 封面固定 5:4，其余按同一比例推导，保证「看起来就是那个卡片」。
 * 描述超长时按真机 2 行截断，避免预览里塞一大段而真机只显示两行。
 */
const props = defineProps<{
  config: PageShareConfig
  /** 页面名称：分享标题留空时继承它 */
  pageName?: string
  /** 来源行（默认「小程序名」由父级传入真实值） */
  sourceName?: string
}>()

const RATIO = { ...SHARE_IMAGE_RATIO, titleMax: SHARE_TITLE_MAX, descMax: 50 }

const fallbackTitle = computed(() => String(props.pageName || '').trim())

/** 标题：配置值优先（超长截断），留空则继承页面名称 —— 与真机回落链同规则 */
const shownTitle = computed(() => {
  const t = String(props.config.title || '').trim()
  if (t) return t.slice(0, RATIO.titleMax)
  return fallbackTitle.value.slice(0, RATIO.titleMax)
})

/** 描述按 2 行截断（与真机一致）：每行约 22 字，超出加省略号 */
const shownDesc = computed(() => {
  const d = String(props.config.desc || '')
  if (d.length <= 44) return d
  return `${d.slice(0, 44)}…`
})

const sourceText = computed(() => props.sourceName || '小程序')

const coverStyle = computed(() => ({ aspectRatio: `${RATIO.w} / ${RATIO.h}` }))

const overLimit = computed(() => String(props.config.title || '').length > RATIO.titleMax)
</script>

<style scoped>
.shp { display: flex; flex-direction: column; gap: 5px; }

.shp__card {
  align-self: center;
  width: 100%;
  max-width: 260px;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e8eaed;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

/* 封面：按 5:4 固定比例，未设图时给占位提示 */
.shp__cover {
  position: relative;
  width: 100%;
  overflow: hidden;
  background: #f2f3f5;
}

.shp__cover-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.shp__cover-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 100%;
  height: 100%;
  color: #a8acb3;
  font-size: 11px;
}

.shp__cover-ratio {
  padding: 1px 6px;
  font-size: 10px;
  font-weight: 500;
  background: #e4e6eb;
  border-radius: 999px;
}

/* 裁剪指引框：四边 1px 虚线 + 内侧留白，直观表达「会按 5:4 裁」 */
.shp__ratio-frame {
  position: absolute;
  inset: 4px;
  border: 1px dashed rgba(255, 255, 255, 0.75);
  border-radius: 3px;
  pointer-events: none;
}

.shp__body { padding: 8px 10px 6px; }

.shp__title {
  overflow: hidden;
  color: #1a1a1a;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.shp__desc {
  margin-top: 3px;
  overflow: hidden;
  color: #8a8f99;
  font-size: 11px;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.shp__desc--empty { color: #b6bac1; font-style: italic; }

.shp__foot {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 10px 9px;
  color: #a8acb3;
  font-size: 10.5px;
}

.shp__dot {
  width: 12px;
  height: 12px;
  background: #d5d8dd;
  border-radius: 3px;
}

.shp__hint {
  margin: 0;
  color: #a8acb3;
  font-size: 11px;
  line-height: 1.4;
  text-align: center;
}
</style>