<template>
  <div class="header-container">
    <div class="header-left">
      <!-- 折叠按钮 -->
      <el-icon class="collapse-btn" @click="appStore.toggleSidebar">
        <Fold v-if="!appStore.sidebarCollapsed" />
        <Expand v-else />
      </el-icon>
      <!-- 面包屑导航 -->
      <el-breadcrumb separator="/">
        <el-breadcrumb-item
          v-for="item in breadcrumbs"
          :key="item.path"
          :to="item.path"
        >
          {{ item.title }}
        </el-breadcrumb-item>
      </el-breadcrumb>
    </div>
    <div class="header-right">
      <!-- 用户下拉菜单 -->
      <el-dropdown trigger="click" @command="handleCommand">
        <span class="user-info">
          <span class="avatar-wrap">
            <el-avatar :size="30" :src="userStore.userInfo?.avatar" />
          </span>
          <span class="username">{{ userStore.userInfo?.nickname || '管理员' }}</span>
          <el-icon><ArrowDown /></el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="profile">个人中心</el-dropdown-item>
            <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import { ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const userStore = useUserStore()

/** 面包屑数据 */
const breadcrumbs = computed(() => {
  const matched = route.matched.filter((item) => item.meta?.title)
  return matched.map((item) => ({
    path: item.path,
    title: item.meta.title as string,
  }))
})

/** 下拉菜单命令处理 */
async function handleCommand(command: string) {
  if (command === 'logout') {
    try {
      await ElMessageBox.confirm('确定退出登录吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      })
      await userStore.logout()
      router.push('/login')
    } catch {
      // 取消退出
    }
  } else if (command === 'profile') {
    // TODO: 跳转个人中心
  }
}
</script>

<style lang="scss" scoped>
.header-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.collapse-btn {
  font-size: 20px;
  cursor: pointer;
  color: #333;
  &:hover {
    color: #409eff;
  }
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  padding: 4px 10px 4px 6px;
  background: #f8faff;
  border: 1px solid #e3e8f0;
  border-radius: 12px;
  cursor: pointer;
  color: #172033;
  transition: background 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;

  &:hover {
    background: #eaf2ff;
    border-color: #bfdbfe;
    box-shadow: 0 8px 18px rgba(23, 105, 255, 0.1);
  }

  .avatar-wrap {
    position: relative;
    display: inline-flex;

    &::after {
      position: absolute;
      right: 0;
      bottom: 1px;
      width: 8px;
      height: 8px;
      content: '';
      background: #22c55e;
      border: 2px solid #fff;
      border-radius: 50%;
      box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.18);
    }
  }

  .username {
    font-size: 14px;
    font-weight: 700;
  }
}
</style>
