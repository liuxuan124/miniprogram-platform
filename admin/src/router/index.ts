/**
 * 路由配置
 */
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import Layout from '@/layout/index.vue'

/** 公共路由（无需登录） */
export const constantRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', hidden: true },
  },
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '工作台', icon: 'Odometer', affix: true },
      },
    ],
  },
  {
    path: '/page-builder/editor/:id',
    name: 'PageBuilderEditor',
    component: () => import('@/views/page-builder/editor.vue'),
    meta: { title: '页面装修器', hidden: true },
  },
  {
    path: '/page-builder/preview/:id',
    name: 'PageBuilderPreview',
    component: () => import('@/views/page-builder/preview.vue'),
    meta: { title: '页面预览', hidden: true },
  },
  {
    path: '/h5/preview',
    name: 'H5Preview',
    component: () => import('@/views/page-builder/h5-preview.vue'),
    meta: { title: 'H5预览', hidden: true },
  },
]

/** 动态路由（需登录 + 权限过滤） */
export const asyncRoutes: RouteRecordRaw[] = [
  {
    path: '/page-builder',
    component: Layout,
    name: 'PageBuilder',
    meta: { title: '页面装修', icon: 'Monitor' },
    redirect: '/page-builder/list',
    children: [
      {
        path: 'list',
        name: 'PageBuilderList',
        component: () => import('@/views/page-builder/index.vue'),
        meta: { title: '页面管理', icon: 'Document' },
      },
      {
        path: 'template-center',
        name: 'TemplateCenter',
        component: () => import('@/views/page-builder/template-center.vue'),
        meta: { title: '模板中心', icon: 'Shop' },
      },
      {
        path: 'miniapp',
        name: 'MiniappBuilder',
        component: () => import('@/views/page-builder/miniapp-builder.vue'),
        meta: { title: '小程序搭建', icon: 'Cellphone' },
      },
      {
        path: 'version-management',
        name: 'VersionManagement',
        component: () => import('@/views/page-builder/version-management.vue'),
        meta: { title: '版本管理', icon: 'Version', hidden: true },
      },
      {
        path: 'version/:id',
        name: 'PageBuilderVersion',
        component: () => import('@/views/page-builder/version.vue'),
        meta: { title: '版本管理', hidden: true },
      },
    ],
  },
  {
    path: '/content',
    component: Layout,
    name: 'Content',
    meta: { title: '内容管理', icon: 'Reading' },
    redirect: '/content/article',
    children: [
      {
        path: 'article',
        name: 'ContentList',
        component: () => import('@/views/content/index.vue'),
        meta: { title: '文章管理', icon: 'Notebook' },
      },
      {
        path: 'list',
        name: 'ContentListAlias',
        component: () => import('@/views/content/index.vue'),
        meta: { title: '内容管理', hidden: true },
      },
      {
        path: 'category',
        name: 'ContentCategory',
        component: () => import('@/views/content/category.vue'),
        meta: { title: '分类管理', icon: 'Folder' },
      },
      {
        path: 'edit',
        name: 'ContentEdit',
        component: () => import('@/views/content/edit.vue'),
        meta: { title: '编辑文章', icon: 'Edit', hidden: true },
      },
    ],
  },
  {
    path: '/commerce',
    component: Layout,
    name: 'Commerce',
    meta: { title: '商城管理', icon: 'ShoppingCart' },
    redirect: '/commerce/product',
    children: [
      {
        path: 'product',
        name: 'CommerceProduct',
        component: () => import('@/views/product/index.vue'),
        meta: { title: '商品管理', icon: 'Goods' },
      },
      {
        path: 'category',
        name: 'CommerceProductCategory',
        component: () => import('@/views/product/category.vue'),
        meta: { title: '分类管理', hidden: true },
      },
      {
        path: 'product/edit/:id?',
        name: 'ProductEdit',
        component: () => import('@/views/product/edit.vue'),
        meta: { title: '编辑商品', hidden: true },
      },
    ],
  },
  {
    path: '/user',
    component: Layout,
    name: 'User',
    meta: { title: '用户管理', icon: 'UserFilled' },
    redirect: '/user/list',
    children: [
      {
        path: 'list',
        name: 'UserList',
        component: () => import('@/views/user/index.vue'),
        meta: { title: '用户列表', icon: 'Avatar' },
      },
    ],
  },
  {
    path: '/order',
    component: Layout,
    name: 'Order',
    meta: { title: '订单管理', icon: 'List' },
    redirect: '/order/list',
    children: [
      {
        path: 'list',
        name: 'OrderList',
        component: () => import('@/views/order/index.vue'),
        meta: { title: '订单列表', icon: 'Document' },
      },
      {
        path: 'detail/:id',
        name: 'OrderDetail',
        component: () => import('@/views/order/detail.vue'),
        meta: { title: '订单详情', hidden: true },
      },
      {
        path: 'refund',
        name: 'OrderRefund',
        component: () => import('@/views/order/refund.vue'),
        meta: { title: '退款审核', icon: 'CircleCheck' },
      },
    ],
  },
  {
    path: '/asset',
    component: Layout,
    name: 'Asset',
    meta: { title: '素材库', icon: 'Picture' },
    redirect: '/asset/list',
    children: [
      {
        path: 'list',
        name: 'AssetList',
        component: () => import('@/views/asset/index.vue'),
        meta: { title: '素材列表', icon: 'FolderOpened' },
      },
    ],
  },
  {
    path: '/member',
    component: Layout,
    name: 'Member',
    meta: { title: '会员管理', icon: 'User' },
    redirect: '/member/list',
    children: [
      {
        path: 'list',
        name: 'MemberList',
        component: () => import('@/views/member/index.vue'),
        meta: { title: '会员列表', icon: 'Avatar' },
      },
      {
        path: 'level',
        name: 'MemberLevel',
        component: () => import('@/views/member/level.vue'),
        meta: { title: '会员等级', icon: 'Medal' },
      },
      {
        path: 'points',
        name: 'MemberPoints',
        component: () => import('@/views/member/points.vue'),
        meta: { title: '积分管理', icon: 'Coin' },
      },
    ],
  },
  {
    path: '/marketing',
    component: Layout,
    name: 'Marketing',
    meta: { title: '营销中心', icon: 'Present' },
    redirect: '/marketing/coupon',
    children: [
      {
        path: 'coupon',
        name: 'MarketingCoupon',
        component: () => import('@/views/marketing/coupon.vue'),
        meta: { title: '优惠券', icon: 'Ticket' },
      },
    ],
  },
  {
    path: '/activity',
    component: Layout,
    name: 'Activity',
    meta: { title: '活动管理', icon: 'Calendar' },
    redirect: '/activity/list',
    children: [
      {
        path: 'list',
        name: 'ActivityList',
        component: () => import('@/views/activity/index.vue'),
        meta: { title: '活动管理', icon: 'Calendar' },
      },
    ],
  },
  {
    path: '/form-activity',
    component: Layout,
    name: 'FormActivity',
    meta: { title: '表单活动', icon: 'EditPen', hidden: true },
    redirect: '/activity/list',
    children: [
      {
        path: 'list',
        name: 'FormActivityList',
        component: () => import('@/views/activity/index.vue'),
        meta: { title: '活动列表', icon: 'List', hidden: true },
      },
    ],
  },
  {
    path: '/form',
    component: Layout,
    name: 'Form',
    meta: { title: '表单管理', icon: 'EditPen' },
    redirect: '/form/template',
    children: [
      {
        path: 'template',
        name: 'FormTemplate',
        component: () => import('@/views/form/template.vue'),
        meta: { title: '表单模板', icon: 'Document' },
      },
      {
        path: 'submissions',
        name: 'FormSubmissions',
        component: () => import('@/views/form/submissions.vue'),
        meta: { title: '提交数据', icon: 'DataLine' },
      },
    ],
  },
  {
    path: '/appointment',
    component: Layout,
    name: 'Appointment',
    meta: { title: '预约管理', icon: 'Calendar' },
    redirect: '/appointment/list',
    children: [
      {
        path: 'list',
        name: 'AppointmentListAlias',
        component: () => import('@/views/appointment/index.vue'),
        meta: { title: '预约管理', icon: 'Calendar' },
      },
      {
        path: 'service',
        name: 'AppointmentService',
        component: () => import('@/views/appointment/service.vue'),
        meta: { title: '预约服务', icon: 'Service' },
      },
      {
        path: 'slot',
        name: 'AppointmentSlot',
        component: () => import('@/views/appointment/slot.vue'),
        meta: { title: '预约时段', icon: 'Clock' },
      },
    ],
  },
  {
    path: '/statistics',
    component: Layout,
    name: 'Statistics',
    meta: { title: '数据统计', icon: 'DataAnalysis' },
    redirect: '/statistics/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'StatisticsDashboard',
        component: () => import('@/views/statistics/dashboard.vue'),
        meta: { title: '统计概览', icon: 'DataBoard' },
      },
    ],
  },
  {
    path: '/ai',
    component: Layout,
    name: 'AI',
    meta: { title: '智能 AI', icon: 'MagicStick' },
    redirect: '/ai/conversation',
    children: [
      {
        path: 'conversation',
        name: 'AiConversation',
        component: () => import('@/views/ai/conversation.vue'),
        meta: { title: '对话记录', icon: 'ChatDotRound' },
      },
      {
        path: 'stats',
        name: 'AiStats',
        component: () => import('@/views/ai/stats.vue'),
        meta: { title: '推荐统计', icon: 'TrendCharts' },
      },
      {
        path: 'recommendation',
        name: 'AiRecommendation',
        component: () => import('@/views/ai/recommendation.vue'),
        meta: { title: '推荐日志', icon: 'List', hidden: true },
      },
      {
        path: 'agent',
        name: 'AiAgent',
        component: () => import('@/views/ai/agent/index.vue'),
        meta: { title: '智能 Agent', icon: 'MagicStick' },
      },
    ],
  },
  {
    path: '/finance',
    component: Layout,
    name: 'Finance',
    meta: { title: '财务管理', icon: 'Money' },
    redirect: '/finance/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'FinanceDashboard',
        component: () => import('@/views/finance/dashboard.vue'),
        meta: { title: '财务概览', icon: 'DataBoard' },
      },
      {
        path: 'income-expense',
        name: 'FinanceIncomeExpense',
        component: () => import('@/views/finance/income-expense.vue'),
        meta: { title: '收支明细', icon: 'List' },
      },
      {
        path: 'report',
        name: 'FinanceReport',
        component: () => import('@/views/finance/report.vue'),
        meta: { title: '财务报表', icon: 'DataAnalysis' },
      },
      {
        path: 'budget',
        name: 'FinanceBudget',
        component: () => import('@/views/finance/budget.vue'),
        meta: { title: '预算管理', icon: 'Aim' },
      },
      {
        path: 'invoice',
        name: 'FinanceInvoice',
        component: () => import('@/views/finance/invoice.vue'),
        meta: { title: '发票与税务', icon: 'Document' },
      },
      {
        path: 'permission',
        name: 'FinancePermission',
        component: () => import('@/views/finance/permission.vue'),
        meta: { title: '财务权限', icon: 'Lock', roles: ['admin', 'super_admin'] },
      },
    ],
  },
  {
    path: '/settings',
    component: Layout,
    name: 'Settings',
    meta: { title: '系统设置', icon: 'Setting' },
    redirect: '/settings/basic',
    children: [
      {
        path: 'basic',
        name: 'SettingsBasic',
        component: () => import('@/views/system/basic.vue'),
        meta: { title: '系统设置', icon: 'Tools' },
      },
      {
        path: 'wechat',
        name: 'SettingsWechat',
        component: () => import('@/views/system/wechat.vue'),
        meta: { title: '微信小程序配置', icon: 'ChatDotRound' },
      },
      {
        path: 'storage',
        name: 'SettingsStorage',
        component: () => import('@/views/system/storage.vue'),
        meta: { title: '存储配置', icon: 'FolderOpened' },
      },
      {
        path: 'logs',
        name: 'SettingsLogs',
        component: () => import('@/views/system/logs.vue'),
        meta: { title: '操作日志', icon: 'Document' },
      },
    ],
  },
  // 404 兜底路由
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/error/404.vue'),
    meta: { title: '404', hidden: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes: [...constantRoutes, ...asyncRoutes],
  scrollBehavior: () => ({ top: 0 }),
})

export default router
