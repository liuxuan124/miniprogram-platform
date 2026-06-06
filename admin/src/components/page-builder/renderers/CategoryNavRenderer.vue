<template>
  <div class="render-category-nav">
    <div class="section-title">{{ component.props.title || '分类导航' }}</div>
    <div
      class="category-nav-items"
      :class="[`layout-${categoryNavLayout}`, `icon-${categoryNavIconStyle}`]"
      :style="categoryNavGridStyle"
    >
      <div v-for="(item, i) in categoryNavItems" :key="`cat-${i}`" class="category-nav-item">
        <span class="icon">
          <img v-if="isImageIcon(item.icon)" :src="item.icon" alt="" class="category-icon-img" />
          <template v-else>{{ item.icon || '📌' }}</template>
        </span>
        <span class="name">{{ item.title || `分类${i + 1}` }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ComponentInstance } from '@/types/page'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()

const categoryNavItems = computed<any[]>(() => {
  const items = props.component.props?.items
  return Array.isArray(items) ? items : []
})

const categoryNavLayout = computed<string>(() => {
  const raw = String(props.component.props?.layout || 'grid-3')
  const valid = ['grid-2', 'grid-3', 'grid-4', 'scroll', 'pill', 'list']
  return valid.includes(raw) ? raw : 'grid-3'
})

const categoryNavIconStyle = computed<string>(() => {
  const raw = String(props.component.props?.icon_style || 'circle')
  const valid = ['plain', 'circle', 'square']
  return valid.includes(raw) ? raw : 'circle'
})

const categoryNavGridStyle = computed<Record<string, string>>(() => {
  const style: Record<string, string> = {}
  if (['scroll', 'pill', 'list'].includes(categoryNavLayout.value)) return style
  const col = Number(props.component.props?.columns || (categoryNavLayout.value === 'grid-4' ? 4 : 3))
  const safeCol = Math.min(5, Math.max(2, Number.isFinite(col) ? col : 3))
  style.gridTemplateColumns = `repeat(${safeCol}, minmax(0, 1fr))`
  return style
})

function isImageIcon(icon?: string): boolean {
  if (!icon) return false
  return /^(https?:\/\/|\/|data:image|\.\/|\.\.\/)/i.test(icon.trim())
}
</script>

<style lang="scss" scoped>
.render-category-nav {
  padding: 10px;
  background: #fff;

  .section-title {
    margin-bottom: 8px;
    color: #172033;
    font-size: 15px;
    font-weight: 700;
  }

  .category-nav-items {
    display: grid;
    gap: 8px;

    &.layout-grid-3 {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    &.layout-grid-4 {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    &.layout-grid-2 {
      grid-template-columns: repeat(2, minmax(0, 1fr));

      .category-nav-item {
        display: flex;
        align-items: center;
        gap: 8px;
        text-align: left;

        .icon {
          flex-shrink: 0;
          margin: 0;
        }

        .name {
          margin-top: 0;
          font-size: 12px;
          font-weight: 700;
        }
      }
    }

    &.layout-scroll {
      display: flex;
      overflow-x: auto;
    }

    &.layout-pill {
      display: flex;
      flex-wrap: wrap;

      .category-nav-item {
        width: auto;
        min-width: 0;
        padding: 6px 10px;
        border-radius: 999px;

        .icon {
          display: none;
        }
      }
    }

    &.layout-list {
      display: flex;
      flex-direction: column;
      gap: 6px;

      .category-nav-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px;
        text-align: left;

        .icon {
          flex-shrink: 0;
          margin: 0;
        }

        .name {
          margin-top: 0;
          font-size: 13px;
          font-weight: 700;
        }
      }
    }
  }

  .category-nav-item {
    min-width: 0;
    padding: 8px;
    border: 1px solid #e6edf6;
    border-radius: 10px;
    text-align: center;

    .icon {
      display: block;
      font-size: 18px;
      width: 28px;
      height: 28px;
      margin: 0 auto;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #eef4ff;

      .category-icon-img {
        width: 20px;
        height: 20px;
        object-fit: contain;
      }
    }

    .name {
      display: block;
      margin-top: 4px;
      color: #475569;
      font-size: 11px;
    }
  }

  .category-nav-items.icon-square {
    .category-nav-item .icon {
      border-radius: 8px;
      background: #eef4ff;
    }
  }

  .category-nav-items.icon-plain {
    .category-nav-item .icon {
      background: transparent;
      width: auto;
      height: auto;
    }
  }
}
</style>
