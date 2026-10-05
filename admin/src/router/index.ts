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
  {
    path: '/h5/golden-parity',
    name: 'GoldenParityPreview',
    component: () => import('@/views/page-builder/golden-parity-preview.vue'),
    meta: { title: '黄金 DSL 比对', hidden: true },
  },
]

/** 动态路由（需登录 + 权限过滤） */
export const asyncRoutes: RouteRecordRaw[] = [
  {
    path: '/mini',
    component: Layout,
    name: 'Mini',
    meta: { title: '小程序', icon: 'Monitor', roles: ['super_admin', 'content_ops'], permissions: ['page:list'] },
    redirect: '/mini/pages',
    children: [
      /* ── 三个工作台（侧栏只显示这三个）─────────────────────────────────
         2026-10-06 从 9 个平铺 / 6 组分组进一步收敛为 3 个工作台：
         页面管理 / 品牌与导航 / 发版中心。
         收敛依据是「用户要完成的几件事」而不是「技术模块的划分」——
         原来「品牌信息」「导航配置」「系统功能」改的都是同一个外壳，
         「概览」「预览检查」「发布与版本」是同一次发布的三个侧面。          */
      {
        path: 'pages',
        name: 'MiniPages',
        component: () => import('@/views/mini/pages-hub.vue'),
        meta: { title: '页面管理', icon: 'Document', roles: ['super_admin', 'content_ops'], permissions: ['page:list'] },
      },
      {
        path: 'appearance',
        name: 'MiniAppearanceHub',
        component: () => import('@/views/mini/appearance-hub.vue'),
        meta: { title: '品牌与导航', icon: 'Brush', roles: ['super_admin', 'content_ops'], permissions: ['page:list'] },
      },
      {
        path: 'releases',
        name: 'MiniReleasesHub',
        component: () => import('@/views/mini/releases-hub.vue'),
        meta: { title: '发版中心', icon: 'Upload', roles: ['super_admin', 'content_ops'], permissions: ['page:list'] },
      },

      /* ── 旧地址兼容 ────────────────────────────────────────────────────
         🔴 这些 redirect 不是"过时的历史"，是**正在被人使用的深链接**：
         旧书签、外部文档、我上一轮给用户的链接都指向它们。
         全部保留并指到对应工作台，尽量带上 query 让上下文延续。
         用函数式 redirect 而不是字符串，才能把原 query 带过去。          */
      { path: 'overview', redirect: '/mini/releases', meta: { title: '搭建工作台', hidden: true } },
      { path: 'brand', redirect: { path: '/mini/appearance', query: { tab: 'brand' } }, meta: { title: '品牌信息', hidden: true } },
      { path: 'system', redirect: { path: '/mini/appearance', query: { tab: 'flags' } }, meta: { title: '系统配置', hidden: true } },
      { path: 'page-config', redirect: '/mini/pages', meta: { title: '页面配置', hidden: true } },
      { path: 'navigation', redirect: { path: '/mini/appearance', query: { tab: 'nav' } }, meta: { title: '导航配置', hidden: true } },
      { path: 'preview', redirect: '/mini/releases', meta: { title: '预览检查', hidden: true } },
      { path: 'publish', redirect: '/mini/releases', meta: { title: '发布与版本', hidden: true } },

      /* ── 仍是独立页的（不是配置，是创作流程）───────────────────────── */
      {
        path: 'templates',
        name: 'MiniTemplates',
        component: () => import('@/views/mini/templates.vue'),
        meta: { title: '模板库', hidden: true, roles: ['super_admin', 'content_ops'], permissions: ['page:list'] },
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
    ],
  },
  {
    path: '/page-builder',
    component: Layout,
    name: 'PageBuilder',
    meta: { title: '小程序', icon: 'Monitor', roles: ['super_admin', 'content_ops'], permissions: ['page:list'], hidden: true },
    redirect: '/mini/pages',
    children: [
      {
        path: 'overview',
        name: 'PageBuilderOverview',
        redirect: '/mini/releases',
        meta: { title: '搭建工作台', hidden: true, roles: ['super_admin', 'content_ops'], permissions: ['page:list'] },
      },
      {
        path: 'start',
        name: 'PageBuilderStart',
        redirect: '/mini/pages',
        meta: { title: '页面管理', hidden: true, roles: ['super_admin', 'content_ops'], permissions: ['page:list'] },
      },
      {
        // 旧「品牌导航」页：保留深链可达，但侧栏不再展示
        // （它与 /mini/brand + /mini/navigation 是同一批能力的两套实现，已收编到新路由）
        path: 'appearance',
        name: 'PageBuilderAppearance',
        redirect: '/mini/appearance',
        meta: { title: '品牌与导航', hidden: true, roles: ['super_admin', 'content_ops'], permissions: ['page:list'] },
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
        // 2026-10-06：标题与侧栏入口统一，避免面包屑写「固定页 · 我的」而侧栏写「我的页」
        meta: { title: '我的页', hidden: true, roles: ['super_admin', 'content_ops'], permissions: ['page:list'] },
      },
      {
        path: 'login',
        name: 'PageBuilderLogin',
        component: () => import('@/views/page-builder/login-config.vue'),
        meta: { title: '登录页', hidden: true, roles: ['super_admin', 'content_ops'], permissions: ['page:list'] },
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
        redirect: '/mini/releases',
        meta: { title: '发版中心', hidden: true, roles: ['super_admin', 'content_ops'], permissions: ['page:publish'] },
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
        redirect: '/mini/releases',
        meta: { title: '发版中心', hidden: true, roles: ['super_admin', 'content_ops'], permissions: ['page:list'] },
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
        meta: { title: '长文创作', icon: 'Reading', lockedType: 'article', featureModule: 'content' },
      },
      {
        path: 'notes',
        name: 'ContentOpsNotes',
        component: () => import('@/views/content-ops/library.vue'),
        meta: { title: '图文笔记', icon: 'EditPen', lockedType: 'note', featureModule: 'content' },
      },
      {
        path: 'materials',
        redirect: '/content/files',
      },
      {
        // V111：动态管理已并入「社区管理 › 内容管理」，老链接保留跳转
        path: 'moments',
        name: 'ContentOpsMoments',
        redirect: '/community/content/all',
        meta: { title: '动态管理', icon: 'ChatDotRound', featureModule: 'content' },
      },
      {
        path: 'videos',
        name: 'ContentOpsVideos',
        component: () => import('@/views/content-ops/library.vue'),
        meta: { title: '视频管理', icon: 'VideoCamera', lockedType: 'video', featureModule: 'content' },
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
        path: 'authors',
        name: 'ContentOpsAuthors',
        component: () => import('@/views/content/authors.vue'),
        meta: { title: '作者管理', icon: 'User', featureModule: 'content' },
      },
      {
        path: 'settings',
        name: 'ContentOpsSettings',
        component: () => import('@/views/content-ops/settings.vue'),
        meta: { title: '内容设置', icon: 'Setting', featureModule: 'content' },
      },
      {
        path: 'sources/wechat',
        name: 'ContentSourcesWechat',
        component: () => import('@/views/content-ops/sources-wechat.vue'),
        meta: { title: '公众号同步', icon: 'Connection', featureModule: 'content' },
      },
      {
        path: 'sources/xhs',
        name: 'ContentSourcesXhs',
        component: () => import('@/views/content-ops/sources-xhs.vue'),
        meta: { title: '小红书导入', icon: 'DocumentCopy', featureModule: 'content' },
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
        meta: { title: '文件管理', icon: 'FolderOpened', hidden: true },
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
        path: 'channels',
        name: 'CommerceOpsChannels',
        component: () => import('@/views/commerce-ops/channels.vue'),
        meta: { title: '渠道管理', icon: 'Share', featureModule: 'product' },
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
        meta: { title: '用户列表', icon: 'User' },
      },
      {
        // V114 用户管理收编：角色身份标签（作者/主理人/编辑等），运营可自由增删改
        path: 'role-tags',
        name: 'MemberOpsRoleTags',
        component: () => import('@/views/member-ops/role-tags.vue'),
        meta: { title: '角色标签', icon: 'Collection' },
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
      // 社区已升级为独立模块 /community
      { path: 'community', redirect: '/community/list' },
      {
        // 客服 IM 工作台：满屏三栏（会话列表 / 对话流 / 客户全景），SSE 实时收消息。
        // 老的 support.vue 降级为「工单视图」（一次诉求的记录），路径保留兼容。
        path: 'support',
        name: 'MemberOpsSupport',
        component: () => import('@/views/member-ops/im-workbench.vue'),
        meta: { title: '客服工作台', icon: 'ChatDotRound' },
      },
      {
        path: 'support-tickets',
        name: 'MemberOpsSupportTickets',
        component: () => import('@/views/member-ops/support.vue'),
        meta: { title: '客服工单', icon: 'Tickets' },
      },
      // 旧路径兼容
      { path: 'list', redirect: '/member/plans' },
      { path: 'planet', redirect: '/community/list' },
      { path: 'level', redirect: '/member/growth' },
      { path: 'points', redirect: '/member/growth' },
    ],
  },
  {
    path: '/community',
    component: Layout,
    name: 'Community',
    meta: { title: '社区管理', icon: 'Present', featureModule: 'planet' },
    redirect: '/community/list',
    children: [
      {
        path: 'list',
        name: 'CommunityList',
        component: () => import('@/views/community/list.vue'),
        meta: { title: '社区列表', icon: 'Present', featureModule: 'planet' },
      },
      {
        path: 'content',
        name: 'CommunityContentEntry',
        component: () => import('@/views/community/entry.vue'),
        meta: { title: '内容管理', featureModule: 'planet' },
      },
      {
        path: 'members',
        name: 'CommunityMembersEntry',
        component: () => import('@/views/community/entry.vue'),
        meta: { title: '成员管理', featureModule: 'planet' },
      },
      {
        path: 'membership',
        name: 'CommunityMembershipEntry',
        component: () => import('@/views/community/entry.vue'),
        meta: { title: '会员配置', featureModule: 'planet' },
      },
      {
        path: 'create',
        name: 'CommunityCreate',
        component: () => import('@/views/community/create.vue'),
        meta: { title: '新建社区', hidden: true },
      },
      {
        path: 'overview/:id',
        name: 'CommunityOverview',
        component: () => import('@/views/community/overview.vue'),
        meta: { title: '社区概览', hidden: true },
      },
      {
        path: 'profile/:id',
        name: 'CommunityProfile',
        component: () => import('@/views/community/profile.vue'),
        meta: { title: '编辑资料', hidden: true },
      },
      // 旧路径兼容
      { path: 'detail/:id', redirect: (to: any) => `/community/overview/${to.params.id}` },
      {
        path: 'members/:id',
        name: 'CommunityMembers',
        component: () => import('@/views/community/members.vue'),
        meta: { title: '社区成员', hidden: true },
      },
      {
        path: 'content/:id',
        name: 'CommunityContent',
        component: () => import('@/views/community/content.vue'),
        meta: { title: '社区内容', hidden: true },
      },
      {
        path: 'membership/:id',
        name: 'CommunityMembership',
        component: () => import('@/views/community/membership.vue'),
        meta: { title: '会员配置', hidden: true },
      },
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
    // 运营中心：横向运营动作的统一收口（有时间窗 / 需启停 / 跨资产生效的动作）
    // 与「资产」类模块的区别：页面/内容/商品/社区属于资产，留在各自模块
    path: '/ops',
    component: Layout,
    name: 'Ops',
    meta: { title: '运营中心', icon: 'Promotion' },
    redirect: '/ops/private-domain',
    children: [
      {
        path: 'private-domain',
        name: 'OpsPrivateDomain',
        component: () => import('@/views/ops/private-domain.vue'),
        meta: { title: '私域引流', icon: 'ChatDotRound' },
      },
      {
        // 搜索运营：热词原先硬编码在小程序 data/warm-source.js，运营改不了。
        // 端上读取链路已存在（search.js onLoad 拉 config.search_hot），
        // 且 search_hot 在 SystemConfigServiceImpl 的三处白名单里，本页只补运营入口。
        path: 'search',
        name: 'OpsSearch',
        component: () => import('@/views/ops/search.vue'),
        meta: { title: '搜索运营', icon: 'Search' },
      },
      {
        // 审核中心：处理用户举报 + 账号封禁。
        // 刻意走 /api/v1/admin/ops/moderation 而非 /api/v1/admin/compliance ——
        // 后者权限注解是 hasAuthority('content:audit')，该权限码在 mp_permission 里
        // 根本不存在，运营调它会 403。详见 backend AdminModerationController 类注释。
        path: 'moderation',
        name: 'OpsModeration',
        component: () => import('@/views/ops/moderation.vue'),
        meta: { title: '审核中心', icon: 'Warning' },
      },
      {
        // 全局资源位：弹窗 / 顶部横条 / 悬浮球 / 公告。
        // 存mp_system_config.global_resource_slots（JSON），无需 DDL；
        // 已在 SystemConfigServiceImpl 的 PUBLIC / JSON / RUNTIME_PUBLIC 三处白名单登记。
        // 端上由 utils/global-resource.js 读缓存挑片，逐页注册 <global-resource />（5 个 Tab）。
        path: 'resource',
        name: 'OpsResource',
        component: () => import('@/views/ops/resource.vue'),
        meta: { title: '全局资源位', icon: 'Promotion' },
      },
      {
        // 通知中心：站内信群发 + 发送记录 + 场景开关 + 订阅消息模板。
        // 站内信此前只有系统自动写入（UserNoticeService 6 处），运营无任何入口；
        // 订阅消息模板原先只挂在 /settings（super_admin 专属），运营根本进不去。
        // 两者都收编到运营中心，路径走 /api/v1/admin/ops/**（只需登录）。
        path: 'notification',
        name: 'OpsNotification',
        component: () => import('@/views/ops/notification.vue'),
        meta: { title: '通知中心', icon: 'Bell' },
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
    meta: { title: '经营管理', icon: 'Money', roles: ['super_admin'] },
    redirect: '/finance/overview',
    children: [
      {
        path: 'overview',
        name: 'FinanceOpsOverview',
        component: () => import('@/views/finance-ops/overview.vue'),
        meta: { title: '经营概览', icon: 'DataBoard' },
      },
      {
        path: 'transactions',
        name: 'FinanceOpsTransactions',
        component: () => import('@/views/finance-ops/transactions.vue'),
        meta: { title: '收支明细', icon: 'List' },
      },
      {
        path: 'budget',
        name: 'FinanceOpsBudget',
        component: () => import('@/views/finance-ops/budget.vue'),
        meta: { title: '预算与目标', icon: 'Aim' },
      },
      {
        path: 'invoice',
        name: 'FinanceOpsInvoice',
        component: () => import('@/views/finance-ops/invoice.vue'),
        meta: { title: '票据与税务', icon: 'Document' },
      },
      {
        path: 'assistant',
        name: 'FinanceOpsAssistant',
        component: () => import('@/views/finance-ops/assistant.vue'),
        meta: { title: '智能助手', icon: 'MagicStick' },
      },
      { path: 'dashboard', redirect: '/finance/overview' },
      { path: 'income-expense', redirect: '/finance/transactions' },
      { path: 'report', redirect: '/finance/overview' },
      { path: 'permission', redirect: '/finance/assistant' },
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

// P1-04 白屏兜底：发布新版后旧 chunk 从服务器消失，懒加载失败会导致整页白屏。
// 命中时自动刷新一次拉新资源；60 秒内只刷一次，防止新资源也 404 时死循环。
const CHUNK_RELOAD_KEY = 'admin-chunk-reload-at'
export function isChunkLoadError(error: unknown): boolean {
  const msg = String((error as Error)?.message || error || '')
  return /Loading chunk [\w-]+ failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(msg)
}
export function reloadOnceForChunkError(): void {
  const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0)
  if (Date.now() - last > 60_000) {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()))
    window.location.reload()
  }
}
router.onError((error) => {
  if (isChunkLoadError(error)) reloadOnceForChunkError()
})

export default router
