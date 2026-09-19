<template>
  <el-aside class="app-sidebar" :width="appStore.sidebarCollapsed ? '72px' : '220px'">
    <div class="brand">
      <div class="brand-icon">
        <img src="/logo.svg" alt="" width="40" height="40" />
      </div>
      <div v-show="!appStore.sidebarCollapsed" class="brand-text">
        <strong>小程序运营系统</strong>
        <span>多场景搭建与运营平台</span>
        <span class="brand-version">平台 v{{ PLATFORM_VERSION }}</span>
      </div>
    </div>

    <el-scrollbar class="menu-scroll">
      <div v-for="group in menuGroups" :key="group.title" class="menu-group">
        <button
          v-show="!appStore.sidebarCollapsed"
          type="button"
          class="group-title"
          :class="{ open: isGroupOpen(group.title) }"
          @click="toggleGroup(group.title)"
        >
          <span>{{ group.title }}</span>
          <el-icon class="group-arrow" :class="{ open: isGroupOpen(group.title) }" :size="12">
            <ArrowRight />
          </el-icon>
        </button>

        <div v-show="appStore.sidebarCollapsed || isGroupOpen(group.title)" class="group-items">
          <template v-for="item in group.children" :key="item.path || item.title">
            <div v-if="item.children?.length" class="submenu">
              <button
                class="menu-item"
                :class="{
                  active: isParentActive(item) && !item.children.some((c) => isActive(c)),
                  open: isSubOpen(item),
                }"
                :title="item.title"
                @click="toggleSubmenu(item)"
              >
                <span class="menu-icon"><el-icon :size="18"><component :is="iconMap[item.icon]" /></el-icon></span>
                <span v-show="!appStore.sidebarCollapsed" class="menu-title">{{ item.title }}</span>
                <el-icon
                  v-show="!appStore.sidebarCollapsed"
                  class="menu-arrow"
                  :class="{ open: isSubOpen(item) }"
                  :size="14"
                >
                  <ArrowRight />
                </el-icon>
              </button>
              <div v-show="isSubOpen(item) && !appStore.sidebarCollapsed" class="submenu-list">
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
      </div>
    </el-scrollbar>
  </el-aside>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { usePermissionStore } from '@/stores/permission'
import { useFeatureModulesStore } from '@/stores/feature-modules'
import { useIndustryProfileStore } from '@/stores/industry-profile'
import { PLATFORM_VERSION } from '@/constants/platform'
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
  DataLine,
  Aim,
  Document as InvoiceIcon,
  Lock,
  MagicStick,
  Picture,
  Setting,
  ArrowRight,
  Guide,
  Upload,
  Collection,
  Checked,
  EditPen,
  ChatDotRound,
} from '@element-plus/icons-vue'

interface MenuItem {
  title: string
  path?: string
  icon: string
  activePrefix?: string
  /** 在 activePrefix 命中时排除的更具体路径 */
  excludePrefixes?: string[]
  children?: MenuItem[]
  /** 需要任一权限码；空则不限制（超管仍全部可见） */
  permissions?: string[]
  /** 功能模块开关 key（对应系统配置 plugins） */
  featureModule?: string
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
  DataLine,
  Aim,
  InvoiceIcon,
  Lock,
  MagicStick,
  Picture,
  Setting,
  Guide,
  Upload,
  Collection,
  Checked,
  EditPen,
  ChatDotRound,
}

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const permissionStore = usePermissionStore()
const featureModulesStore = useFeatureModulesStore()
const industryProfileStore = useIndustryProfileStore()
const openGroups = ref<string[]>([])
const openKeys = ref<string[]>([])

if (!featureModulesStore.loaded) {
  featureModulesStore.load()
}
if (!industryProfileStore.loaded) {
  industryProfileStore.load()
}

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
      { title: '搭建工作台', path: '/page-builder/overview', icon: 'Odometer', activePrefix: '/page-builder/overview', permissions: ['page:list'] },
      { title: '页面管理', path: '/page-builder/list', icon: 'Document', activePrefix: '/page-builder/list', permissions: ['page:list'] },
      { title: '品牌导航', path: '/page-builder/start', icon: 'Brush', activePrefix: '/page-builder/start', permissions: ['page:list'] },
      { title: '发布中心', path: '/page-builder/release', icon: 'Upload', activePrefix: '/page-builder/release', permissions: ['page:publish', 'page:list'] },
    ],
  },
  {
    title: '内容运营',
    children: [
      { title: '内容管理', path: '/content/article', icon: 'Reading', activePrefix: '/content', excludePrefixes: ['/content/audit', '/content/creators', '/content/qa', '/content/files'], featureModule: 'content' },
      { title: '资料管理', path: '/content/files', icon: 'DocumentCopy', activePrefix: '/content/files', featureModule: 'file' },
      { title: '内容审核', path: '/content/audit', icon: 'Checked', activePrefix: '/content/audit' },
      { title: '作者申请', path: '/content/creators', icon: 'EditPen', activePrefix: '/content/creators' },
      { title: '问答管理', path: '/content/qa', icon: 'ChatDotRound', activePrefix: '/content/qa', featureModule: 'qa' },
      { title: '表单管理', path: '/form/template', icon: 'DocumentCopy', activePrefix: '/form', featureModule: 'form' },
    ],
  },
  {
    title: '用户会员',
    children: [
      { title: '会员管理', path: '/member/list', icon: 'GoldMedal', activePrefix: '/member', permissions: ['member:list'], featureModule: 'member' },
      { title: '社区管理', path: '/member/planet', icon: 'Present', activePrefix: '/member/planet', permissions: ['member:list'], featureModule: 'planet' },
      { title: '用户管理', path: '/user/list', icon: 'User', activePrefix: '/user', excludePrefixes: ['/user/service-community'], permissions: ['user:list'] },
      { title: '客服社群', path: '/user/service-community', icon: 'ChatDotRound', activePrefix: '/user/service-community', permissions: ['user:list'] },
    ],
  },
  {
    title: '商业变现',
    children: [
      { title: '商品管理', path: '/commerce/product', icon: 'Goods', activePrefix: '/commerce', featureModule: 'product' },
      { title: '订单管理', path: '/order/list', icon: 'Box', activePrefix: '/order', permissions: ['order:list'], featureModule: 'product' },
      { title: '优惠管理', path: '/marketing/coupon', icon: 'Ticket', activePrefix: '/marketing' },
      { title: '增长数据', path: '/growth/overview', icon: 'DataLine', activePrefix: '/growth' },
    ],
  },
  {
    title: '活动预约',
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
    title: '经营管理',
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
          { title: '发票税务', path: '/finance/invoice', icon: 'InvoiceIcon', activePrefix: '/finance/invoice' },
          { title: '财务权限', path: '/finance/permission', icon: 'Lock', activePrefix: '/finance/permission' },
        ],
      },
      { title: '智能助手', path: '/ai/agent', icon: 'MagicStick', activePrefix: '/ai/agent', featureModule: 'agent' },
      { title: '智能草稿', path: '/ai/drafts', icon: 'Document', activePrefix: '/ai/drafts', featureModule: 'agent' },
      { title: '语料管理', path: '/ai/knowledge', icon: 'Collection', activePrefix: '/ai/knowledge', featureModule: 'agent' },
    ],
  },
  {
    title: '系统设置',
    children: [
      { title: '素材管理', path: '/asset/list', icon: 'Picture', activePrefix: '/asset' },
      { title: '系统设置', path: '/settings/basic', icon: 'Setting', activePrefix: '/settings' },
    ],
  },
]

function allowMenuItem(item: MenuItem): boolean {
  if (item.featureModule && !featureModulesStore.isEnabled(item.featureModule)) return false
  if (!item.permissions?.length) return true
  return permissionStore.hasAnyPerm(item.permissions)
}

const menuGroups = computed(() => {
  void industryProfileStore.profile
  return rawMenuGroups
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
    .filter((g) => g.children.length > 0)
})

function isActive(item: MenuItem) {
  if (!item.path && !item.activePrefix) return false
  if (item.path && route.path === item.path) return true
  if (!item.activePrefix || !route.path.startsWith(item.activePrefix)) return false
  if (item.excludePrefixes?.some((p) => route.path.startsWith(p))) return false
  return true
}

function isParentActive(item: MenuItem) {
  return item.activePrefix ? route.path.startsWith(item.activePrefix) : false
}

function itemMatchesRoute(item: MenuItem): boolean {
  if (isActive(item) || isParentActive(item)) return true
  return Boolean(item.children?.some((c) => isActive(c) || isParentActive(c)))
}

function isGroupOpen(title: string) {
  return openGroups.value.includes(title)
}

function toggleGroup(title: string) {
  if (isGroupOpen(title)) {
    openGroups.value = openGroups.value.filter((k) => k !== title)
  } else {
    openGroups.value = [...openGroups.value, title]
  }
}

function isSubOpen(item: MenuItem) {
  return openKeys.value.includes(item.title)
}

function toggleSubmenu(item: MenuItem) {
  if (appStore.sidebarCollapsed) {
    go(item.path || item.children?.[0]?.path || '/finance/dashboard')
    return
  }
  if (isSubOpen(item)) {
    openKeys.value = openKeys.value.filter((k) => k !== item.title)
  } else {
    openKeys.value = [...openKeys.value, item.title]
  }
}

function go(path: string) {
  router.push(path)
}

watch(
  () => [route.path, menuGroups.value] as const,
  () => {
    const current = menuGroups.value.find((g) => g.children.some(itemMatchesRoute))
    if (current && !openGroups.value.includes(current.title)) {
      openGroups.value = [...openGroups.value, current.title]
    }
    for (const group of menuGroups.value) {
      for (const item of group.children) {
        if (item.children?.length && itemMatchesRoute(item) && !openKeys.value.includes(item.title)) {
          openKeys.value = [...openKeys.value, item.title]
        }
      }
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
  min-height: 72px;
  height: auto;
  padding: 14px 16px;
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

  .brand-version {
    margin-top: 2px;
    font-size: 11px;
    letter-spacing: 0.02em;
    opacity: 0.85;
  }
}

.menu-scroll {
  height: calc(100vh - 88px);
}

.menu-group {
  padding: 8px 8px 4px;
}

.group-title {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 0;
  padding: 8px 10px 8px 12px;
  border: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.55);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
  text-align: left;

  &:hover,
  &.open {
    color: rgba(255, 255, 255, 0.88);
  }
}

.group-arrow {
  flex-shrink: 0;
  transition: transform 0.2s ease;

  &.open {
    transform: rotate(90deg);
  }
}

.group-items {
  padding: 0 0 6px 6px;
}

.menu-item {
  width: 100%;
  min-height: 40px;
  border: 0;
  border-radius: 8px;
  padding: 0 10px 0 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--sidebar-text);
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background 0.16s ease, color 0.16s ease;

  &:hover:not(.active) {
    background: rgba(255, 255, 255, 0.08);
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
    min-height: 34px;
    padding-left: 42px;
    font-size: 13px;

    &.active {
      background: var(--brand);
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
  font-size: 13px;
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
