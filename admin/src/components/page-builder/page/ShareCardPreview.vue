<template>
  <div class="shp">
    <!--
      🔴 比例切换是**需求硬要求**：微信聊天转发用 5:4，
      朋友圈 / 网页卡片是 1:1。运营经常只配了其中一张，
      不给切换就只能靠猜 —— 猜错的结果是「分享出去发现封面被裁」。
    -->
    <div class="shp__tabs" role="tablist">
      <button
        v-for="t in TABS"
        :key="t.value"
        type="button"
        role="tab"
        class="shp__tab"
        :class="{ 'is-on': ratio === t.value }"
        :aria-selected="ratio === t.value"
        @click="emit('update:ratio', t.value)"
      >
        {{ t.label }}
      </button>
    </div>

    <div class="shp__card">
      <div class="shp__cover" :style="coverStyle">
        <img v-if="activeImage" :src="activeImage" alt="" class="shp__cover-img" />
        <div v-else class="shp__cover-empty">
          <span class="shp__cover-ratio">{{ ratioLabel }}</span>
          <span class="shp__cover-text">未设置封面</span>
        </div>
        <!-- 裁剪指引框：封面图设成别的比例时，一眼看出会被裁掉哪部分 -->
        <div v-if="activeImage" class="shp__ratio-frame" aria-hidden="true"></div>
      </div>

      <div class="shp__body">
        <div class="shp__title">{{ shownTitle || '（未设置标题）' }}</div>
        <div v-if="config.desc" class="shp__desc">{{ shownDesc }}</div>
        <div v-else class="shp__desc shp__desc--empty">（未设置描述，分享时将不显示摘要）</div>
      </div>

      <div class="shp__foot">
        <span class="shp__dot"></span>
        <span class="shp__source">{{ sourceText }}</span>
        <span class="shp__mini">小程序</span>
      </div>
    </div>

    <p v-if="fallbackUsed" class="shp__note">
      未设置朋友圈封面，正在用聊天封面代替
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { SHARE_IMAGE_RATIO, SHARE_TITLE_MAX, type PageShareConfig } from './pageConfigSchema'

/** 预览比例：5:4 = 微信聊天转发；1:1 = 朋友圈 / 网页卡片 */
export type SharePreviewRatio = 'chat' | 'square'

const TABS: Array<{ value: SharePreviewRatio; label: string }> = [
  { value: 'chat', label: `微信聊天 (${SHARE_IMAGE_RATIO.w}:${SHARE_IMAGE_RATIO.h})` },
  { value: 'square', label: '朋友圈/网页 (1:1)' },
]

const props = withDefaults(
  defineProps<{
    config: PageShareConfig
    pageName?: string
    sourceName?: string
    ratio?: SharePreviewRatio
    /** 朋友圈封面（可选）；没配时回落到聊天封面并给出提示 */
    squareImage?: string
  }>(),
  { ratio: 'chat', squareImage: '' },
)

const emit = defineEmits<{ 'update:ratio': [value: SharePreviewRatio] }>()

const ratioLabel = computed(() =>
  props.ratio === 'square' ? '1:1' : `${SHARE_IMAGE_RATIO.w}:${SHARE_IMAGE_RATIO.h}`,
)

/** 当前比例该显示哪张图；没配朋友圈封面时回落到聊天封面 */
const activeImage = computed(() => {
  if (props.ratio === 'square') return props.squareImage || props.config.image
  return props.config.image
})

const fallbackUsed = computed(
  () => props.ratio === 'square' && !props.squareImage && !!props.config.image,
)

const coverStyle = computed(() => ({
  aspectRatio:
    props.ratio === 'square' ? '1 / 1' : `${SHARE_IMAGE_RATIO.w} / ${SHARE_IMAGE_RATIO.h}`,
}))

/** 标题：配置值优先（超长截断），留空则继承页面名称 —— 与真机回落链同规则 */
const shownTitle = computed(() => {
  const t = String(props.config.title || '').trim()
  if (t) return t.slice(0, SHARE_TITLE_MAX)
  return String(props.pageName || '').trim().slice(0, SHARE_TITLE_MAX)
})

/** 描述按 2 行截断（与真机一致）：每行约 22 字 */
const shownDesc = computed(() => {
  const d = String(props.config.desc || '')
  if (d.length <= 44) return d
  return `${d.slice(0, 44)}…`
})

const sourceText = computed(() => props.sourceName || '小程序')
</script>

<style scoped>
.shp { display: flex; flex-direction: column; gap: 6px; }

/* 预览比例切换 */
.shp__tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
  padding: 2px;
  background: #f1f5f9;
  border-radius: 6px;
}
.shp__tab {
  padding: 4px 6px;
  color: #64748b;
  font-family: inherit;
  font-size: 11px;
  /* ⚠️ 必须 nowrap：两个 tab 文案长短差异大，不锁会被挤到叠字 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: transparent;
  border: 0;
  border-radius: 4px;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
}
.shp__tab.is-on {
  color: #475569;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

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

.shp__cover { position: relative; width: 100%; overflow: hidden; background: #f2f3f5; }
.shp__cover-img { display: block; width: 100%; height: 100%; object-fit: cover; }

.shp__cover-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 2px; width: 100%; height: 100%;
  color: #a8acb3; font-size: 11px;
}
.shp__cover-ratio {
  padding: 1px 6px;
  font-size: 10px; font-weight: 500;
  background: #e4e6eb; border-radius: 999px;
}

.shp__ratio-frame {
  position: absolute; inset: 4px;
  border: 1px dashed rgba(255, 255, 255, 0.75);
  border-radius: 3px;
  pointer-events: none;
}

.shp__body { padding: 8px 10px 6px; }

.shp__title {
  overflow: hidden;
  color: #1a1a1a;
  font-size: 13px; font-weight: 500; line-height: 1.4;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.shp__desc {
  margin-top: 3px;
  overflow: hidden;
  color: #8a8f99;
  font-size: 11px; line-height: 1.45;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.shp__desc--empty { color: #b6bac1; font-style: italic; }

.shp__foot {
  display: flex; align-items: center; gap: 4px;
  padding: 0 10px 9px;
  color: #a8acb3;
  font-size: 10.5px;
}
.shp__dot { width: 12px; height: 12px; background: #d5d8dd; border-radius: 3px; }

/* 「小程序」微标：与真机转发卡片来源行同款 */
.shp__mini {
  margin-left: auto;
  padding: 0 4px;
  color: #b6bac1;
  font-size: 9px;
  line-height: 14px;
  background: #f4f5f7;
  border-radius: 2px;
}

.shp__note { margin: 0; color: #a8acb3; font-size: 11px; line-height: 1.4; text-align: center; }
</style>