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
    </div>

    <PreviewPhone
      :page-title="previewTitle"
      :page-bg-color="previewBgColor"
      @back="handlePreviewBack"
    >
      <template v-if="previewTab === 'home'">
        <ComponentItem
          v-for="(comp, index) in pageStore.components"
          :key="comp.id"
          :component="comp"
          :index="index"
          :selected="false"
          :preview-mode="true"
          @select="() => {}"
          @preview-action="handlePreviewAction"
        />
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
          <div class="mini-detail-card">
            <h3>{{ previewDetail.title }}</h3>
            <p>{{ previewDetail.desc }}</p>
            <el-button type="primary" plain size="small" @click="clearPreviewDetail">返回商城列表</el-button>
          </div>
        </div>

        <div v-else-if="previewTab === 'shop'" class="mini-section">
          <div class="mini-section-title">推荐商品</div>
          <div class="mini-product-grid">
            <div
              v-for="item in shopPreviewList"
              :key="item.name"
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

      <div class="mini-bottom-tab" :style="{ gridTemplateColumns: 'repeat(' + tabColumns + ', 1fr)' }">
        <button
          v-for="tab in miniTabs"
          :key="tab.value"
          class="mini-tab-btn"
          :class="{ active: previewTab === tab.value }"
          @click="previewTab = tab.value"
        >
          <span>{{ tab.icon }}</span>
          <em>{{ tab.label }}</em>
        </button>
      </div>
    </PreviewPhone>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { usePageStore } from '@/stores/page'
import { useDataSync } from '@/components/page-builder/composables/useDataSync'
import { getConfigByGroup } from '@/api/system'
import PreviewPhone from '@/components/page-builder/PreviewPhone.vue'
import ComponentItem from '@/components/page-builder/ComponentItem.vue'

defineProps<{
  modelValue: boolean
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const pageStore = usePageStore()
const { syncProducts, syncContents, syncActivities } = useDataSync()

type PreviewTab = string
type PreviewDetail = { type: 'content' | 'product' | 'activity'; title: string; desc: string }

const previewTab = ref<PreviewTab>('home')
const previewDataMode = ref<'real' | 'demo'>('real')
const previewDetail = ref<PreviewDetail | null>(null)

/** 从系统配置加载真实 TabBar，确保管理后台预览与小程序端一致 */
const miniTabs = ref<Array<{ value: string; label: string; icon: string }>>([
  { value: 'home', label: '首页', icon: '🏠' },
  { value: 'content', label: '内容', icon: '📝' },
  { value: 'member', label: '会员', icon: '👑' },
  { value: 'shop', label: '商城', icon: '🛍️' },
  { value: 'mine', label: '我的', icon: '👤' },
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
          return { value, label: item.name || item.text || '', icon: item.icon || '📌' }
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

const defaultContentPreviewList: { title: string; desc: string }[] = [
  { title: '品牌故事', desc: '展示品牌理念、文化内容与图文详情' },
  { title: '选品指南', desc: '文章内容可关联商品和活动' },
]

const contentPreviewList = ref<{ title: string; desc: string }[]>([...defaultContentPreviewList])

const shopPreviewList = ref<{ name: string; price: string }[]>([
  { name: '湘品甄选礼盒', price: '99.00' },
  { name: '药食同源组合', price: '128.00' },
])

const defaultActivityPreviewList = [
  { id: 1, name: '五一活动专题', desc: '报名预约、签到核销、活动内容一站式展示' },
]

const activityPreviewList = ref<{ id: number | string; name: string; desc: string }[]>([
  ...defaultActivityPreviewList,
])

const previewTitle = computed(() => {
  const tab = miniTabs.value.find((item) => item.value === previewTab.value)
  return tab?.label || pageStore.pageConfig.name || '首页'
})

const previewBgColor = computed(() => {
  return pageStore.pageConfig.background_color || '#f6f8fb'
})

async function loadShopPreviewList() {
  if (previewDataMode.value === 'demo') {
    shopPreviewList.value = [
      { name: '湘品甄选礼盒', price: '99.00' },
      { name: '药食同源组合', price: '128.00' },
    ]
    return
  }
  await syncProducts((items) => {
    if (items.length > 0) {
      shopPreviewList.value = items.slice(0, 6).map((item: any) => ({
        name: item.title || '未命名商品',
        price: Number.isFinite(Number(item.price)) ? Number(item.price).toFixed(2) : '0.00',
      }))
    }
  })
}

async function loadContentPreviewList() {
  if (previewDataMode.value === 'demo') {
    contentPreviewList.value = [...defaultContentPreviewList]
    return
  }
  const localArticleList = pageStore.components.find((item) => item.type === 'article_list')?.props?.items
  const localPreviewList = Array.isArray(localArticleList)
    ? localArticleList
        .map((item: any) => ({
          title: item?.title || '未命名内容',
          desc: item?.meta || item?.summary || '品牌内容',
        }))
        .filter((item: { title: string; desc: string }) => !!item.title)
    : []

  await syncContents((items) => {
    if (items.length > 0) {
      contentPreviewList.value = items.map((item: any) => ({
        title: item.title || '未命名内容',
        desc: item.cover || '品牌内容',
      }))
    } else {
      contentPreviewList.value = localPreviewList.length > 0 ? localPreviewList : [...defaultContentPreviewList]
    }
  })
  // Fallback if sync didn't produce results
  if (contentPreviewList.value.length === 0) {
    contentPreviewList.value = localPreviewList.length > 0 ? localPreviewList : [...defaultContentPreviewList]
  }
}

async function loadActivityPreviewList() {
  if (previewDataMode.value === 'demo') {
    activityPreviewList.value = [...defaultActivityPreviewList]
    return
  }
  await syncActivities((items) => {
    if (items.length > 0) {
      activityPreviewList.value = items.map((item: any, index: number) => ({
        id: item.id ?? index,
        name: item.name || '未命名活动',
        desc: item.dateText || item.venue || '报名预约、签到核销、活动内容一站式展示',
      }))
    } else {
      activityPreviewList.value = [...defaultActivityPreviewList]
    }
  })
}

function handlePreviewAction(payload: {
  tab: PreviewTab
  message: string
  detailType?: string
  detailTitle?: string
  detailDesc?: string
}) {
  if (!payload) return
  previewTab.value = payload.tab
  const validTypes = ['content', 'product', 'activity'] as const
  const detailType = validTypes.includes(payload.detailType as any) ? payload.detailType as 'content' | 'product' | 'activity' : undefined
  previewDetail.value = detailType
    ? {
        type: detailType,
        title: payload.detailTitle || '详情',
        desc: payload.detailDesc || '详情预览',
      }
    : null
  ElMessage.success(payload.message)
}

function handlePreviewBack() {
  if (previewDetail.value) {
    previewDetail.value = null
    ElMessage.success('已返回列表')
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

function openProductDetail(item: { name: string; price: string }) {
  previewTab.value = 'shop'
  previewDetail.value = { type: 'product', title: item.name, desc: `售价 ¥${item.price}` }
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
function open() {
  previewTab.value = 'home'
  previewDetail.value = null
  loadTabbarConfig()
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
  () => {
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

.mini-preview-head {
  text-align: center;

  .preview-subtitle {
    margin-bottom: 10px;
    color: #6b7280;
    font-size: 13px;
  }
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
  position: sticky;
  bottom: 0;
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
