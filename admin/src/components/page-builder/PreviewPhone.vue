<template>
  <div class="preview-phone">
    <div class="phone-shell">
      <!-- 顶部刘海 -->
      <div class="phone-notch"></div>

      <!-- 状态栏 -->
      <div class="phone-status-bar">
        <span class="time">{{ currentTime }}</span>
        <div class="status-icons">
          <el-icon :size="12"><Connection /></el-icon>
          <el-icon :size="12"><ChatDotRound /></el-icon>
          <el-icon :size="14"><ChromeFilled /></el-icon>
        </div>
      </div>

      <!-- 导航栏 -->
      <div class="phone-nav-bar">
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

      <!-- 页面内容 -->
      <div class="phone-content" :style="{ backgroundColor: pageBgColor }">
        <slot></slot>
      </div>

      <!-- 底部安全区 -->
      <div class="phone-safe-area"></div>
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
    min-height: 720px;
    background: #f5f5f5;
    border-radius: 40px;
    box-shadow:
      0 0 0 2px #1a1a1a,
      0 0 0 4px #333,
      0 8px 40px rgba(0, 0, 0, 0.3);
    overflow: hidden;
    position: relative;
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
    min-height: 500px;
    overflow-y: auto;
    padding-bottom: 20px;
  }

  .phone-safe-area {
    height: 34px;
    background: #f5f5f5;
  }
}
</style>
