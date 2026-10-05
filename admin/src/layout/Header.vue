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
        <button type="button" class="mini-site-pill" @click="router.push('/mini/releases')">
          <span class="dot" />
          <span class="pill-text">
            {{ siteLabel }}
            <template v-if="liveReleaseNo != null"> · 配置版本 {{ liveReleaseNo }}</template>
            <template v-if="pendingCount > 0"> · {{ pendingCount }} 项待同步</template>
          </span>
        </button>
      </template>
      <template v-else-if="isContentOps">
        <button type="button" class="content-top-btn" @click="router.push({ path: '/content/articles', query: { import: '1' } })">
          从链接导入
        </button>
        <button type="button" class="mini-publish-btn" @click="router.push({ path: '/content/write', query: { type: 'article' } })">
          写内容
        </button>
      </template>
      <template v-else-if="isCommerceOps">
        <input
          v-model="commerceOrderQ"
          class="commerce-order-search"
          type="search"
          placeholder="搜订单号 / 手机号"
          aria-label="搜索订单"
          @keydown.enter.prevent="goCommerceOrders"
        />
        <button type="button" class="content-top-btn" @click="goCommerceOrders">搜订单</button>
      </template>
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
            <el-dropdown-item disabled class="theme-menu-label">主题配色</el-dropdown-item>
            <el-dropdown-item command="theme-classic">
              <span class="theme-option">
                <span class="theme-swatch theme-swatch--classic" aria-hidden="true" />
                经典蓝
                <el-icon v-if="appStore.uiTheme === 'classic'" class="theme-check"><Check /></el-icon>
              </span>
            </el-dropdown-item>
            <el-dropdown-item command="theme-warm">
              <span class="theme-option">
                <span class="theme-swatch theme-swatch--warm" aria-hidden="true" />
                暖棕
                <el-icon v-if="appStore.uiTheme === 'warm'" class="theme-check"><Check /></el-icon>
              </span>
            </el-dropdown-item>
            <el-dropdown-item divided command="profile">个人中心</el-dropdown-item>
            <el-dropdown-item command="logout">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Check } from '@element-plus/icons-vue'
import { useAppStore } from '@/stores/app'
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
const isMemberOps = computed(() => route.path.startsWith('/member') || route.path.startsWith('/user'))
const isCommerceOps = computed(() =>
  route.path.startsWith('/commerce')
  || route.path.startsWith('/order')
  || route.path.startsWith('/marketing')
  || route.path.startsWith('/growth'),
)
const isWarmShell = computed(() => isMiniRoute.value || isContentOps.value || isMemberOps.value || isCommerceOps.value)

const commerceOrderQ = ref('')
function goCommerceOrders() {
  const q = commerceOrderQ.value.trim()
  router.push(q ? { path: '/commerce/orders', query: { q } } : '/commerce/orders')
}

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

const breadcrumbs = computed(() => {
  const matched = route.matched.filter((item) => item.meta?.title)
  return matched.map((item) => ({
    path: item.path,
    title: item.meta.title as string,
  }))
})

async function handleCommand(command: string) {
  if (command === 'theme-classic') {
    appStore.setUiTheme('classic')
    return
  }
  if (command === 'theme-warm') {
    appStore.setUiTheme('warm')
    return
  }
  if (command === 'profile') {
    router.push('/settings/admin-user')
    return
  }
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
    background: var(--header-mini-bg);
    border-bottom: 1px solid var(--header-border);
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
  border: 1px solid var(--wb-line);
  background: var(--wb-card);
  cursor: pointer;
  font-size: 13px;
  color: var(--wb-ink);
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
  border: 1px solid var(--el-color-primary);
  border-radius: 8px;
  background: var(--el-color-primary);
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  line-height: 1.2;
  font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
  &:hover { background: var(--el-color-primary-dark-2); border-color: var(--el-color-primary-dark-2); }
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    &:hover { background: var(--el-color-primary); border-color: var(--el-color-primary); }
  }
  .pub-badge {
    background: #fff;
    color: var(--el-color-primary);
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
  border: 1px solid var(--wb-line);
  border-radius: 8px;
  background: var(--wb-card);
  color: var(--wb-ink);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
  &:hover { border-color: var(--border-strong); }
}

.commerce-order-search {
  width: 180px;
  padding: 6px 10px;
  border: 1px solid var(--wb-line);
  border-radius: 8px;
  background: var(--wb-card);
  font-size: 13px;
  color: var(--wb-ink);
  font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
  outline: none;
  &:focus { border-color: var(--el-color-primary); }
}

.theme-menu-label {
  font-size: 12px;
  color: var(--text-muted);
  cursor: default;
}

.theme-option {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.theme-swatch {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  border: 1px solid var(--border);
  flex-shrink: 0;
}

.theme-swatch--classic {
  background: linear-gradient(135deg, #002fa7 55%, #1e293b 55%);
}

.theme-swatch--warm {
  background: linear-gradient(135deg, #b4430f 55%, #2b1d14 55%);
}

.theme-check {
  margin-left: auto;
  color: var(--el-color-primary);
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
