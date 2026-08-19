<template>
  <el-dialog
    :model-value="modelValue"
    title="小程序端实时预览"
    width="520px"
    destroy-on-close
    class="mini-preview-dialog"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="mini-preview-head">
      <div class="preview-subtitle">
        小程序端实时预览 · 当前模式：
        <b>{{ previewDataMode === 'real' ? '真实数据' : '演示数据' }}</b>
      </div>
      <el-segmented
        v-model="previewDataMode"
        :options="previewModeOptions"
        size="small"
      />
      <el-segmented v-model="previewTab" :options="previewTabs" size="small" />
      <el-button size="small" type="primary" plain :loading="qrLoading" @click="openMobileQr">
        手机扫码预览
      </el-button>
    </div>
    <el-alert
      class="preview-data-notice"
      :type="previewDataMode === 'demo' ? 'warning' : (realDataWarnings.length ? 'warning' : 'success')"
      :title="previewDataNotice"
      :closable="false"
      show-icon
    />

    <PreviewPhone
      :page-title="previewTitle"
      :page-bg-color="previewBgColor"
      :hide-nav-bar="previewHasBrandHeader"
      :pinned-brand-header="!!previewPinnedBrandHeader"
      @back="handlePreviewBack"
    >
      <template v-if="previewPinnedBrandHeader" #pinnedHeader>
        <div ref="previewPinnedHeaderEl">
          <ComponentItem
            :component="previewPinnedBrandHeader"
            :index="previewPinnedBrandHeaderIndex"
            :selected="false"
            :preview-mode="true"
            @select="() => {}"
            @preview-action="handlePreviewAction"
          />
        </div>
      </template>
      <template v-if="previewTab === 'home'">
        <div class="preview-home-wrap">
          <div v-if="previewPageLoading" class="preview-page-loading">正在加载页面…</div>
          <template v-for="(comp, index) in flowPreviewComponents" :key="comp.id">
            <div
              v-if="isPreviewPinnedBrandHeader(comp, index)"
              class="brand-header-flow-spacer"
              :style="{ height: `${previewPinnedBrandHeaderHeight}px` }"
            />
            <ComponentItem
              v-else
              :component="comp"
              :index="index"
              :selected="false"
              :preview-mode="true"
              @select="() => {}"
              @preview-action="handlePreviewAction"
            />
          </template>
          <div v-if="previewDetail?.type === 'form'" class="preview-form-overlay">
            <div class="mini-detail-card">
              <h3>{{ previewDetail.title }}</h3>
              <p>{{ previewDetail.desc }}</p>
              <div v-if="previewDetail.formFields?.length" class="preview-form-fields">
                <div v-for="field in previewDetail.formFields" :key="field.id" class="preview-form-field">
                  <label>{{ field.label }}<span v-if="field.required" class="required">*</span></label>
                  <div class="preview-field-placeholder">{{ field.placeholder || '请输入' + field.label }}</div>
                </div>
              </div>
              <p v-else class="preview-form-tip">暂无字段配置，请先在表单管理中编辑字段。</p>
              <p class="preview-form-tip">预览不支持真实提交，请到小程序端填写。</p>
              <el-button type="primary" plain size="small" @click="clearPreviewDetail">返回页面</el-button>
            </div>
          </div>
        </div>
      </template>

      <div v-else class="mini-mock-page">
        <div v-if="previewTab === 'content' && previewDetail?.type === 'content'" class="mini-section">
          <div class="mini-detail-card">
            <h3>{{ previewDetail.title }}</h3>
            <p>{{ previewDetail.desc }}</p>
            <el-button type="primary" plain size="small" @click="clearPreviewDetail">返回内容列表</el-button>
          </div>
        </div>

        <div v-else-if="previewTab === 'content'" class="mini-section">
          <div class="mini-section-title">精选内容</div>
          <div
            v-for="item in contentPreviewList"
            :key="item.title"
            class="mini-list-card clickable-card"
            @click="openContentDetail(item)"
          >
            <div class="mini-thumb">
              <el-icon><Document /></el-icon>
            </div>
            <div>
              <div class="mini-item-title">{{ item.title }}</div>
              <div class="mini-item-desc">{{ item.desc }}</div>
            </div>
          </div>
        </div>

        <div v-else-if="previewTab === 'member'" class="mini-section">
          <div class="member-preview-card">
            <div class="member-preview-name">金卡会员</div>
            <div class="member-preview-row">
              <span>等级</span>
              <span>积分 1280</span>
              <span>余额 ¥268</span>
            </div>
          </div>
          <div class="mini-section-title">会员权益</div>
          <div class="mini-grid">
            <div v-for="item in ['积分兑换', '专属优惠', '活动优先', '生日礼遇']" :key="item" class="mini-grid-card">
              {{ item }}
            </div>
          </div>
        </div>

        <div v-else-if="previewTab === 'activity' && previewDetail?.type === 'activity'" class="mini-section">
          <div class="mini-detail-card">
            <h3>{{ previewDetail.title }}</h3>
            <p>{{ previewDetail.desc }}</p>
            <el-button type="primary" size="small" @click="confirmPreviewAppointment">提交预约</el-button>
            <el-button plain size="small" @click="clearPreviewDetail">返回活动列表</el-button>
          </div>
        </div>

        <div v-else-if="previewTab === 'activity'" class="mini-section">
          <div
            v-for="item in activityPreviewList"
            :key="item.id"
            class="activity-preview-card"
          >
            <div class="mini-item-title">{{ item.name }}</div>
            <div class="mini-item-desc">{{ item.desc }}</div>
            <el-button type="primary" size="small" @click.stop="openActivityAppointment(item)">立即预约</el-button>
          </div>
        </div>

        <div v-else-if="previewTab === 'shop' && previewDetail?.type === 'product'" class="mini-section">
          <div class="mini-detail-card product-detail-card">
            <div v-if="productDetailLoading" class="product-detail-loading">正在加载商品详情…</div>
            <template v-else>
              <div v-if="previewDetail.cover" class="product-detail-cover">
                <img :src="previewDetail.cover" alt="" />
              </div>
              <h3>{{ previewDetail.title }}</h3>
              <p class="product-detail-price">¥{{ previewDetail.price || '0.00' }}</p>
              <p v-if="previewDetail.sales != null" class="product-detail-meta">已售 {{ previewDetail.sales }}</p>
              <p v-if="previewDetail.categoryName" class="product-detail-meta">分类：{{ previewDetail.categoryName }}</p>
              <p class="product-detail-desc">{{ previewDetail.desc || '暂无简介' }}</p>
              <el-button type="primary" plain size="small" @click="clearPreviewDetail">返回</el-button>
            </template>
          </div>
        </div>

        <div v-else-if="previewTab === 'shop'" class="mini-section">
          <div class="mini-section-title">推荐商品</div>
          <div class="mini-product-grid">
            <div
              v-for="item in shopPreviewList"
              :key="item.id || item.name"
              class="mini-product-card clickable-card"
              @click="openProductDetail(item)"
            >
              <div class="mini-product-img">
                <el-icon><Goods /></el-icon>
              </div>
              <div class="mini-item-title">{{ item.name }}</div>
              <div class="mini-price">¥{{ item.price }}</div>
            </div>
          </div>
        </div>
      </div>

      <template v-if="previewTab === 'home'" #fab>
        <ComponentItem
          v-for="(comp, index) in floatPreviewComponents"
          :key="`fab-${comp.id}`"
          :component="comp"
          :index="index"
          :selected="false"
          :preview-mode="true"
          :fab-only="true"
          @select="() => {}"
          @preview-action="handlePreviewAction"
        />
      </template>

      <template #tabbar>
        <div class="mini-bottom-tab" :style="{ gridTemplateColumns: 'repeat(' + tabColumns + ', 1fr)' }">
          <button
            v-for="tab in miniTabs"
            :key="tab.value"
            class="mini-tab-btn"
            :class="{ active: previewTab === tab.value }"
            @click="previewTab = tab.value"
          >
            <TabBarIconDisplay :icon="tab.icon" />
            <em>{{ tab.label }}</em>
          </button>
        </div>
      </template>
    </PreviewPhone>
  </el-dialog>

  <el-dialog
    v-model="qrVisible"
    title="手机扫码预览"
    width="360px"
    append-to-body
    destroy-on-close
    @closed="onQrDialogClosed"
  >
    <el-alert
      v-if="isLocalHost"
      type="warning"
      :closable="false"
      show-icon
      title="当前是本机地址：手机需与电脑同网，并用局域网 IP 访问；或部署到公网后再扫。"
      style="margin-bottom: 12px"
    />
    <div class="qr-panel">
      <img v-if="qrDataUrl" :src="qrDataUrl" alt="预览二维码" class="qr-image" />
      <p class="qr-tip">关闭「小程序端实时预览」窗口后，此码立即失效并清除。</p>
      <el-input :model-value="qrFullUrl" readonly size="small">
        <template #append>
          <el-button @click="copyQrLink">复制</el-button>
        </template>
      </el-input>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import QRCode from 'qrcode'
import { usePageStore } from '@/stores/page'
import { ComponentType, type ComponentInstance } from '@/types/page'
import type { PageDSL } from '@/types/page'
import { useDataSync } from '@/components/page-builder/composables/useDataSync'
import { loadHydratedComponent } from '@/utils/preview-datasource'
import { loadPagePreviewByPath, clearPreviewPageCache, type PreviewPageFrame } from '@/utils/preview-page-nav'
import { getProductList, getProduct } from '@/api/product'
import { normalizeUploadUrl, getConfigByGroup } from '@/api/system'
import { migrateTabBarIcon } from '@/components/page-builder/navIconSet'
import { getFormTemplateDetail } from '@/api/form'
import { createPreviewDraft, deletePreviewDraft } from '@/api/preview-draft'
import type { FormFieldConfig } from '@/types/form'
import PreviewPhone from '@/components/page-builder/PreviewPhone.vue'
import ComponentItem from '@/components/page-builder/ComponentItem.vue'
import { usePinnedBrandHeader, estimateBrandHeaderHeight } from '@/components/page-builder/composables/usePinnedBrandHeader'
import { useMeasuredElementHeight } from '@/components/page-builder/composables/useMeasuredElementHeight'
import TabBarIconDisplay from '@/components/miniapp-builder/TabBarIconDisplay.vue'

const props = defineProps<{
  modelValue: boolean
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const pageStore = usePageStore()
const { syncContents, syncActivities } = useDataSync()

const qrVisible = ref(false)
const qrLoading = ref(false)
const qrToken = ref('')
const qrDataUrl = ref('')
const qrFullUrl = ref('')
const isLocalHost = computed(() => {
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]'
})

async function revokePreviewDraft() {
  const token = qrToken.value
  qrToken.value = ''
  qrDataUrl.value = ''
  qrFullUrl.value = ''
  if (!token) return
  try {
    await deletePreviewDraft(token)
  } catch {
    /* 已失效也忽略，保证关窗不挡操作 */
  }
}

async function openMobileQr() {
  qrLoading.value = true
  try {
    if (qrToken.value) {
      await revokePreviewDraft()
    }
    const dsl = JSON.parse(pageStore.serializeDSL()) as PageDSL
    const pageIdRaw = pageStore.currentPage?.id
    const pageId = pageIdRaw != null ? Number(pageIdRaw) : undefined
    const res = await createPreviewDraft({
      dsl,
      pageTitle: pageStore.pageConfig?.name || dsl.page?.name,
      pageId: Number.isFinite(pageId) && pageId! > 0 ? pageId : undefined,
    })
    const data = ((res as any)?.data || res) as {
      token: string
      previewPath: string
    }
    if (!data?.token || !data?.previewPath) {
      throw new Error('生成预览失败')
    }
    qrToken.value = data.token
    qrFullUrl.value = `${window.location.origin}${data.previewPath}`
    qrDataUrl.value = await QRCode.toDataURL(qrFullUrl.value, {
      width: 220,
      margin: 2,
      errorCorrectionLevel: 'M',
    })
    qrVisible.value = true
  } catch (e: any) {
    ElMessage.error(e?.message || '生成手机预览失败')
  } finally {
    qrLoading.value = false
  }
}

function copyQrLink() {
  if (!qrFullUrl.value) return
  navigator.clipboard.writeText(qrFullUrl.value)
    .then(() => ElMessage.success('链接已复制'))
    .catch(() => ElMessage.error('复制失败，请手动复制'))
}

function onQrDialogClosed() {
  /* 二维码弹层关掉不删 token，仍可扫；真正清理在关预览窗 */
}

watch(
  () => props.modelValue,
  async (open, wasOpen) => {
    if (wasOpen && !open) {
      qrVisible.value = false
      await revokePreviewDraft()
    }
  },
)

onUnmounted(() => {
  void revokePreviewDraft()
})

type PreviewTab = string
type PreviewDetail = {
  type: 'content' | 'product' | 'activity' | 'form'
  title: string
  desc: string
  formId?: string
  formFields?: FormFieldConfig[]
  productId?: string | number
  price?: string
  cover?: string
  sales?: number
  categoryName?: string
}

const previewTab = ref<PreviewTab>('home')
const previewDataMode = ref<'real' | 'demo'>('real')
const previewDetail = ref<PreviewDetail | null>(null)
const productDetailLoading = ref(false)
const hydratedComponents = ref<ComponentInstance[]>([])
const previewHydrating = ref(false)
const previewPageStack = ref<PreviewPageFrame[]>([])
const previewPageLoading = ref(false)

/** 从系统配置加载真实 TabBar，确保管理后台预览与小程序端一致 */
const miniTabs = ref<Array<{ value: string; label: string; icon: string }>>([
  { value: 'home', label: '首页', icon: '/images/nav-icons/g-platform.png' },
  { value: 'content', label: '内容', icon: '/images/nav-icons/g-content.png' },
  { value: 'member', label: '会员', icon: '/images/nav-icons/g-crown.png' },
  { value: 'shop', label: '商城', icon: '/images/nav-icons/g-bag.png' },
  { value: 'mine', label: '我的', icon: '/images/nav-icons/g-user.png' },
])

async function loadTabbarConfig() {
  try {
    const res = await getConfigByGroup('basic')
    const data = (res as any)?.data || {}
    let tabbarItems: any[] = []
    if (Array.isArray(data.tabbarItems)) {
      tabbarItems = data.tabbarItems
    } else if (typeof data.tabbarItems === 'string') {
      try { tabbarItems = JSON.parse(data.tabbarItems) } catch { tabbarItems = [] }
    }
    if (Array.isArray(tabbarItems) && tabbarItems.length > 0) {
      const mapped = tabbarItems
        .filter((item: any) => item.enabled !== false)
        .map((item: any) => {
          const path = item.path || ''
          let value = 'home'
          if (path.includes('content')) value = 'content'
          else if (path.includes('member')) value = 'member'
          else if (path.includes('product')) value = 'shop'
          else if (path.includes('mine')) value = 'mine'
          else if (path.includes('ai-chat')) value = 'ai'
          return { value, label: item.name || item.text || '', icon: migrateTabBarIcon(item.icon || item.iconPath || '') || '/images/nav-icons/g-bag.png' }
        })
      if (mapped.length > 0) miniTabs.value = mapped
    }
  } catch {
    // 使用默认列表
  }
}

const previewTabs = computed(() => miniTabs.value.map((tab) => ({ label: tab.label, value: tab.value })))
const tabColumns = computed(() => miniTabs.value.length || 5)
const previewModeOptions = [
  { label: '真实数据', value: 'real' },
  { label: '演示数据', value: 'demo' },
]

const realDataWarnings = computed(() => {
  const warnings: string[] = []
  const components = previewComponents.value
  const types = new Set<string>(components.map((item) => String(item.type)))
  if (types.has('product_list') && components.some((c) =>
    c.type === 'product_list' && !(Array.isArray(c.props?.items) && c.props.items.length)
  )) warnings.push('商品')
  if (types.has('article_list') && components.some((c) =>
    c.type === 'article_list' && !(Array.isArray(c.props?.items) && c.props.items.length)
  )) warnings.push('文章')
  if (types.has('article_feed') && components.some((c) =>
    c.type === 'article_feed' && !(Array.isArray(c.props?.items) && c.props.items.length)
  )) warnings.push('文章流')
  if (types.has('hot_news') && components.some((c) =>
    c.type === 'hot_news' && !(Array.isArray(c.props?.items) && c.props.items.length)
  )) warnings.push('热门资讯')
  if (types.has('form_entry') && components.some((item) =>
    item.type === 'form_entry' && !(item.props.formId || item.props.formTemplateId)
  )) warnings.push('表单')
  return warnings
})

function demoProductItems(limit = 2) {
  return [
    { id: 'demo-1', name: '跨境通用知识库', price: '199.00', sales: 128, image: '' },
    { id: 'demo-2', name: '跨境财税知识库', price: '299.00', sales: 86, image: '' },
  ].slice(0, limit)
}

async function hydratePreviewComponents() {
  previewHydrating.value = true
  const base = pageStore.components
  try {
    if (previewDataMode.value === 'demo') {
      hydratedComponents.value = base.map((component) => {
        const type = String(component.type)
        if (type === 'product_list') {
          const limit = Math.max(Number(component.props?.limit || 4), 1)
          return {
            ...component,
            props: {
              ...component.props,
              items: demoProductItems(limit),
              _previewDataFailed: false,
            },
          }
        }
        if (type === 'article_list' || type === 'article_feed' || type === 'hot_news') {
          const items = defaultContentPreviewList.map((item) => ({
            title: item.title,
            meta: item.desc,
            cover: '',
          }))
          return { ...component, props: { ...component.props, items, _previewDataFailed: false } }
        }
        return component
      })
      return
    }

    hydratedComponents.value = await Promise.all(
      base.map(async (component) => {
        const type = String(component.type)
        if (type === 'product_list' || type === 'article_list' || type === 'article_feed' || type === 'hot_news') {
          try {
            return await loadHydratedComponent(component)
          } catch {
            return component
          }
        }
        return component
      }),
    )
  } finally {
    previewHydrating.value = false
  }
}

const activePreviewPage = computed(() => {
  const stack = previewPageStack.value
  return stack.length ? stack[stack.length - 1] : null
})

const previewComponents = computed(() => {
  if (activePreviewPage.value?.components?.length) {
    return activePreviewPage.value.components
  }
  if (hydratedComponents.value.length === pageStore.components.length && pageStore.components.length > 0) {
    return hydratedComponents.value
  }
  return pageStore.components
})

const flowPreviewComponents = computed(() =>
  previewComponents.value.filter((c) => c.type !== ComponentType.FloatButton),
)
const {
  pinnedBrandHeader: previewPinnedBrandHeader,
  pinnedBrandHeaderIndex: previewPinnedBrandHeaderIndex,
  hasBrandHeader: previewHasBrandHeader,
  isPinnedBrandHeader: isPreviewPinnedBrandHeader,
} = usePinnedBrandHeader(flowPreviewComponents)

const previewPinnedHeaderEl = ref<HTMLElement | null>(null)
const measuredPreviewPinnedHeight = useMeasuredElementHeight(
  previewPinnedHeaderEl,
  computed(() => !!previewPinnedBrandHeader.value),
)
const previewPinnedBrandHeaderHeight = computed(() => {
  if (!previewPinnedBrandHeader.value) return 0
  return measuredPreviewPinnedHeight.value || estimateBrandHeaderHeight(previewPinnedBrandHeader.value.props)
})
const floatPreviewComponents = computed(() =>
  previewComponents.value.filter((c) => c.type === ComponentType.FloatButton),
)

const previewDataNotice = computed(() => {
  if (previewDataMode.value === 'demo') {
    return '当前为演示数据，仅用于查看布局，不代表线上实际内容。'
  }
  if (realDataWarnings.value.length > 0) {
    return `真实数据缺失：${realDataWarnings.value.join('、')}。编辑画布中的示例内容不会作为线上数据发布。`
  }
  return '当前展示线上可用的真实数据。'
})

const defaultContentPreviewList: { title: string; desc: string }[] = [
  { title: '品牌故事', desc: '2026-05-10 10:30' },
  { title: '选品指南', desc: '2026-05-12 14:20' },
]

const contentPreviewList = ref<{ title: string; desc: string }[]>([...defaultContentPreviewList])

const shopPreviewList = ref<{ id?: string | number; name: string; price: string; sales?: number }[]>([
  { name: '湘品甄选礼盒', price: '99.00', sales: 0 },
  { name: '药食同源组合', price: '128.00', sales: 0 },
])

const defaultActivityPreviewList = [
  { id: 1, name: '五一活动专题', desc: '报名预约、签到核销、活动内容一站式展示' },
]

const activityPreviewList = ref<{ id: number | string; name: string; desc: string }[]>([
  ...defaultActivityPreviewList,
])

const previewTitle = computed(() => {
  if (activePreviewPage.value?.title) return activePreviewPage.value.title
  const tab = miniTabs.value.find((item) => item.value === previewTab.value)
  return tab?.label || pageStore.pageConfig.name || '首页'
})

const previewBgColor = computed(() => {
  return activePreviewPage.value?.bg || pageStore.pageConfig.background_color || '#f6f8fb'
})

async function loadShopPreviewList() {
  if (previewDataMode.value === 'demo') {
    shopPreviewList.value = [
      { name: '跨境通用知识库', price: '199.00', sales: 128 },
      { name: '跨境财税知识库', price: '299.00', sales: 86 },
    ]
    return
  }
  shopPreviewList.value = []
  try {
    const res = await getProductList({ current: 1, size: 50, status: 'on_sale' } as any)
    const data = (res as any)?.data
    const records = data?.records || data?.list || (Array.isArray(data) ? data : [])
    if (records.length) {
      shopPreviewList.value = records.slice(0, 6).map((item: any) => ({
        id: item.id,
        name: item.name || item.title || '未命名商品',
        price: Number.isFinite(Number(item.price)) ? Number(item.price).toFixed(2) : '0.00',
        sales: Number(item.sales ?? item.salesCount ?? 0) || 0,
      }))
    }
  } catch {
    // 接口失败时从已水合组件回退
  }
  if (!shopPreviewList.value.length) {
    for (const comp of hydratedComponents.value) {
      if (comp.type !== 'product_list') continue
      const items = Array.isArray(comp.props?.items) ? comp.props.items : []
      if (!items.length) continue
      shopPreviewList.value = items.slice(0, 6).map((item: any) => ({
        id: item.id,
        name: item.name || item.title || '未命名商品',
        price: Number.isFinite(Number(item.price)) ? Number(item.price).toFixed(2) : '0.00',
        sales: Number(item.sales ?? item.salesCount ?? 0) || 0,
      }))
      break
    }
  }
}

async function loadContentPreviewList() {
  if (previewDataMode.value === 'demo') {
    contentPreviewList.value = [...defaultContentPreviewList]
    return
  }
  contentPreviewList.value = []
  const localArticleList = pageStore.components.find((item) => item.type === 'article_list')?.props?.items
  const localPreviewList = Array.isArray(localArticleList)
    ? localArticleList
        .map((item: any) => ({
          title: item?.title || '未命名内容',
          desc: item?.publishedAt || item?.publish_time || item?.created_at || item?.meta || '',
        }))
        .filter((item: { title: string; desc: string }) => !!item.title)
    : []

  await syncContents((items) => {
    if (items.length > 0) {
      contentPreviewList.value = items.map((item: any) => {
        const dateRaw = item.publishedAt || item.publishTime || item.publish_time || item.createTime || item.createdAt || item.created_at
        let desc = ''
        if (dateRaw) {
          const raw = String(dateRaw).trim()
          const matched = raw.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/)
          if (matched) desc = `${matched[1]} ${matched[2]}`
          else if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) desc = `${raw} 00:00`
          else {
            const d = new Date(raw.replace(/-/g, '/'))
            if (!Number.isNaN(d.getTime())) {
              const pad = (n: number) => String(n).padStart(2, '0')
              desc = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
            }
          }
        }
        return {
          title: item.title || '未命名内容',
          desc,
        }
      })
    } else {
      contentPreviewList.value = localPreviewList
    }
  })
}

async function loadActivityPreviewList() {
  if (previewDataMode.value === 'demo') {
    activityPreviewList.value = [...defaultActivityPreviewList]
    return
  }
  activityPreviewList.value = []
  await syncActivities((items) => {
    if (items.length > 0) {
      activityPreviewList.value = items.map((item: any, index: number) => ({
        id: item.id ?? index,
        name: item.name || '未命名活动',
        desc: item.dateText || item.venue || '报名预约、签到核销、活动内容一站式展示',
      }))
    }
  })
}

function normalizePreviewFormFields(rawFields: unknown): FormFieldConfig[] {
  try {
    const source = typeof rawFields === 'string' ? JSON.parse(rawFields) : rawFields
    if (!Array.isArray(source)) return []
    return source.map((field: any, index: number) => ({
      id: field.id || field.field_key || field.key || `field_${index + 1}`,
      label: field.label || `字段${index + 1}`,
      field_type: field.field_type || field.type || 'text',
      placeholder: field.placeholder || '',
      required: Boolean(field.required),
      sort: Number(field.sort ?? index),
      options: Array.isArray(field.options) ? field.options : [],
    }))
  } catch {
    return []
  }
}

function handlePreviewAction(payload: {
  tab: PreviewTab
  message: string
  detailType?: string
  detailTitle?: string
  detailDesc?: string
  formId?: string
  productId?: string | number
  previewPath?: string
}) {
  if (!payload) return
  if (payload.previewPath) {
    void navigatePreviewToPage(payload.previewPath, payload.message)
    return
  }
  const validTypes = ['content', 'product', 'activity', 'form'] as const
  const detailType = validTypes.includes(payload.detailType as any) ? payload.detailType as 'content' | 'product' | 'activity' | 'form' : undefined
  const detail = detailType
    ? {
        type: detailType,
        title: payload.detailTitle || '详情',
        desc: payload.detailDesc || '详情预览',
        formId: payload.formId,
        productId: payload.productId,
      }
    : null
  if (detailType === 'form') {
    void (async () => {
      let formFields: FormFieldConfig[] = []
      if (payload.formId && previewDataMode.value === 'real') {
        try {
          const res = await getFormTemplateDetail(Number(payload.formId))
          formFields = normalizePreviewFormFields((res as any)?.data?.fields)
        } catch {
          // 预览降级为静态卡片
        }
      }
      previewDetail.value = detail ? { ...detail, formFields } : null
      ElMessage.info('预览不支持真实提交，请到小程序端填写')
    })()
    return
  }
  if (detailType === 'product' && payload.productId != null && previewDataMode.value === 'real') {
    previewTab.value = payload.tab || 'shop'
    void nextTick(() => {
      void openRealProductDetail(payload.productId!, {
        title: payload.detailTitle || '商品详情',
        desc: payload.detailDesc || '',
      })
    })
    ElMessage.success(payload.message)
    return
  }
  previewTab.value = payload.tab
  // 切 tab 的 watcher 会清空详情，需等其执行完再设置
  void nextTick(() => {
    previewDetail.value = detail
  })
  ElMessage.success(payload.message)
}

async function openRealProductDetail(
  productId: string | number,
  fallback: { title: string; desc: string },
) {
  productDetailLoading.value = true
  previewDetail.value = {
    type: 'product',
    title: fallback.title,
    desc: fallback.desc,
    productId,
  }
  try {
    const res = await getProduct(Number(productId))
    const p = (res as any)?.data || {}
    const priceRaw = p.min_price ?? p.minPrice ?? p.price ?? p.skus?.[0]?.price
    const price = Number.isFinite(Number(priceRaw)) ? Number(priceRaw).toFixed(2) : '0.00'
    const cover = normalizeUploadUrl(
      String(p.main_image || p.mainImage || p.coverImage || p.cover || p.images?.[0] || ''),
    )
    const sales = Number(p.sales ?? p.salesCount ?? p.sold ?? 0) || 0
    const desc = String(p.description || p.content || fallback.desc || '暂无简介')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 200)
    previewDetail.value = {
      type: 'product',
      title: String(p.name || fallback.title),
      desc: desc || '暂无简介',
      productId,
      price,
      cover,
      sales,
      categoryName: String(p.category_name || p.categoryName || ''),
    }
  } catch {
    ElMessage.warning('商品详情加载失败，已展示列表摘要')
  } finally {
    productDetailLoading.value = false
  }
}

async function navigatePreviewToPage(path: string, message?: string) {
  previewPageLoading.value = true
  previewDetail.value = null
  try {
    const loaded = await loadPagePreviewByPath(path, previewDataMode.value)
    if (!loaded) {
      ElMessage.warning(`未找到页面：${path}`)
      return
    }
    previewTab.value = 'home'
    previewPageStack.value.push(loaded)
    ElMessage.success(message || `已打开「${loaded.title}」`)
  } catch {
    ElMessage.error('页面加载失败')
  } finally {
    previewPageLoading.value = false
  }
}

function handlePreviewBack() {
  if (previewDetail.value) {
    previewDetail.value = null
    ElMessage.success('已返回列表')
    return
  }
  if (previewPageStack.value.length > 0) {
    previewPageStack.value.pop()
    ElMessage.success('已返回上一页')
    return
  }
  if (previewTab.value !== 'home') {
    previewTab.value = 'home'
    ElMessage.success('已返回首页')
    return
  }
  ElMessage.info('当前已在首页')
}

function clearPreviewDetail() {
  previewDetail.value = null
}

function openContentDetail(item: { title: string; desc: string }) {
  previewTab.value = 'content'
  previewDetail.value = { type: 'content', title: item.title, desc: item.desc }
  ElMessage.success(`已打开「${item.title}」`)
}

function openProductDetail(item: { name: string; price: string; id?: string | number }) {
  previewTab.value = 'shop'
  if (item.id != null && previewDataMode.value === 'real') {
    void openRealProductDetail(item.id, {
      title: item.name,
      desc: `售价 ¥${item.price}`,
    })
    ElMessage.success(`已打开商品「${item.name}」`)
    return
  }
  previewDetail.value = {
    type: 'product',
    title: item.name,
    desc: `售价 ¥${item.price}`,
    price: item.price,
  }
  ElMessage.success(`已打开商品「${item.name}」`)
}

function openActivityAppointment(item: { name: string; desc: string }) {
  previewTab.value = 'activity'
  previewDetail.value = { type: 'activity', title: item.name, desc: item.desc || '进入活动预约流程' }
  ElMessage.success(`已打开活动「${item.name}」预约`)
}

function confirmPreviewAppointment() {
  ElMessage.success('预约提交成功（预览模式）')
}

/** 外部调用：打开预览并加载数据 */
async function open() {
  previewTab.value = 'home'
  previewDetail.value = null
  previewPageStack.value = []
  clearPreviewPageCache()
  loadTabbarConfig()
  await hydratePreviewComponents()
  loadContentPreviewList()
  loadActivityPreviewList()
  loadShopPreviewList()
}

/** 外部调用：切换到首页 tab 并打开 */
function openHome() {
  previewTab.value = 'home'
}

defineExpose({ open, openHome })

watch(
  () => previewTab.value,
  (tab) => {
    previewDetail.value = null
    if (tab !== 'home') {
      previewPageStack.value = []
    }
    if (tab === 'content') {
      loadContentPreviewList()
      return
    }
    if (tab === 'activity') {
      loadActivityPreviewList()
    }
  },
)

watch(
  () => previewDataMode.value,
  async () => {
    await hydratePreviewComponents()
    loadShopPreviewList()
    loadContentPreviewList()
    loadActivityPreviewList()
  },
)
</script>

<style lang="scss" scoped>
:deep(.mini-preview-dialog) {
  .el-dialog__body {
    padding-top: 8px;
  }
}

.preview-home-wrap {
  position: relative;
  min-height: 100%;
}

.brand-header-flow-spacer {
  flex-shrink: 0;
  width: 100%;
}

.preview-page-loading {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.72);
  color: #64748b;
  font-size: 13px;
}

.qr-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.qr-image {
  width: 220px;
  height: 220px;
  border-radius: 8px;
  background: #fff;
}

.qr-tip {
  margin: 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
  text-align: center;
}

.preview-form-overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: flex-end;
  padding: 12px;
  background: rgba(15, 23, 42, 0.35);
}

.preview-form-overlay .mini-detail-card {
  width: 100%;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
}

.preview-form-tip {
  margin: 8px 0 12px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.preview-form-fields {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 12px 0;
  text-align: left;
}

.preview-form-field label {
  display: block;
  margin-bottom: 4px;
  color: #334155;
  font-size: 12px;
  font-weight: 600;
}

.preview-form-field .required {
  color: #ef4444;
}

.preview-field-placeholder {
  padding: 8px 10px;
  color: #94a3b8;
  font-size: 12px;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 6px;
}

.mini-preview-head {
  text-align: center;

  .preview-subtitle {
    margin-bottom: 10px;
    color: #6b7280;
    font-size: 13px;
  }

  .el-button {
    margin-top: 10px;
  }
}

.preview-data-notice {
  margin: 12px 0;
}

.mini-mock-page {
  min-height: 500px;
  background: #f6f8fb;
}

.mini-section {
  padding: 12px;
}

.mini-section-title {
  margin-bottom: 10px;
  color: #1f2937;
  font-size: 16px;
  font-weight: 700;
}

.mini-list-card,
.activity-preview-card {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
  padding: 12px;
  background: #fff;
  border-radius: 8px;
}

.clickable-card {
  cursor: pointer;
  transition: transform 0.14s ease, box-shadow 0.14s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(23, 105, 255, 0.08);
  }
}

.mini-detail-card {
  padding: 14px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 6px 18px rgba(15, 31, 60, 0.08);

  h3 {
    margin: 0 0 8px;
    color: #172033;
    font-size: 16px;
    font-weight: 700;
  }

  p {
    margin: 0 0 12px;
    color: #6b7280;
    font-size: 13px;
    line-height: 1.6;
  }
}

.product-detail-card {
  .product-detail-cover {
    width: 100%;
    margin-bottom: 12px;
    overflow: hidden;
    border-radius: 10px;
    background: #f1f5fb;

    img {
      display: block;
      width: 100%;
      max-height: 220px;
      object-fit: cover;
    }
  }

  .product-detail-price {
    margin: 0 0 6px !important;
    color: #e53935 !important;
    font-size: 20px !important;
    font-weight: 800;
  }

  .product-detail-meta {
    margin: 0 0 4px !important;
    color: #94a3b8 !important;
    font-size: 12px !important;
  }

  .product-detail-desc {
    margin: 10px 0 14px !important;
  }
}

.product-detail-loading {
  padding: 28px 8px;
  color: #94a3b8;
  font-size: 13px;
  text-align: center;
}

.activity-preview-card {
  flex-direction: column;
  align-items: flex-start;
  background: linear-gradient(135deg, #1769ff, #0faa6e);
  color: #fff;

  .mini-item-desc {
    color: rgba(255, 255, 255, 0.8);
  }
}

.mini-thumb,
.mini-product-img {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #9ca3af;
  background: #eef2f7;
}

.mini-thumb {
  width: 70px;
  height: 56px;
  border-radius: 6px;
}

.mini-item-title {
  color: #1f2937;
  font-size: 14px;
  font-weight: 700;
}

.mini-item-desc {
  margin-top: 4px;
  color: #8a94a6;
  font-size: 12px;
  line-height: 1.5;
}

.member-preview-card {
  margin-bottom: 12px;
  padding: 18px 16px;
  color: #fff;
  background: linear-gradient(135deg, #2c3e50, #3498db);
  border-radius: 10px;

  .member-preview-name {
    font-size: 18px;
    font-weight: 800;
  }

  .member-preview-row {
    display: flex;
    justify-content: space-between;
    margin-top: 18px;
    font-size: 12px;
  }
}

.mini-grid,
.mini-product-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.mini-grid-card,
.mini-product-card {
  padding: 12px;
  color: #1f2937;
  background: #fff;
  border-radius: 8px;
}

.mini-product-img {
  height: 90px;
  margin-bottom: 8px;
  border-radius: 8px;
}

.mini-price {
  margin-top: 4px;
  color: #ef4444;
  font-size: 14px;
  font-weight: 800;
}

.mini-bottom-tab {
  position: relative;
  z-index: 30;
  flex-shrink: 0;
  display: grid;
  padding: 6px 0 8px;
  background: #fff;
  border-top: 1px solid #e5e7eb;
}

.mini-tab-btn {
  border: 0;
  background: transparent;
  color: #8a94a6;
  cursor: pointer;

  span,
  em {
    display: block;
  }

  span {
    font-size: 18px;
    line-height: 1.3;
  }

  em {
    font-style: normal;
    font-size: 11px;
  }

  &.active {
    color: #1769ff;
    font-weight: 700;
  }
}
</style>
