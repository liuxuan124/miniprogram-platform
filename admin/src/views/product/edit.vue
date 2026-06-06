<template>
  <div class="product-editor-page">
    <div class="product-editor-wrap">
      <header class="page-header">
        <div class="page-title-wrap">
          <el-button class="back-icon-btn" :icon="Back" circle @click="goBack" />
          <div>
            <div class="page-breadcrumb">商城管理 / 商品管理</div>
            <h1>{{ isEdit ? '编辑商品' : '新增商品' }}</h1>
          </div>
        </div>
        <div class="page-actions">
          <span v-if="hasUnsavedChanges" class="draft-pill">未保存</span>
          <span v-if="lastAutoSaveTime" class="autosave-text">自动保存 {{ formatTime(lastAutoSaveTime) }}</span>
          <el-button class="ghost-btn" @click="goBack">返回列表</el-button>
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

                <el-form-item label="商品类型" prop="productType" class="span-all">
                  <div class="segmented-control">
                    <button
                      v-for="t in typeOptions"
                      :key="t.value"
                      type="button"
                      class="segment-item"
                      :class="{ active: formData.productType === t.value }"
                      @click="formData.productType = t.value"
                    >
                      <span class="segment-icon">{{ t.icon }}</span>
                      <span>{{ t.label }}</span>
                    </button>
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
                  <el-input
                    v-model="formData.content"
                    type="textarea"
                    :rows="10"
                    placeholder="请输入商品详情（支持 HTML），建议包含规格、适用场景、发货与售后说明。"
                  />
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
                        <el-input-number v-model="row.stock" :min="0" size="small" controls-position="right" />
                      </template>
                    </el-table-column>
                    <el-table-column label="SKU 编码" min-width="160">
                      <template #default="{ row }">
                        <el-input v-model="row.sku_code" placeholder="自动生成" size="small" />
                      </template>
                    </el-table-column>
                    <el-table-column label="操作" width="72" fixed="right" align="center">
                      <template #default="{ $index }">
                        <el-button class="delete-icon-btn" :icon="Delete" circle text @click="removeSku($index)" />
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
                  <p>主图影响点击率，轮播图用于详情页展示。</p>
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
                    <el-button class="thumb-remove" type="danger" :icon="Delete" circle size="small" @click="removeImage(idx)" />
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
              <div class="status-hint">上线前请确认主图、SKU 价格和库存。保存后小程序端将按接口状态展示。</div>
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

    <AssetPickerDialog v-model="assetPickerVisible" @select="handleAssetSelected" />
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

/** 规格名称列表 */
const specNames = ref<{ name: string }[]>([{ name: '' }])

const formData = reactive({
  name: '',
  category_id: undefined as number | undefined,
  productType: 'physical' as string,
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
  main_image: [{ required: true, message: '请输入主图URL', trigger: 'blur' }],
}

const completionItems = computed(() => [
  { label: '填写商品名称', done: !!formData.name.trim() },
  { label: '选择商品分类', done: !!formData.category_id },
  { label: '上传商品主图', done: !!formData.main_image },
  { label: '添加至少 1 个 SKU', done: formData.skus.length > 0 },
  { label: '配置价格和库存', done: formData.skus.some((sku) => toNumber(sku.price, 0) > 0 && toNumber(sku.stock, 0) > 0) },
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
  return isEdit.value ? '编辑中' : '草稿'
})

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
    productType: formData.productType,
    mainImage: formData.main_image,
    images: formData.images,
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
  if (!formData.main_image) errors.push('上传商品主图')
  if (!formData.skus.length) errors.push('添加至少 1 个 SKU')
  if (formData.skus.some((sku) => toNumber(sku.price, 0) <= 0)) {
    errors.push('填写 SKU 销售价')
  }
  if (formData.productType !== 'digital' && formData.skus.every((sku) => toNumber(sku.stock, 0) <= 0)) {
    errors.push('配置可售库存')
  }
  return errors
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

/** 加载分类选项 */
async function fetchCategories() {
  try {
    const res = await getCategoryList()
    categoryOptions.value = res.data || []
  } catch { /* ignore */ }
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
    formData.productType = product.productType || product.product_type || 'physical'
    formData.main_image = product.mainImage ?? product.main_image ?? ''
    formData.images = Array.isArray(product.images) ? product.images : []
    formData.description = product.description || ''
    formData.content = product.detail ?? product.content ?? ''
    formData.sort = product.sortOrder ?? product.sort ?? 0
    formStatus.value = product.status || 'off_sale'
    formData.skus = Array.isArray(product.skus) ? product.skus.map((sku: any) => mapApiSkuToForm(sku)) : []

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

/** 添加图片 */
function addImage() {
  const url = newImageUrl.value.trim()
  if (!url) return
  if (!isImageLikeUrl(url)) {
    ElMessage.warning('请输入有效图片URL（http(s):// 或 /uploads/...）')
    return
  }
  formData.images.push(url)
  newImageUrl.value = ''
}

/** 移除图片 */
function removeImage(idx: number) {
  formData.images.splice(idx, 1)
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
    ElMessage.success('已选择商品主图')
    return
  }
  if (!formData.images.includes(url)) {
    formData.images.push(url)
  }
  ElMessage.success('已添加商品图片')
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
      ElMessage.success(publish ? '商品资料已保存' : '更新成功')
    } else {
      const res: any = await createProduct(payload as any)
      savedProductId = Number(res?.data?.id || 0)
      ElMessage.success(publish ? '商品草稿已创建' : '创建成功')
    }
    if (publish && savedProductId) {
      if (formStatus.value !== 'on_sale') {
        await onSaleProduct(savedProductId)
      }
      ElMessage.success('商品已保存并上线')
    }
    goBack()
  } catch {
    ElMessage.error('保存失败')
  } finally {
    submitting.value = false
  }
  // 保存成功后清除草稿
  clearDraft()
  hasUnsavedChanges.value = false
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
  background: #f5f7fb;
  color: #1d2129;
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
  border-bottom: 1px solid #e5e6eb;
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
  color: #86909c;
  font-size: 12px;
  line-height: 1.3;
}

.page-header h1 {
  margin: 0;
  color: #1d2129;
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
  color: #86909c;
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
  border: 1px solid #e5e6eb;
  border-radius: 8px;
  color: #86909c;
  background: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color .2s ease, color .2s ease, background .2s ease, box-shadow .2s ease;
}

.step-nav-item:hover {
  border-color: #1677ff;
  color: #1677ff;
}

.step-nav-item.current {
  border-color: #1677ff;
  color: #1677ff;
  background: #f0f7ff;
  box-shadow: 0 0 0 3px rgba(22, 119, 255, .08);
}

.step-nav-item.done {
  border-color: #1677ff;
  color: #1677ff;
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
  border-color: #1677ff;
}

.step-nav-item.done .step-dot {
  border-color: #1677ff;
  background: #1677ff;
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
  border: 1px solid #e5e6eb;
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
  background: #1677ff;
  font-size: 13px;
  font-weight: 800;
}

.section-head h2,
.side-card-title {
  margin: 0;
  color: #1d2129;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.35;
}

.section-head p {
  margin: 4px 0 0;
  color: #86909c;
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
  border: 1px solid #e5e6eb;
  border-radius: 8px;
  background: #f7f8fa;
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
  color: #4e5969;
  background: transparent;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: color .2s ease, background .2s ease, box-shadow .2s ease;
}

.segment-item.active {
  color: #fff;
  background: #1677ff;
  box-shadow: 0 6px 14px rgba(22, 119, 255, .24);
}

.segment-icon {
  font-size: 16px;
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
  color: #86909c;
  text-align: center;
}

.upload-empty :deep(.el-icon) {
  color: #1677ff;
  font-size: 30px;
}

.upload-empty strong {
  color: #1d2129;
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
  color: #1677ff;
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
  border: 1px solid #e5e6eb;
  border-radius: 8px;
  background: #f7f8fa;
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
  color: #86909c;
  min-height: 96px;
  cursor: pointer;
}

.gallery-add-tile :deep(.el-icon) {
  font-size: 22px;
}

.gallery-add-tile:hover {
  border-color: #1677ff;
  color: #1677ff;
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
  border: 1px solid #e5e6eb;
  border-radius: 8px;
}

.sku-table {
  width: 100%;
}

.money-input :deep(.el-input__prefix) {
  color: #86909c;
  font-weight: 700;
}

.delete-icon-btn {
  color: #86909c;
}

.delete-icon-btn:hover {
  color: #f53f3f;
  background: #fff1f0;
}

.sku-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 180px;
  color: #86909c;
}

.sku-empty strong {
  color: #1d2129;
  font-size: 15px;
}

.empty-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  color: #1677ff;
  background: #e8f3ff;
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
  color: #1677ff;
  background: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.add-row-btn:hover {
  border-color: #1677ff;
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
  color: #86909c;
  font-size: 13px;
}

.status-row strong {
  color: #1d2129;
  font-weight: 700;
}

.status-hint {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  color: #4e5969;
  background: #f7f8fa;
  font-size: 12px;
  line-height: 1.7;
}

.side-progress {
  gap: 14px;
}

.side-progress strong,
.footer-status strong {
  color: #1d2129;
  font-size: 14px;
}

.side-progress p,
.footer-status p {
  margin: 4px 0 0;
  color: #86909c;
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
  color: #1d2129;
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
  color: #4e5969;
  font-size: 12px;
}

.todo-list i,
.footer-todos i {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #f53f3f;
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
  color: #1d2129;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.4;
}

.product-editor-page :deep(.el-form-item__error) {
  padding-top: 5px;
  color: #f53f3f;
  font-size: 12px;
}

.product-editor-page :deep(.el-input__wrapper),
.product-editor-page :deep(.el-textarea__inner) {
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 0 0 1px #dcdfe6 inset;
}

.product-editor-page :deep(.el-input__wrapper:hover),
.product-editor-page :deep(.el-textarea__inner:hover) {
  box-shadow: 0 0 0 1px #b7c7dd inset;
}

.product-editor-page :deep(.el-input__wrapper.is-focus),
.product-editor-page :deep(.el-textarea__inner:focus) {
  box-shadow: 0 0 0 1px #1677ff inset, 0 0 0 3px rgba(22, 119, 255, .12);
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
  --el-button-bg-color: #1677ff;
  --el-button-border-color: #1677ff;
  --el-button-hover-bg-color: #0e63d6;
  --el-button-hover-border-color: #0e63d6;
  --el-button-active-bg-color: #0b55bd;
  --el-button-active-border-color: #0b55bd;
}

.product-editor-page :deep(.el-button.ghost-btn),
.product-editor-page :deep(.el-button.outline-btn) {
  color: #4e5969;
  border-color: #dcdfe6;
  background: #fff;
}

.product-editor-page :deep(.el-button.ghost-btn:hover),
.product-editor-page :deep(.el-button.outline-btn:hover) {
  color: #1677ff;
  border-color: #1677ff;
  background: #f0f7ff;
}

.product-editor-page :deep(.el-table th.el-table__cell) {
  color: #4e5969;
  background: #f7f8fa;
  font-size: 13px;
  font-weight: 700;
}

.product-editor-page :deep(.el-table td.el-table__cell) {
  vertical-align: middle;
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
