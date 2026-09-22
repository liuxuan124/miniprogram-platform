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
        meta: { title: '工作总览', icon: 'Odometer', affix: true },
      },
    ],
  },
  {
    path: '/page-builder/editor/:id',
    name: 'PageBuilderEditor',
    component: () => import('@/views/page-builder/editor.vue'),
    meta: { title: '页面装修器', hidden: true, roles: ['super_admin', 'content_ops'], permissions: ['page:update', 'page:create'] },
  },
  {
    path: '/page-builder/preview/:id',
    name: 'PageBuilderPreview',
    component: () => import('@/views/page-builder/preview.vue'),
    meta: { title: '页面预览', hidden: true, roles: ['super_admin', 'content_ops'], permissions: ['page:list'] },
  },
  {
    path: '/h5/preview',
    name: 'H5Preview',
    component: () => import('@/views/page-builder/h5-preview.vue'),
    meta: { title: 'H5预览', hidden: true },
  },
  {
    path: '/h5/draft-preview',
    name: 'H5DraftPreview',
    component: () => import('@/views/page-builder/draft-preview.vue'),
    meta: { title: '草稿手机预览', hidden: true },
  },
  {
    path: '/h5/miniapp-preview',
    name: 'MiniappFullPreview',
    component: () => import('@/views/page-builder/miniapp-full-preview.vue'),
    meta: { title: '小程序预览', hidden: true },
  },
]

/** 动态路由（需登录 + 权限过滤） */
export const asyncRoutes: RouteRecordRaw[] = [
  {
    path: '/mini',
    component: Layout,
    name: 'Mini',
    meta: { title: '小程序', icon: 'Monitor', roles: ['super_admin', 'content_ops'], permissions: ['page:list'] },
    redirect: '/mini/overview',
    children: [
      {
        path: 'overview',
        name: 'MiniOverview',
        component: () => import('@/views/mini/overview.vue'),
        meta: { title: '运营概览', icon: 'Odometer', roles: ['super_admin', 'content_ops'], permissions: ['page:list'] },
      },
      {
        path: 'pages',
        name: 'MiniPages',
        component: () => import('@/views/mini/pages.vue'),
        meta: { title: '页面管理', icon: 'Document', roles: ['super_admin', 'content_ops'], permissions: ['page:list'] },
      },
      {
        path: 'pages/new-ai',
        name: 'MiniNewAi',
        component: () => import('@/views/mini/new-ai.vue'),
        meta: { title: 'AI 建页', hidden: true, roles: ['super_admin', 'content_ops'], permissions: ['page:create', 'page:list'] },
      },
      {
        path: 'pages/:id/editor',
        name: 'MiniPageEditor',
        redirect: (to) => ({ path: `/page-builder/editor/${to.params.id}`, query: to.query }),
        meta: { title: '装修', hidden: true, roles: ['super_admin', 'content_ops'], permissions: ['page:update', 'page:create'] },
      },
      {
        path: 'templates',
        name: 'MiniTemplates',
        component: () => import('@/views/mini/templates.vue'),
        meta: { title: '模板中心', icon: 'Shop', roles: ['super_admin', 'content_ops'], permissions: ['page:list'] },
      },
      {
        path: 'publish',
        name: 'MiniPublish',
        component: () => import('@/views/mini/publish.vue'),
        meta: { title: '发布中心', icon: 'Upload', roles: ['super_admin', 'content_ops'], permissions: ['page:publish'] },
      },
    ],
  },
  {
    path: '/page-builder',
    component: Layout,
    name: 'PageBuilder',
    meta: { title: '小程序', icon: 'Monitor', roles: ['super_admin', 'content_ops'], permissions: ['page:list'], hidden: true },
    redirect: '/mini/overview',
    children: [
      {
        path: 'overview',
        name: 'PageBuilderOverview',
        redirect: '/mini/overview',
        meta: { title: '搭建工作台', hidden: true, roles: ['super_admin', 'content_ops'], permissions: ['page:list'] },
      },
      {
        path: 'start',
        name: 'PageBuilderStart',
        redirect: '/mini/overview',
        meta: { title: '品牌导航', hidden: true, roles: ['super_admin', 'content_ops'], permissions: ['page:list'] },
      },
      {
        path: 'appearance',
        name: 'PageBuilderAppearance',
        component: () => import('@/views/page-builder/appearance.vue'),
        meta: { title: '品牌导航', hidden: true, roles: ['super_admin', 'content_ops'], permissions: ['page:list'] },
      },
      {
        path: 'drafts',
        name: 'PageBuilderDrafts',
        redirect: '/mini/templates',
        meta: { title: '品牌导航', hidden: true, roles: ['super_admin', 'content_ops'], permissions: ['page:list'] },
      },
      {
        path: 'miniapp',
        redirect: '/mini/overview',
      },
      {
        path: 'list',
        name: 'PageBuilderList',
        redirect: '/mini/pages',
        meta: { title: '页面管理', hidden: true, roles: ['super_admin', 'content_ops'], permissions: ['page:list'] },
      },
      {
        path: 'mine',
        name: 'PageBuilderMine',
        component: () => import('@/views/page-builder/mine-config.vue'),
        meta: { title: '固定页 · 我的', hidden: true, roles: ['super_admin', 'content_ops'], permissions: ['page:list'] },
      },
      {
        path: 'templates',
        redirect: '/mini/templates',
      },
      {
        path: 'template-center',
        name: 'TemplateCenter',
        component: () => import('@/views/page-builder/template-center.vue'),
        meta: { title: '模板', hidden: true, icon: 'Shop', roles: ['super_admin', 'content_ops'], permissions: ['page:list'] },
      },
      {
        path: 'release',
        name: 'PageBuilderRelease',
        redirect: '/mini/publish',
        meta: { title: '发布中心', hidden: true, roles: ['super_admin', 'content_ops'], permissions: ['page:publish'] },
      },
      {
        // 开发者微信推送深链（侧栏不展示）
        path: 'wx-push',
        name: 'PageBuilderWxPush',
        component: () => import('@/views/page-builder/release.vue'),
        meta: { title: '微信推送', hidden: true, roles: ['super_admin', 'content_ops'], permissions: ['page:publish'] },
      },
      {
        path: 'version-management',
        name: 'VersionManagement',
        redirect: '/mini/publish',
        meta: { title: '版本记录', hidden: true, roles: ['super_admin', 'content_ops'], permissions: ['page:list'] },
      },
      {
        path: 'version/:id',
        name: 'PageBuilderVersion',
        component: () => import('@/views/page-builder/version.vue'),
        meta: { title: '历史版本', hidden: true, roles: ['super_admin', 'content_ops'], permissions: ['page:list'] },
      },
    ],
  },
  {
    path: '/content',
    component: Layout,
    name: 'Content',
    meta: { title: '内容管理', icon: 'Reading' },
    redirect: '/content/overview',
    children: [
      {
        path: 'overview',
        name: 'ContentOpsOverview',
        component: () => import('@/views/content-ops/overview.vue'),
        meta: { title: '内容概览', icon: 'Odometer', featureModule: 'content' },
      },
      {
        path: 'articles',
        name: 'ContentOpsArticles',
        component: () => import('@/views/content-ops/library.vue'),
        meta: { title: '长文', icon: 'Reading', lockedType: 'article', featureModule: 'content' },
      },
      {
        path: 'notes',
        name: 'ContentOpsNotes',
        component: () => import('@/views/content-ops/library.vue'),
        meta: { title: '笔记', icon: 'EditPen', lockedType: 'note', featureModule: 'content' },
      },
      {
        path: 'materials',
        name: 'ContentOpsMaterials',
        component: () => import('@/views/content-ops/library.vue'),
        meta: { title: '资料', icon: 'FolderOpened', lockedType: 'file', featureModule: 'content' },
      },
      {
        path: 'moments',
        name: 'ContentOpsMoments',
        component: () => import('@/views/content-ops/library.vue'),
        meta: { title: '动态', icon: 'ChatDotRound', lockedType: 'moment', featureModule: 'content' },
      },
      {
        path: 'videos',
        name: 'ContentOpsVideos',
        component: () => import('@/views/content-ops/library.vue'),
        meta: { title: '视频', icon: 'VideoCamera', lockedType: 'video', featureModule: 'content' },
      },
      {
        path: 'library',
        redirect: '/content/articles',
        meta: { title: '内容列表', hidden: true, featureModule: 'content' },
      },
      {
        path: 'write',
        name: 'ContentOpsWrite',
        // 撰写入口保留 hidden；承接完整本地编辑器（置顶/附件/关联商品/预览等）
        component: () => import('@/views/content/edit.vue'),
        meta: { title: '撰写内容', icon: 'EditPen', hidden: true, featureModule: 'content' },
      },
      {
        path: 'inbox',
        name: 'ContentOpsInbox',
        component: () => import('@/views/content-ops/inbox.vue'),
        meta: { title: '互动中心', icon: 'ChatDotRound' },
      },
      {
        path: 'settings',
        name: 'ContentOpsSettings',
        component: () => import('@/views/content-ops/settings.vue'),
        meta: { title: '内容设置', icon: 'Setting', featureModule: 'content' },
      },
      // 旧路径兼容
      { path: 'article', redirect: '/content/articles' },
      { path: 'note', redirect: '/content/notes' },
      { path: 'list', redirect: '/content/articles' },
      { path: 'category', redirect: '/content/settings' },
      { path: 'comments', redirect: '/content/inbox?tab=comment' },
      { path: 'audit', redirect: '/content/inbox?tab=submit' },
      { path: 'creators', redirect: '/content/inbox?tab=creator' },
      { path: 'qa', redirect: '/content/inbox?tab=qa' },
      {
        path: 'edit',
        name: 'ContentEdit',
        redirect: (to) => ({
          path: '/content/write',
          query: { ...to.query, id: to.query.id ?? to.query.contentId },
        }),
        meta: { title: '编辑文章', hidden: true },
      },
      {
        path: 'audit-rules',
        name: 'ContentAuditRules',
        component: () => import('@/views/content/audit-rules.vue'),
        meta: { title: '审核规则', icon: 'Setting', hidden: true },
      },
      {
        path: 'files',
        name: 'FileLibrary',
        component: () => import('@/views/files/index.vue'),
        meta: { title: '文件库', icon: 'FolderOpened', hidden: true },
      },
      {
        path: 'files/edit',
        name: 'FileEdit',
        component: () => import('@/views/files/edit.vue'),
        meta: { title: '编辑文件', hidden: true },
      },
    ],
  },
  {
    path: '/commerce',
    component: Layout,
    name: 'Commerce',
    meta: { title: '商业变现', icon: 'ShoppingCart', featureModule: 'product' },
    redirect: '/commerce/overview',
    children: [
      {
        path: 'overview',
        name: 'CommerceOpsOverview',
        component: () => import('@/views/commerce-ops/overview.vue'),
        meta: { title: '收入概览', icon: 'Odometer', featureModule: 'product' },
      },
      {
        path: 'products',
        name: 'CommerceOpsProducts',
        component: () => import('@/views/commerce-ops/products.vue'),
        meta: { title: '商品管理', icon: 'Goods', featureModule: 'product' },
      },
      {
        path: 'orders',
        name: 'CommerceOpsOrders',
        component: () => import('@/views/commerce-ops/orders.vue'),
        meta: { title: '订单管理', icon: 'Box', featureModule: 'product' },
      },
      {
        path: 'coupons',
        name: 'CommerceOpsCoupons',
        component: () => import('@/views/commerce-ops/coupons.vue'),
        meta: { title: '卡券中心', icon: 'Ticket' },
      },
      {
        path: 'growth',
        name: 'CommerceOpsGrowth',
        component: () => import('@/views/commerce-ops/growth.vue'),
        meta: { title: '增长数据', icon: 'DataLine' },
      },
      {
        path: 'settings',
        name: 'CommerceOpsSettings',
        component: () => import('@/views/commerce-ops/settings.vue'),
        meta: { title: '交易设置', icon: 'Setting', featureModule: 'product' },
      },
      { path: 'product', redirect: '/commerce/products' },
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
    redirect: '/member/users',
    children: [
      { path: 'list', redirect: '/member/users' },
      { path: 'service-community', redirect: '/member/support' },
    ],
  },
  {
    path: '/order',
    component: Layout,
    name: 'Order',
    meta: { title: '订单管理', icon: 'List', featureModule: 'product', hidden: true },
    redirect: '/commerce/orders',
    children: [
      { path: 'list', redirect: '/commerce/orders' },
      {
        path: 'detail/:id',
        name: 'OrderDetail',
        redirect: (to) => ({ path: '/commerce/orders', query: { id: String(to.params.id || '') } }),
        meta: { title: '订单详情', hidden: true },
      },
      { path: 'refund', redirect: '/commerce/orders?tab=refund' },
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
        meta: { title: '素材管理', icon: 'FolderOpened' },
      },
    ],
  },
  {
    path: '/member',
    component: Layout,
    name: 'Member',
    meta: { title: '会员管理', icon: 'User', featureModule: 'member' },
    redirect: '/member/overview',
    children: [
      {
        path: 'overview',
        name: 'MemberOpsOverview',
        component: () => import('@/views/member-ops/overview.vue'),
        meta: { title: '会员概览', icon: 'Odometer', featureModule: 'member' },
      },
      {
        path: 'users',
        name: 'MemberOpsUsers',
        component: () => import('@/views/member-ops/users.vue'),
        meta: { title: '用户管理', icon: 'User' },
      },
      {
        path: 'plans',
        name: 'MemberOpsPlans',
        component: () => import('@/views/member-ops/plans.vue'),
        meta: { title: '会员权益', icon: 'Avatar', featureModule: 'member' },
      },
      {
        path: 'growth',
        name: 'MemberOpsGrowth',
        component: () => import('@/views/member-ops/growth.vue'),
        meta: { title: '成长积分', icon: 'Medal', featureModule: 'member' },
      },
      {
        path: 'community',
        name: 'MemberOpsCommunity',
        component: () => import('@/views/member-ops/community.vue'),
        meta: { title: '社区管理', icon: 'Orange', featureModule: 'planet' },
      },
      {
        path: 'support',
        name: 'MemberOpsSupport',
        component: () => import('@/views/member-ops/support.vue'),
        meta: { title: '客服中心', icon: 'ChatDotRound' },
      },
      // 旧路径兼容
      { path: 'list', redirect: '/member/plans' },
      { path: 'planet', redirect: '/member/community' },
      { path: 'level', redirect: '/member/growth' },
      { path: 'points', redirect: '/member/growth' },
    ],
  },
  {
    path: '/marketing',
    component: Layout,
    name: 'Marketing',
    meta: { title: '优惠券', icon: 'Ticket', hidden: true },
    redirect: '/commerce/coupons',
    children: [
      { path: 'coupon', redirect: '/commerce/coupons' },
    ],
  },
  {
    path: '/growth',
    component: Layout,
    name: 'Growth',
    meta: { title: '增长数据', icon: 'DataLine', hidden: true },
    redirect: '/commerce/growth',
    children: [
      { path: 'overview', redirect: '/commerce/growth' },
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
        meta: { title: '预约看板', icon: 'Calendar' },
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
        path: 'drafts',
        name: 'AiAgentDrafts',
        component: () => import('@/views/ai/agent/drafts.vue'),
        meta: { title: '草稿箱', icon: 'Document', roles: ['super_admin'] },
      },
      {
        path: 'agent',
        name: 'AiAgentList',
        component: () => import('@/views/ai/agent/list.vue'),
        meta: { title: '智能 Agent', icon: 'MagicStick', roles: ['super_admin'] },
      },
      {
        path: 'agent/:role',
        name: 'AiAgentConfig',
        component: () => import('@/views/ai/agent/index.vue'),
        meta: { title: 'Agent 配置', hidden: true, roles: ['super_admin'] },
      },
      {
        path: 'knowledge',
        name: 'AiKnowledge',
        component: () => import('@/views/ai/knowledge/index.vue'),
        meta: { title: '知识中心', icon: 'Collection', roles: ['super_admin'] },
      },
    ],
  },
  {
    path: '/finance',
    component: Layout,
    name: 'Finance',
    meta: { title: '财务管理', icon: 'Money', roles: ['super_admin'] },
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
        meta: { title: '发票税务', icon: 'Document' },
      },
      {
        path: 'permission',
        name: 'FinancePermission',
        component: () => import('@/views/finance/permission.vue'),
        meta: { title: '财务权限', icon: 'Lock', roles: ['super_admin'] },
      },
    ],
  },
  {
    path: '/settings',
    component: Layout,
    name: 'Settings',
    meta: { title: '系统设置', icon: 'Setting', roles: ['super_admin'] },
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
      {
        path: 'admin-user',
        name: 'SettingsAdminUser',
        component: () => import('@/views/system/admin-user.vue'),
        meta: { title: '管理员账号', icon: 'UserFilled' },
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
