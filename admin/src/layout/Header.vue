<template>
  <div class="header-container">
    <div class="header-left">
      <el-icon
        class="collapse-btn"
        role="button"
        tabindex="0"
        :aria-label="appStore.sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'"
        @click="appStore.toggleSidebar"
        @keydown.enter="appStore.toggleSidebar"
        @keydown.space.prevent="appStore.toggleSidebar"
      >
        <Fold v-if="!appStore.sidebarCollapsed" />
        <Expand v-else />
      </el-icon>
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
      <el-select
        :model-value="appStore.uiTheme"
        class="theme-switcher"
        size="small"
        style="width: 110px"
        @change="onThemeChange"
      >
        <el-option label="经典蓝" value="classic" />
        <el-option label="暖阁" value="warm" />
      </el-select>
      <el-select
        v-if="showTenantSwitcher"
        v-model="tenantSelectId"
        class="tenant-switcher"
        size="small"
        placeholder="切换租户"
        filterable
        @change="onTenantChange"
      >
        <el-option
          v-for="t in tenantStore.tenants"
          :key="t.id || t.tenantId"
          :label="`${t.name || t.code} (#${t.id || t.tenantId})`"
          :value="Number(t.id || t.tenantId)"
        />
      </el-select>
      <span v-else-if="tenantStore.current?.name" class="tenant-label">{{ tenantStore.displayName }}</span>

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
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore, type AdminUiTheme } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import { useTenantStore } from '@/stores/tenant'
import { usePermissionStore } from '@/stores/permission'
import { ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const userStore = useUserStore()
const tenantStore = useTenantStore()
const permissionStore = usePermissionStore()

const tenantSelectId = ref<number | undefined>()
const showTenantSwitcher = computed(
  () => permissionStore.hasRole('super_admin') && tenantStore.tenants.length > 0,
)

watch(
  () => tenantStore.activeTenantId,
  (id) => {
    if (id) tenantSelectId.value = id
  },
  { immediate: true },
)

onMounted(async () => {
  if (!tenantStore.loaded) await tenantStore.load()
  if (tenantStore.activeTenantId) tenantSelectId.value = tenantStore.activeTenantId
})

async function onTenantChange(id: number) {
  if (!id || id === tenantStore.activeTenantId) return
  try {
    await ElMessageBox.confirm(`切换到租户 #${id}？页面将刷新。`, '切换租户', {
      type: 'warning',
      confirmButtonText: '切换',
      cancelButtonText: '取消',
    })
    await tenantStore.switchTenant(id)
  } catch {
    tenantSelectId.value = tenantStore.activeTenantId || undefined
  }
}

function onThemeChange(theme: AdminUiTheme) {
  appStore.setUiTheme(theme)
}

const breadcrumbs = computed(() => {
  const matched = route.matched.filter((item) => item.meta?.title)
  return matched.map((item) => ({
    path: item.path,
    title: item.meta.title as string,
  }))
})

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
      // cancel
    }
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
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
  overflow: hidden;
}

.collapse-btn {
  font-size: 20px;
  cursor: pointer;
  color: var(--text-secondary, #333);
  border-radius: 4px;

  &:hover {
    color: var(--brand, #409eff);
  }

  &:focus-visible {
    outline: 2px solid var(--brand, #409eff);
    outline-offset: 2px;
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.tenant-switcher {
  width: 220px;
}

.tenant-label {
  font-size: 13px;
  color: #64748b;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
