<template>
  <el-container class="app-layout" :class="{ 'sidebar-collapsed': appStore.sidebarCollapsed }">
    <Sidebar />
    <el-container class="main-container">
      <el-header class="app-header" height="56px">
        <Header />
      </el-header>
      <TagsView />
      <el-main class="app-main">
        <router-view v-slot="{ Component, route }">
          <transition name="fade-transform" mode="out-in">
            <keep-alive>
              <component :is="Component" :key="route.path + '-' + appStore.reloadKey" />
            </keep-alive>
          </transition>
        </router-view>
      </el-main>
    </el-container>
    <ChangePasswordDialog />
  </el-container>
</template>

<script setup lang="ts">
import Sidebar from './Sidebar.vue'
import Header from './Header.vue'
import TagsView from './TagsView.vue'
import ChangePasswordDialog from './ChangePasswordDialog.vue'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
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
}

/* 路由切换动画 */
.fade-transform-enter-active,
.fade-transform-leave-active {
  transition: all 0.3s;
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
