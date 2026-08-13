<template>
  <div
    class="render-member-card split-text-typography"
    :class="{ clickable: previewMode }"
    @click="onCardClick"
  >
    <div class="member-bg" :class="themeClass" :style="cardSurfaceStyle">
      <div class="member-row">
        <div class="member-avatar">👤</div>
        <div class="member-user">
          <div class="member-title-row">
            <div class="member-title" :style="titleStyle">{{ component.props.title || '会员权益' }}</div>
            <button
              v-if="showUpgrade"
              type="button"
              class="upgrade-btn"
              :style="upgradeStyle"
              @click.stop="onUpgrade"
            >
              {{ component.props.upgrade_text || '升级会员' }}
            </button>
          </div>
          <div v-if="showLevel" class="member-subtitle" :style="subtitleStyle">{{ subtitle }}</div>
        </div>
      </div>

      <div v-if="benefitTags.length" class="member-benefits">
        <span v-for="(tag, i) in benefitTags" :key="i" class="benefit-tag" :style="benefitStyle">{{ tag }}</span>
      </div>

      <div v-if="statItems.length" class="member-info-row">
        <span v-for="item in statItems" :key="item.label">
          <b :style="statValueStyle">{{ item.value }}</b>
          <em :style="statLabelStyle">{{ item.label }}</em>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { normalizeUploadUrl } from '@/api/system'
import type { ComponentInstance } from '@/types/page'
import { titleFontStyle } from '../composables/titleFontStyle'

const DEFAULT_LINK = '/pages/member-center/member-center'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const emit = defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()

const showLevel = computed(() => props.component.props?.show_level !== false)
const showPoints = computed(() => props.component.props?.show_points !== false)
const showBalance = computed(() => props.component.props?.show_balance !== false)
const showCoupons = computed(() => props.component.props?.show_coupons !== false)
const showUpgrade = computed(() => props.component.props?.show_upgrade !== false)

const subtitle = computed(() => props.component.props?.subtitle || '点击查看权益')
const titleStyle = computed(() => titleFontStyle(props.component.props?.title_font_size, 15))
const subtitleStyle = computed(() => titleFontStyle(props.component.props?.subtitle_font_size, 11))
const benefitStyle = computed(() => titleFontStyle(props.component.props?.benefit_font_size, 10))
const statValueStyle = computed(() => titleFontStyle(props.component.props?.stat_value_font_size, 16))
const statLabelStyle = computed(() => titleFontStyle(props.component.props?.stat_label_font_size, 10))
const upgradeStyle = computed(() => titleFontStyle(props.component.props?.upgrade_font_size, 11))

const benefitTags = computed(() => {
  const raw = props.component.props?.benefits
  if (!Array.isArray(raw)) return []
  return raw.map((x: any) => String(x || '').trim()).filter(Boolean).slice(0, 6)
})

const bgMode = computed(() => {
  const mode = props.component.props?.bg_mode
  if (mode === 'image' || mode === 'gradient') return mode
  return props.component.props?.background_image ? 'image' : 'gradient'
})

const bgImage = computed(() => normalizeUploadUrl(String(props.component.props?.background_image || '')))

const themeClass = computed(() => {
  if (bgMode.value === 'image' && bgImage.value) return 'theme-image'
  return `theme-${props.component.props?.theme || 'blue'}`
})

const cardSurfaceStyle = computed<Record<string, string>>(() => {
  const styleRadius = props.component.style?.border_radius
  const radius = styleRadius === undefined || styleRadius === null
    ? Number(props.component.props?.border_radius ?? 14)
    : Number(styleRadius)
  const style: Record<string, string> = { borderRadius: `${radius}px` }
  if (bgMode.value === 'image' && bgImage.value) {
    style.backgroundImage = `url(${bgImage.value})`
    style.backgroundSize = 'cover'
    style.backgroundPosition = 'center'
  }
  // 样式面板背景色作用在卡面本身，避免外层垫色露出「三面有色」
  const bgColor = props.component.style?.background_color
  if (bgColor && bgMode.value === 'gradient') {
    style.background = bgColor
  }
  return style
})

const statItems = computed(() => {
  const items: Array<{ label: string; value: string }> = []
  if (showPoints.value) items.push({ label: '积分', value: '1280' })
  if (showBalance.value) items.push({ label: '余额', value: '¥268' })
  if (showCoupons.value) items.push({ label: '优惠券', value: '3' })
  return items
})

function emitNav(message: string, link: string) {
  if (!props.previewMode) return
  emit('preview-action', {
    tab: 'member',
    message: `${message}：${link || DEFAULT_LINK}`,
    detailType: 'member',
    detailTitle: props.component.props?.title || '会员权益',
    detailDesc: message,
  })
}

function onCardClick() {
  emitNav('打开会员中心', props.component.props?.link_url || DEFAULT_LINK)
}

function onUpgrade() {
  emitNav(
    props.component.props?.upgrade_text || '升级会员',
    props.component.props?.upgrade_link || DEFAULT_LINK,
  )
}
</script>

<style lang="scss" scoped>
.render-member-card {
  padding: 0;

  &.clickable {
    cursor: pointer;
  }

  .member-bg {
    padding: 16px;
    color: var(--component-text-color, #fff);
    background: linear-gradient(135deg, #0f2150, var(--theme-primary, #1769ff));
    background-size: cover;
    background-position: center;
    overflow: hidden;

    &.theme-image {
      background-color: #0f2150;
      position: relative;

      &::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, rgba(15, 33, 80, 0.25), rgba(15, 33, 80, 0.55));
        pointer-events: none;
      }

      > * {
        position: relative;
        z-index: 1;
      }
    }

    &.theme-purple {
      background: linear-gradient(135deg, #7c3aed, #a855f7);
    }

    &.theme-dark {
      background: linear-gradient(135deg, #111827, #374151);
    }

    &.theme-gold {
      background: linear-gradient(135deg, #b45309, #f59e0b);
    }
  }

  .member-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }

  .member-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    background: rgba(255, 255, 255, 0.16);
    border-radius: 999px;
  }

  .member-user {
    flex: 1;
    min-width: 0;
  }

  .member-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .member-title {
    flex: 1;
    min-width: 0;
    font-size: 15px;
    font-weight: 800;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .upgrade-btn {
    flex-shrink: 0;
    height: auto;
    min-height: 24px;
    padding: 2px 10px;
    color: #0f2150;
    font-size: 11px;
    font-weight: 700;
    background: #fff;
    border: 0;
    border-radius: 999px;
    cursor: pointer;
    white-space: nowrap;
  }

  .member-subtitle {
    margin-top: 2px;
    font-size: 11px;
    opacity: 0.78;
  }

  .member-benefits {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 10px;
  }

  .benefit-tag {
    padding: 2px 8px;
    font-size: 10px;
    background: rgba(255, 255, 255, 0.16);
    border-radius: 999px;
  }

  .member-info-row {
    display: flex;
    justify-content: space-around;
    margin-top: 14px;
    text-align: center;

    span {
      display: flex;
      flex-direction: column;
    }

    b {
      font-size: 16px;
      line-height: 1.2;
    }

    em {
      margin-top: 3px;
      font-size: 10px;
      font-style: normal;
      opacity: 0.75;
    }
  }
}
</style>
