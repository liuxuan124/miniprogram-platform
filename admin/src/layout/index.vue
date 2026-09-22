<template>
  <el-container
    class="app-layout"
    :class="{ 'sidebar-collapsed': appStore.sidebarCollapsed, 'is-mini': isMiniRoute }"
  >
    <Sidebar />
    <el-container class="main-container">
      <el-header
        class="app-header"
        :class="{ 'is-mini': isMiniRoute }"
        :height="isMiniRoute ? '60px' : '56px'"
      >
        <Header />
      </el-header>
      <TagsView v-if="!isMiniRoute" />
      <el-main class="app-main" :class="{ 'is-mini': isMiniRoute }">
        <div v-if="switching" class="route-skeleton" role="status" aria-live="polite" aria-label="页面加载中">
          <div class="sk-line" />
          <div class="sk-line" />
          <div class="sk-line sk-line--short" />
        </div>
        <router-view v-slot="{ Component, route }">
          <transition name="fade-transform">
            <keep-alive>
              <component :is="Component" :key="route.path + '-' + appStore.reloadKey" />
            </keep-alive>
          </transition>
        </router-view>
      </el-main>
    </el-container>
    <ChangePasswordDialog />
    <CommandPalette />
  </el-container>
</template>

<script setup lang="ts">
import Sidebar from './Sidebar.vue'
import Header from './Header.vue'
import TagsView from './TagsView.vue'
import ChangePasswordDialog from './ChangePasswordDialog.vue'
import CommandPalette from '@/components/CommandPalette.vue'
import { useAppStore } from '@/stores/app'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const appStore = useAppStore()
const switching = ref(false)
const router = useRouter()
const route = useRoute()
const isMiniRoute = computed(() => route.path.startsWith('/mini'))
let switchTimer = 0
router.beforeEach((to, from) => {
  if (to.path === from.path) return
  switching.value = true
})
router.afterEach(() => {
  window.clearTimeout(switchTimer)
  switchTimer = window.setTimeout(() => { switching.value = false }, 160)
})
</script>

<style lang="scss" scoped>
.app-layout {
  width: 100%;
  min-height: 100vh;
  height: auto !important;
  box-sizing: border-box;
  padding-left: 220px;
  transition: padding-left 0.3s ease;
}

/*
 * /mini：侧栏占文档流（Sidebar.is-mini-shell）；壳锁 100vh，仅右侧 main 纵向滚动。
 */
.app-layout.is-mini {
  padding-left: 0;
  height: 100vh !important;
  min-height: 100vh;
  overflow: hidden;
}

.app-layout.sidebar-collapsed {
  padding-left: 72px;
}

.app-layout.is-mini.sidebar-collapsed {
  padding-left: 0;
}

.main-container {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.app-layout.is-mini .main-container {
  min-height: 0;
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
}

.app-header {
  padding: 0;
  border-bottom: 1px solid #e6e6e6;
  background: #fff;
  flex-shrink: 0;

  /* Header.vue 里 /mini 的条是 60px，外层壳必须同高，否则内容会被压掉 4px */
  &.is-mini {
    border-bottom: 0;
    position: sticky;
    top: 0;
    z-index: 20;
  }
}

.app-main {
  padding: 20px;
  background: var(--bg-page);
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  height: auto !important;
  overflow-x: auto !important;
  overflow-y: visible !important;
  min-height: calc(100vh - 56px - 34px);
  box-sizing: border-box;
  position: relative;
  &.is-mini {
    padding: 0;
    background: #f6f2ec;
    min-height: 0;
    flex: 1 0 auto;
    overflow-x: hidden !important;
    overflow-y: visible !important;
  }
}

.route-skeleton {
  position: absolute;
  inset: 20px;
  z-index: 5;
  pointer-events: none;
  display: grid;
  align-content: start;
  gap: 12px;
}

.sk-line {
  height: 16px;
  border-radius: 8px;
  background: linear-gradient(90deg, #eef1f6 25%, #f7f8fb 50%, #eef1f6 75%);
  background-size: 200% 100%;
  animation: sk-shimmer 0.9s linear infinite;
}

.sk-line--short { width: 40%; }

@keyframes sk-shimmer {
  from { background-position: 100% 0; }
  to { background-position: -100% 0; }
}

/* 路由切换动画 */
.fade-transform-enter-active,
.fade-transform-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.fade-transform-enter-from {
  opacity: 0;
  transform: translateX(-10px);
}

.fade-transform-leave-to {
  opacity: 0;
  transform: translateX(10px);
}
</style>
