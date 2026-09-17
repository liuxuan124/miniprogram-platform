<template>
  <el-container class="app-layout" :class="{ 'sidebar-collapsed': appStore.sidebarCollapsed }">
    <Sidebar />
    <el-container class="main-container">
      <el-header class="app-header" height="56px">
        <Header />
      </el-header>
      <TagsView />
      <el-main class="app-main">
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
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const appStore = useAppStore()
const switching = ref(false)
const router = useRouter()
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

.app-layout.sidebar-collapsed {
  padding-left: 72px;
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

.app-header {
  padding: 0;
  border-bottom: 1px solid #e6e6e6;
  background: #fff;
  flex-shrink: 0;
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
