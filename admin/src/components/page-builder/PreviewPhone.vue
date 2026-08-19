<template>
  <div class="preview-phone">
    <div class="phone-shell" :class="{ 'phone-shell--custom-nav': hideNavBar }">
      <!-- 顶部刘海（品牌顶栏页不展示，避免顶栏上方多余元素） -->
      <div v-if="!hideNavBar" class="phone-notch"></div>

      <!-- 状态栏 -->
      <div v-if="!hideNavBar" class="phone-status-bar">
        <span class="time">{{ currentTime }}</span>
        <div class="status-icons">
          <el-icon :size="12"><Connection /></el-icon>
          <el-icon :size="12"><ChatDotRound /></el-icon>
          <el-icon :size="14"><ChromeFilled /></el-icon>
        </div>
      </div>

      <!-- 导航栏（自定义顶栏页面可隐藏） -->
      <div v-if="!hideNavBar" class="phone-nav-bar">
        <button
          class="nav-back-btn"
          type="button"
          @click.stop.prevent="handleBackClick"
          @mousedown.stop.prevent="handleBackClick"
          @touchstart.stop.prevent="handleBackClick"
        >
          <el-icon :size="18"><ArrowLeft /></el-icon>
        </button>
        <span class="nav-title">{{ pageTitle }}</span>
        <el-icon :size="18"><More /></el-icon>
      </div>

      <!-- 吸顶品牌顶栏（独立于滚动区，避免 sticky 失效） -->
      <div v-if="pinnedBrandHeader" class="phone-pinned-brand-header">
        <slot name="pinnedHeader" />
      </div>

      <!-- 页面内容（超出高度时内部滚动） -->
      <div class="phone-content" :style="{ backgroundColor: pageBgColor }">
        <slot></slot>
      </div>

      <!-- 悬浮按钮：相对手机壳固定，不随 phone-content 滚动 -->
      <div class="phone-fab-layer">
        <slot name="fab"></slot>
      </div>

      <!-- 底部 TabBar（固定，不随内容滚动） -->
      <slot name="tabbar"></slot>

      <!-- 无 TabBar 时才留底部安全区，避免 Tab 下方出现空白条 -->
      <div v-if="!$slots.tabbar" class="phone-safe-area"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const emit = defineEmits<{
  back: []
}>()

defineProps<{
  pageTitle: string
  pageBgColor: string
  /** 使用品牌顶栏组件时隐藏模拟系统导航栏 */
  hideNavBar?: boolean
  /** 品牌顶栏吸顶：顶栏渲染在 phone-content 外的固定层 */
  pinnedBrandHeader?: boolean
}>()

const currentTime = computed(() => {
  const now = new Date()
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
})

function handleBackClick() {
  emit('back')
}
</script>

<style lang="scss" scoped>
.preview-phone {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 20px;

  .phone-shell {
    width: 375px;
    height: 720px;
    display: flex;
    flex-direction: column;
    background: #f5f5f5;
    border-radius: 40px;
    box-shadow:
      0 0 0 2px #1a1a1a,
      0 0 0 4px #333,
      0 8px 40px rgba(0, 0, 0, 0.3);
    overflow: hidden;
    position: relative;
  }

  .phone-shell--custom-nav {
    position: relative;
  }

  .phone-pinned-brand-header {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 20;
  }

  .phone-notch,
  .phone-status-bar,
  .phone-nav-bar,
  .phone-safe-area {
    flex-shrink: 0;
  }

  .phone-notch {
    width: 150px;
    height: 28px;
    background: #1a1a1a;
    border-radius: 0 0 18px 18px;
    margin: 0 auto;
    position: relative;
    z-index: 1;
  }

  .phone-status-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 24px 2px;
    background: #fff;
    font-size: 12px;
    color: #333;

    .status-icons {
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }

  .phone-nav-bar {
    position: relative;
    z-index: 5;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 44px;
    padding: 0 12px;
    background: #fff;
    border-bottom: 1px solid #eee;

    .nav-back-btn {
      position: relative;
      z-index: 6;
      pointer-events: auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      color: #606266;
      background: transparent;
      border: 0;
      border-radius: 6px;
      cursor: pointer;

      &:hover {
        background: #f3f4f6;
      }
    }

    .nav-title {
      font-size: 16px;
      font-weight: 500;
      color: #333;
    }
  }

  .phone-content {
    position: relative;
    z-index: 1;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding-bottom: 20px;

    /* 隐藏滚动条，更接近真机观感 */
    scrollbar-width: none;
    &::-webkit-scrollbar {
      display: none;
    }
  }

  .phone-fab-layer {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    z-index: 25;
    pointer-events: none;
  }

  .phone-fab-layer :deep(.fab-only-wrap),
  .phone-fab-layer :deep(.render-float-button.is-overlay) {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .phone-fab-layer :deep(.float-fab) {
    pointer-events: auto;
  }

  /* TabBar 盖在悬浮层之上，避免挡操作时被 FAB 抢事件 */
  .phone-shell > .mini-bottom-tab,
  .phone-shell > [class*='tab'] {
    position: relative;
    z-index: 30;
  }

  .phone-safe-area {
    height: 34px;
    background: #f5f5f5;
  }
}
</style>
