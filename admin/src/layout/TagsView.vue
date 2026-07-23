<template>
  <div class="tags-view-container">
    <el-scrollbar>
      <div class="tags-view-wrapper">
        <router-link
          v-for="tag in appStore.visitedViews"
          :key="tag.path"
          :to="tag.path"
          class="tags-view-item"
          :class="{ active: isActive(tag.path) }"
          @contextmenu.prevent="openContextMenu($event, tag.path)"
        >
          <span>{{ tag.title }}</span>
          <el-icon
            v-if="!tag.affix"
            class="tag-close"
            role="button"
            tabindex="0"
            :aria-label="`关闭标签 ${tag.title}`"
            @click.prevent.stop="closeTag(tag.path)"
            @keydown.enter.prevent.stop="closeTag(tag.path)"
          >
            <Close />
          </el-icon>
        </router-link>
      </div>
    </el-scrollbar>

    <!-- A6：右键菜单，支持刷新当前/关闭其他/关闭右侧/关闭全部 -->
    <teleport to="body">
      <div
        v-if="contextMenu.visible"
        class="tags-context-menu"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      >
        <div class="menu-item" @click="handleRefresh">
          <el-icon><RefreshRight /></el-icon>
          刷新当前
        </div>
        <div
          class="menu-item"
          :class="{ disabled: isAffix(contextMenu.path) }"
          @click="handleCloseCurrent"
        >
          <el-icon><Close /></el-icon>
          关闭当前
        </div>
        <div class="menu-item" @click="handleCloseOthers">
          <el-icon><CircleClose /></el-icon>
          关闭其他
        </div>
        <div class="menu-item" @click="handleCloseRight">
          <el-icon><Right /></el-icon>
          关闭右侧
        </div>
        <div class="menu-item" @click="handleCloseAll">
          <el-icon><FolderDelete /></el-icon>
          关闭全部
        </div>
      </div>
    </teleport>
    <div v-if="contextMenu.visible" class="tags-context-mask" @click="closeContextMenu" @contextmenu.prevent="closeContextMenu"></div>
  </div>
</template>

<script setup lang="ts">
import { watch, onMounted, onBeforeUnmount, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Close, RefreshRight, CircleClose, Right, FolderDelete } from '@element-plus/icons-vue'
import { useAppStore } from '@/stores/app'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

/** 判断标签是否激活 */
function isActive(path: string): boolean {
  return route.path === path
}

function isAffix(path: string): boolean {
  return !!appStore.visitedViews.find((v) => v.path === path)?.affix
}

/** 关闭标签 */
function closeTag(path: string) {
  appStore.removeVisitedView(path)
  // 如果关闭的是当前页面，跳转到最后一个标签
  if (isActive(path)) {
    const views = appStore.visitedViews
    if (views.length > 0) {
      router.push(views[views.length - 1].path)
    } else {
      router.push('/')
    }
  }
}

/** 右键菜单状态 */
const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  path: '',
})

function openContextMenu(event: MouseEvent, path: string) {
  contextMenu.visible = true
  contextMenu.path = path
  // 简单防止菜单超出视口右侧
  const menuWidth = 132
  contextMenu.x = Math.min(event.clientX, window.innerWidth - menuWidth - 8)
  contextMenu.y = event.clientY
}

function closeContextMenu() {
  contextMenu.visible = false
}

function handleRefresh() {
  const path = contextMenu.path
  closeContextMenu()
  if (path === route.path) {
    appStore.triggerReload()
  } else {
    router.push(path)
  }
}

function handleCloseCurrent() {
  const path = contextMenu.path
  closeContextMenu()
  if (isAffix(path)) return
  closeTag(path)
}

function handleCloseOthers() {
  const path = contextMenu.path
  closeContextMenu()
  appStore.closeOtherVisitedViews(path)
  if (route.path !== path) router.push(path)
}

function handleCloseRight() {
  const path = contextMenu.path
  closeContextMenu()
  appStore.closeRightVisitedViews(path)
  if (!appStore.visitedViews.find((v) => v.path === route.path)) {
    router.push(path)
  }
}

function handleCloseAll() {
  closeContextMenu()
  appStore.closeAllVisitedViews()
  const views = appStore.visitedViews
  router.push(views.length ? views[views.length - 1].path : '/')
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') closeContextMenu()
}

/** 监听路由变化，添加标签 */
watch(
  () => route.path,
  () => {
    if (route.meta?.title && route.name) {
      appStore.addVisitedView({
        path: route.path,
        name: route.name as string,
        title: route.meta.title as string,
        affix: route.meta.affix as boolean,
      })
    }
  },
  { immediate: true }
)

/** 初始化固定标签 */
onMounted(() => {
  appStore.addVisitedView({
    path: '/dashboard',
    name: 'Dashboard',
    title: '工作台',
    affix: true,
  })
  window.addEventListener('keydown', handleEscape)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleEscape)
})
</script>

<style lang="scss" scoped>
.tags-view-container {
  height: 34px;
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
}

.tags-view-wrapper {
  display: flex;
  align-items: center;
  height: 34px;
  padding: 0 var(--space-2);
  white-space: nowrap;
}

.tags-view-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 var(--space-2);
  margin-right: 6px;
  font-size: var(--font-caption);
  color: var(--text-secondary);
  background: var(--bg-elevated);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  text-decoration: none;
  cursor: pointer;

  &:hover {
    color: var(--brand);
  }

  &.active {
    color: var(--brand);
    background-color: var(--brand-soft);
    border-color: var(--brand);
  }
}

.tag-close {
  font-size: 12px;
  border-radius: 50%;
  &:hover {
    background: var(--brand);
    color: #fff;
  }
}
</style>

<style scoped>
.tags-context-mask {
  position: fixed;
  inset: 0;
  z-index: var(--z-dropdown, 1000);
}

.tags-context-menu {
  position: fixed;
  z-index: calc(var(--z-dropdown, 1000) + 1);
  min-width: 128px;
  padding: 4px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-md);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  color: var(--text);
  font-size: 13px;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background: var(--bg-page);
    color: var(--brand);
  }

  &.disabled {
    color: var(--text-muted);
    cursor: not-allowed;

    &:hover {
      background: transparent;
      color: var(--text-muted);
    }
  }
}
</style>
