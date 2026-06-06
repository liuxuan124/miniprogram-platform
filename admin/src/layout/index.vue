<template>
  <el-container class="app-layout">
    <Sidebar />
    <el-container class="main-container" :class="{ 'sidebar-collapsed': appStore.sidebarCollapsed }">
      <el-header class="app-header" height="56px">
        <Header />
      </el-header>
      <TagsView />
      <el-main class="app-main">
        <router-view v-slot="{ Component }">
          <transition name="fade-transform" mode="out-in">
            <keep-alive>
              <component :is="Component" />
            </keep-alive>
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import Sidebar from './Sidebar.vue'
import Header from './Header.vue'
import TagsView from './TagsView.vue'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
</script>

<style lang="scss" scoped>
.app-layout {
  width: 100%;
  height: 100%;
}

.main-container {
  margin-left: 220px;
  transition: margin-left 0.3s ease;
  min-height: 100%;
  position: relative;
}

.main-container.sidebar-collapsed {
  margin-left: 72px;
}

.app-header {
  padding: 0;
  border-bottom: 1px solid #e6e6e6;
  background: #fff;
}

.app-main {
  padding: 20px;
  background: #f4f6fb;
  min-height: calc(100vh - 56px - 34px);
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
