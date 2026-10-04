<template>
  <el-container
    class="app-layout"
    :class="{
      'sidebar-collapsed': appStore.sidebarCollapsed && !isContentEditor,
      'is-mini': isWarmShell,
      'is-content-editor': isContentEditor,
    }"
  >
    <Sidebar v-if="!isContentEditor" />
    <el-container class="main-container">
      <el-header
        v-if="!isContentEditor"
        class="app-header"
        :class="{ 'is-mini': isWarmShell }"
        :height="isWarmShell ? '60px' : '56px'"
      >
        <Header />
      </el-header>
      <TagsView v-if="!isWarmShell" />
      <el-main class="app-main" :class="{ 'is-mini': isWarmShell, 'is-content-editor': isContentEditor }">
        <router-view v-slot="{ Component, route }">
          <transition name="fade-transform">
            <!-- 内容编辑器不缓存、按 fullPath 重建：type/id 变化必须销毁旧编辑会话，
                 否则地址已切、编辑器仍是上一类型与未保存输入（QA P1-01/P1-02） -->
            <keep-alive v-if="!isContentEditor">
              <component :is="Component" :key="route.path + '-' + appStore.reloadKey" />
            </keep-alive>
            <component v-else :is="Component" :key="route.fullPath + '-' + appStore.reloadKey" />
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
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const appStore = useAppStore()
const route = useRoute()
const isContentEditor = computed(() => /^\/content\/(write|edit)(\/|$)/.test(route.path))
const isContentOps = computed(() => route.path.startsWith('/content') && !isContentEditor.value)
const isMemberOps = computed(() => route.path.startsWith('/member') || route.path.startsWith('/user'))
const isCommerceOps = computed(() =>
  route.path.startsWith('/commerce')
  || route.path.startsWith('/order')
  || route.path.startsWith('/marketing')
  || route.path.startsWith('/growth'),
)
const isWarmShell = computed(() => route.path.startsWith('/mini') || isContentOps.value || isMemberOps.value || isCommerceOps.value)
/** @deprecated use isWarmShell — kept for Header/Sidebar that still read mini */
const isMiniRoute = isWarmShell
</script>

<style lang="scss" scoped>
.app-layout {
  width: 100%;
  min-height: 100vh;
  height: auto !important;
  box-sizing: border-box;
  padding-left: 216px;
}

:global(html.sidebar-width-animate) .app-layout {
  transition: padding-left 0.2s ease;
}

/* 工作台壳：锁 100vh，仅右侧 main 纵向滚动 */
.app-layout.is-mini {
  height: 100vh !important;
  min-height: 100vh;
  overflow: hidden;
}

.app-layout.sidebar-collapsed {
  padding-left: 72px;
}

.app-layout.is-content-editor {
  padding-left: 0 !important;
  height: 100vh !important;
  min-height: 100vh;
  overflow-x: hidden;
  overflow-y: auto;
}

.app-layout.is-content-editor .main-container {
  height: auto;
  min-height: 100%;
  overflow: visible;
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
  border-bottom: 1px solid var(--header-border);
  background: var(--header-mini-bg);
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
    background: var(--wb-bg);
    min-height: 0;
    flex: 1 0 auto;
    overflow-x: hidden !important;
    overflow-y: visible !important;
  }
  &.is-content-editor {
    padding: 0;
    background: var(--wb-bg);
    min-height: 100%;
    height: auto !important;
    overflow-x: hidden !important;
    overflow-y: auto !important;
    flex: 1 1 auto;
  }
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
