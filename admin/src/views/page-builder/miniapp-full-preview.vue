<template>
  <div class="full-preview" :class="{ 'is-proto': previewMode === 'prototype' }">
    <header class="fp-toolbar">
      <div class="fp-toolbar__left">
        <el-button size="small" plain @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <strong>小程序预览</strong>
        <el-tag v-if="semver" size="small" type="success">v{{ semver }}</el-tag>
        <el-tag size="small" type="info">{{ modeLabel }}</el-tag>
      </div>
      <div class="fp-toolbar__center">
        <el-segmented v-model="previewMode" :options="modeOptions" size="default" />
      </div>
      <div class="fp-toolbar__right">
        <el-segmented
          v-if="previewMode === 'config'"
          v-model="authPreviewMode"
          :options="authModeOptions"
          size="small"
        />
        <el-button size="small" @click="copyLink">复制链接</el-button>
        <el-button size="small" type="primary" @click="openPrototypeTab">全屏打开原型</el-button>
      </div>
    </header>

    <!-- 原型全页：占满剩余视口，可滚动看完整手机 -->
    <div v-if="previewMode === 'prototype'" class="fp-proto">
      <div class="fp-proto__tip">这是静态设计稿演示，与「编辑」里的版本配置不是同一套。要看真实配置请切换到「本版本配置」。</div>
      <iframe
        class="fp-proto__frame"
        title="出海笔记完整原型"
        :src="prototypeSrc"
      />
    </div>

    <!-- 线上配置：首页 DSL + 四 Tab + 业务页清单 -->
    <div v-else class="fp-config" v-loading="loading">
      <aside class="fp-rail">
        <h4>页面清单</h4>
        <div v-for="group in displayScreenGroups" :key="group.title" class="fp-rail__group">
          <div class="fp-rail__label">{{ group.title }}</div>
          <button
            v-for="item in group.items"
            :key="item.key"
            type="button"
            class="fp-rail__item"
            :class="{ on: activeScreen === item.key }"
            @click="openScreen(item.key)"
          >
            <span class="n">{{ item.no }}</span>
            {{ item.label }}
          </button>
        </div>
      </aside>

      <div class="fp-stage">
        <el-alert
          v-if="notice"
          class="fp-notice"
          type="warning"
          :closable="false"
          show-icon
          :title="notice"
        />

        <PreviewPhone
          :page-title="phoneTitle"
          :page-bg-color="pageBgColor"
          :hide-nav-bar="currentHasBrandHeader || activeScreen === 'mine'"
          :pinned-brand-header="!!currentPinnedBrandHeader"
          @back="handleBack"
        >
          <template v-if="currentPinnedBrandHeader" #pinnedHeader>
            <div ref="pinnedHeaderEl">
              <ComponentItem
                :component="currentPinnedBrandHeader"
                :index="currentPinnedBrandHeaderIndex"
                :selected="false"
                :preview-mode="true"
                @preview-action="handlePreviewAction"
              />
            </div>
          </template>

          <!-- 版本快照：按该次发布的真实页面 DSL 渲染 -->
          <template v-if="showBoundPageContent">
            <template v-for="(comp, index) in activeComponents" :key="comp.id">
              <div
                v-if="isCurrentPinnedBrandHeader(comp, index)"
                class="brand-header-flow-spacer"
                :style="{ height: `${currentPinnedBrandHeaderHeight}px` }"
              />
              <ComponentItem
                v-else-if="comp.type !== ComponentType.FloatButton"
                :component="comp"
                :index="index"
                :selected="false"
                :preview-mode="true"
                @preview-action="handlePreviewAction"
              />
            </template>
            <div v-if="!loading && activeComponents.length === 0" class="fp-empty">该页在此版本快照中为空</div>
          </template>

          <!-- 无快照时：首页 DSL -->
          <template v-else-if="!snapshotPages.length && activeScreen === 'home'">
            <template v-for="(comp, index) in homeComponents" :key="comp.id">
              <div
                v-if="isCurrentPinnedBrandHeader(comp, index)"
                class="brand-header-flow-spacer"
                :style="{ height: `${currentPinnedBrandHeaderHeight}px` }"
              />
              <ComponentItem
                v-else-if="comp.type !== ComponentType.FloatButton"
                :component="comp"
                :index="index"
                :selected="false"
                :preview-mode="true"
                @preview-action="handlePreviewAction"
              />
            </template>
            <div v-if="!loading && homeComponents.length === 0" class="fp-empty">暂无首页内容</div>
          </template>

          <!-- 其它业务页：用真实接口数据拼出完整预览结构 -->
          <div v-else class="fp-page">
            <template v-if="activeScreen === 'content'">
              <div class="fp-search" @click="openScreen('search')">🔍 搜索内容、资料包、咨询</div>
              <div class="fp-chips">
                <span
                  v-for="t in contentTopics"
                  :key="t"
                  class="chip"
                  :class="{ on: contentTopic === t }"
                  @click="contentTopic = t"
                >{{ t }}</span>
              </div>
              <div class="fp-chips fmt">
                <span
                  v-for="f in contentFormats"
                  :key="f"
                  class="chip"
                  :class="{ on: contentFormat === f }"
                  @click="contentFormat = f"
                >{{ f }}</span>
              </div>
              <div
                v-for="item in filteredContents"
                :key="item.id"
                class="fp-card row"
                @click="openScreen('article')"
              >
                <img v-if="item.cover" :src="item.cover" class="thumb" alt="" />
                <div v-else class="thumb ph">📄</div>
                <div class="meta">
                  <div class="title">{{ item.title }}</div>
                  <div class="desc">{{ item.summary || '内容详情预览' }}</div>
                </div>
              </div>
              <div v-if="filteredContents.length === 0" class="fp-empty">暂无内容</div>
            </template>

            <template v-else-if="activeScreen === 'shop'">
              <div class="fp-banner">知识商城 · 虚拟商品正常发货 · 咨询按时段预约</div>
              <div class="fp-chips">
                <span
                  v-for="f in shopFilters"
                  :key="f.key"
                  class="chip"
                  :class="{ on: shopFilter === f.key }"
                  @click="shopFilter = f.key"
                >{{ f.label }}</span>
              </div>
              <div class="fp-grid">
                <div
                  v-for="p in filteredProducts"
                  :key="p.id"
                  class="fp-card product"
                  @click="openProduct(p)"
                >
                  <img v-if="p.mainImage || p.image" :src="p.mainImage || p.image" class="cover" alt="" />
                  <div v-else class="cover ph">📘</div>
                  <div class="kind">{{ productKind(p) }}</div>
                  <div class="title">{{ p.name }}</div>
                  <div class="price">¥{{ formatPrice(p.price) }}</div>
                </div>
              </div>
              <div v-if="filteredProducts.length === 0" class="fp-empty">暂无商品</div>
            </template>

            <template v-else-if="activeScreen === 'product'">
              <div class="fp-product-hero">
                <img v-if="currentProduct?.mainImage || currentProduct?.image" :src="currentProduct.mainImage || currentProduct.image" alt="" />
                <div v-else class="ph">📘</div>
              </div>
              <div class="fp-pad">
                <div class="price-lg">¥{{ formatPrice(currentProduct?.price) }}</div>
                <h3>{{ currentProduct?.name || '商品详情' }}</h3>
                <p class="desc">{{ currentProduct?.description || '资料包 / 1v1 咨询详情预览' }}</p>
                <div class="fp-block">
                  <h4>你将获得</h4>
                  <p>模板、清单与实操路径（预览态）</p>
                </div>
                <div class="fp-block">
                  <h4>用户评价</h4>
                  <p @click="openScreen('reviews')" class="link">查看全部评价 ›</p>
                </div>
              </div>
              <div class="fp-cta">
                <el-button @click="openScreen('service')">客服</el-button>
                <el-button type="primary" @click="openScreen(isServiceProduct ? 'booking' : 'confirm')">
                  {{ isServiceProduct ? '选时段预约' : '立即购买' }}
                </el-button>
              </div>
            </template>

            <template v-else-if="activeScreen === 'mine'">
              <MinePagePreview
                v-model:preview-logged-in="previewLoggedIn"
                :mine-config="mineConfigFull"
                :theme="themeConfig"
                @update:preview-nickname="onFullPreviewNicknameUpdate"
                @update:preview-avatar="onFullPreviewAvatarUpdate"
                @update:preview-phone="onFullPreviewPhoneUpdate"
                @update:preview-email="onFullPreviewEmailUpdate"
              />
            </template>

            <template v-else-if="activeScreen === 'login'">
              <div class="fp-login-overlay">
                <div class="fp-login-overlay__mask" @click="openScreen('mine')" />
                <div class="fp-login-overlay__sheet">
                  <div class="fp-login-overlay__handle" />
                  <div class="fp-login-overlay__brand">
                    <span class="fp-login-overlay__mark">海</span>
                    <div class="fp-login-overlay__brand-copy">
                      <strong>出海笔记</strong>
                      <span>想认识一下你，可以吗？</span>
                    </div>
                  </div>
                  <div class="fp-login-overlay__panel">
                    <div class="fp-login-overlay__row">
                      <span>头像、昵称</span>
                      <em>让主页有你的样子</em>
                    </div>
                    <div class="fp-login-overlay__divider" />
                    <div class="fp-login-overlay__row">
                      <span>手机号</span>
                      <em>点击授权微信手机号</em>
                    </div>
                  </div>
                  <label class="fp-login-overlay__agreement">
                    <input v-model="previewPrivacyAccepted" type="checkbox" />
                    <span>已阅读并同意《用户协议》与《隐私政策》</span>
                  </label>
                  <button class="fp-login-overlay__cta" :disabled="!previewPrivacyAccepted" @click="completePreviewLogin">
                    微信一键登录
                  </button>
                  <button type="button" class="fp-login-overlay__skip" @click="openScreen('mine')">先随便逛逛</button>
                </div>
              </div>
            </template>

            <template v-else>
              <div class="fp-stub">
                <div class="ic">{{ stubMeta.icon }}</div>
                <h3>{{ stubMeta.title }}</h3>
                <p>{{ stubMeta.desc }}</p>
                <div class="hint">完整交互请切换到「原型全页」模式</div>
                <el-button type="primary" @click="previewMode = 'prototype'">打开原型全页</el-button>
                <el-button plain @click="openScreen('home')">回首页</el-button>
              </div>
            </template>
          </div>

          <template #tabbar>
            <div
              v-if="showTabbar"
              class="fp-tabbar"
              :style="{ gridTemplateColumns: `repeat(${Math.max(displayTabs.length, 1)}, 1fr)` }"
            >
              <button
                v-for="tab in displayTabs"
                :key="tab.key"
                type="button"
                class="t"
                :class="{ on: isTabOn(tab.key) }"
                @click="openScreen(tab.key)"
              >
                <TabBarIconDisplay :icon="tab.icon" />
                <em>{{ tab.label }}</em>
              </button>
            </div>
          </template>
        </PreviewPhone>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { getReleaseDetail } from '@/api/version'
import { isAuthenticated } from '@/utils/auth'
import { getProductList } from '@/api/product'
import { getContentList } from '@/api/content'
import { getConfigByGroup } from '@/api/system'
import { getPageDetail } from '@/api/page'
import PreviewPhone from '@/components/page-builder/PreviewPhone.vue'
import ComponentItem from '@/components/page-builder/ComponentItem.vue'
import type { ComponentInstance, PageDSL } from '@/types/page'
import { ComponentType } from '@/types/page'
import TabBarIconDisplay from '@/components/miniapp-builder/TabBarIconDisplay.vue'
import MinePagePreview from '@/components/miniapp-builder/MinePagePreview.vue'
import { hydratePreviewDsl } from '@/utils/preview-datasource'
import {
  CONFIG_KEYS,
  DEFAULT_MINE_MENU,
  DEFAULT_ORDER_QUICK_ACCESS,
  DEFAULT_USER_PROFILE,
  DEFAULT_THEME,
  normalizeOrderTabLabels,
  resolveMineStyleKey,
  applyMineStylePreset,
  type MinePageConfig,
  type ThemeConfig,
} from '@/types/miniapp'
import { migrateTabBarIcon } from '@/components/page-builder/navIconSet'
import { suggestMenuLineIcon } from '@/components/miniapp-builder/menuLineIcons'
import { usePinnedBrandHeader, estimateBrandHeaderHeight } from '@/components/page-builder/composables/usePinnedBrandHeader'
import { useMeasuredElementHeight } from '@/components/page-builder/composables/useMeasuredElementHeight'

const route = useRoute()
const router = useRouter()

const previewMode = ref<'prototype' | 'config'>((route.query.view as string) === 'prototype' ? 'prototype' : 'config')
const modeOptions = [
  { label: '当前配置', value: 'config' },
  { label: '设计原型（22屏）', value: 'prototype' },
]

const loading = ref(false)
const notice = ref('')
const semver = ref(String(route.query.semver || ''))
const homeComponents = ref<ComponentInstance[]>([])
const activeComponents = ref<ComponentInstance[]>([])
const snapshotPages = ref<Array<{ path: string; name: string; dslContent?: string; pageId?: string }>>([])
const snapshotTabs = ref<Array<{ text: string; icon?: string; pagePath?: string; pageId?: string }>>([])
const pageCache = new Map<string, { title: string; bg: string; components: ComponentInstance[] }>()
const pageBgColor = ref('#f5f6f9')
const homeTitle = ref('首页')
const activeScreen = ref('home')
const products = ref<any[]>([])
const contents = ref<any[]>([])
const coupons = ref<any[]>([])
const currentProduct = ref<any | null>(null)
/** 从商品详情返回时的上一屏（模拟真机 navigateBack） */
const screenBeforeProduct = ref('home')
const authPreviewMode = ref<'guest' | 'member'>('guest')
const previewPrivacyAccepted = ref(false)
const authModeOptions = [
  { label: '未登录态', value: 'guest' },
  { label: '已登录态', value: 'member' },
]
const mineConfigFull = ref<MinePageConfig>({
  loginTitle: '登录出海笔记',
  loginSubtitle: '查看订单、预约与会员权益',
  loginButtonText: '微信一键登录',
  memberCardTitle: '会员中心',
  previewNickname: '微信用户',
  previewAvatar: '',
  previewPhone: '',
  previewEmail: '',
  showMenuIcons: false,
  showDecorBackground: true,
  showMemberCard: true,
  menuItems: DEFAULT_MINE_MENU.map((item, i) => ({ ...item, id: `mine-${i + 1}` })),
  orderQuickAccess: { ...DEFAULT_ORDER_QUICK_ACCESS },
  userProfile: { ...DEFAULT_USER_PROFILE },
})
const themeConfig = ref<ThemeConfig>({ ...DEFAULT_THEME })

function onFullPreviewNicknameUpdate(value: string) {
  mineConfigFull.value.previewNickname = value
}

function onFullPreviewAvatarUpdate(value: string) {
  mineConfigFull.value.previewAvatar = value
}

function onFullPreviewPhoneUpdate(value: string) {
  mineConfigFull.value.previewPhone = value
}

function onFullPreviewEmailUpdate(value: string) {
  mineConfigFull.value.previewEmail = value
}

function parseMineConfig(raw: unknown): MinePageConfig {
  const src = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {}
  const tabLabels = (src.orderQuickAccess as Record<string, unknown> | undefined)?.tabLabels as Record<string, string> | undefined
  const parsed = {
    loginTitle: String(src.loginTitle || mineConfigFull.value.loginTitle),
    loginSubtitle: String(src.loginSubtitle || mineConfigFull.value.loginSubtitle),
    loginButtonText: String(src.loginButtonText || mineConfigFull.value.loginButtonText),
    memberCardTitle: String(src.memberCardTitle || mineConfigFull.value.memberCardTitle),
    previewNickname: String(src.previewNickname || '微信用户'),
    previewAvatar: String(src.previewAvatar || ''),
    previewPhone: String(src.previewPhone || ''),
    previewEmail: String(src.previewEmail || ''),
    showMenuIcons: src.showMenuIcons === true,
    showDecorBackground: src.showDecorBackground !== false,
    showMemberCard: src.showMemberCard !== false,
    menuItems: Array.isArray(src.menuItems)
      ? (src.menuItems as MinePageConfig['menuItems']).map((m, i) => ({
          ...m,
          id: m.id || `mine-${i + 1}`,
          icon: suggestMenuLineIcon(m.title || '', m.icon),
        }))
      : DEFAULT_MINE_MENU.map((item, i) => ({ ...item, id: `mine-${i + 1}` })),
    orderQuickAccess: {
      ...DEFAULT_ORDER_QUICK_ACCESS,
      ...(src.orderQuickAccess as object || {}),
      tabLabels: normalizeOrderTabLabels(tabLabels),
    },
    userProfile: {
      ...DEFAULT_USER_PROFILE,
      ...(src.userProfile as object || {}),
    },
    ...(src.templateStyle ? { templateStyle: String(src.templateStyle) } : {}),
    ...(src.style ? { style: String(src.style) } : {}),
    ...(src.themeColor ? { themeColor: String(src.themeColor) } : {}),
    ...(src.themeColorSecondary ? { themeColorSecondary: String(src.themeColorSecondary) } : {}),
  } as MinePageConfig

  const rawStyleKey = String(src.templateStyle || '')
  const needsStyleFallback =
    src.style === 'outline'
    || rawStyleKey === 'minimal'
    || rawStyleKey === 'dark'
    || rawStyleKey === 'simple'
    || rawStyleKey === 'standard'
    || rawStyleKey === 'premium'
    || ['#1e293b', '#334155'].includes(String(src.themeColor || '').toLowerCase())
  if (needsStyleFallback || src.themeColor || src.templateStyle) {
    applyMineStylePreset(parsed as Record<string, unknown>, resolveMineStyleKey(parsed))
  }
  return parsed
}

function parseThemeConfig(raw: unknown): ThemeConfig {
  if (!raw) return { ...DEFAULT_THEME }
  try {
    const src = typeof raw === 'string' ? JSON.parse(raw) : raw
    return { ...DEFAULT_THEME, ...(src as object) }
  } catch {
    return { ...DEFAULT_THEME }
  }
}

function applyMineAndThemeFromMap(configMap: Record<string, string>) {
  const mineRaw = configMap[CONFIG_KEYS.MINE_PAGE_CONFIG]
  if (mineRaw) {
    try {
      const mine = typeof mineRaw === 'string' ? JSON.parse(mineRaw) : mineRaw
      mineConfigFull.value = parseMineConfig(mine)
    } catch { /* ignore */ }
  }
  const themeRaw = configMap[CONFIG_KEYS.THEME_CONFIG]
  if (themeRaw) {
    themeConfig.value = parseThemeConfig(themeRaw)
  }
}
const contentTopic = ref('全部')
const contentFormat = ref('全部')
const shopFilter = ref('all')

const contentTopics = ['全部', '选品', '供应链', '平台', '独立站', '物流', '合规']
const contentFormats = ['全部', '笔记', '长文', '视频', '数据']
const shopFilters = [
  { key: 'all', label: '全部' },
  { key: 'digital', label: '资料包' },
  { key: 'service', label: '1v1' },
]

const tabs = [
  { key: 'home', label: '首页', icon: '/images/nav-icons/g-platform.png' },
  { key: 'content', label: '内容', icon: '/images/nav-icons/g-content.png' },
  { key: 'shop', label: '商城', icon: '/images/nav-icons/g-bag.png' },
  { key: 'mine', label: '我的', icon: '/images/nav-icons/g-user.png' },
]

const mineMenus = [
  { key: 'orders', icon: '🧾', label: '全部订单' },
  { key: 'member', icon: '👑', label: '会员中心 · 权益' },
  { key: 'coupons', icon: '🎫', label: '优惠券' },
  { key: 'ai', icon: '🤖', label: 'AI 出海助手' },
  { key: 'service', icon: '💬', label: '客服 · 售后' },
]

const screenGroups = [
  {
    title: '底部 Tab',
    items: [
      { no: '01', key: 'home', label: '首页' },
      { no: '02', key: 'content', label: '内容中心' },
      { no: '03', key: 'shop', label: '知识商城' },
      { no: '04', key: 'mine', label: '我的' },
    ],
  },
  {
    title: '账户与权限',
    items: [
      { no: '05', key: 'login', label: '微信登录' },
    ],
  },
  {
    title: '交易闭环',
    items: [
      { no: '05', key: 'product', label: '商品详情' },
      { no: '06', key: 'confirm', label: '确认订单' },
      { no: '07', key: 'paid', label: '支付成功' },
      { no: '08', key: 'booking', label: '预约咨询' },
      { no: '09', key: 'booked', label: '预约成功' },
    ],
  },
  {
    title: '运营与售后',
    items: [
      { no: '11', key: 'search', label: '搜索' },
      { no: '12', key: 'reviews', label: '评价列表' },
      { no: '13', key: 'writereview', label: '写评价' },
      { no: '14', key: 'orders', label: '我的订单' },
      { no: '15', key: 'coupons', label: '优惠券' },
      { no: '16', key: 'member', label: '会员中心' },
      { no: '17', key: 'ai', label: 'AI 助手' },
      { no: '18', key: 'service', label: '客服售后' },
    ],
  },
]

const stubScreens: Record<string, { icon: string; title: string; desc: string }> = {
  search: { icon: '🔍', title: '搜索', desc: '热门词、历史记录、内容与商品结果' },
  article: { icon: '📰', title: '内容详情', desc: '笔记画廊 / 长文进度双模板' },
  reviews: { icon: '⭐', title: '全部评价', desc: '评分分布、标签筛选、评价列表' },
  writereview: { icon: '✍️', title: '发表评价', desc: '星级、标签、图片、匿名提交' },
  confirm: { icon: '🧾', title: '确认订单', desc: '优惠券、积分、支付底栏' },
  paid: { icon: '✅', title: '支付成功', desc: '收据、订单进度、奖励券' },
  booking: { icon: '🗓️', title: '预约 1v1', desc: '选日 / 时段 / 表单三步' },
  booked: { icon: '🎉', title: '预约成功', desc: '预约凭证与回看入口' },
  orders: { icon: '📦', title: '我的订单', desc: '待付款 / 待发货 / 待收货 / 已完成' },
  coupons: { icon: '🎫', title: '我的优惠券', desc: '可使用 / 已使用 / 已过期' },
  member: { icon: '👑', title: '会员中心', desc: 'LV1–4、成长值、权益网格' },
  ai: { icon: '🤖', title: 'AI 出海助手', desc: '主题引导与商品转化' },
  service: { icon: '💬', title: '客服 · 售后', desc: '退款 / 发票 / 改期 / 转人工' },
}

const prototypeSrc = computed(() => `/prototype/chuhai-notes.html?embed=1`)
const releaseId = computed(() => {
  const value = Number(route.query.releaseId)
  return Number.isFinite(value) && value > 0 ? value : 0
})
const useLiveConfig = computed(() => {
  if (String(route.query.source || '') === 'live') return true
  return !releaseId.value
})
const modeLabel = computed(() => {
  if (previewMode.value === 'prototype') return '设计原型'
  if (useLiveConfig.value) return '当前已保存配置'
  return semver.value ? `版本快照 v${semver.value}` : '版本快照'
})
const displayScreenGroups = computed(() => {
  if (!snapshotPages.value.length) return screenGroups
  return [{
    title: useLiveConfig.value
      ? '当前绑定页面（最新草稿）'
      : (semver.value ? `v${semver.value} 页面快照` : '本版本页面'),
    items: snapshotPages.value.map((page, index) => ({
      no: String(index + 1).padStart(2, '0'),
      key: page.path,
      label: page.name || page.path,
    })),
  }]
})
const displayTabs = computed(() => {
  if (!snapshotTabs.value.length) return tabs
  return snapshotTabs.value.map((tab) => {
    const tabId = String(tab.pageId || '').trim()
    const bound = /^\d+$/.test(tabId)
      ? snapshotPages.value.find((p) => p.pageId === tabId)
      : undefined
    const key = bound?.path || tab.pagePath || String(tab.pageId || '')
    return {
      key,
      label: tab.text,
      icon: migrateTabBarIcon(tab.icon) || '/images/nav-icons/g-bag.png',
    }
  })
})
const showTabbar = computed(() => {
  if (activeScreen.value === 'login') return false
  // 真机商品详情为 navigateTo 子页，不显示 TabBar
  if (activeScreen.value === 'product') return false
  if (snapshotPages.value.length) return displayTabs.value.length > 0
  return ['home', 'content', 'shop', 'mine'].includes(activeScreen.value)
})

const showBoundPageContent = computed(() => {
  if (!snapshotPages.value.length) return false
  if (activeScreen.value === 'login') return false
  if (activeScreen.value === 'product') return false
  if (activeScreen.value === 'mine' && activeComponents.value.length === 0) return false
  return snapshotPages.value.some((p) => normalizePath(p.path) === normalizePath(activeScreen.value))
    || activeComponents.value.length > 0
})

const currentViewComponents = computed(() => {
  if (showBoundPageContent.value) return activeComponents.value
  if (!snapshotPages.value.length && activeScreen.value === 'home') return homeComponents.value
  return []
})

const {
  pinnedBrandHeader: currentPinnedBrandHeader,
  pinnedBrandHeaderIndex: currentPinnedBrandHeaderIndex,
  hasBrandHeader: currentHasBrandHeader,
  isPinnedBrandHeader: isCurrentPinnedBrandHeader,
} = usePinnedBrandHeader(currentViewComponents)

const pinnedHeaderEl = ref<HTMLElement | null>(null)
const measuredPinnedHeight = useMeasuredElementHeight(
  pinnedHeaderEl,
  computed(() => !!currentPinnedBrandHeader.value),
)
const currentPinnedBrandHeaderHeight = computed(() => {
  if (!currentPinnedBrandHeader.value) return 0
  return measuredPinnedHeight.value || estimateBrandHeaderHeight(currentPinnedBrandHeader.value.props)
})

const previewLoggedIn = computed({
  get: () => authPreviewMode.value === 'member',
  set: (v: boolean) => {
    authPreviewMode.value = v ? 'member' : 'guest'
  },
})
const phoneTitle = computed(() => {
  if (activeScreen.value === 'login') return '登录'
  if (activeScreen.value === 'mine') return '我的'
  if (activeScreen.value === 'product') return currentProduct.value?.name || '商品详情'
  if (snapshotPages.value.length) {
    const page = findSnapshotPage(activeScreen.value)
    if (page?.name) return page.name
    const tab = displayTabs.value.find((t) => isTabOn(t.key))
    if (tab) return tab.label
    return '页面预览'
  }
  if (activeScreen.value === 'home') return homeTitle.value
  const tab = tabs.find((t) => t.key === activeScreen.value)
  if (tab) return tab.label
  return stubScreens[activeScreen.value]?.title || '页面预览'
})
const stubMeta = computed(() => stubScreens[activeScreen.value] || {
  icon: '📱',
  title: '页面预览',
  desc: '该业务页请切换到原型全页查看完整交互',
})
const isServiceProduct = computed(() => {
  const t = String(currentProduct.value?.productType || currentProduct.value?.type || '')
  return t.includes('service') || t.includes('预约') || t.includes('咨询')
})
const filteredContents = computed(() => {
  return contents.value.filter((c) => {
    const topicOk = contentTopic.value === '全部' || String(c.categoryName || c.topic || '').includes(contentTopic.value)
    const fmt = String(c.format || c.contentType || c.type || '')
    const formatOk =
      contentFormat.value === '全部' ||
      (contentFormat.value === '笔记' && /note|笔记/i.test(fmt)) ||
      (contentFormat.value === '长文' && /long|article|长文/i.test(fmt)) ||
      (contentFormat.value === '视频' && /video|视频/i.test(fmt)) ||
      (contentFormat.value === '数据' && /data|数据/i.test(fmt))
    return topicOk && formatOk
  })
})
const filteredProducts = computed(() => {
  return products.value.filter((p) => {
    if (shopFilter.value === 'all') return true
    const t = String(p.productType || p.type || '')
    if (shopFilter.value === 'digital') return /digital|资料|ebook/i.test(t) || !/service|咨询/i.test(t)
    if (shopFilter.value === 'service') return /service|咨询|预约/i.test(t)
    return true
  })
})

function formatPrice(v: unknown) {
  const n = Number(v)
  return Number.isFinite(n) ? (n % 1 === 0 ? String(n) : n.toFixed(2)) : '0'
}

function productKind(p: any) {
  const t = String(p.productType || p.type || '')
  if (/service|咨询|预约/i.test(t)) return '1v1 咨询'
  if (/digital|资料|ebook/i.test(t)) return '资料包'
  return '知识产品'
}

function normalizePath(path?: string) {
  return String(path || '').trim().replace(/^\/+/, '').replace(/\/+$/, '')
}

function isTabOn(key: string) {
  return normalizePath(activeScreen.value) === normalizePath(key)
}

function findSnapshotPage(ref: string) {
  const needle = normalizePath(ref)
  if (!needle) return undefined
  return snapshotPages.value.find((page) => normalizePath(page.path) === needle)
    || snapshotPages.value.find((page) => page.pageId === ref || page.pageId === needle)
    || snapshotPages.value.find((page) => {
      const p = normalizePath(page.path)
      return p.endsWith(needle) || needle.endsWith(p)
    })
}

async function fetchPageSnapshot(id: string) {
  try {
    const detailRes = await getPageDetail(id, { silent: true })
    const page = ((detailRes as any)?.data || detailRes) as {
      id?: number | string
      name?: string
      path?: string
      draftDslContent?: string
      dslContent?: string
    }
    const path = String(page.path || '').trim() || `pages/custom/page-${id}`
    let raw = page.draftDslContent || page.dslContent
    if (!raw) {
      try {
        const response = await fetch(`/api/v1/mp/pages?path=${encodeURIComponent(path)}`)
        const payload = await response.json()
        if (payload.code === 200 && payload.data) {
          raw = typeof payload.data === 'string' ? payload.data : JSON.stringify(payload.data)
        }
      } catch {
        // ignore published fallback errors
      }
    }
    if (!raw) return null
    return {
      pageId: id,
      path,
      name: page.name || path,
      dslContent: typeof raw === 'string' ? raw : JSON.stringify(raw),
    }
  } catch {
    return null
  }
}

function pickInitialHomePath(
  homeId: string,
  tabs: Array<{ pagePath?: string; pageId?: string }>,
  pages: Array<{ path: string; pageId?: string }>,
) {
  if (/^\d+$/.test(homeId)) {
    const byHome = pages.find((p) => p.pageId === homeId)
    if (byHome) return byHome.path
  }
  for (const tab of tabs) {
    const tabId = String(tab.pageId || '').trim()
    if (/^\d+$/.test(tabId)) {
      const byTab = pages.find((p) => p.pageId === tabId)
      if (byTab) return byTab.path
    }
    const tabPath = normalizePath(tab.pagePath)
    if (tabPath && tabPath !== 'pages/index/index') {
      const byPath = pages.find((p) => {
        const pPath = normalizePath(p.path)
        return pPath === tabPath || pPath.endsWith(tabPath) || tabPath.endsWith(pPath)
      })
      if (byPath) return byPath.path
    }
  }
  return pages.find((p) => /pages\/index\/index/.test(normalizePath(p.path)))?.path
    || pages[0]?.path
    || ''
}

function filterBoundSnapshotPages(
  pages: Array<{ path: string; name?: string; dslContent?: string; pageId?: string }>,
  tabs: Array<{ pagePath?: string; pageId?: string }>,
  homeId: string,
) {
  const boundIds = new Set<string>()
  if (/^\d+$/.test(homeId)) boundIds.add(homeId)
  for (const tab of tabs) {
    const id = String(tab.pageId || '').trim()
    if (/^\d+$/.test(id)) boundIds.add(id)
  }

  const boundPaths = new Set<string>()
  for (const tab of tabs) {
    const p = normalizePath(tab.pagePath || '')
    if (!p || p === 'pages/mine/mine') continue
    boundPaths.add(p)
  }

  if (!boundIds.size && !boundPaths.size) return pages

  return pages.filter((page) => {
    const id = String(page.pageId || '').trim()
    if (id && boundIds.has(id)) return true
    const p = normalizePath(page.path)
    if (boundPaths.has(p)) return true
    for (const bp of boundPaths) {
      if (p === bp || p.endsWith(bp) || bp.endsWith(p)) return true
    }
    return false
  })
}

function syncTabPagePaths(
  tabs: Array<{ text: string; icon?: string; pagePath?: string; pageId?: string }>,
  pages: Array<{ path: string; pageId?: string }>,
) {
  return tabs.map((tab) => {
    const tabId = String(tab.pageId || '').trim()
    if (/^\d+$/.test(tabId)) {
      const page = pages.find((p) => p.pageId === tabId)
      if (page) return { ...tab, pagePath: page.path }
    }
    return tab
  })
}

async function showSnapshotPage(path: string) {
  activeScreen.value = path
  const cacheKey = normalizePath(path)
  const cached = pageCache.get(cacheKey)
  if (cached) {
    homeTitle.value = cached.title
    pageBgColor.value = cached.bg
    activeComponents.value = cached.components
    homeComponents.value = cached.components
    return
  }
  const page = findSnapshotPage(path)
  if (!page?.dslContent) {
    homeTitle.value = page?.name || '页面预览'
    activeComponents.value = []
    homeComponents.value = []
    return
  }
  try {
    const dsl = JSON.parse(page.dslContent) as PageDSL
    const rawComponents = Array.isArray(dsl.components) ? dsl.components : []
    const rawTitle = dsl.page?.name || page.name || '页面预览'
    const rawBg = dsl.page?.background_color || '#f5f6f9'
    homeTitle.value = rawTitle
    pageBgColor.value = rawBg
    activeComponents.value = rawComponents
    homeComponents.value = rawComponents
    pageCache.set(cacheKey, { title: rawTitle, bg: rawBg, components: rawComponents })

    void hydratePreviewDsl(dsl).then(({ dsl: hydrated }) => {
      const title = hydrated.page?.name || rawTitle
      const bg = hydrated.page?.background_color || rawBg
      const components = Array.isArray(hydrated.components) ? hydrated.components : rawComponents
      pageCache.set(cacheKey, { title, bg, components })
      if (normalizePath(activeScreen.value) === cacheKey) {
        homeTitle.value = title
        pageBgColor.value = bg
        activeComponents.value = components
        homeComponents.value = components
      }
    }).catch(() => {})
  } catch (e: any) {
    notice.value = e?.message || '该页快照解析失败'
  }
}

function openScreen(key: string) {
  // 商品详情为子页，不走版本快照路由（真机为 /pages/product-detail）
  if (key === 'product') {
    if (activeScreen.value !== 'product') {
      screenBeforeProduct.value = activeScreen.value
    }
    activeScreen.value = 'product'
    if (!currentProduct.value && products.value.length) {
      currentProduct.value = products.value[0]
    }
    return
  }
  if (snapshotPages.value.length) {
    const page = findSnapshotPage(key)
    if (page?.path) {
      void showSnapshotPage(page.path)
      return
    }
    if (key === 'mine' || key === '__mine__' || normalizePath(key) === 'pages/mine/mine') {
      activeScreen.value = 'mine'
      activeComponents.value = []
      homeComponents.value = []
      return
    }
    void showSnapshotPage(key)
    return
  }
  activeScreen.value = key
  if (key === 'product' && !currentProduct.value && products.value.length) {
    currentProduct.value = products.value[0]
  }
}

function handlePreviewAction(payload: {
  tab?: string
  message?: string
  detailType?: string
  detailTitle?: string
  detailDesc?: string
  productId?: string | number
  previewPath?: string
}) {
  if (!payload) return
  if (payload.detailType === 'content' || payload.tab === 'content') {
    openScreen('content')
    ElMessage.success(payload.message || `已打开「${payload.detailTitle || '内容'}」`)
    return
  }
  // 点商品 → 商品介绍页（对齐真机 product-detail），不是商品 Tab 列表
  if (payload.detailType === 'product' || payload.tab === 'product') {
    const id = payload.productId
    const found = id != null
      ? products.value.find((p) => String(p.id) === String(id))
      : null
    openProduct(found || {
      id,
      name: payload.detailTitle || '商品详情',
      description: payload.detailDesc || '',
    })
    ElMessage.success(payload.message || '已打开商品详情')
    return
  }
  if (payload.tab === 'shop') {
    openScreen('shop')
    ElMessage.success(payload.message || '已打开商品')
    return
  }
  if (payload.detailType === 'activity' || payload.tab === 'activity') {
    openScreen('activity')
    ElMessage.success(payload.message || '已打开活动')
    return
  }
  if (payload.previewPath) {
    void showSnapshotPage(payload.previewPath)
    return
  }
  if (payload.tab === 'mine') {
    openScreen('mine')
    return
  }
  if (payload.tab === 'home') {
    openScreen('home')
    return
  }
  if (payload.message) ElMessage.success(payload.message)
}

function openProtectedScreen(key: string) {
  if (!previewLoggedIn.value) {
    activeScreen.value = 'login'
    ElMessage.info('该功能需要登录，已唤起登录面板')
    return
  }
  openScreen(key)
}

function completePreviewLogin() {
  if (!previewPrivacyAccepted.value) {
    ElMessage.warning('请先同意用户协议与隐私政策')
    return
  }
  authPreviewMode.value = 'member'
  activeScreen.value = 'mine'
  ElMessage.success('已切换为登录成功状态（预览模式）')
}

function openProduct(p: any) {
  if (activeScreen.value !== 'product') {
    screenBeforeProduct.value = activeScreen.value
  }
  currentProduct.value = p
  activeScreen.value = 'product'
}

function handleBack() {
  if (activeScreen.value === 'login') {
    openScreen('mine')
    return
  }
  if (activeScreen.value === 'product') {
    const back = screenBeforeProduct.value || 'home'
    openScreen(back)
    return
  }
  if (!showTabbar.value) {
    openScreen('home')
    return
  }
  if (activeScreen.value !== 'home') openScreen('home')
}

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push('/page-builder/start')
}

function copyLink() {
  navigator.clipboard.writeText(window.location.href)
    .then(() => ElMessage.success('预览链接已复制'))
    .catch(() => ElMessage.info(window.location.href))
}

function openPrototypeTab() {
  window.open('/prototype/chuhai-notes.html', '_blank', 'noopener,noreferrer')
}

async function applyDsl(dsl: PageDSL) {
  const { dsl: hydrated } = await hydratePreviewDsl(dsl)
  homeTitle.value = hydrated.page?.name || '出海笔记首页'
  pageBgColor.value = hydrated.page?.background_color || '#f5f6f9'
  homeComponents.value = Array.isArray(hydrated.components) ? hydrated.components : []
}

function extractDslFromSnapshot(snapshotJson: string, path: string): PageDSL | null {
  if (!snapshotJson) return null
  const snapshot = JSON.parse(snapshotJson) as { pages?: Array<{ path?: string; dslContent?: string }> }
  const needle = normalizePath(path)
  const page = snapshot.pages?.find((item) => {
    const p = normalizePath(item.path)
    return p === needle || p.endsWith(needle) || needle.endsWith(p)
  })
  if (!page?.dslContent) return null
  return JSON.parse(page.dslContent) as PageDSL
}

async function loadLiveConfig() {
  snapshotPages.value = []
  snapshotTabs.value = []
  homeComponents.value = []
  activeComponents.value = []
  pageCache.clear()
  notice.value = ''
  semver.value = ''

  if (!isAuthenticated()) {
    notice.value = '未登录，无法读取当前后台配置；请登录后重试。'
    await loadHomeDsl()
    return
  }

  try {
    const res = await getConfigByGroup('basic')
    const configs = ((res as any)?.data?.configs || (res as any)?.data || []) as Array<{
      configKey?: string
      configValue?: string
    }>
    const configMap: Record<string, string> = {}
    for (const c of configs) {
      if (c?.configKey != null && c.configValue !== undefined) {
        configMap[c.configKey] = c.configValue
      }
    }

    let tabsRaw: any[] = []
    const tabStr = configMap[CONFIG_KEYS.TABBAR_ITEMS]
    if (tabStr) {
      try {
        tabsRaw = typeof tabStr === 'string' ? JSON.parse(tabStr) : (tabStr as any)
      } catch {
        tabsRaw = []
      }
    }
    snapshotTabs.value = (Array.isArray(tabsRaw) ? tabsRaw : []).map((t: any) => ({
      text: t.text || t.label || t.name || '未命名',
      icon: migrateTabBarIcon(t.icon || t.iconPath || '') || '/images/nav-icons/g-bag.png',
      pagePath: t.pagePath || t.path || '',
      pageId: t.pageId != null ? String(t.pageId) : '',
    }))

    applyMineAndThemeFromMap(configMap)

    const pageIds = new Set<string>()
    const homeId = String(configMap[CONFIG_KEYS.HOME_PAGE_ID] || '').trim()
    if (/^\d+$/.test(homeId)) pageIds.add(homeId)
    for (const tab of snapshotTabs.value) {
      const id = String(tab.pageId || '').trim()
      if (/^\d+$/.test(id)) pageIds.add(id)
    }

    const pages: Array<{ path: string; name: string; dslContent?: string; pageId?: string }> = []
    for (const id of pageIds) {
      const snapshot = await fetchPageSnapshot(id)
      if (snapshot) pages.push(snapshot)
    }

    snapshotPages.value = pages
    snapshotTabs.value = syncTabPagePaths(snapshotTabs.value, pages)
    const homePathPreferred = pickInitialHomePath(homeId, snapshotTabs.value, pages)
    if (homePathPreferred) {
      await showSnapshotPage(homePathPreferred)
    } else {
      notice.value = '当前配置未绑定可预览页面，请先在导航里绑定首页。'
      await loadHomeDsl()
    }
  } catch (e: any) {
    notice.value = e?.message || '读取当前配置失败'
    await loadHomeDsl()
  }
}

async function loadPreviewSource() {
  if (useLiveConfig.value) {
    await loadLiveConfig()
    return
  }
  await loadReleaseSnapshot()
}

async function loadReleaseSnapshot() {
  snapshotPages.value = []
  snapshotTabs.value = []
  activeComponents.value = []
  pageCache.clear()
  notice.value = ''
  if (!releaseId.value || !isAuthenticated()) {
    await loadLiveConfig()
    return
  }
  try {
    const res = await getReleaseDetail(releaseId.value)
    const release = ((res as any).data || res) as {
      semver?: string
      snapshot?: string
    }
    semver.value = release.semver || semver.value
    if (!release.snapshot) {
      notice.value = '该版本没有页面快照，已改为展示当前已保存配置。'
      await loadLiveConfig()
      return
    }
    const snap = JSON.parse(release.snapshot) as {
      pages?: Array<{ path?: string; name?: string; dslContent?: string; pageId?: string | number }>
      systemConfig?: Record<string, unknown> & {
        tabbarItems?: Array<{ text: string; icon?: string; pagePath?: string; pageId?: string }>
        miniappHomePageId?: string | number
      }
    }
    const configMap = snap.systemConfig || {}
    const homeId = String(configMap.miniappHomePageId || '').trim()
    snapshotTabs.value = Array.isArray(configMap.tabbarItems) ? configMap.tabbarItems : []
    const allPages = (snap.pages || [])
      .filter((page) => page?.path)
      .map((page) => ({
        path: page.path as string,
        name: page.name || page.path as string,
        dslContent: page.dslContent,
        pageId: page.pageId != null ? String(page.pageId) : undefined,
      }))
    const pages = filterBoundSnapshotPages(allPages, snapshotTabs.value, homeId)
    snapshotPages.value = pages
    snapshotTabs.value = syncTabPagePaths(snapshotTabs.value, pages)
    const homePathPreferred = pickInitialHomePath(homeId, snapshotTabs.value, pages)
    if (homePathPreferred) await showSnapshotPage(homePathPreferred)
    else notice.value = '该版本快照里没有可预览页面'
  } catch (e: any) {
    const timedOut = e?.code === 'ECONNABORTED' || /timeout/i.test(String(e?.message || ''))
    notice.value = timedOut
      ? '版本快照加载超时，请稍后重试'
      : (e?.message || e?.msg || '版本快照加载失败')
  }
}

async function loadHomeDsl() {
  notice.value = ''
  try {
    if (releaseId.value && isAuthenticated()) {
      const res = await getReleaseDetail(releaseId.value)
      const release = ((res as any).data || res) as { semver?: string; snapshot?: string }
      semver.value = release.semver || semver.value
      const dsl = release.snapshot ? extractDslFromSnapshot(release.snapshot, 'pages/index/index') : null
      if (dsl) {
        await applyDsl(dsl)
        return
      }
    }
    const response = await fetch('/api/v1/mp/pages?path=pages/index/index')
    const payload = await response.json()
    if (payload.code === 200 && payload.data) {
      await applyDsl(payload.data as PageDSL)
      if (releaseId.value && !isAuthenticated()) {
        notice.value = '未登录时展示当前线上首页；登录后可查看版本快照。'
      }
      return
    }
    throw new Error(payload.message || '加载首页失败')
  } catch (e: any) {
    notice.value = e?.message || '首页加载失败'
    homeComponents.value = []
  }
}

async function loadBusinessData() {
  try {
    const [prodRes, contentRes] = await Promise.all([
      getProductList({ page: 1, pageSize: 20, status: 1 } as any),
      getContentList({ page: 1, pageSize: 20, status: 1 } as any),
    ])
    const prodData = (prodRes as any)?.data
    const contentData = (contentRes as any)?.data
    products.value = prodData?.records || prodData?.list || (Array.isArray(prodData) ? prodData : [])
    contents.value = contentData?.records || contentData?.list || (Array.isArray(contentData) ? contentData : [])
    if (!currentProduct.value && products.value.length) currentProduct.value = products.value[0]
  } catch {
    products.value = []
    contents.value = []
  }
}

async function loadMiniappConfig() {
  try {
    const res = await getConfigByGroup('basic')
    const data = (res as any)?.data || {}
    const configs = (data.configs || []) as Array<{ configKey?: string; configValue?: string }>
    const configMap: Record<string, string> = { ...data }
    for (const c of configs) {
      if (c?.configKey != null && c.configValue !== undefined) {
        configMap[c.configKey] = c.configValue
      }
    }
    if (data.minePageConfig && !configMap[CONFIG_KEYS.MINE_PAGE_CONFIG]) {
      configMap[CONFIG_KEYS.MINE_PAGE_CONFIG] = typeof data.minePageConfig === 'string'
        ? data.minePageConfig
        : JSON.stringify(data.minePageConfig)
    }
    applyMineAndThemeFromMap(configMap)
  } catch {
    // 保留默认配置
  }
}

watch(previewMode, (mode) => {
  const q = { ...route.query, view: mode }
  router.replace({ query: q })
  if (mode === 'config') {
    loading.value = true
    loadPreviewSource().finally(() => {
      loading.value = false
    })
  }
})

onMounted(async () => {
  if (previewMode.value === 'config') {
    loading.value = true
    await loadPreviewSource()
    loading.value = false
  }
})
</script>

<style scoped lang="scss">
.full-preview {
  min-height: 100vh;
  height: 100vh;
  overflow: hidden;
  background: #0d1018;
  display: flex;
  flex-direction: column;

  &.is-proto {
    background: #0d1018;
  }

  &:not(.is-proto) {
    background: linear-gradient(180deg, #0f1424 0%, #1a2035 120px, #eef3fb 120px);
    overflow: auto;
    height: auto;
    min-height: 100vh;
  }
}

.fp-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.98);
  border-bottom: 1px solid #e5e7eb;
  position: relative;
  z-index: 20;
  flex-shrink: 0;

  &__left, &__right {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 220px;
  }

  &__right {
    justify-content: flex-end;
  }

  &__center {
    flex: 1;
    display: flex;
    justify-content: center;
  }

  strong {
    font-size: 16px;
    color: #111827;
  }
}

.fp-proto {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #0d1018;

  &__tip {
    flex-shrink: 0;
    padding: 8px 16px;
    font-size: 12px;
    color: #9aa2b6;
    background: rgba(255, 255, 255, 0.04);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    text-align: center;
  }

  &__frame {
    flex: 1;
    width: 100%;
    min-height: 0;
    border: 0;
    background: #0d1018;
  }
}

.fp-config {
  flex: 1;
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 0;
  min-height: calc(100vh - 58px);
}

.fp-rail {
  padding: 20px 14px;
  background: #12172a;
  color: #c5cbe0;
  overflow: auto;

  h4 {
    margin: 0 0 16px;
    font-size: 12px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #7b849e;
  }

  &__group { margin-bottom: 20px; }
  &__label {
    font-size: 11px;
    color: #6d7590;
    margin-bottom: 8px;
  }
  &__item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid transparent;
    background: transparent;
    color: #aeb6c8;
    border-radius: 10px;
    padding: 8px 10px;
    margin-bottom: 4px;
    cursor: pointer;
    font-size: 13px;
    text-align: left;

    .n {
      font-size: 10px;
      color: #5f677d;
      font-variant-numeric: tabular-nums;
      width: 18px;
    }

    &:hover {
      background: rgba(255, 255, 255, 0.06);
      color: #fff;
    }

    &.on {
      background: rgba(47, 91, 255, 0.18);
      border-color: rgba(47, 91, 255, 0.4);
      color: #fff;
    }
  }
}

.fp-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 16px 40px;
  background: linear-gradient(180deg, #eef3fb 0%, #f7f9fc 100%);
}

.fp-notice {
  width: min(100%, 420px);
  margin-bottom: 16px;
}

.fp-empty {
  padding: 48px 16px;
  text-align: center;
  color: #94a3b8;
}

.fp-page {
  min-height: 520px;
  background: #f5f6f9;
  padding-bottom: 72px;
}

.fp-search {
  margin: 12px;
  padding: 12px 14px;
  background: #fff;
  border-radius: 999px;
  color: #9aa3b5;
  font-size: 13px;
}

.fp-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 12px 10px;

  &.fmt { padding-top: 0; }

  .chip {
    padding: 6px 12px;
    border-radius: 999px;
    background: #fff;
    color: #39404f;
    font-size: 12px;
    cursor: pointer;
    border: 1px solid #e8ebf2;

    &.on {
      background: #eef2ff;
      color: #2f5bff;
      border-color: #dfe6ff;
      font-weight: 600;
    }
  }
}

.fp-card {
  background: #fff;
  border-radius: 12px;
  margin: 0 12px 10px;
  padding: 12px;

  &.row {
    display: flex;
    gap: 10px;
    cursor: pointer;
  }

  .thumb, .cover {
    width: 72px;
    height: 72px;
    border-radius: 10px;
    object-fit: cover;
    background: #eef2f7;
    flex-shrink: 0;
  }

  .thumb.ph, .cover.ph {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
  }

  .title {
    font-size: 14px;
    font-weight: 700;
    color: #111827;
  }

  .desc {
    margin-top: 4px;
    font-size: 12px;
    color: #8a94a6;
    line-height: 1.5;
  }

  .price {
    margin-top: 6px;
    color: #ff6b3d;
    font-weight: 800;
  }

  .kind {
    display: inline-block;
    margin: 8px 0 4px;
    font-size: 11px;
    color: #2f5bff;
    background: #eef2ff;
    padding: 2px 8px;
    border-radius: 6px;
  }

  &.product {
    margin: 0;
    padding: 0 0 10px;
    overflow: hidden;
    cursor: pointer;

    .cover {
      width: 100%;
      height: 120px;
      border-radius: 0;
    }

    .kind, .title, .price {
      margin-left: 10px;
      margin-right: 10px;
    }
  }
}

.fp-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 0 12px 12px;
}

.fp-banner {
  margin: 12px;
  padding: 16px;
  border-radius: 14px;
  background: linear-gradient(135deg, #2f5bff, #6d8cff);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.5;
}

.fp-product-hero {
  height: 220px;
  background: #e8ebf2;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .ph {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 48px;
  }
}

.fp-pad {
  padding: 16px;
  background: #fff;

  h3 {
    margin: 8px 0;
    font-size: 18px;
  }

  .price-lg {
    color: #ff6b3d;
    font-size: 28px;
    font-weight: 800;
  }

  .desc { color: #6b7280; font-size: 13px; line-height: 1.6; }
  .link { color: #2f5bff; cursor: pointer; }
}

.fp-block {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #f0f2f5;

  h4 { margin: 0 0 6px; font-size: 14px; }
  p { margin: 0; color: #6b7280; font-size: 13px; }
}

.fp-cta {
  position: sticky;
  bottom: 56px;
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  background: #fff;
  border-top: 1px solid #eee;
}

.fp-mine-hero {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 24px 16px;
  background: linear-gradient(145deg, #1b1f31, #2a3350);
  color: #fff;

  .av {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: #2f5bff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
  }

  .nm { font-size: 18px; font-weight: 700; }
  .lv { margin-top: 4px; font-size: 12px; opacity: 0.75; }

  &.is-guest {
    background: linear-gradient(145deg, #111827, #26334e);

    .av {
      background: rgba(255, 255, 255, 0.12);
    }
  }
}

.fp-login-cta {
  margin-left: auto;
  padding: 7px 13px;
  flex-shrink: 0;
  color: #111827;
  font-size: 11px;
  font-weight: 700;
  background: #fff;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
}

.fp-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  background: #fff;
  padding: 14px 8px;
  text-align: center;

  b { display: block; font-size: 16px; color: #111827; }
  span { font-size: 11px; color: #8a94a6; }
  div { cursor: pointer; }
}

.fp-quick {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin: 12px;
  padding: 12px;
  background: #fff;
  border-radius: 14px;
  text-align: center;
  font-size: 12px;
  color: #39404f;

  div { cursor: pointer; line-height: 1.6; }
}

.fp-menu {
  margin: 0 12px 12px;
  background: #fff;
  border-radius: 14px;
  overflow: hidden;

  .row {
    display: flex;
    justify-content: space-between;
    padding: 14px 16px;
    border-bottom: 1px solid #f3f4f6;
    font-size: 14px;
    cursor: pointer;

    em { color: #c0c4cc; font-style: normal; }
  }
}

.fp-login-overlay {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  min-height: 520px;
  background: #f5f6f9;
}

.fp-login-overlay__mask {
  position: absolute;
  inset: 0;
  background: rgba(11, 18, 33, 0.42);
}

.fp-login-overlay__sheet {
  position: relative;
  z-index: 1;
  padding: 8px 18px 24px;
  background: #fff;
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -8px 24px rgba(23, 32, 51, 0.12);
}

.fp-login-overlay__handle {
  width: 32px;
  height: 4px;
  margin: 0 auto 16px;
  border-radius: 99px;
  background: #e5dfd6;
}

.fp-login-overlay__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.fp-login-overlay__mark {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: linear-gradient(135deg, #315efb, #2446c7);
  color: #fff;
  font-size: 19px;
  font-weight: 800;
}

.fp-login-overlay__brand-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;

  strong { font-size: 17px; font-weight: 800; color: #2a3142; }
  span { font-size: 12px; color: #9aa3b5; }
}

.fp-login-overlay__panel {
  margin-bottom: 14px;
  padding: 4px 14px;
  background: #f6f3ee;
  border-radius: 14px;
}

.fp-login-overlay__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
  font-size: 14px;
  color: #2a3142;

  em { font-style: normal; font-size: 12px; color: #9aa3b5; }
}

.fp-login-overlay__divider {
  height: 1px;
  background: rgba(42, 49, 66, 0.08);
}

.fp-login-overlay__agreement {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 11px;
  color: #7c879d;
  cursor: pointer;
}

.fp-login-overlay__cta {
  width: 100%;
  min-height: 44px;
  border: 0;
  border-radius: 12px;
  background: #315efb;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;

  &:disabled { opacity: 0.45; cursor: not-allowed; }
}

.fp-login-overlay__skip {
  display: block;
  width: 100%;
  margin-top: 10px;
  padding: 8px 0;
  border: 0;
  background: transparent;
  color: #9aa3b5;
  font-size: 13px;
  cursor: pointer;
}

.fp-login {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 520px;
  padding: 20px 18px 24px;
  overflow: hidden;
  color: #10231f;
  background: #f7f7f3;
  box-sizing: border-box;
}

.fp-login__ambient {
  position: absolute;
  pointer-events: none;
  border-radius: 50%;
}

.fp-login__ambient--top {
  top: -90px;
  right: -80px;
  width: 230px;
  height: 230px;
  background: radial-gradient(circle, rgb(215 181 109 / 22%) 0%, rgb(215 181 109 / 0%) 70%);
}

.fp-login__ambient--bottom {
  bottom: -130px;
  left: -105px;
  width: 290px;
  height: 290px;
  background: radial-gradient(circle, rgb(73 111 101 / 13%) 0%, rgb(73 111 101 / 0%) 72%);
}

.fp-login__brand-lockup {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;

  > div:last-child {
    display: flex;
    flex-direction: column;
    margin-left: 8px;
  }

  b {
    font-size: 12px;
    line-height: 1.1;
  }

  span {
    margin-top: 3px;
    color: #8a928e;
    font-size: 6px;
    font-weight: 700;
    letter-spacing: 0.8px;
  }
}

.fp-login__logo {
  display: grid;
  width: 29px;
  height: 29px;
  margin: 0 !important;
  color: #f1e8d2;
  font-size: 12px;
  font-weight: 700;
  background: #10231f;
  border-radius: 8px;
  box-shadow: 0 4px 10px rgb(16 35 31 / 14%);
  place-items: center;
}

.fp-login__hero {
  position: relative;
  z-index: 1;
  margin-top: 36px;
}

.fp-login__eyebrow {
  display: flex;
  align-items: center;
  color: #718079;
  font-size: 7px;
  font-weight: 700;
  letter-spacing: 1.2px;

  i {
    width: 5px;
    height: 5px;
    margin-right: 7px;
    background: #c7a85e;
    border-radius: 50%;
    box-shadow: 0 0 0 3px rgb(199 168 94 / 13%);
  }
}

.fp-login__brand {
  margin-top: 12px;
  font-size: 34px;
  font-weight: 760;
  letter-spacing: -1px;
  line-height: 1.1;
}

.fp-login__desc {
  margin-top: 8px;
  color: #7d8883;
  font-size: 10px;
}

.fp-login__card {
  position: relative;
  z-index: 1;
  margin-top: 27px;
  padding: 15px;
  background: rgb(255 255 255 / 82%);
  border: 1px solid rgb(16 35 31 / 10%);
  border-radius: 15px;
  box-shadow: 0 12px 34px rgb(16 35 31 / 8%);
}

.fp-login__card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  border-bottom: 1px solid rgb(16 35 31 / 10%);

  div {
    display: flex;
    flex-direction: column;
  }

  b {
    font-size: 13px;
  }

  span {
    margin-top: 3px;
    color: #909894;
    font-size: 8px;
  }

  em {
    padding: 4px 8px;
    color: #866e38;
    font-size: 8px;
    font-style: normal;
    font-weight: 700;
    background: rgb(215 181 109 / 18%);
    border-radius: 999px;
  }
}

.fp-login__profile-row {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 62px;
  padding: 10px 0;
  border-bottom: 1px solid rgb(16 35 31 / 10%);

  > em {
    flex-shrink: 0;
    color: #48685f;
    font-size: 10px;
    font-style: normal;
    font-weight: 650;
  }
}

.fp-login__avatar {
  position: relative;
  flex-shrink: 0;

  .avatar-ring {
    display: grid;
    width: 41px;
    height: 41px;
    color: #84918b;
    font-size: 14px;
    background: #edf0ec;
    border: 1px solid rgb(16 35 31 / 10%);
    border-radius: 50%;
    place-items: center;
  }

  i {
    position: absolute;
    right: -3px;
    bottom: -2px;
    display: grid;
    width: 17px;
    height: 17px;
    color: #fff;
    font-size: 11px;
    font-style: normal;
    background: #10231f;
    border: 2px solid #fff;
    border-radius: 50%;
    place-items: center;
  }
}

.fp-login__profile-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;

  b {
    font-size: 12px;
  }

  span {
    margin-top: 3px;
    color: #7d8883;
    font-size: 8px;
  }
}

.fp-login__nickname {
  padding-top: 11px;

  label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
    color: #10231f;
    font-size: 11px;
    font-weight: 650;

    em {
      color: #a18a57;
      font-size: 8px;
      font-style: normal;
    }
  }
}

.nickname-input {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 42px;
  padding: 0 6px 0 11px;
  color: #a2aaa6;
  font-size: 11px;
  background: rgb(239 241 237 / 82%);
  border-radius: 8px;

  b {
    display: grid;
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    padding: 0;
    color: #69766f;
    font-size: 9px;
    background: rgb(255 255 255 / 82%);
    border-radius: 7px;
    place-items: center;
  }
}

.fp-login__bottom {
  position: relative;
  z-index: 1;
  margin-top: 13px;
}

.privacy-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 0 2px;
  margin-bottom: 11px;
  color: #7d8883;
  font-size: 9px;
  line-height: 1.55;

  input {
    margin-top: 1px;
    accent-color: #10231f;
  }

  b {
    color: #344842;
    font-weight: 650;
  }
}

.one-tap-login {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 48px;
  padding: 0 10px 0 16px;
  color: #fff;
  font-size: 13px;
  font-weight: 650;
  background: #10231f;
  border: 0;
  border-radius: 10px;
  box-shadow: 0 9px 20px rgb(16 35 31 / 18%);
  cursor: pointer;

  i {
    display: grid;
    width: 28px;
    height: 28px;
    color: #10231f;
    font-size: 13px;
    font-style: normal;
    font-weight: 500;
    background: #f1e8d2;
    border-radius: 50%;
    place-items: center;
  }

  &:disabled {
    color: #939b97;
    background: #e3e6e2;
    box-shadow: none;
    cursor: not-allowed;

    i {
      color: #a5aca8;
      background: #f2f3f0;
    }
  }
}

.fp-login__trust {
  display: flex;
  justify-content: center;
  margin-top: 9px;
  color: #929b96;
  font-size: 8px;
}

.fp-stub {
  padding: 48px 24px;
  text-align: center;

  .ic { font-size: 42px; margin-bottom: 12px; }
  h3 { margin: 0 0 8px; }
  p { color: #6b7280; font-size: 13px; line-height: 1.6; }
  .hint {
    margin: 16px 0;
    font-size: 12px;
    color: #2f5bff;
    background: #eef2ff;
    display: inline-block;
    padding: 6px 12px;
    border-radius: 999px;
  }

  .el-button { margin: 4px; }
}

.fp-tabbar {
  display: grid;
  background: #fff;
  border-top: 1px solid #e8ebf2;
  padding: 6px 0 8px;
  flex-shrink: 0;
  width: 100%;

  .t {
    border: 0;
    background: transparent;
    color: #a5abb9;
    cursor: pointer;

    span, em { display: block; }
    span { font-size: 18px; line-height: 1.3; }
    em { font-style: normal; font-size: 11px; }

    &.on {
      color: #2f5bff;
      font-weight: 700;
    }
  }
}

.brand-header-flow-spacer {
  flex-shrink: 0;
  width: 100%;
}

@media (max-width: 900px) {
  .fp-config {
    grid-template-columns: 1fr;
  }

  .fp-rail {
    max-height: 180px;
  }

  .fp-toolbar {
    flex-wrap: wrap;

    &__left, &__right, &__center {
      min-width: 0;
      width: 100%;
      justify-content: flex-start;
    }
  }
}
</style>
