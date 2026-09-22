<template>
  <div class="header-container" :class="{ 'is-mini': isWarmShell }">
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
      <template v-if="isMiniRoute">
        <button type="button" class="mini-site-pill" @click="router.push('/mini/overview')">
          <span class="dot" />
          <span class="pill-text">
            {{ siteLabel }}
            <template v-if="liveReleaseNo != null"> · 第 {{ liveReleaseNo }} 次发布</template>
          </span>
        </button>
        <button type="button" class="mini-publish-btn" @click="router.push('/mini/publish')">
          <el-icon><Promotion /></el-icon>
          发布
          <span v-if="pendingCount > 0" class="pub-badge">{{ pendingCount > 99 ? '99+' : pendingCount }}</span>
        </button>
      </template>
      <template v-else-if="isContentOps">
        <button type="button" class="content-top-btn" @click="router.push({ path: '/content/library', query: { import: '1' } })">
          从链接导入
        </button>
        <button type="button" class="mini-publish-btn" @click="router.push('/content/write')">
          写内容
        </button>
      </template>
      <el-select
        v-else
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
      <span v-else-if="tenantStore.current?.name && !isMiniRoute" class="tenant-label">{{ tenantStore.displayName }}</span>

      <el-dropdown trigger="click" @command="handleCommand">
        <span class="user-info" :class="{ warm: isMiniRoute }">
          <span class="avatar-wrap">
            <el-avatar :size="30" :src="userStore.userInfo?.avatar">
              {{ (userStore.userInfo?.nickname || 'B').slice(0, 1) }}
            </el-avatar>
          </span>
          <span v-if="!isMiniRoute" class="username">{{ userStore.userInfo?.nickname || '管理员' }}</span>
          <el-icon v-if="!isMiniRoute"><ArrowDown /></el-icon>
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
import { Promotion } from '@element-plus/icons-vue'
import { useAppStore, type AdminUiTheme } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import { useTenantStore } from '@/stores/tenant'
import { usePermissionStore } from '@/stores/permission'
import { useMiniPending } from '@/composables/useMiniPending'
import { ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const userStore = useUserStore()
const tenantStore = useTenantStore()
const permissionStore = usePermissionStore()
const { pendingCount, siteLabel, liveReleaseNo, refreshMiniPending } = useMiniPending(false)

const isMiniRoute = computed(() => route.path.startsWith('/mini'))
const isContentOps = computed(() => route.path.startsWith('/content') && !/^\/content\/(write|edit)/.test(route.path))
const isWarmShell = computed(() => isMiniRoute.value || isContentOps.value)

watch(
  () => route.path,
  (p) => {
    if (p.startsWith('/mini')) void refreshMiniPending()
  },
  { immediate: true },
)

const tenantSelectId = ref<number | undefined>()
const showTenantSwitcher = computed(
  () => !isWarmShell.value && permissionStore.hasRole('super_admin') && tenantStore.tenants.length > 0,
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
  &.is-mini {
    height: 60px;
    padding: 0 28px;
    gap: 14px;
    background: #ffffff;
    border-bottom: 1px solid #e8dfd3;
  }
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

.mini-site-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 320px;
  margin-left: auto;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid #e8dfd3;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
  color: #2a1f17;
  white-space: nowrap;
  font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #1f7a4d;
    flex-shrink: 0;
    display: inline-block;
  }
  .pill-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.mini-publish-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid #b4430f;
  border-radius: 8px;
  background: #b4430f;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  line-height: 1.2;
  font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
  &:hover { background: #8c3208; border-color: #8c3208; }
  .pub-badge {
    background: #fff;
    color: #b4430f;
    border-radius: 999px;
    padding: 0 7px;
    font-size: 12px;
    font-weight: 600;
    line-height: 18px;
  }
}

.content-top-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid #e8dfd3;
  border-radius: 8px;
  background: #fff;
  color: #2a1f17;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
  &:hover { border-color: #d6c8b6; }
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

  &.warm {
    background: transparent;
    border-color: transparent;
    padding: 2px;
    &:hover {
      background: transparent;
      border-color: transparent;
      box-shadow: none;
    }
  }

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
    }
  }

  .username {
    font-size: 14px;
    font-weight: 700;
  }
}
</style>
