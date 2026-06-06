<template>
  <el-aside class="prototype-sidebar" :width="appStore.sidebarCollapsed ? '72px' : '220px'">
    <div class="brand">
      <div class="brand-icon">▣</div>
      <div v-show="!appStore.sidebarCollapsed" class="brand-text">
        <strong>小程序运营系统</strong>
        <span>多场景搭建与运营平台</span>
      </div>
    </div>

    <el-scrollbar class="menu-scroll">
      <div v-for="group in menuGroups" :key="group.title" class="menu-group">
        <div v-show="!appStore.sidebarCollapsed" class="group-title">{{ group.title }}</div>
        <button
          v-for="item in group.children"
          :key="item.path"
          class="menu-item"
          :class="{ active: isActive(item) }"
          :title="item.title"
          @click="go(item.path)"
        >
          <span class="menu-emoji">{{ item.emoji }}</span>
          <span v-show="!appStore.sidebarCollapsed" class="menu-title">{{ item.title }}</span>
          <span v-if="item.badge && !appStore.sidebarCollapsed" class="menu-badge">{{ item.badge }}</span>
        </button>
      </div>
    </el-scrollbar>
  </el-aside>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'

interface MenuItem {
  title: string
  path: string
  emoji: string
  badge?: string
  activePrefix?: string
}

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const menuGroups: Array<{ title: string; children: MenuItem[] }> = [
  {
    title: '总览',
    children: [
      { title: '工作台', path: '/dashboard', emoji: '📊', activePrefix: '/dashboard' },
    ],
  },
  {
    title: '页面装修',
    children: [
      { title: '页面管理', path: '/page-builder/list', emoji: '📄', activePrefix: '/page-builder/list' },
      { title: '模板中心', path: '/page-builder/template-center', emoji: '🎨', activePrefix: '/page-builder/template-center' },
      { title: '小程序搭建', path: '/page-builder/miniapp', emoji: '📱', activePrefix: '/page-builder/miniapp' },
    ],
  },
  {
    title: '内容运营',
    children: [
      { title: '内容管理', path: '/content/article', emoji: '📝', activePrefix: '/content' },
      { title: '表单管理', path: '/form/template', emoji: '📋', badge: '9', activePrefix: '/form' },
    ],
  },
  {
    title: '用户与会员',
    children: [
      { title: '会员管理', path: '/member/list', emoji: '👑', activePrefix: '/member' },
      { title: '用户管理', path: '/user/list', emoji: '👥', activePrefix: '/user' },
    ],
  },
  {
    title: '商业变现',
    children: [
      { title: '商品管理', path: '/commerce/product', emoji: '🛍️', activePrefix: '/commerce' },
      { title: '订单管理', path: '/order/list', emoji: '📦', badge: '16', activePrefix: '/order' },
      { title: '营销管理', path: '/marketing/coupon', emoji: '🎁', activePrefix: '/marketing' },
    ],
  },
  {
    title: '活动与预约',
    children: [
      { title: '活动管理', path: '/activity/list', emoji: '🎪', activePrefix: '/activity' },
      { title: '预约管理', path: '/appointment/list', emoji: '📅', activePrefix: '/appointment' },
    ],
  },
  {
    title: '财务管理',
    children: [
      { title: '财务概览', path: '/finance/dashboard', emoji: '💰', activePrefix: '/finance/dashboard' },
      { title: '收支明细', path: '/finance/income-expense', emoji: '📋', activePrefix: '/finance/income-expense' },
      { title: '财务报表', path: '/finance/report', emoji: '📊', activePrefix: '/finance/report' },
      { title: '预算管理', path: '/finance/budget', emoji: '🎯', activePrefix: '/finance/budget' },
      { title: '发票与税务', path: '/finance/invoice', emoji: '🧾', activePrefix: '/finance/invoice' },
      { title: '财务权限', path: '/finance/permission', emoji: '🔐', activePrefix: '/finance/permission' },
    ],
  },
  {
    title: '智能 AI',
    children: [
      { title: '智能 Agent', path: '/ai/agent', emoji: '🤖', activePrefix: '/ai' },
    ],
  },
  {
    title: '系统',
    children: [
      { title: '素材库', path: '/asset/list', emoji: '🖼️', activePrefix: '/asset' },
      { title: '系统设置', path: '/settings/basic', emoji: '⚙️', activePrefix: '/settings' },
    ],
  },
]

function isActive(item: MenuItem) {
  return route.path === item.path || (item.activePrefix ? route.path.startsWith(item.activePrefix) : false)
}

function go(path: string) {
  router.push(path)
}
</script>

<style lang="scss" scoped>
.prototype-sidebar {
  background: #0d1422;
  color: #cbd5e1;
  overflow: hidden;
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 1001;
  transition: width 0.2s ease;
  box-shadow: 12px 0 28px rgba(15, 23, 42, 0.08);
}

.brand {
  height: 96px;
  padding: 20px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.brand-icon {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  color: #fff;
  font-weight: 900;
  background: linear-gradient(135deg, #19b7ff, #286cff 60%, #7c3aed);
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
    color: #8ea1bb;
    font-size: 12px;
    white-space: nowrap;
  }
}

.menu-scroll {
  height: calc(100vh - 96px);
}

.menu-group {
  padding: 12px 8px 0;
}

.group-title {
  padding: 8px 10px;
  color: #64748b;
  font-size: 12px;
}

.menu-item {
  width: 100%;
  min-height: 44px;
  border: 0;
  border-radius: 10px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #cbd5e1;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background 0.16s ease, color 0.16s ease;

  &:hover {
    background: rgba(59, 130, 246, 0.12);
    color: #fff;
  }

  &.active {
    background: #2474ff;
    color: #fff;
    font-weight: 700;
  }
}

.menu-emoji {
  width: 20px;
  flex-shrink: 0;
  text-align: center;
}

.menu-title {
  flex: 1;
  min-width: 0;
  font-size: 14px;
}

.menu-badge {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  background: #ff4d4f;
}
</style>
