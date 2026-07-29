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
        <div v-for="group in screenGroups" :key="group.title" class="fp-rail__group">
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

        <PreviewPhone :page-title="phoneTitle" :page-bg-color="pageBgColor" @back="handleBack">
          <!-- 首页 DSL -->
          <template v-if="activeScreen === 'home'">
            <ComponentItem
              v-for="(comp, index) in homeComponents"
              :key="comp.id"
              :component="comp"
              :index="index"
              :selected="false"
              :preview-mode="true"
            />
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
              <div class="fp-mine-hero" :class="{ 'is-guest': !previewLoggedIn }">
                <div class="av">🧭</div>
                <div>
                  <div class="nm">{{ previewLoggedIn ? '出海笔记用户' : mineConfig.loginTitle }}</div>
                  <div class="lv">{{ previewLoggedIn ? '出海会员 · LV.2' : mineConfig.loginSubtitle }}</div>
                </div>
                <button v-if="!previewLoggedIn" class="fp-login-cta" @click="openScreen('login')">
                  {{ mineConfig.loginButtonText }}
                </button>
              </div>
              <div class="fp-stats">
                <div @click="openProtectedScreen('coupons')"><b>{{ previewLoggedIn ? (coupons.length || 3) : '—' }}</b><span>优惠券</span></div>
                <div @click="openProtectedScreen('member')"><b>{{ previewLoggedIn ? '860' : '—' }}</b><span>积分</span></div>
                <div @click="openProtectedScreen('member')"><b>{{ previewLoggedIn ? '1,360' : '—' }}</b><span>成长值</span></div>
              </div>
              <div class="fp-quick">
                <div @click="openProtectedScreen('orders')">💳<br>待付款</div>
                <div @click="openProtectedScreen('orders')">📦<br>待发货</div>
                <div @click="openProtectedScreen('booked')">🗓️<br>我的预约</div>
                <div @click="openProtectedScreen('writereview')">✍️<br>待评价</div>
              </div>
              <div class="fp-menu">
                <div v-for="m in mineMenus" :key="m.key" class="row" @click="openProtectedScreen(m.key)">
                  <span>{{ m.icon }} {{ m.label }}</span><em>›</em>
                </div>
              </div>
            </template>

            <template v-else-if="activeScreen === 'login'">
              <div class="fp-login">
                <div class="fp-login__ambient fp-login__ambient--top"></div>
                <div class="fp-login__ambient fp-login__ambient--bottom"></div>

                <div class="fp-login__brand-lockup">
                  <div class="fp-login__logo">海</div>
                  <div>
                    <b>出海笔记</b>
                    <span>CROSS-BORDER NOTES</span>
                  </div>
                </div>

                <div class="fp-login__hero">
                  <div class="fp-login__eyebrow"><i></i>MEMBER ACCESS</div>
                  <div class="fp-login__brand">欢迎回来</div>
                  <div class="fp-login__desc">登录后同步订单、预约与会员权益</div>
                </div>

                <div class="fp-login__card">
                  <div class="fp-login__card-head">
                    <div>
                      <b>完善个人资料</b>
                      <span>首次登录只需完成一次</span>
                    </div>
                    <em>01</em>
                  </div>

                  <div class="fp-login__profile-row">
                    <div class="fp-login__avatar">
                      <div class="avatar-ring">人</div>
                      <i>+</i>
                    </div>
                    <div class="fp-login__profile-copy">
                      <b>个人头像</b>
                      <span>点击使用你的头像</span>
                    </div>
                    <em>选择</em>
                  </div>

                  <div class="fp-login__nickname">
                    <label><span>昵称</span><em>必填</em></label>
                    <div class="nickname-input">
                      <span>填写你希望展示的昵称</span>
                      <b>Aa</b>
                    </div>
                  </div>
                </div>

                <div class="fp-login__bottom">
                  <label class="privacy-row">
                    <input v-model="previewPrivacyAccepted" type="checkbox" />
                    <span>我已阅读并同意 <b>《用户协议》</b> 与 <b>《隐私政策》</b></span>
                  </label>
                  <button class="one-tap-login" :disabled="!previewPrivacyAccepted" @click="completePreviewLogin">
                    <span>手机号快捷登录</span><i>→</i>
                  </button>
                  <div class="fp-login__trust">
                    <span>✓ 手机号仅用于登录及必要的服务通知</span>
                  </div>
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

          <div class="fp-tabbar" v-if="showTabbar">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              type="button"
              class="t"
              :class="{ on: activeScreen === tab.key }"
              @click="openScreen(tab.key)"
            >
              <span>{{ tab.icon }}</span>
              <em>{{ tab.label }}</em>
            </button>
          </div>
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
import PreviewPhone from '@/components/page-builder/PreviewPhone.vue'
import ComponentItem from '@/components/page-builder/ComponentItem.vue'
import type { ComponentInstance, PageDSL } from '@/types/page'
import { hydratePreviewDsl } from '@/utils/preview-datasource'

const route = useRoute()
const router = useRouter()

const previewMode = ref<'prototype' | 'config'>((route.query.view as string) === 'prototype' ? 'prototype' : 'config')
const modeOptions = [
  { label: '本版本配置', value: 'config' },
  { label: '设计原型（22屏）', value: 'prototype' },
]

const loading = ref(false)
const notice = ref('')
const semver = ref(String(route.query.semver || ''))
const homeComponents = ref<ComponentInstance[]>([])
const pageBgColor = ref('#f5f6f9')
const homeTitle = ref('出海笔记首页')
const activeScreen = ref('home')
const products = ref<any[]>([])
const contents = ref<any[]>([])
const coupons = ref<any[]>([])
const currentProduct = ref<any | null>(null)
const authPreviewMode = ref<'guest' | 'member'>('guest')
const previewPrivacyAccepted = ref(false)
const authModeOptions = [
  { label: '未登录态', value: 'guest' },
  { label: '已登录态', value: 'member' },
]
const mineConfig = ref({
  loginTitle: '登录出海笔记',
  loginSubtitle: '查看订单、预约与会员权益',
  loginButtonText: '微信一键登录',
})

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
  { key: 'home', label: '首页', icon: '🏠' },
  { key: 'content', label: '内容', icon: '📚' },
  { key: 'shop', label: '商城', icon: '🛍️' },
  { key: 'mine', label: '我的', icon: '👤' },
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
const modeLabel = computed(() => (previewMode.value === 'prototype' ? '设计原型' : '本版本配置'))
const previewLoggedIn = computed(() => authPreviewMode.value === 'member')
const showTabbar = computed(() => ['home', 'content', 'shop', 'mine'].includes(activeScreen.value))
const phoneTitle = computed(() => {
  if (activeScreen.value === 'home') return homeTitle.value
  if (activeScreen.value === 'login') return '登录'
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

const releaseId = computed(() => {
  const value = Number(route.query.releaseId)
  return Number.isFinite(value) && value > 0 ? value : 0
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

function openScreen(key: string) {
  activeScreen.value = key
  if (key === 'product' && !currentProduct.value && products.value.length) {
    currentProduct.value = products.value[0]
  }
}

function openProtectedScreen(key: string) {
  if (!previewLoggedIn.value) {
    activeScreen.value = 'login'
    ElMessage.info('该功能需要登录，已进入登录页')
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
  currentProduct.value = p
  openScreen('product')
}

function handleBack() {
  if (activeScreen.value === 'login') {
    openScreen('mine')
    return
  }
  if (activeScreen.value === 'product') {
    openScreen('shop')
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
  const page = snapshot.pages?.find((item) => item.path === path)
  if (!page?.dslContent) return null
  return JSON.parse(page.dslContent) as PageDSL
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
    let mine = data.minePageConfig
    if (typeof mine === 'string') {
      try { mine = JSON.parse(mine) } catch { mine = null }
    }
    if (mine && typeof mine === 'object') {
      mineConfig.value = {
        loginTitle: mine.loginTitle || mineConfig.value.loginTitle,
        loginSubtitle: mine.loginSubtitle || mineConfig.value.loginSubtitle,
        loginButtonText: mine.loginButtonText || mineConfig.value.loginButtonText,
      }
    }
  } catch {
    // 保留登录页默认配置
  }
}

watch(previewMode, (mode) => {
  const q = { ...route.query, view: mode }
  router.replace({ query: q })
  if (mode === 'config') {
    loading.value = true
    Promise.all([loadHomeDsl(), loadBusinessData(), loadMiniappConfig()]).finally(() => {
      loading.value = false
    })
  }
})

onMounted(async () => {
  if (previewMode.value === 'config') {
    loading.value = true
    await Promise.all([loadHomeDsl(), loadBusinessData(), loadMiniappConfig()])
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
  position: sticky;
  bottom: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  background: rgba(255, 255, 255, 0.96);
  border-top: 1px solid #e8ebf2;
  padding: 6px 0 calc(8px + env(safe-area-inset-bottom));

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
