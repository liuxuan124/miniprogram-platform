<template>
  <el-aside
    class="app-sidebar"
    :width="appStore.sidebarCollapsed ? '72px' : '216px'"
  >
    <div class="brand">
      <div class="brand-icon">
        <img :src="brandLogo" alt="" width="40" height="40" />
      </div>
      <div v-show="!appStore.sidebarCollapsed" class="brand-text">
        <strong>{{ brandTitle }}</strong>
        <span>{{ brandSubtitle }}</span>
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
import { useMiniPending } from '@/composables/useMiniPending'
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
  Share,
  Flag,
  Calendar,
  Money,
  Tickets,
  TrendCharts,
  DataLine,
  DataBoard,
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
  ChatLineRound,
  VideoCamera,
  Shop,
  FolderOpened,
  Plus,
  Search,
  // 运营中心：审核中心 / 全局资源位（原先菜单已配 icon 名但未注册，导致图标位空白）
  Warning,
  Promotion,
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
  /** 需要任一角色码（如 super_admin）；空则不限制 */
  roles?: string[]
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
  Share,
  Flag,
  Calendar,
  Money,
  Tickets,
  TrendCharts,
  DataLine,
  DataBoard,
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
  ChatLineRound,
  VideoCamera,
  Shop,
  FolderOpened,
  Plus,
  Search,
  Warning,
  Promotion,
}

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const { refreshMiniPending } = useMiniPending(true)

watch(
  () => route.path,
  (p) => {
    if (p.startsWith('/mini')) void refreshMiniPending()
  },
)
const permissionStore = usePermissionStore()
const featureModulesStore = useFeatureModulesStore()
const industryProfileStore = useIndustryProfileStore()
const openGroups = ref<string[]>([])
const openKeys = ref<string[]>([])

/** 品牌标识：墨太白（跨境墨太白）——图标用盾牌勾标，名称统一 */
const brandLogo = '/logo-motaibai.svg'
const brandTitle = computed(() => '跨境墨太白运营后台')
const brandSubtitle = computed(() =>
  appStore.uiTheme === 'warm' ? '内容 · 会员 · Agent' : '跨境增长 · 选品洞察 · 供应链实战',
)

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
      { title: '工作总览', path: '/dashboard', icon: 'Odometer', activePrefix: '/dashboard' },
    ],
  },
  {
    // 运营中心：横向运营动作收口。不加权限门（与后端一致：该组接口只需登录即可访问），
    // content_ops 也能看到并使用
    title: '运营中心',
    children: [
      { title: '私域引流', path: '/ops/private-domain', icon: 'ChatDotRound', activePrefix: '/ops/private-domain' },
      { title: '搜索运营', path: '/ops/search', icon: 'Search', activePrefix: '/ops/search' },
      { title: '审核中心', path: '/ops/moderation', icon: 'Warning', activePrefix: '/ops/moderation' },
      { title: '全局资源位', path: '/ops/resource', icon: 'Promotion', activePrefix: '/ops/resource' },
    ],
  },
  {
    title: '小程序',
    children: [
      { title: '概览', path: '/mini/overview', icon: 'Odometer', activePrefix: '/mini/overview', permissions: ['page:list'] },
      { title: '外观', path: '/mini/appearance', icon: 'Brush', activePrefix: '/mini/appearance', permissions: ['page:list'] },
      { title: '页面', path: '/mini/pages', icon: 'Document', activePrefix: '/mini/pages', permissions: ['page:list'] },
      { title: '模板', path: '/mini/templates', icon: 'Shop', activePrefix: '/mini/templates', permissions: ['page:list'] },
    ],
  },
  {
    title: '内容运营',
    children: [
      { title: '内容概览', path: '/content/overview', icon: 'Odometer', activePrefix: '/content/overview', featureModule: 'content' },
      { title: '长文创作', path: '/content/articles', icon: 'Reading', activePrefix: '/content/articles', featureModule: 'content' },
      { title: '图文笔记', path: '/content/notes', icon: 'EditPen', activePrefix: '/content/notes', featureModule: 'content' },
      { title: '文件管理', path: '/content/files', icon: 'FolderOpened', activePrefix: '/content/files', featureModule: 'content' },
      { title: '视频管理', path: '/content/videos', icon: 'VideoCamera', activePrefix: '/content/videos', featureModule: 'content' },
      { title: '互动中心', path: '/content/inbox', icon: 'ChatDotRound', activePrefix: '/content/inbox' },
      { title: '内容设置', path: '/content/settings', icon: 'Setting', activePrefix: '/content/settings', featureModule: 'content' },
    ],
  },
  {
    // V114 用户管理收编：作者/用户/星球主理人都归到这一组统一管。
    // 作者管理从「内容运营」移到这里（原 /content/authors 保留 redirect，不产生死链）。
    title: '用户管理',
    children: [
      { title: '用户概览', path: '/member/overview', icon: 'Odometer', activePrefix: '/member/overview', permissions: ['member:list', 'user:list'], featureModule: 'member' },
      { title: '用户列表', path: '/member/users', icon: 'User', activePrefix: '/member/users', permissions: ['user:list'] },
      { title: '作者管理', path: '/content/authors', icon: 'Brush', activePrefix: '/content/authors', permissions: ['user:list'] },
      { title: '角色标签', path: '/member/role-tags', icon: 'Collection', activePrefix: '/member/role-tags', permissions: ['user:list'] },
      { title: '会员权益', path: '/member/plans', icon: 'GoldMedal', activePrefix: '/member/plans', permissions: ['member:list'], featureModule: 'member' },
      { title: '成长积分', path: '/member/growth', icon: 'TrendCharts', activePrefix: '/member/growth', permissions: ['member:list'], featureModule: 'member' },
      { title: '客服中心', path: '/member/support', icon: 'ChatDotRound', activePrefix: '/member/support', permissions: ['user:list'] },
    ],
  },
  {
    title: '社区管理',
    children: [
      { title: '社区列表', path: '/community/list', icon: 'Present', activePrefix: '/community/list', permissions: ['member:list'], featureModule: 'planet' },
      // V111：动态管理并入本页 → 内容运营(content:list) 与会员运营(member:list) 两侧角色都可见
      { title: '内容管理', path: '/community/content', icon: 'Document', activePrefix: '/community/content', permissions: ['member:list', 'content:list'], featureModule: 'planet' },
      { title: '成员管理', path: '/community/members', icon: 'User', activePrefix: '/community/members', permissions: ['member:list'], featureModule: 'planet' },
      { title: '会员配置', path: '/community/membership', icon: 'GoldMedal', activePrefix: '/community/membership', permissions: ['member:list'], featureModule: 'planet' },
      { title: '新建社区', path: '/community/create', icon: 'Plus', activePrefix: '/community/create', permissions: ['member:list'], featureModule: 'planet' },
    ],
  },
  {
    title: '商业变现',
    children: [
      { title: '收入概览', path: '/commerce/overview', icon: 'Odometer', activePrefix: '/commerce/overview', featureModule: 'product' },
      { title: '商品管理', path: '/commerce/products', icon: 'Goods', activePrefix: '/commerce/products', featureModule: 'product' },
      { title: '订单管理', path: '/commerce/orders', icon: 'Box', activePrefix: '/commerce/orders', permissions: ['order:list'], featureModule: 'product' },
      { title: '卡券中心', path: '/commerce/coupons', icon: 'Ticket', activePrefix: '/commerce/coupons' },
      { title: '渠道管理', path: '/commerce/channels', icon: 'Share', activePrefix: '/commerce/channels', featureModule: 'product' },
      { title: '增长数据', path: '/commerce/growth', icon: 'DataLine', activePrefix: '/commerce/growth' },
      { title: '交易设置', path: '/commerce/settings', icon: 'Setting', activePrefix: '/commerce/settings', featureModule: 'product' },
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
      { title: '经营概览', path: '/finance/overview', icon: 'DataBoard', activePrefix: '/finance/overview' },
      { title: '收支明细', path: '/finance/transactions', icon: 'Tickets', activePrefix: '/finance/transactions' },
      { title: '预算与目标', path: '/finance/budget', icon: 'Aim', activePrefix: '/finance/budget' },
      { title: '票据与税务', path: '/finance/invoice', icon: 'InvoiceIcon', activePrefix: '/finance/invoice' },
      { title: '智能助手', path: '/finance/assistant', icon: 'MagicStick', activePrefix: '/finance/assistant' },
      { title: '知识中心', path: '/ai/knowledge', icon: 'Collection', activePrefix: '/ai/knowledge', featureModule: 'agent' },
    ],
  },
  {
    title: '系统设置',
    children: [
      { title: '素材管理', path: '/asset/list', icon: 'Picture', activePrefix: '/asset' },
      {
        title: '系统设置',
        path: '/settings/basic',
        icon: 'Setting',
        activePrefix: '/settings',
        excludePrefixes: ['/settings/admin-user', '/settings/wechat', '/settings/storage', '/settings/logs'],
      },
      {
        title: '管理员账号',
        path: '/settings/admin-user',
        icon: 'User',
        activePrefix: '/settings/admin-user',
        roles: ['super_admin'],
      },
    ],
  },
]

function allowMenuItem(item: MenuItem): boolean {
  if (item.featureModule && !featureModulesStore.isEnabled(item.featureModule)) return false
  if (item.roles?.length && !item.roles.some((r) => permissionStore.roles.includes(r))) {
    return false
  }
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

function prefixMatch(prefix: string): boolean {
  if (!route.path.startsWith(prefix)) return false
  const rest = route.path.slice(prefix.length)
  // 仅当前缀命中到路径段边界（/community/members 不应命中 /community/membership）
  return rest === '' || rest.startsWith('/') || rest.startsWith('?')
}

function isActive(item: MenuItem) {
  if (!item.path && !item.activePrefix) return false
  if (item.path && route.path === item.path) return true
  if (!item.activePrefix || !prefixMatch(item.activePrefix)) return false
  if (item.excludePrefixes?.some((p) => route.path.startsWith(p))) return false
  return true
}

function isParentActive(item: MenuItem) {
  return item.activePrefix ? prefixMatch(item.activePrefix) : false
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
    go(item.path || item.children?.[0]?.path || '/finance/overview')
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
  height: 100vh;
  flex-shrink: 0;
  padding: 0;
  transition: none;
}

:global(html.sidebar-width-animate) .app-sidebar {
  transition: width 0.2s ease;
}

.brand {
  min-height: auto;
  height: auto;
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 0;
}

.brand-icon {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  overflow: hidden;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  background: var(--sidebar-brand-bg);

  img {
    display: block;
    width: 22px;
    height: 22px;
  }
}

.brand-text {
  min-width: 0;

  strong {
    display: block;
    color: #fff;
    font-size: 15px;
    line-height: 1.3;
  }

  span {
    display: block;
    color: var(--sidebar-muted);
    font-size: 11px;
    white-space: nowrap;
  }

  .brand-version {
    display: none;
  }
}

.menu-scroll {
  height: calc(100vh - 72px);
}

.menu-group {
  padding: 0 8px 4px;
}

.group-title {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 0;
  padding: 10px 12px 6px;
  border: 0;
  background: transparent;
  color: var(--sidebar-group-title);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: pointer;
  text-align: left;

  &:hover,
  &.open {
    color: var(--sidebar-group-title-open);
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
  padding: 10px 12px;
  margin: 0 0 2px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--sidebar-text);
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background 0.16s ease, color 0.16s ease;

  &:hover:not(.active) {
    background: var(--sidebar-item-hover-bg);
    color: var(--sidebar-item-active-text);
  }

  &.active {
    background: var(--sidebar-item-active-bg);
    color: var(--sidebar-item-active-text);
    font-weight: 600;
  }

  &.open:not(.active) {
    color: var(--sidebar-item-active-text);
    background: var(--sidebar-item-hover-bg);
  }

  &.sub {
    min-height: 34px;
    padding-left: 42px;
    font-size: 13px;

    &.active {
      background: var(--sidebar-item-active-bg);
      color: var(--sidebar-item-active-text);
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

.menu-badge {
  margin-left: auto;
  flex-shrink: 0;
  min-width: 18px;
  height: 18px;
  padding: 0 7px;
  border-radius: 999px;
  background: var(--sidebar-badge-bg);
  color: var(--sidebar-badge-text);
  font-size: 11px;
  font-weight: 600;
  line-height: 18px;
  text-align: center;
  box-sizing: border-box;

  &.is-empty {
    visibility: hidden;
  }
}

.menu-item.active .menu-badge,
.menu-item.sub.active .menu-badge {
  background: var(--sidebar-item-active-text);
  color: var(--sidebar-item-active-bg);
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
