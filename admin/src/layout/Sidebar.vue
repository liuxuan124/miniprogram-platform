<template>
  <el-aside class="app-sidebar" :width="appStore.sidebarCollapsed ? '72px' : '220px'">
    <div class="brand">
      <div class="brand-icon">
        <img src="/logo.svg" alt="" width="40" height="40" />
      </div>
      <div v-show="!appStore.sidebarCollapsed" class="brand-text">
        <strong>小程序运营系统</strong>
        <span>多场景搭建与运营平台</span>
      </div>
    </div>

    <el-scrollbar class="menu-scroll">
      <div v-for="group in menuGroups" :key="group.title" class="menu-group">
        <div v-show="!appStore.sidebarCollapsed" class="group-title">{{ group.title }}</div>

        <template v-for="item in group.children" :key="item.path || item.title">
          <!-- 可展开分组（财务） -->
          <div v-if="item.children?.length" class="submenu">
            <button
              class="menu-item"
              :class="{ active: isParentActive(item), open: isOpen(item) }"
              :title="item.title"
              @click="toggleSubmenu(item)"
            >
              <span class="menu-icon"><el-icon :size="18"><component :is="iconMap[item.icon]" /></el-icon></span>
              <span v-show="!appStore.sidebarCollapsed" class="menu-title">{{ item.title }}</span>
              <el-icon
                v-show="!appStore.sidebarCollapsed"
                class="menu-arrow"
                :class="{ open: isOpen(item) }"
                :size="14"
              >
                <ArrowRight />
              </el-icon>
            </button>
            <div v-show="isOpen(item) && !appStore.sidebarCollapsed" class="submenu-list">
              <button
                v-for="child in item.children"
                :key="child.path"
                class="menu-item sub"
                :class="{ active: isActive(child) }"
                :title="child.title"
                @click="go(child.path!)"
              >
                <span class="menu-title">{{ child.title }}</span>
              </button>
            </div>
          </div>

          <!-- 普通菜单项 -->
          <button
            v-else
            class="menu-item"
            :class="{ active: isActive(item) }"
            :title="item.title"
            @click="go(item.path!)"
          >
            <span class="menu-icon"><el-icon :size="18"><component :is="iconMap[item.icon]" /></el-icon></span>
            <span v-show="!appStore.sidebarCollapsed" class="menu-title">{{ item.title }}</span>
          </button>
        </template>
      </div>
    </el-scrollbar>
  </el-aside>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { usePermissionStore } from '@/stores/permission'
import {
  Odometer,
  Document,
  Brush,
  Cellphone,
  Reading,
  DocumentCopy,
  GoldMedal,
  User,
  Goods,
  Box,
  Present,
  Ticket,
  Flag,
  Calendar,
  Money,
  Tickets,
  TrendCharts,
  Aim,
  Document as InvoiceIcon,
  Lock,
  MagicStick,
  Picture,
  Setting,
  ArrowRight,
  Guide,
  Upload,
} from '@element-plus/icons-vue'

interface MenuItem {
  title: string
  path?: string
  icon: string
  activePrefix?: string
  children?: MenuItem[]
  /** 需要任一权限码；空则不限制（超管仍全部可见） */
  permissions?: string[]
}

const iconMap: Record<string, any> = {
  Odometer,
  Document,
  Brush,
  Cellphone,
  Reading,
  DocumentCopy,
  GoldMedal,
  User,
  Goods,
  Box,
  Present,
  Ticket,
  Flag,
  Calendar,
  Money,
  Tickets,
  TrendCharts,
  Aim,
  InvoiceIcon,
  Lock,
  MagicStick,
  Picture,
  Setting,
  Guide,
  Upload,
}

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const permissionStore = usePermissionStore()
const openKeys = ref<string[]>([])

const rawMenuGroups: Array<{ title: string; children: MenuItem[] }> = [
  {
    title: '总览',
    children: [
      { title: '工作台', path: '/dashboard', icon: 'Odometer', activePrefix: '/dashboard' },
    ],
  },
  {
    title: '小程序',
    children: [
      { title: '页面', path: '/page-builder/list', icon: 'Document', activePrefix: '/page-builder/list', permissions: ['page:list'] },
      { title: '导航与外观', path: '/page-builder/start', icon: 'Cellphone', activePrefix: '/page-builder/start', permissions: ['page:list'] },
      { title: '发布', path: '/page-builder/release', icon: 'Upload', activePrefix: '/page-builder/release', permissions: ['page:publish', 'page:list'] },
      { title: '模板', path: '/page-builder/template-center', icon: 'Brush', activePrefix: '/page-builder/template-center', permissions: ['page:list'] },
    ],
  },
  {
    title: '内容运营',
    children: [
      { title: '内容管理', path: '/content/article', icon: 'Reading', activePrefix: '/content' },
      { title: '表单管理', path: '/form/template', icon: 'DocumentCopy', activePrefix: '/form' },
    ],
  },
  {
    title: '用户与会员',
    children: [
      { title: '会员管理', path: '/member/list', icon: 'GoldMedal', activePrefix: '/member', permissions: ['member:list'] },
      { title: '用户管理', path: '/user/list', icon: 'User', activePrefix: '/user', permissions: ['user:list'] },
    ],
  },
  {
    title: '商业变现',
    children: [
      { title: '商品管理', path: '/commerce/product', icon: 'Goods', activePrefix: '/commerce' },
      { title: '订单管理', path: '/order/list', icon: 'Box', activePrefix: '/order', permissions: ['order:list'] },
      { title: '优惠券', path: '/marketing/coupon', icon: 'Ticket', activePrefix: '/marketing' },
    ],
  },
  {
    title: '活动与预约',
    children: [
      { title: '活动管理', path: '/activity/list', icon: 'Flag', activePrefix: '/activity' },
      {
        title: '预约管理',
        icon: 'Calendar',
        activePrefix: '/appointment',
        path: '/appointment/list',
        children: [
          { title: '预约看板', path: '/appointment/list', icon: 'Calendar', activePrefix: '/appointment/list' },
          { title: '预约服务', path: '/appointment/service', icon: 'Guide', activePrefix: '/appointment/service' },
          { title: '预约时段', path: '/appointment/slot', icon: 'Ticket', activePrefix: '/appointment/slot' },
        ],
      },
    ],
  },
  {
    title: '经营',
    children: [
      {
        title: '财务管理',
        icon: 'Money',
        activePrefix: '/finance',
        path: '/finance/dashboard',
        children: [
          { title: '财务概览', path: '/finance/dashboard', icon: 'Money', activePrefix: '/finance/dashboard' },
          { title: '收支明细', path: '/finance/income-expense', icon: 'Tickets', activePrefix: '/finance/income-expense' },
          { title: '财务报表', path: '/finance/report', icon: 'TrendCharts', activePrefix: '/finance/report' },
          { title: '预算管理', path: '/finance/budget', icon: 'Aim', activePrefix: '/finance/budget' },
          { title: '发票与税务', path: '/finance/invoice', icon: 'InvoiceIcon', activePrefix: '/finance/invoice' },
          { title: '财务权限', path: '/finance/permission', icon: 'Lock', activePrefix: '/finance/permission' },
        ],
      },
      { title: '智能 Agent', path: '/ai/agent', icon: 'MagicStick', activePrefix: '/ai' },
    ],
  },
  {
    title: '系统',
    children: [
      { title: '素材库', path: '/asset/list', icon: 'Picture', activePrefix: '/asset' },
      { title: '系统设置', path: '/settings/basic', icon: 'Setting', activePrefix: '/settings' },
    ],
  },
]

function allowMenuItem(item: MenuItem): boolean {
  if (!item.permissions?.length) return true
  return permissionStore.hasAnyPerm(item.permissions)
}

const menuGroups = computed(() =>
  rawMenuGroups
    .map((group) => ({
      ...group,
      children: group.children
        .map((item) => {
          if (item.children?.length) {
            const children = item.children.filter(allowMenuItem)
            return { ...item, children }
          }
          return item
        })
        .filter((item) => {
          if (item.children) return item.children.length > 0 || allowMenuItem(item)
          return allowMenuItem(item)
        }),
    }))
    .filter((g) => g.children.length > 0),
)

function isActive(item: MenuItem) {
  if (!item.path && !item.activePrefix) return false
  if (item.path && route.path === item.path) return true
  return item.activePrefix ? route.path.startsWith(item.activePrefix) : false
}

function isParentActive(item: MenuItem) {
  return item.activePrefix ? route.path.startsWith(item.activePrefix) : false
}

function isOpen(item: MenuItem) {
  return openKeys.value.includes(item.title)
}

function toggleSubmenu(item: MenuItem) {
  if (appStore.sidebarCollapsed) {
    go(item.path || item.children?.[0]?.path || '/finance/dashboard')
    return
  }
  if (isOpen(item)) {
    openKeys.value = openKeys.value.filter((k) => k !== item.title)
  } else {
    openKeys.value = [...openKeys.value, item.title]
  }
}

function go(path: string) {
  router.push(path)
}

watch(
  () => route.path,
  (path) => {
    if (path.startsWith('/finance') && !openKeys.value.includes('财务管理')) {
      openKeys.value = [...openKeys.value, '财务管理']
    }
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
.app-sidebar {
  background: var(--sidebar-bg);
  color: var(--sidebar-text);
  overflow: hidden;
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 1001;
  transition: width 0.2s ease;
}

.brand {
  height: 72px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.brand-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
  display: grid;
  place-items: center;

  img {
    display: block;
    width: 40px;
    height: 40px;
  }
}

.brand-text {
  min-width: 0;

  strong {
    display: block;
    color: #fff;
    font-size: 14px;
    line-height: 22px;
  }

  span {
    display: block;
    color: var(--sidebar-muted);
    font-size: 12px;
    white-space: nowrap;
  }
}

.menu-scroll {
  height: calc(100vh - 72px);
}

.menu-group {
  padding: 12px 8px 0;
}

.group-title {
  padding: 8px 10px;
  color: var(--sidebar-muted);
  font-size: 12px;
}

.menu-item {
  width: 100%;
  min-height: 42px;
  border: 0;
  border-radius: 8px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--sidebar-text);
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background 0.16s ease, color 0.16s ease;

  &:hover {
    background: rgba(23, 105, 255, 0.14);
    color: #fff;
  }

  &.active {
    background: var(--brand);
    color: #fff;
    font-weight: 600;
  }

  &.open:not(.active) {
    color: #fff;
    background: rgba(255, 255, 255, 0.06);
  }

  &.sub {
    min-height: 36px;
    padding-left: 42px;
    font-size: 13px;

    &.active {
      background: rgba(23, 105, 255, 0.22);
      color: #fff;
      font-weight: 600;
    }
  }
}

.menu-icon {
  width: 20px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.menu-title {
  flex: 1;
  min-width: 0;
  font-size: 14px;
}

.menu-arrow {
  color: var(--sidebar-muted);
  transition: transform 0.2s ease;

  &.open {
    transform: rotate(90deg);
    color: #fff;
  }
}

.submenu-list {
  padding: 2px 0 6px;
}
</style>
