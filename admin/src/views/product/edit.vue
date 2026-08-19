<template>
  <div class="product-editor-page">
    <div class="product-editor-wrap">
      <header class="page-header">
        <div class="page-title-wrap">
          <el-button class="back-icon-btn" :icon="Back" circle aria-label="返回" @click="goBack" />
          <div>
            <div class="page-breadcrumb">商城管理 / 商品管理</div>
            <h1>{{ isEdit ? '编辑商品' : '新增商品' }}</h1>
          </div>
        </div>
        <div class="page-actions">
          <span v-if="hasUnsavedChanges" class="draft-pill">未保存</span>
          <span v-if="lastAutoSaveTime" class="autosave-text">自动保存 {{ formatTime(lastAutoSaveTime) }}</span>
          <el-button class="ghost-btn" @click="goBack">返回列表</el-button>
          <el-button class="ghost-btn" @click="openPreview">预览</el-button>
          <el-button class="primary-btn" type="primary" :loading="submitting" @click="handleSubmit(false)">保存商品</el-button>
        </div>
      </header>

      <el-form
        id="product-form"
        ref="formRef"
        class="editor-form"
        :model="formData"
        :rules="formRules"
        label-position="top"
        v-loading="pageLoading"
      >
        <nav class="step-nav" aria-label="商品编辑步骤">
          <button
            v-for="step in stepItems"
            :key="step.key"
            type="button"
            class="step-nav-item"
            :class="{ done: step.done, current: !step.done && currentStepKey === step.key }"
            @click="scrollToStep(step.target, step.key)"
          >
            <span class="step-dot">{{ step.done ? '✓' : '' }}</span>
            <span class="step-label">{{ step.label }}</span>
          </button>
        </nav>

        <div class="editor-layout">
          <main class="editor-main">
            <section id="section-basic" class="section-card">
              <div class="section-head">
                <span class="section-no">01</span>
                <div>
                  <h2>基础信息</h2>
                  <p>决定商品在列表、详情和订单中的基础展示。</p>
                </div>
              </div>

              <div class="basic-form-grid">
                <el-form-item label="商品名称" prop="name" class="span-all">
                  <el-input v-model="formData.name" placeholder="例如：药食同源甄选礼盒" maxlength="100" show-word-limit />
                </el-form-item>

                <div class="category-sort-row span-all">
                  <el-form-item label="商品分类" prop="category_id">
                    <el-tree-select
                      v-model="formData.category_id"
                      :data="categoryOptions"
                      :props="{ label: 'name', value: 'id', children: 'children' }"
                      placeholder="选择分类"
                      check-strictly
                      style="width: 100%"
                    />
                  </el-form-item>

                  <el-form-item label="排序">
                    <el-input-number v-model="formData.sort" :min="0" :max="9999" controls-position="right" />
                  </el-form-item>
                </div>

                <el-form-item label="商品类型" prop="productTypes" class="span-all">
                  <div v-if="!formData.category_id" class="form-tip">请先选择商品分类，再勾选类型</div>
                  <div v-else-if="!availableTypeOptions.length" class="form-tip">当前分类未配置允许类型，请先在分类管理中设置</div>
                  <div v-else>
                    <el-checkbox-group v-model="formData.productTypes" class="type-check-group">
                      <el-checkbox
                        v-for="t in availableTypeOptions"
                        :key="t.value"
                        :value="t.value"
                        border
                      >
                        {{ t.icon }} {{ t.label }}
                      </el-checkbox>
                    </el-checkbox-group>
                    <div class="form-tip">类型由分类决定，可多选；纯数字商品不校验实体库存。</div>
                  </div>
                </el-form-item>
              </div>
            </section>

            <section id="section-content" class="section-card">
              <div class="section-head">
                <span class="section-no">03</span>
                <div>
                  <h2>内容描述</h2>
                  <p>简介用于快速导购，详情用于承接转化和售后说明。</p>
                </div>
              </div>

              <div class="content-form-grid">
                <el-form-item label="商品简介">
                  <el-input
                    v-model="formData.description"
                    type="textarea"
                    :rows="4"
                    placeholder="用一两句话写清楚核心卖点，方便用户快速判断。"
                    maxlength="500"
                    show-word-limit
                  />
                </el-form-item>

                <el-form-item label="商品详情">
                  <PageRichTextEditor v-model="formData.content" seamless-images class="product-rich-editor" />
                  <div class="form-tip">支持图片、文字混排；连续插图会无缝拼接，适合淘宝式详情长图。</div>
                </el-form-item>
              </div>
            </section>

            <section id="section-sku" class="section-card">
              <div class="section-head sku-head">
                <span class="section-no">04</span>
                <div>
                  <h2>SKU 管理</h2>
                  <p>配置规格、价格、库存和 SKU 编码，确保可售卖可履约。</p>
                </div>
              </div>

              <el-form-item label="规格名称">
                <div class="spec-tag-editor">
                  <el-tag
                    v-for="spec in visibleSpecNames"
                    :key="spec.index"
                    closable
                    effect="plain"
                    @close="removeSpecName(spec.index)"
                  >
                    {{ spec.name }}
                  </el-tag>
                  <el-input
                    v-model="newSpecName"
                    class="spec-tag-input"
                    placeholder="输入规格名后回车，如颜色"
                    @keyup.enter="addSpecTag"
                  />
                  <el-button class="ghost-btn" :icon="Plus" @click="addSpecTag">添加规格</el-button>
                </div>
              </el-form-item>

              <el-form-item label="SKU 列表">
                <div class="sku-table-wrap">
                  <el-table :data="formData.skus" border class="sku-table">
                    <el-table-column
                      v-for="spec in visibleSpecNames"
                      :key="spec.index"
                      :label="spec.name"
                      min-width="140"
                    >
                      <template #default="{ row }">
                        <el-input v-model="row.specs[spec.index].value" placeholder="规格值" size="small" />
                      </template>
                    </el-table-column>
                    <el-table-column label="销售价" min-width="138">
                      <template #default="{ row }">
                        <el-input v-model.number="row.price" class="money-input" type="number" min="0" size="small">
                          <template #prefix>¥</template>
                        </el-input>
                      </template>
                    </el-table-column>
                    <el-table-column label="原价" min-width="138">
                      <template #default="{ row }">
                        <el-input v-model.number="row.original_price" class="money-input" type="number" min="0" size="small">
                          <template #prefix>¥</template>
                        </el-input>
                      </template>
                    </el-table-column>
                    <el-table-column label="库存" min-width="118">
                      <template #default="{ row }">
                        <span v-if="isDigitalOnly" class="unlimited-stock">无限</span>
                        <el-input-number v-else v-model="row.stock" :min="0" size="small" controls-position="right" />
                      </template>
                    </el-table-column>
                    <el-table-column label="SKU 编码" min-width="160">
                      <template #default="{ row }">
                        <el-input v-model="row.sku_code" placeholder="自动生成" size="small" />
                      </template>
                    </el-table-column>
                    <el-table-column label="操作" width="72" fixed="right" align="center">
                      <template #default="{ $index }">
                        <el-button class="delete-icon-btn" :icon="Delete" circle text aria-label="删除该 SKU" @click="removeSku($index)" />
                      </template>
                    </el-table-column>
                    <template #empty>
                      <div class="sku-empty">
                        <div class="empty-icon">SKU</div>
                        <strong>还没有 SKU</strong>
                        <span>至少添加一行，填写价格和库存后才能发布。</span>
                        <el-button class="primary-btn" type="primary" :icon="Plus" @click="addSku">添加第一行 SKU</el-button>
                      </div>
                    </template>
                  </el-table>
                  <button type="button" class="add-row-btn" @click="addSku">
                    <el-icon><Plus /></el-icon>
                    添加一行 SKU
                  </button>
                </div>
              </el-form-item>
            </section>
          </main>

          <aside class="editor-aside">
            <section id="section-assets" class="section-card asset-card">
              <div class="section-head">
                <span class="section-no">02</span>
                <div>
                  <h2>图片素材</h2>
                  <p>主图作列表封面，并自动作为轮播第一张；轮播图在详情页左右滑动查看。</p>
                </div>
              </div>

              <el-form-item label="商品主图" prop="main_image">
                <el-upload
                  class="main-image-drop"
                  drag
                  :show-file-list="false"
                  accept="image/*"
                  :before-upload="beforeImageUpload"
                  :http-request="handleMainImageUpload"
                >
                  <div class="main-image-drop-inner" :class="{ filled: formData.main_image }">
                    <el-image v-if="formData.main_image" :src="formData.main_image" fit="cover" />
                    <div v-else class="upload-empty">
                      <el-icon><Picture /></el-icon>
                      <strong>拖拽或点击上传主图</strong>
                      <span>建议 800 x 800，图片小于 5MB</span>
                    </div>
                  </div>
                </el-upload>

                <div class="image-action-row">
                  <el-upload :show-file-list="false" accept="image/*" :before-upload="beforeImageUpload" :http-request="handleMainImageUpload">
                    <el-button class="ghost-btn" :icon="Upload" :loading="uploadingMainImage">本地上传</el-button>
                  </el-upload>
                  <el-button class="ghost-btn" :icon="Picture" @click="openAssetPicker('main')">素材库</el-button>
                </div>

                <button type="button" class="fold-link" @click="showMainUrlInput = !showMainUrlInput">
                  {{ showMainUrlInput ? '收起 URL 输入' : '通过 URL 添加主图' }}
                </button>
                <el-input v-if="showMainUrlInput" v-model="formData.main_image" placeholder="粘贴主图 URL" />
              </el-form-item>

              <el-form-item label="商品轮播图">
                <div class="gallery-grid">
                  <div
                    v-for="(img, idx) in formData.images"
                    :key="`${img}-${idx}`"
                    class="gallery-thumb"
                    draggable="true"
                    @dragstart="handleGalleryDragStart(idx)"
                    @dragover.prevent
                    @drop="handleGalleryDrop(idx)"
                    @dragend="handleGalleryDragEnd"
                  >
                    <el-image :src="img" fit="cover" />
                    <el-button class="thumb-remove" type="danger" :icon="Delete" circle size="small" aria-label="删除该图片" @click="removeImage(idx)" />
                  </div>
                  <el-upload :show-file-list="false" accept="image/*" :before-upload="beforeImageUpload" :http-request="handleGalleryImageUpload">
                    <div class="gallery-add-tile">
                      <el-icon><Plus /></el-icon>
                      <span>添加</span>
                    </div>
                  </el-upload>
                </div>

                <div class="image-action-row">
                  <el-upload :show-file-list="false" accept="image/*" :before-upload="beforeImageUpload" :http-request="handleGalleryImageUpload">
                    <el-button class="ghost-btn" :icon="Upload" :loading="uploadingGalleryImage">本地上传</el-button>
                  </el-upload>
                  <el-button class="ghost-btn" :icon="Picture" @click="openAssetPicker('gallery')">素材库</el-button>
                </div>

                <button type="button" class="fold-link" @click="showGalleryUrlInput = !showGalleryUrlInput">
                  {{ showGalleryUrlInput ? '收起 URL 输入' : '通过 URL 添加轮播图' }}
                </button>
                <el-input v-if="showGalleryUrlInput" v-model="newImageUrl" placeholder="输入图片 URL 后回车添加" @keyup.enter="addImage">
                  <template #append>
                    <el-button @click="addImage">添加</el-button>
                  </template>
                </el-input>
              </el-form-item>
            </section>

            <section class="side-card">
              <div class="side-card-title">发布状态</div>
              <div class="status-row">
                <span>当前状态</span>
                <strong>{{ statusText }}</strong>
              </div>
              <div class="status-row">
                <span>自动保存</span>
                <strong>{{ lastAutoSaveTime ? formatTime(lastAutoSaveTime) : '未保存' }}</strong>
              </div>
              <div class="status-hint">
                {{ isDigitalOnly
                  ? '上线前请确认主图、SKU 价格和发货说明。纯数字商品不校验实体库存。'
                  : '上线前请确认主图、SKU 价格和库存。保存后小程序端将按接口状态展示。' }}
              </div>
            </section>

            <section class="side-card">
              <div class="side-card-title">完成度进度</div>
              <div class="side-progress">
                <div class="progress-ring" :style="{ '--progress': `${completionPercent}%` }">
                  <span>{{ completionPercent }}%</span>
                </div>
                <div>
                  <strong>{{ completionPercent === 100 ? '可以上线' : '继续完善商品资料' }}</strong>
                  <p>{{ incompleteItems.length ? `剩余 ${incompleteItems.length} 项待完成` : '所有必要信息已完成' }}</p>
                </div>
              </div>
              <div class="todo-list">
                <span v-for="item in incompleteItems" :key="item.label">
                  <i></i>{{ item.label }}
                </span>
              </div>
            </section>
          </aside>
        </div>

        <div class="sticky-action-bar">
          <div class="footer-status">
            <div class="progress-ring small" :style="{ '--progress': `${completionPercent}%` }">
              <span>{{ completionPercent }}%</span>
            </div>
            <div>
              <strong>发布完成度</strong>
              <p v-if="incompleteItems.length">还有 {{ incompleteItems.length }} 项未完成</p>
              <p v-else>商品资料已满足发布条件</p>
              <div class="footer-todos">
                <span v-for="item in incompleteItems.slice(0, 3)" :key="item.label"><i></i>{{ item.label }}</span>
              </div>
            </div>
          </div>
          <div class="footer-actions">
            <el-button class="ghost-btn" @click="goBack">取消</el-button>
            <el-button class="outline-btn" :loading="submitting" @click="handleSubmit(false)">
              {{ isEdit ? '保存修改' : '存为草稿' }}
            </el-button>
            <el-button class="primary-btn" type="primary" :loading="submitting" @click="handleSubmit(true)">保存并上线</el-button>
          </div>
        </div>
      </el-form>
    </div>

    <AssetPickerDialog
      v-model="assetPickerVisible"
      :multiple="assetPickerTarget === 'gallery'"
      @select="handleAssetSelected"
      @select-many="handleAssetSelectedMany"
    />

    <el-dialog
      v-model="previewVisible"
      title="商品预览"
      width="400px"
      append-to-body
      destroy-on-close
      class="product-preview-dialog"
      align-center
    >
      <div class="preview-phone">
        <div class="preview-notch" />
        <div class="preview-scroll">
          <!-- 轮播 -->
          <div class="pv-gallery">
            <el-carousel
              v-if="previewImages.length"
              height="280px"
              :interval="3500"
              indicator-position="inside"
              arrow="hover"
            >
              <el-carousel-item v-for="(img, idx) in previewImages" :key="`${img}-${idx}`">
                <img :src="img" alt="" />
              </el-carousel-item>
            </el-carousel>
            <div v-else class="pv-gallery-empty">暂无主图 / 轮播图</div>
            <div v-if="previewImages.length" class="pv-gallery-count">
              {{ previewImages.length }} 张
            </div>
          </div>

          <!-- 价格标题区 -->
          <div class="pv-header">
            <div class="pv-price-row">
              <span class="pv-yen">¥</span>
              <span class="pv-price">{{ previewPrice }}</span>
              <span v-if="previewOriginalPrice" class="pv-origin">¥{{ previewOriginalPrice }}</span>
            </div>
            <div class="pv-name">{{ formData.name || '商品名称' }}</div>
            <div class="pv-meta-row">
              <span>已售 —</span>
              <span>库存 {{ previewStockLabel }}</span>
              <span v-for="t in formData.productTypes" :key="t">{{ typeLabel(t) }}</span>
            </div>
            <div v-if="formData.description" class="pv-desc">{{ formData.description }}</div>
          </div>

          <!-- 规格 / 优惠 / 服务（淘宝式入口行） -->
          <div class="pv-picks">
            <div class="pv-pick">
              <span class="k">规格</span>
              <span class="v">{{ previewSkuLabel }}</span>
              <span class="ar">›</span>
            </div>
            <div class="pv-pick">
              <span class="k">优惠券</span>
              <span class="v">满减可用</span>
              <span class="ar">›</span>
            </div>
            <div class="pv-pick">
              <span class="k">服务</span>
              <span class="v">{{ previewServiceLabel }}</span>
              <span class="ar">›</span>
            </div>
          </div>

          <!-- 评价入口 -->
          <div class="pv-review">
            <div>
              <div class="pv-review-t">用户评价</div>
              <div class="pv-review-s">暂无评价 · 上架后展示</div>
            </div>
            <span class="ar">全部 ›</span>
          </div>

          <!-- 图文详情 -->
          <div class="pv-detail-card">
            <div class="pv-section-title">{{ previewDetailTitle }}</div>
            <div class="pv-rich" v-html="formData.content || '<p style=&quot;color:#999&quot;>暂无详情，可在上方编辑器插入图文</p>'" />
          </div>
        </div>

        <!-- 底部栏：对齐淘宝详情（预览固定展示完整操作，不按类型隐藏） -->
        <div class="pv-bottom">
          <div class="pv-icon-btn">
            <span class="emoji">💬</span>
            <span>客服</span>
          </div>
          <div class="pv-icon-btn">
            <span class="emoji">🛒</span>
            <span>购物车</span>
          </div>
          <button type="button" class="pv-btn pv-btn-cart">加入购物车</button>
          <button type="button" class="pv-btn pv-btn-buy">立即购买</button>
        </div>
      </div>
      <p class="preview-hint">模拟淘宝/小程序商品详情（含底部购买栏），样式供参考，实际以端上为准。</p>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Back, Delete, Picture, Plus, Upload } from '@element-plus/icons-vue'
import { getProduct, createProduct, updateProduct, getCategoryList, onSaleProduct } from '@/api/product'
import { uploadFile } from '@/api/system'
import { post } from '@/api/request'
import AssetPickerDialog from '@/components/AssetPickerDialog.vue'
import PageRichTextEditor from '@/components/page-builder/props/PageRichTextEditor.vue'
import type { ProductCategory, SkuItem, SkuSpec } from '@/types/product'

/** 自定义防抖函数（避免引入额外依赖） */
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout> | null = null
  return function (this: any, ...args: Parameters<T>) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}

/** 草稿存储键 */
const DRAFT_KEY = 'product_edit_draft'

const route = useRoute()
const router = useRouter()
const formRef = ref<FormInstance>()
const pageLoading = ref(false)
const submitting = ref(false)
const categoryOptions = ref<ProductCategory[]>([])
const newImageUrl = ref('')
const uploadingMainImage = ref(false)
const uploadingGalleryImage = ref(false)
const assetPickerVisible = ref(false)
const assetPickerTarget = ref<'main' | 'gallery'>('main')
const hasUnsavedChanges = ref(false)
const lastAutoSaveTime = ref<Date | null>(null)
const isRestoringDraft = ref(false)
const activeStepKey = ref('')
const newSpecName = ref('')
const showMainUrlInput = ref(false)
const showGalleryUrlInput = ref(false)
const draggingImageIndex = ref<number | null>(null)
const formStatus = ref<'draft' | 'on_sale' | 'off_sale'>('draft')

const isEdit = computed(() => !!route.params.id)
const productId = computed(() => Number(route.params.id) || 0)

const typeOptions = [
  { value: 'physical', label: '实物商品', icon: '📦' },
  { value: 'digital', label: '数字商品', icon: '📄' },
  { value: 'service', label: '服务商品', icon: '🎯' },
]

const previewVisible = ref(false)
const categoryNodeMap = ref<Map<number, any>>(new Map())

/** 规格名称列表 */
const specNames = ref<{ name: string }[]>([{ name: '' }])

const formData = reactive({
  name: '',
  category_id: undefined as number | undefined,
  productTypes: [] as string[],
  main_image: '',
  images: [] as string[],
  description: '',
  content: '',
  sort: 0,
  skus: [] as SkuItem[],
})

const formRules: FormRules = {
  name: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
  category_id: [{ required: true, message: '请选择商品分类', trigger: 'change' }],
  productTypes: [{ type: 'array', required: true, min: 1, message: '请至少选择一种商品类型', trigger: 'change' }],
  main_image: [{ required: true, message: '请输入主图URL', trigger: 'blur' }],
}

const isDigitalOnly = computed(() => {
  const types = formData.productTypes || []
  return types.includes('digital') && !types.includes('physical') && !types.includes('service')
})

const availableTypeOptions = computed(() => {
  if (!formData.category_id) return []
  const node = categoryNodeMap.value.get(Number(formData.category_id))
  const allowed: string[] = Array.isArray(node?.allowedProductTypes) && node.allowedProductTypes.length
    ? node.allowedProductTypes
    : ['physical', 'digital', 'service']
  return typeOptions.filter((t) => allowed.includes(t.value))
})

const previewPrice = computed(() => {
  const prices = formData.skus
    .map((s) => s.price)
    .filter((v) => isSkuPriceFilled(v))
    .map((v) => toNumber(v, 0))
  if (!prices.length) return '0.00'
  return Math.min(...prices).toFixed(2)
})

/** 预览/小程序轮播：主图优先，再拼轮播图并去重 */
const previewImages = computed(() => buildSyncedImages(formData.main_image, formData.images))

const previewOriginalPrice = computed(() => {
  const origins = formData.skus
    .map((s) => toNumber(s.original_price, 0))
    .filter((n) => n > toNumber(previewPrice.value, 0))
  if (!origins.length) return ''
  return Math.max(...origins).toFixed(2)
})

const previewStockLabel = computed(() => {
  if (isDigitalOnly.value) return '无限'
  const total = formData.skus.reduce((sum, s) => sum + toNumber(s.stock, 0), 0)
  return total > 0 ? String(total) : '无'
})

const previewSkuLabel = computed(() => {
  if (!formData.skus.length) return '请先配置 SKU'
  if (formData.skus.length === 1) {
    const s = formData.skus[0]
    const spec = (s.specs || []).map((x) => x.value).filter(Boolean).join(' / ')
    return spec || s.sku_code || '默认规格'
  }
  return `${formData.skus.length} 个规格可选`
})

const previewIsService = computed(() => (formData.productTypes || []).includes('service') && !(formData.productTypes || []).includes('physical'))
const previewServiceLabel = computed(() => {
  if (isDigitalOnly.value) return '下单后可查'
  if (previewIsService.value) return '开始前24h可改期'
  return '假一赔四 · 极速退款'
})
const previewDetailTitle = computed(() => {
  if (isDigitalOnly.value) return '资料介绍'
  if (previewIsService.value) return '服务说明'
  return '商品详情'
})

function buildSyncedImages(main: string, gallery: string[]) {
  const list: string[] = []
  const push = (url?: string) => {
    const u = (url || '').trim()
    if (u && !list.includes(u)) list.push(u)
  }
  push(main)
  ;(gallery || []).forEach(push)
  return list
}

const completionItems = computed(() => [
  { label: '填写商品名称', done: !!formData.name.trim() },
  { label: '选择商品分类', done: !!formData.category_id },
  { label: '选择商品类型', done: formData.productTypes.length > 0 },
  { label: '上传商品主图', done: !!formData.main_image },
  { label: '添加至少 1 个 SKU', done: formData.skus.length > 0 },
  {
    label: isDigitalOnly.value ? '配置商品价格' : '配置价格和库存',
    done: formData.skus.some((sku) =>
      isSkuPriceFilled(sku.price)
      && (isDigitalOnly.value || toNumber(sku.stock, 0) > 0)
    ),
  },
])

const completionPercent = computed(() => {
  const items = completionItems.value
  const doneCount = items.filter((item) => item.done).length
  return Math.round((doneCount / items.length) * 100)
})

const incompleteItems = computed(() => completionItems.value.filter((item) => !item.done))
const statusText = computed(() => {
  if (formStatus.value === 'on_sale') return '已上架'
  if (formStatus.value === 'off_sale') return '已下架'
  return '草稿'
})

function filterEnabledCategories(nodes: any[]): any[] {
  if (!Array.isArray(nodes)) return []
  return nodes
    .filter((n) => Number(n?.status ?? 1) === 1)
    .map((n) => {
      const allowed = Array.isArray(n.allowedProductTypes)
        ? n.allowedProductTypes
        : (typeof n.allowedProductTypes === 'string'
          ? (() => { try { return JSON.parse(n.allowedProductTypes) } catch { return [] } })()
          : [])
      return {
        ...n,
        allowedProductTypes: allowed.length ? allowed : ['physical', 'digital', 'service'],
        children: filterEnabledCategories(n.children || []),
      }
    })
}

function findCategory(nodes: any[], id: number): boolean {
  for (const n of nodes || []) {
    if (Number(n.id) === Number(id)) return true
    if (findCategory(n.children || [], id)) return true
  }
  return false
}

/** 加载分类选项（仅启用） */
async function fetchCategories() {
  try {
    const res = await getCategoryList()
    const raw = (res as any).data || []
    categoryOptions.value = filterEnabledCategories(Array.isArray(raw) ? raw : [])
    const map = new Map<number, any>()
    collectCategoryNodes(categoryOptions.value, map)
    categoryNodeMap.value = map
  } catch { /* ignore */ }
}

const stepItems = computed(() => [
  {
    key: 'basic',
    label: '基础信息',
    target: 'section-basic',
    done: completionItems.value[0].done && completionItems.value[1].done,
  },
  {
    key: 'assets',
    label: '图片素材',
    target: 'section-assets',
    done: completionItems.value[2].done,
  },
  {
    key: 'content',
    label: '内容描述',
    target: 'section-content',
    done: !!formData.description.trim() && !!formData.content.trim(),
  },
  {
    key: 'sku',
    label: 'SKU 管理',
    target: 'section-sku',
    done: completionItems.value[3].done && completionItems.value[4].done,
  },
])

const currentStepKey = computed(() => activeStepKey.value || stepItems.value.find((step) => !step.done)?.key || 'sku')

const visibleSpecNames = computed(() =>
  specNames.value
    .map((spec, index) => ({ name: spec.name.trim(), index }))
    .filter((spec) => spec.name)
)

function scrollToStep(target: string, key: string) {
  activeStepKey.value = key
  nextTick(() => {
    document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

function isImageLikeUrl(url: string) {
  return /^(https?:\/\/|\/|data:image\/)/i.test(url)
}

function toNumber(value: unknown, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

/** 销售价已填写：允许 0，不允许空值或负数 */
function isSkuPriceFilled(value: unknown): boolean {
  if (value === '' || value === null || value === undefined) return false
  const n = Number(value)
  return Number.isFinite(n) && n >= 0
}

function mapApiSpecsToForm(specs: unknown): SkuSpec[] {
  if (Array.isArray(specs)) {
    return specs.map((item: any) => ({
      name: String(item?.name || ''),
      value: String(item?.value || ''),
    }))
  }
  if (specs && typeof specs === 'object') {
    return Object.entries(specs as Record<string, unknown>).map(([name, value]) => ({
      name,
      value: value == null ? '' : String(value),
    }))
  }
  return []
}

function mapApiSkuToForm(sku: any): SkuItem {
  const specs = mapApiSpecsToForm(sku?.specs)
  return {
    id: sku?.id,
    specs,
    price: toNumber(sku?.price, 0),
    original_price: toNumber(sku?.originalPrice ?? sku?.original_price, 0),
    stock: toNumber(sku?.stock, 0),
    sku_code: String(sku?.skuCode ?? sku?.sku_code ?? sku?.skuName ?? sku?.sku_name ?? ''),
    image: sku?.skuImage ?? sku?.image ?? '',
  }
}

function mapFormSpecsToApi(specs: SkuSpec[]) {
  return specs.reduce<Record<string, string>>((acc, item) => {
    const key = (item?.name || '').trim()
    if (key) {
      acc[key] = String(item?.value || '')
    }
    return acc
  }, {})
}

function buildApiPayload() {
  const mappedSkus = formData.skus.map((sku, index) => ({
    id: sku.id,
    skuName: (sku.sku_code || '').trim() || `SKU-${index + 1}`,
    skuImage: sku.image || formData.main_image || '',
    price: toNumber(sku.price, 0),
    originalPrice: toNumber(sku.original_price, 0),
    stock: toNumber(sku.stock, 0),
    specs: mapFormSpecsToApi(sku.specs || []),
    sortOrder: index,
    status: 1,
  }))

  const minPrice = mappedSkus.length > 0 ? Math.min(...mappedSkus.map((sku) => sku.price)) : 0
  const maxOriginalPrice = mappedSkus.length > 0 ? Math.max(...mappedSkus.map((sku) => sku.originalPrice || sku.price)) : minPrice
  const totalStock = mappedSkus.reduce((sum, sku) => sum + toNumber(sku.stock, 0), 0)

  return {
    name: formData.name,
    categoryId: formData.category_id,
    productTypes: [...formData.productTypes],
    productType: formData.productTypes[0] || 'physical',
    mainImage: formData.main_image,
    images: buildSyncedImages(formData.main_image, formData.images),
    description: formData.description,
    detail: formData.content,
    price: minPrice,
    originalPrice: maxOriginalPrice,
    stock: totalStock,
    unit: '件',
    sortOrder: toNumber(formData.sort, 0),
    skus: mappedSkus,
  }
}

function getPublishErrors() {
  const errors: string[] = []
  if (!formData.name.trim()) errors.push('填写商品名称')
  if (!formData.category_id) errors.push('选择商品分类')
  if (!formData.productTypes.length) errors.push('选择商品类型')
  if (!formData.main_image) errors.push('上传商品主图')
  if (!formData.skus.length) errors.push('添加至少 1 个 SKU')
  if (formData.skus.some((sku) => !isSkuPriceFilled(sku.price))) {
    errors.push('填写 SKU 销售价')
  }
  if (!isDigitalOnly.value && formData.skus.every((sku) => toNumber(sku.stock, 0) <= 0)) {
    errors.push('配置可售库存')
  }
  return errors
}

function typeLabel(t: string) {
  if (t === 'digital') return '数字'
  if (t === 'service') return '服务'
  return '实物'
}

function openPreview() {
  previewVisible.value = true
}

function collectCategoryNodes(nodes: any[], map: Map<number, any>) {
  ;(nodes || []).forEach((n) => {
    if (n?.id != null) map.set(Number(n.id), n)
    if (n.children?.length) collectCategoryNodes(n.children, map)
  })
}

function syncTypesForCategory(preserveSelection = true) {
  const allowed = availableTypeOptions.value.map((t) => t.value)
  if (!allowed.length) {
    formData.productTypes = []
    return
  }
  if (preserveSelection) {
    const kept = formData.productTypes.filter((t) => allowed.includes(t))
    formData.productTypes = kept.length ? kept : [...allowed]
  } else {
    formData.productTypes = [...allowed]
  }
}

function resolveUploadUrl(url: string) {
  if (!url) return ''
  if (/^(https?:\/\/|data:image\/)/i.test(url)) return url
  if (url.startsWith('/')) return `${window.location.origin}${url}`
  return `${window.location.origin}/${url}`
}

async function registerImageAsset(file: File, url: string) {
  try {
    await post('/api/v1/admin/assets', {
      name: file.name,
      type: 'image',
      url,
      thumbUrl: url,
      size: file.size,
    })
  } catch {
    // 素材登记失败不阻断商品编辑，上传 URL 仍可继续使用。
  }
}

function beforeImageUpload(file: File) {
  if (!file.type.startsWith('image/')) {
    ElMessage.error('只能上传图片文件')
    return false
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('图片大小不能超过 5MB')
    return false
  }
  return true
}

/** 加载商品详情（编辑模式） */
async function fetchProduct() {
  if (!productId.value) return
  pageLoading.value = true
  try {
    const res = await getProduct(productId.value)
    const product = (res as any).data || {}
    formData.name = product.name || ''
    formData.category_id = product.categoryId ?? product.category_id
    const types = Array.isArray(product.productTypes)
      ? product.productTypes
      : (product.productType || product.product_type ? [product.productType || product.product_type] : [])
    formData.productTypes = types.length ? types.map(String) : []
    formData.main_image = product.mainImage ?? product.main_image ?? ''
    const rawImages = Array.isArray(product.images) ? product.images.filter(Boolean) : []
    formData.images = buildSyncedImages(formData.main_image, rawImages)
    if (!formData.main_image && formData.images.length) {
      formData.main_image = formData.images[0]
    }
    formData.description = product.description || ''
    formData.content = product.detail ?? product.content ?? ''
    formData.sort = product.sortOrder ?? product.sort ?? 0
    formStatus.value = product.status || 'draft'
    formData.skus = Array.isArray(product.skus) ? product.skus.map((sku: any) => mapApiSkuToForm(sku)) : []

    // 若当前分类已禁用，仍保留在选项中以便展示
    if (formData.category_id) {
      const exists = findCategory(categoryOptions.value, formData.category_id)
      if (!exists) {
        categoryOptions.value = [
          ...categoryOptions.value,
          {
            id: formData.category_id,
            name: `${product.categoryName || product.category_name || '原分类'}（已禁用）`,
            status: 0,
            children: [],
          },
        ]
      }
    }

    // 从 SKU 推断规格名称
    if (formData.skus.length > 0 && formData.skus[0].specs?.length) {
      specNames.value = formData.skus[0].specs.map((s) => ({ name: s.name }))
      formData.skus.forEach((sku) => {
        while (sku.specs.length < specNames.value.length) {
          sku.specs.push({ name: '', value: '' })
        }
      })
    }
  } catch {
    ElMessage.error('获取商品详情失败')
  } finally {
    pageLoading.value = false
  }
}

function handleGalleryDragStart(idx: number) {
  draggingImageIndex.value = idx
}

function handleGalleryDrop(idx: number) {
  const from = draggingImageIndex.value
  if (from === null || from === idx) return
  const [moved] = formData.images.splice(from, 1)
  if (moved) {
    formData.images.splice(idx, 0, moved)
  }
  draggingImageIndex.value = null
}

function handleGalleryDragEnd() {
  draggingImageIndex.value = null
}

async function handleMainImageUpload(options: { file: File }) {
  uploadingMainImage.value = true
  try {
    const compressed = await compressImage(options.file)
    const res = await uploadFile(compressed)
    const url = resolveUploadUrl(res.data?.url || '')
    if (!url) throw new Error('上传返回地址为空')
    await registerImageAsset(compressed, url)
    formData.main_image = url
    if (!formData.images.includes(url)) {
      formData.images.unshift(url)
    } else {
      // 主图固定排在轮播第一位
      formData.images = [url, ...formData.images.filter((x) => x !== url)]
    }
    ElMessage.success('主图上传成功')
  } catch {
    ElMessage.error('主图上传失败')
  } finally {
    uploadingMainImage.value = false
  }
}

async function handleGalleryImageUpload(options: { file: File }) {
  uploadingGalleryImage.value = true
  try {
    const compressed = await compressImage(options.file)
    const res = await uploadFile(compressed)
    const url = resolveUploadUrl(res.data?.url || '')
    if (!url) throw new Error('上传返回地址为空')
    await registerImageAsset(compressed, url)
    if (!formData.images.includes(url)) {
      formData.images.push(url)
    }
    if (!formData.main_image) {
      formData.main_image = url
    }
    ElMessage.success('商品图上传成功')
  } catch {
    ElMessage.error('商品图上传失败')
  } finally {
    uploadingGalleryImage.value = false
  }
}

function openAssetPicker(target: 'main' | 'gallery') {
  assetPickerTarget.value = target
  assetPickerVisible.value = true
}

function handleAssetSelected(url: string) {
  if (assetPickerTarget.value === 'main') {
    formData.main_image = url
    if (!formData.images.includes(url)) {
      formData.images.unshift(url)
    } else {
      formData.images = [url, ...formData.images.filter((x) => x !== url)]
    }
    ElMessage.success('已选择商品主图')
    assetPickerVisible.value = false
    return
  }
  if (!formData.images.includes(url)) {
    formData.images.push(url)
  }
  if (!formData.main_image) {
    formData.main_image = url
  }
  ElMessage.success('已添加商品图片')
  assetPickerVisible.value = false
}

/** 轮播图：按素材库点击顺序批量追加 */
function handleAssetSelectedMany(urls: string[]) {
  if (!urls.length) return
  let added = 0
  for (const url of urls) {
    if (!formData.images.includes(url)) {
      formData.images.push(url)
      added += 1
    }
  }
  if (!formData.main_image && formData.images.length) {
    formData.main_image = formData.images[0]
  }
  assetPickerVisible.value = false
  if (added > 0) {
    ElMessage.success(`已按选择顺序添加 ${added} 张轮播图`)
  } else {
    ElMessage.info('所选图片已在轮播中')
  }
}

/** 添加图片 */
function addImage() {
  const url = newImageUrl.value.trim()
  if (!url) return
  if (!isImageLikeUrl(url)) {
    ElMessage.warning('请输入有效图片URL（http(s):// 或 /uploads/...）')
    return
  }
  if (!formData.images.includes(url)) {
    formData.images.push(url)
  }
  if (!formData.main_image) {
    formData.main_image = url
  }
  newImageUrl.value = ''
}

/** 移除图片 */
function removeImage(idx: number) {
  const removed = formData.images[idx]
  formData.images.splice(idx, 1)
  if (removed && formData.main_image === removed) {
    formData.main_image = formData.images[0] || ''
  }
}

function syncSkuSpecLength() {
  formData.skus.forEach((sku) => {
    while (sku.specs.length < specNames.value.length) {
      sku.specs.push({ name: '', value: '' })
    }
    if (sku.specs.length > specNames.value.length) {
      sku.specs.splice(specNames.value.length)
    }
  })
}

function addSpecTag() {
  const name = newSpecName.value.trim()
  if (!name) {
    ElMessage.warning('请输入规格名称')
    return
  }
  if (specNames.value.some((spec) => spec.name.trim() === name)) {
    ElMessage.warning('规格名称已存在')
    return
  }

  const emptySpec = specNames.value.find((spec) => !spec.name.trim())
  if (emptySpec) {
    emptySpec.name = name
  } else {
    specNames.value.push({ name })
  }
  syncSkuSpecLength()
  newSpecName.value = ''
}

/** 移除规格名称 */
function removeSpecName(idx: number) {
  specNames.value.splice(idx, 1)
  // 同步已有 SKU 的 specs
  formData.skus.forEach((sku) => {
    sku.specs.splice(idx, 1)
  })
}

/** 添加 SKU 行 */
function addSku() {
  const specs: SkuSpec[] = specNames.value.map((s) => ({
    name: s.name,
    value: '',
  }))
  formData.skus.push({
    specs,
    price: 0,
    original_price: 0,
    stock: 0,
    sku_code: '',
  })
}

/** 移除 SKU 行 */
function removeSku(idx: number) {
  formData.skus.splice(idx, 1)
}

/** 提交 */
async function handleSubmit(publish = false) {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  if (formData.skus.length === 0) {
    ElMessage.warning('请至少添加一个SKU')
    return
  }

  // 同步规格名称到 SKU specs
  formData.skus.forEach((sku) => {
    sku.specs.forEach((spec, idx) => {
      spec.name = specNames.value[idx]?.name || ''
    })
  })

  if (publish) {
    const errors = getPublishErrors()
    if (errors.length) {
      ElMessage.warning(`上线前请先完成：${errors[0]}`)
      return
    }
  }

  submitting.value = true
  try {
    const payload = buildApiPayload()
    let savedProductId = productId.value
    if (isEdit.value) {
      await updateProduct(productId.value, payload as any)
    } else {
      const res: any = await createProduct(payload as any)
      savedProductId = Number(res?.data?.id || 0)
      productId.value = savedProductId
      formStatus.value = 'draft'
    }
    if (publish && savedProductId) {
      if (formStatus.value !== 'on_sale') {
        await onSaleProduct(savedProductId)
      }
      formStatus.value = 'on_sale'
      ElMessage.success('商品已保存并上线')
    } else {
      ElMessage.success(isEdit.value ? '草稿已保存' : '已存为草稿')
    }
    clearDraft()
    hasUnsavedChanges.value = false
    goBack()
  } catch (err: any) {
    ElMessage.error(err?.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

/** 返回列表 */
function goBack() {
  router.push({ name: 'CommerceProduct' })
}

/* ============================================
   方案A增强功能：自动保存草稿
   ============================================ */

/** 保存草稿到 localStorage */
function saveDraft() {
  try {
    const draftData = {
      formData: { ...formData },
      specNames: specNames.value,
      savedAt: new Date().toISOString(),
      productId: productId.value,
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData))
    lastAutoSaveTime.value = new Date()
    hasUnsavedChanges.value = false
  } catch {
    // localStorage 满或不可用时静默失败
  }
}

/** 从 localStorage 恢复草稿 */
function restoreDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return false
    const draft = JSON.parse(raw)
    // 仅恢复与当前编辑商品匹配的草稿（新增模式 productId=0）
    if (draft.productId !== productId.value) return false
    // 草稿超过 24 小时则忽略
    if (Date.now() - new Date(draft.savedAt).getTime() > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(DRAFT_KEY)
      return false
    }
    isRestoringDraft.value = true
    Object.assign(formData, draft.formData)
    if (Array.isArray(draft.specNames)) {
      specNames.value = draft.specNames
    }
    nextTick(() => {
      isRestoringDraft.value = false
    })
    return true
  } catch {
    return false
  }
}

/** 清除草稿 */
function clearDraft() {
  localStorage.removeItem(DRAFT_KEY)
}

/** 防抖自动保存（5秒无操作后触发） */
const autoSaveDraft = debounce(() => {
  if (!hasUnsavedChanges.value || submitting.value || pageLoading.value) return
  saveDraft()
}, 5000)

/** 分类切换 → 同步可选商品类型 */
watch(
  () => formData.category_id,
  (id, prev) => {
    if (!id) {
      formData.productTypes = []
      return
    }
    // 首次加载编辑详情时保留已选类型
    syncTypesForCategory(!!prev || isEdit.value)
  }
)

/** 监听表单变化 → 标记未保存 + 触发自动保存 */
watch(
  () => ({ ...formData }),
  () => {
    if (isRestoringDraft.value) return
    hasUnsavedChanges.value = true
    autoSaveDraft()
  },
  { deep: true }
)

/* ============================================
   方案A增强功能：图片压缩上传
   ============================================ */

/** 压缩图片（Canvas 缩放 + JPEG 质量压缩） */
function compressImage(file: File, maxWidth = 1200, quality = 0.85): Promise<File> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(file)
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let width = img.width
        let height = img.height
        // 仅在图片宽度超过 maxWidth 时压缩
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file)
              return
            }
            const compressed = new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })
            // 如果压缩后反而更大，返回原文件
            resolve(compressed.size < file.size ? compressed : file)
          },
          'image/jpeg',
          quality
        )
      }
      img.onerror = () => resolve(file)
      img.src = e.target?.result as string
    }
    reader.onerror = () => resolve(file)
    reader.readAsDataURL(file)
  })
}

/* ============================================
   方案A增强功能：表单快捷键
   ============================================ */

function handleGlobalKeydown(e: KeyboardEvent) {
  // Ctrl/Cmd + S → 保存
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    handleSubmit(false)
  }
  // Esc → 关闭素材选择弹窗
  if (e.key === 'Escape' && assetPickerVisible.value) {
    assetPickerVisible.value = false
  }
}

/** 页面关闭前提示 */
function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (hasUnsavedChanges.value) {
    e.preventDefault()
  }
}

/** 格式化时间为简短显示 */
function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

/** 路由离开前确认 */
onBeforeRouteLeave((_to, _from, next) => {
  if (hasUnsavedChanges.value) {
    ElMessageBox.confirm('当前有未保存的更改，确定要离开吗？', '离开确认', {
      confirmButtonText: '离开',
      cancelButtonText: '留下',
      type: 'warning',
    })
      .then(() => next())
      .catch(() => next(false))
  } else {
    next()
  }
})

onMounted(() => {
  fetchCategories()
  if (isEdit.value) {
    fetchProduct()
  } else {
    // 新增模式默认一个 SKU
    addSku()
    // 尝试恢复草稿
    const restored = restoreDraft()
    if (restored) {
      ElMessage.info('已恢复上次未保存的草稿')
    }
  }
  // 注册快捷键和关闭提示
  document.addEventListener('keydown', handleGlobalKeydown)
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown)
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<style scoped>
.product-editor-page {
  min-height: 100%;
  padding: 24px 28px 36px;
  background: var(--bg-page);
  color: var(--text);
}

.product-editor-page,
.product-editor-page * {
  box-sizing: border-box;
}

.product-editor-wrap {
  width: 100%;
  max-width: 1480px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  min-height: 76px;
  padding: 16px 0 18px;
  border-bottom: 1px solid var(--border);
}

.page-title-wrap,
.page-actions,
.footer-actions,
.image-action-row,
.side-progress,
.footer-status {
  display: flex;
  align-items: center;
}

.page-title-wrap {
  gap: 14px;
  min-width: 0;
}

.back-icon-btn {
  flex: none;
}

.page-breadcrumb {
  margin-bottom: 4px;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.3;
}

.page-header h1 {
  margin: 0;
  color: var(--text);
  font-size: 26px;
  font-weight: 700;
  line-height: 1.25;
}

.page-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.draft-pill {
  padding: 4px 10px;
  border-radius: 999px;
  color: #d46b08;
  background: #fff7e6;
  font-size: 12px;
  font-weight: 700;
}

.autosave-text {
  color: var(--text-muted);
  font-size: 12px;
}

.editor-form {
  padding-top: 18px;
}

.step-nav {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.step-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  height: 44px;
  padding: 0 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-muted);
  background: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color .2s ease, color .2s ease, background .2s ease, box-shadow .2s ease;
}

.step-nav-item:hover {
  border-color: var(--brand);
  color: var(--brand);
}

.step-nav-item.current {
  border-color: var(--brand);
  color: var(--brand);
  background: #f0f7ff;
  box-shadow: 0 0 0 3px rgba(22, 119, 255, .08);
}

.step-nav-item.done {
  border-color: var(--brand);
  color: var(--brand);
  background: #fff;
}

.step-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 20px;
  height: 20px;
  border: 2px solid #c9cdd4;
  border-radius: 999px;
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
}

.step-nav-item.current .step-dot {
  border-color: var(--brand);
}

.step-nav-item.done .step-dot {
  border-color: var(--brand);
  background: var(--brand);
}

.step-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.editor-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) clamp(360px, 30%, 460px);
  gap: 24px;
  align-items: start;
}

.editor-main,
.editor-aside {
  display: grid;
  gap: 18px;
  min-width: 0;
}

.editor-aside {
  position: sticky;
  top: 18px;
}

.section-card,
.side-card,
.sticky-action-bar {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 20px rgba(29, 33, 41, .04);
}

.section-card {
  scroll-margin-top: 22px;
  padding: 22px 24px 24px;
  min-width: 0;
}

.side-card {
  padding: 18px 20px;
}

.section-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f2f5;
}

.section-no {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 34px;
  height: 28px;
  border-radius: 6px;
  color: #fff;
  background: var(--brand);
  font-size: 13px;
  font-weight: 800;
}

.section-head h2,
.side-card-title {
  margin: 0;
  color: var(--text);
  font-size: 16px;
  font-weight: 700;
  line-height: 1.35;
}

.section-head p {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.6;
}

.basic-form-grid,
.content-form-grid {
  display: grid;
  gap: 18px;
}

.span-all {
  grid-column: 1 / -1;
}

.category-sort-row {
  display: grid;
  grid-template-columns: minmax(0, 6fr) minmax(150px, 2fr);
  gap: 18px;
}

.segmented-control {
  display: inline-flex;
  width: 100%;
  max-width: 620px;
  padding: 4px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-page);
}

.segment-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 1 1 0;
  min-width: 0;
  gap: 8px;
  height: 36px;
  padding: 0 16px;
  border: 0;
  border-radius: 6px;
  color: var(--text-secondary);
  background: transparent;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: color .2s ease, background .2s ease, box-shadow .2s ease;
}

.segment-item.active {
  color: #fff;
  background: var(--brand);
  box-shadow: 0 6px 14px rgba(22, 119, 255, .24);
}

.segment-icon {
  font-size: 16px;
}

.form-tip {
  margin-top: 8px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.6;
}

.asset-card :deep(.el-form-item) {
  margin-bottom: 22px;
}

.asset-card :deep(.el-form-item__content) {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
  align-items: stretch;
}

.asset-card :deep(.el-form-item:last-child) {
  margin-bottom: 0;
}

.main-image-drop {
  display: block;
  width: 100%;
}

.main-image-drop :deep(.el-upload),
.main-image-drop :deep(.el-upload-dragger) {
  width: 100%;
}

.main-image-drop :deep(.el-upload-dragger) {
  overflow: hidden;
  padding: 0;
  border: 1px dashed #c9d5e8;
  border-radius: 8px;
  background: #f7fbff;
}

.main-image-drop-inner {
  position: relative;
  aspect-ratio: 1 / 1;
  min-height: 220px;
}

.main-image-drop-inner.filled :deep(.el-image) {
  width: 100%;
  height: 100%;
}

.upload-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 8px;
  color: var(--text-muted);
  text-align: center;
}

.upload-empty :deep(.el-icon) {
  color: var(--brand);
  font-size: 30px;
}

.upload-empty strong {
  color: var(--text);
  font-size: 14px;
}

.upload-empty span {
  font-size: 12px;
}

.image-action-row {
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 0;
}

.fold-link {
  display: inline-flex;
  justify-self: start;
  margin: 0;
  padding: 0;
  border: 0;
  color: var(--brand);
  background: transparent;
  font-size: 12px;
  cursor: pointer;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 10px;
  width: 100%;
}

.gallery-thumb,
.gallery-add-tile {
  position: relative;
  overflow: hidden;
  aspect-ratio: 1 / 1;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-page);
}

.gallery-thumb {
  cursor: grab;
}

.gallery-thumb:active {
  cursor: grabbing;
}

.gallery-thumb :deep(.el-image) {
  width: 100%;
  height: 100%;
}

.thumb-remove {
  position: absolute;
  top: 6px;
  right: 6px;
  opacity: .9;
}

.gallery-add-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-style: dashed;
  color: var(--text-muted);
  min-height: 96px;
  cursor: pointer;
}

.gallery-add-tile :deep(.el-icon) {
  font-size: 22px;
}

.gallery-add-tile:hover {
  border-color: var(--brand);
  color: var(--brand);
  background: #f0f7ff;
}

.spec-tag-editor {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.spec-tag-input {
  width: 220px;
}

.sku-table-wrap {
  width: 100%;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 8px;
}

.sku-table {
  width: 100%;
}

.unlimited-stock {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  color: #0f8a5f;
  background: #edf9f4;
  font-size: 12px;
  font-weight: 700;
}

.money-input :deep(.el-input__prefix) {
  color: var(--text-muted);
  font-weight: 700;
}

.delete-icon-btn {
  color: var(--text-muted);
}

.delete-icon-btn:hover {
  color: var(--danger);
  background: #fff1f0;
}

.sku-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 180px;
  color: var(--text-muted);
}

.sku-empty strong {
  color: var(--text);
  font-size: 15px;
}

.empty-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  color: var(--brand);
  background: var(--brand-soft);
  font-weight: 800;
}

.add-row-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: calc(100% - 24px);
  height: 42px;
  margin: 12px;
  border: 1px dashed #b7c7dd;
  border-radius: 8px;
  color: var(--brand);
  background: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.add-row-btn:hover {
  border-color: var(--brand);
  background: #f0f7ff;
}

.side-card-title {
  margin-bottom: 14px;
}

.status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #f0f2f5;
  color: var(--text-muted);
  font-size: 13px;
}

.status-row strong {
  color: var(--text);
  font-weight: 700;
}

.status-hint {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  color: var(--text-secondary);
  background: var(--bg-page);
  font-size: 12px;
  line-height: 1.7;
}

.side-progress {
  gap: 14px;
}

.side-progress strong,
.footer-status strong {
  color: var(--text);
  font-size: 14px;
}

.side-progress p,
.footer-status p {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 12px;
}

.progress-ring {
  --progress: 0%;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 70px;
  height: 70px;
  border-radius: 999px;
  background: conic-gradient(#1677ff var(--progress), #e5e6eb 0);
}

.progress-ring::after {
  position: absolute;
  inset: 8px;
  border-radius: 999px;
  background: #fff;
  content: '';
}

.progress-ring span {
  position: relative;
  z-index: 1;
  color: var(--text);
  font-size: 13px;
  font-weight: 800;
}

.progress-ring.small {
  width: 52px;
  height: 52px;
}

.progress-ring.small::after {
  inset: 6px;
}

.progress-ring.small span {
  font-size: 12px;
}

.todo-list,
.footer-todos {
  display: grid;
  gap: 8px;
  margin-top: 14px;
}

.footer-todos {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-top: 7px;
}

.todo-list span,
.footer-todos span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--text-secondary);
  font-size: 12px;
}

.todo-list i,
.footer-todos i {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--danger);
}

.sticky-action-bar {
  position: sticky;
  bottom: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-top: 20px;
  padding: 14px 18px;
  box-shadow: 0 -10px 30px rgba(29, 33, 41, .08);
}

.footer-status {
  gap: 12px;
  min-width: 0;
}

.footer-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.product-editor-page :deep(.el-form-item) {
  margin-bottom: 0;
}

.product-editor-page :deep(.el-form-item__label) {
  margin-bottom: 8px;
  color: var(--text);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.4;
}

.product-editor-page :deep(.el-form-item__error) {
  padding-top: 5px;
  color: var(--danger);
  font-size: 12px;
}

.product-editor-page :deep(.el-input__wrapper),
.product-editor-page :deep(.el-textarea__inner) {
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 0 0 1px var(--border) inset;
}

.product-editor-page :deep(.el-input__wrapper:hover),
.product-editor-page :deep(.el-textarea__inner:hover) {
  box-shadow: 0 0 0 1px #b7c7dd inset;
}

.product-editor-page :deep(.el-input__wrapper.is-focus),
.product-editor-page :deep(.el-textarea__inner:focus) {
  box-shadow: 0 0 0 1px var(--brand) inset, 0 0 0 3px rgba(22, 119, 255, .12);
}

.product-editor-page :deep(.el-input-number) {
  width: 100%;
}

.product-editor-page :deep(.el-button) {
  border-radius: 6px;
  font-weight: 700;
}

.primary-btn:deep(.el-button),
.product-editor-page :deep(.el-button--primary),
.product-editor-page :deep(.el-button.primary-btn) {
  --el-button-bg-color: var(--brand);
  --el-button-border-color: var(--brand);
  --el-button-hover-bg-color: var(--brand-hover);
  --el-button-hover-border-color: var(--brand-hover);
  --el-button-active-bg-color: #0b55bd;
  --el-button-active-border-color: #0b55bd;
}

.product-editor-page :deep(.el-button.ghost-btn),
.product-editor-page :deep(.el-button.outline-btn) {
  color: var(--text-secondary);
  border-color: var(--border);
  background: #fff;
}

.product-editor-page :deep(.el-button.ghost-btn:hover),
.product-editor-page :deep(.el-button.outline-btn:hover) {
  color: var(--brand);
  border-color: var(--brand);
  background: #f0f7ff;
}

.product-editor-page :deep(.el-table th.el-table__cell) {
  color: var(--text-secondary);
  background: var(--bg-page);
  font-size: 13px;
  font-weight: 700;
}

.product-editor-page :deep(.el-table td.el-table__cell) {
  vertical-align: middle;
}

.type-check-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.product-rich-editor {
  width: 100%;
  border: 1px solid var(--border, #e4e9f2);
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
}

.preview-phone {
  position: relative;
  width: 360px;
  margin: 0 auto;
  border: 10px solid #1a1a1a;
  border-radius: 28px;
  background: #f5f6f8;
  overflow: hidden;
}

.preview-notch {
  width: 120px;
  height: 18px;
  margin: 8px auto 0;
  border-radius: 10px;
  background: #111;
}

.preview-scroll {
  max-height: 560px;
  overflow: auto;
  padding-bottom: 72px;
  background: #f5f6f8;
}

.pv-gallery {
  position: relative;
  height: 280px;
  background: #eef1f6;
}

.pv-gallery :deep(.el-carousel),
.pv-gallery :deep(.el-carousel__container) {
  height: 280px !important;
}

.pv-gallery :deep(.el-carousel__item) {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eef1f6;
}

.pv-gallery img {
  width: 100%;
  height: 280px;
  object-fit: cover;
  display: block;
}

.pv-gallery-empty {
  height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #99a3b5;
}

.pv-gallery-count {
  position: absolute;
  right: 12px;
  bottom: 12px;
  z-index: 2;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  font-size: 11px;
}

.pv-header {
  margin-top: -12px;
  padding: 16px 14px 12px;
  border-radius: 14px 14px 0 0;
  background: #fff;
  position: relative;
  z-index: 1;
}

.pv-price-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.pv-yen {
  color: #ff5000;
  font-size: 16px;
  font-weight: 800;
}

.pv-price {
  color: #ff5000;
  font-size: 26px;
  font-weight: 800;
  line-height: 1;
}

.pv-origin {
  margin-left: 6px;
  color: #aab0bc;
  font-size: 13px;
  text-decoration: line-through;
}

.pv-name {
  margin-top: 8px;
  font-size: 16px;
  font-weight: 700;
  color: #111;
  line-height: 1.45;
}

.pv-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
  color: #8b93a3;
  font-size: 12px;
}

.pv-desc {
  margin-top: 8px;
  color: #5b6b82;
  font-size: 12px;
  line-height: 1.5;
}

.pv-picks,
.pv-review,
.pv-detail-card {
  margin: 10px 0 0;
  background: #fff;
}

.pv-picks {
  padding: 0 14px;
}

.pv-pick {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  border-bottom: 1px solid #f0f2f5;
  font-size: 13px;
}

.pv-pick:last-child {
  border-bottom: 0;
}

.pv-pick .k {
  width: 42px;
  color: #8b93a3;
  flex: none;
}

.pv-pick .v {
  flex: 1;
  color: #222;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pv-pick .ar,
.pv-review .ar {
  color: #c0c4cc;
}

.pv-review {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px;
}

.pv-review-t {
  font-size: 14px;
  font-weight: 700;
  color: #111;
}

.pv-review-s {
  margin-top: 4px;
  font-size: 12px;
  color: #8b93a3;
}

.pv-detail-card {
  padding: 14px 0 20px;
}

.pv-section-title {
  padding: 0 14px 10px;
  font-weight: 700;
  color: #111;
  font-size: 14px;
}

.pv-rich {
  padding: 0;
  font-size: 13px;
  line-height: 1.7;
  color: #334155;
  word-break: break-word;
}

.pv-rich :deep(p),
.pv-rich p {
  margin: 0.35em 14px;
}

.pv-rich :deep(p:has(> img:only-child)),
.pv-rich p:has(> img:only-child) {
  margin: 0 !important;
  padding: 0 !important;
  line-height: 0 !important;
  font-size: 0 !important;
}

.pv-rich :deep(img),
.pv-rich img {
  max-width: 100%;
  width: 100%;
  height: auto;
  display: block;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  vertical-align: top;
}

.pv-bottom {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 58px;
  padding: 0 10px;
  background: #fff;
  border-top: 1px solid #eee;
  box-shadow: 0 -6px 16px rgba(0, 0, 0, 0.04);
}

.pv-icon-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 40px;
  color: #666;
  font-size: 10px;
  line-height: 1.2;
  flex: none;
}

.pv-icon-btn .emoji {
  font-size: 16px;
  margin-bottom: 2px;
}

.pv-btn {
  flex: 1;
  height: 40px;
  border: 0;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 700;
  cursor: default;
}

.pv-btn-cart {
  color: #fff;
  background: linear-gradient(90deg, #ffb400, #ff9500);
}

.pv-btn-buy {
  color: #fff;
  background: linear-gradient(90deg, #ff785a, #ff5000);
}

.preview-hint {
  margin: 12px 0 0;
  text-align: center;
  color: #6b7b93;
  font-size: 12px;
}

@media (max-width: 1360px) {
  .editor-layout {
    grid-template-columns: 1fr;
  }

  .editor-aside {
    position: static;
  }

  .asset-card {
    order: -1;
  }

  .main-image-drop-inner {
    min-height: 260px;
  }
}

@media (max-width: 1180px) {
  .product-editor-page {
    padding: 20px;
  }

  .step-nav {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .section-card {
    padding: 20px;
  }
}

@media (max-width: 860px) {
  .product-editor-page {
    padding: 16px;
  }

  .page-header,
  .sticky-action-bar {
    align-items: stretch;
    flex-direction: column;
  }

  .page-actions,
  .footer-actions {
    justify-content: flex-start;
  }

  .step-nav,
  .category-sort-row {
    grid-template-columns: 1fr;
  }

  .segmented-control {
    display: grid;
    width: 100%;
  }

  .segment-item {
    width: 100%;
  }
}
</style>
