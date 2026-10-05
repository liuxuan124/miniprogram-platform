<template>
  <div class="render-category-nav" :class="[`surface-${cfg.surface}`, `icon-${cfg.icon_shape}`]">
    <!-- 标题行：show_title=false 时整行不渲染 -->
    <div v-if="cfg.show_title && cfg.title" class="cnv-section-title">{{ cfg.title }}</div>

    <!-- ============ 固定网格 ============ -->
    <div
      v-if="cfg.layout === 'grid'"
      class="cnv-items"
      :style="{ gridTemplateColumns: `repeat(${cfg.columns}, minmax(0, 1fr))` }"
    >
      <div
        v-for="(item, i) in cfg.items"
        :key="item.id || `c-${i}`"
        class="cnv-item"
        @click.stop="onItemTap(item, i)"
      >
        <span class="cnv-item__icon" :style="iconBoxStyle">
          <img v-if="isImageIcon(item.icon)" :src="item.icon" alt="" class="cnv-item__img" />
          <template v-else>{{ item.icon || '📌' }}</template>
          <span v-if="item.badge" class="cnv-item__badge" :style="badgeStyle(item)">{{ item.badge }}</span>
        </span>
        <span class="cnv-item__name" :style="{ color: cfg.title_color }">{{ item.title || `分类${i + 1}` }}</span>
        <span v-if="item.subtitle" class="cnv-item__sub" :style="subStyle">{{ item.subtitle }}</span>
      </div>
      <div v-if="!cfg.items.length" class="cnv-blank">还没有分类项</div>
    </div>

    <!-- ============ 单行横滑 ============ -->
    <div v-else-if="cfg.layout === 'scroll'" class="cnv-scroll">
      <div v-for="(item, i) in cfg.items" :key="item.id || `c-${i}`" class="cnv-item" @click.stop="onItemTap(item, i)">
        <span class="cnv-item__icon" :style="iconBoxStyle">
          <img v-if="isImageIcon(item.icon)" :src="item.icon" alt="" class="cnv-item__img" />
          <template v-else>{{ item.icon || '📌' }}</template>
          <span v-if="item.badge" class="cnv-item__badge" :style="badgeStyle(item)">{{ item.badge }}</span>
        </span>
        <span class="cnv-item__name" :style="{ color: cfg.title_color }">{{ item.title || `分类${i + 1}` }}</span>
        <span v-if="item.subtitle" class="cnv-item__sub" :style="subStyle">{{ item.subtitle }}</span>
      </div>
      <div v-if="!cfg.items.length" class="cnv-blank">还没有分类项</div>
    </div>

    <!-- ============ 双行分页 ============ -->
    <template v-else>
      <div class="cnv-pager">
        <div class="cnv-pager__page" :style="{ gridTemplateColumns: `repeat(${pagedColumns}, minmax(0, 1fr))` }">
          <div
            v-for="(item, i) in pagedItems"
            :key="item.id || `c-${i}`"
            class="cnv-item"
            @click.stop="onItemTap(item, i)"
          >
            <span class="cnv-item__icon" :style="iconBoxStyle">
              <img v-if="isImageIcon(item.icon)" :src="item.icon" alt="" class="cnv-item__img" />
              <template v-else>{{ item.icon || '📌' }}</template>
              <span v-if="item.badge" class="cnv-item__badge" :style="badgeStyle(item)">{{ item.badge }}</span>
            </span>
            <span class="cnv-item__name" :style="{ color: cfg.title_color }">{{ item.title || `分类${i + 1}` }}</span>
            <span v-if="item.subtitle" class="cnv-item__sub" :style="subStyle">{{ item.subtitle }}</span>
          </div>
        </div>
        <div v-if="pages > 1" class="cnv-pager__dots">
          <span
            v-for="n in pages"
            :key="n"
            class="cnv-pager__dot"
            :class="{ 'is-on': n - 1 === pageIndex }"
          ></span>
        </div>
        <div v-else-if="!cfg.items.length" class="cnv-blank">还没有分类项</div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ComponentInstance } from '@/types/page'
import {
  isImageIcon,
  normalizeCategoryNavProps,
  resolveBadgeColor,
  resolveIconRadius,
  totalPages,
  type CategoryNavItem,
  type CategoryNavProps as CategoryConfig,
} from '../categoryNav/categoryNavSchema'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const emit = defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()

/** 归一化配置：与属性面板读同一份 Schema，避免两边漂移 */
const cfg = computed<CategoryConfig>(() => normalizeCategoryNavProps(props.component.props))

/* ---------------- 分页 ---------------- */
const pages = computed(() => totalPages(cfg.value.items.length, cfg.value.page_size))
const pageIndex = ref(0)

/** 切布局/项数/项数时把页码夹回合法范围，否则指示条会指向不存在的页 */
watch(
  () => [cfg.value.layout, cfg.value.page_size, cfg.value.items.length] as const,
  () => {
    if (pageIndex.value > pages.value - 1) pageIndex.value = 0
  },
)

const pagedItems = computed(() => {
  const start = pageIndex.value * cfg.value.page_size
  return cfg.value.items.slice(start, start + cfg.value.page_size)
})

/** 每页两行 → 列数 = page_size / 2（8→4 列，10→5 列） */
const pagedColumns = computed(() => Math.max(1, Math.round(cfg.value.page_size / 2)))

/* ---------------- 样式 ---------------- */
const iconBoxStyle = computed(() => {
  const shape = cfg.value.icon_shape
  const style: Record<string, string> = {}
  if (shape === 'none') {
    // 无背景原图：不给底色也不给圆角，图片按原尺寸展示
    style.background = 'transparent'
    style.width = '24px'
    style.height = '24px'
  } else {
    const r = resolveIconRadius(shape)
    style.borderRadius = r > 100 ? '50%' : `${r}px`
  }
  return style
})

const subStyle = computed(() => ({
  color: cfg.value.subtitle_color,
  fontSize: `${cfg.value.subtitle_size}px`,
}))

function badgeStyle(item: CategoryNavItem) {
  return { background: resolveBadgeColor(item) }
}

/* ---------------- 点击 ---------------- */
function onItemTap(item: CategoryNavItem, index: number) {
  emit('preview-action', {
    tab: 'shop',
    message: item.link_url
      ? `点击「${item.title || `分类${index + 1}`}」→ ${shortPath(item.link_url)}`
      : `「${item.title || `分类${index + 1}`}」还没设跳转，真机点了不会有反应`,
    detailTitle: item.title,
    detailDesc: item.subtitle,
  })
}

/** 只展示路径末段，避免长 URL 把提示条撑爆 */
function shortPath(url: string): string {
  const base = url.split('?')[0]
  const tail = base.split('/').filter(Boolean).pop() || base
  return url.includes('?') ? `${tail}?…` : tail
}
</script>

<style lang="scss" scoped>
.render-category-nav {
  padding: 10px;
  background: transparent;
  transition: background 0.16s ease, box-shadow 0.16s ease;
}

/* 白色卡片模式：与页面底色分层 */
.render-category-nav.surface-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(42, 31, 23, 0.08);
}

.cnv-section-title {
  margin-bottom: 8px;
  color: #172033;
  font-size: 15px;
  font-weight: 700;
}

.cnv-items {
  display: grid;
  gap: 8px;
}

.cnv-scroll {
  display: flex;
  gap: 8px;
  padding-bottom: 4px;
  overflow-x: auto;

  .cnv-item {
    flex: none;
    width: 68px;
  }
}

.cnv-pager {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cnv-pager__page {
  display: grid;
  gap: 10px 8px;
}

/* 每页两行 → 列数 = page_size / 2（8→4 列，10→5 列），由 script 注入 gridTemplateColumns。
   ⚠️ 不用 `:has()` 判列数 —— 本项目工作台壳下 `:has()` 匹配不可靠（历史踩过），
   用计算值注入行内样式，确定性更高。*/

.cnv-pager__dots {
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
}

.cnv-pager__dot {
  width: 5px;
  height: 5px;
  background: #ddd5c9;
  border-radius: 50%;

  &.is-on {
    width: 14px;
    background: var(--el-color-primary, #c08e6e);
    border-radius: 3px;
  }
}

.cnv-item {
  position: relative;
  min-width: 0;
  padding: 8px 4px;
  text-align: center;
  border: 1px solid #e6edf6;
  border-radius: var(--card-radius, 10px);
}

.cnv-item__icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  margin: 0 auto;
  background: #eef4ff;
}

.cnv-item__img {
  width: 22px;
  height: 22px;
  object-fit: contain;
}

.cnv-item__badge {
  position: absolute;
  top: -4px;
  right: -8px;
  padding: 0 4px;
  max-width: 42px;
  overflow: hidden;
  color: #fff;
  font-size: 9px;
  line-height: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-radius: 3px;
}

.cnv-item__name {
  display: block;
  margin-top: 4px;
  overflow: hidden;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cnv-item__sub {
  display: block;
  margin-top: 1px;
  overflow: hidden;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cnv-blank {
  grid-column: 1 / -1;
  padding: 16px 0;
  color: #a3aebd;
  font-size: 11.5px;
  text-align: center;
}

/* 无背景原图：整块不设底色 */
.render-category-nav.icon-none .cnv-item__icon {
  background: transparent;
}
</style>
