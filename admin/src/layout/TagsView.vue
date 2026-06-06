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
        >
          <span>{{ tag.title }}</span>
          <el-icon
            v-if="!tag.affix"
            class="tag-close"
            @click.prevent.stop="closeTag(tag.path)"
          >
            <Close />
          </el-icon>
        </router-link>
      </div>
    </el-scrollbar>
    <!-- 右键菜单（后续扩展） -->
  </div>
</template>

<script setup lang="ts">
import { watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

/** 判断标签是否激活 */
function isActive(path: string): boolean {
  return route.path === path
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
})
</script>

<style lang="scss" scoped>
.tags-view-container {
  height: 34px;
  background: #fff;
  border-bottom: 1px solid #e6e6e6;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.04);
}

.tags-view-wrapper {
  display: flex;
  align-items: center;
  height: 34px;
  padding: 0 10px;
  white-space: nowrap;
}

.tags-view-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 8px;
  margin-right: 6px;
  font-size: 12px;
  color: #666;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 3px;
  text-decoration: none;
  cursor: pointer;

  &:hover {
    color: #409eff;
  }

  &.active {
    color: #409eff;
    background-color: #ecf5ff;
    border-color: #409eff33;
  }
}

.tag-close {
  font-size: 12px;
  border-radius: 50%;
  &:hover {
    background: #409eff;
    color: #fff;
  }
}
</style>
