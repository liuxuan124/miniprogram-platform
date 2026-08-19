<template>
  <div class="product-list-props">
    <el-form label-width="70px" size="small">
      <div class="ds-hint ds-hint--block">
        标题请单独拖入「标题栏」组件放在本列表上方；本组件只渲染商品卡。
      </div>

      <el-divider content-position="left">商品展示</el-divider>
      <el-form-item label="布局">
        <el-radio-group :model-value="layoutValue" @change="onLayoutChange">
          <el-radio-button value="grid">宫格</el-radio-button>
          <el-radio-button value="list">列表</el-radio-button>
          <el-radio-button value="waterfall">瀑布流</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="layoutValue === 'grid'" label="列数">
        <el-radio-group :model-value="data.columns || 2" @change="emit('update', { columns: $event as number })">
          <el-radio :value="1">单列</el-radio>
          <el-radio :value="2">双列</el-radio>
          <el-radio :value="3">三列</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="商品卡圆角">
        <el-input-number
          :model-value="Number(data.item_border_radius ?? (layoutValue === 'list' ? 14 : 12))"
          :min="0"
          :max="40"
          controls-position="right"
          @change="(v: number | undefined) => emit('update', { item_border_radius: v ?? (layoutValue === 'list' ? 14 : 12) })"
        />
        <div class="ds-hint">单位 px；白色商品卡外框圆角</div>
      </el-form-item>
      <el-form-item label="图片圆角">
        <el-input-number
          :model-value="Number(data.image_border_radius ?? (layoutValue === 'list' ? 10 : 0))"
          :min="0"
          :max="40"
          controls-position="right"
          @change="(v: number | undefined) => emit('update', { image_border_radius: v ?? (layoutValue === 'list' ? 10 : 0) })"
        />
        <div class="ds-hint">单位 px；列表布局下正方形封面不贴边</div>
      </el-form-item>
      <el-form-item label="卡片间距">
        <el-input-number
          :model-value="Number(data.item_gap ?? (layoutValue === 'list' ? 10 : 8))"
          :min="0"
          :max="48"
          controls-position="right"
          @change="(v: number | undefined) => emit('update', { item_gap: v ?? (layoutValue === 'list' ? 10 : 8) })"
        />
        <div class="ds-hint">单位 px；控制商品卡之间的空隙</div>
      </el-form-item>
      <el-form-item label="商品名加粗">
        <el-switch :model-value="data.title_bold !== false" @change="emit('update', { title_bold: $event as boolean })" />
      </el-form-item>
      <el-form-item label="显示价格">
        <el-switch :model-value="data.show_price !== false" @change="emit('update', { show_price: $event as boolean })" />
      </el-form-item>
      <el-form-item label="显示销量">
        <el-switch :model-value="data.show_sales !== false" @change="emit('update', { show_sales: $event as boolean })" />
      </el-form-item>
      <el-form-item v-if="layoutValue === 'list'" label="显示评分">
        <el-switch :model-value="data.show_rating !== false" @change="emit('update', { show_rating: $event as boolean })" />
        <div class="ds-hint">列表布局：价格旁显示 ⭐ 评分 · N 评价</div>
      </el-form-item>
      <el-form-item v-if="layoutValue !== 'list'" label="购物车">
        <el-switch :model-value="data.show_cart !== false" @change="emit('update', { show_cart: $event as boolean })" />
      </el-form-item>
      <el-form-item label="显示数量">
        <el-input-number
          :model-value="data.limit"
          @change="emit('update', { limit: $event as number })"
          :min="1"
          :max="50"
          controls-position="right"
        />
      </el-form-item>
      <el-form-item label="商品标题字号">
        <el-input-number
          :model-value="data.title_font_size ?? 14"
          :min="8"
          :max="48"
          controls-position="right"
          @change="(v: number) => emit('update', { title_font_size: v })"
        />
      </el-form-item>
      <el-form-item label="价格字号">
        <el-input-number
          :model-value="data.price_font_size ?? 13"
          :min="8"
          :max="36"
          controls-position="right"
          @change="(v: number) => emit('update', { price_font_size: v })"
        />
      </el-form-item>
      <el-form-item label="已售字号">
        <el-input-number
          :model-value="data.sales_font_size ?? 11"
          :min="8"
          :max="36"
          controls-position="right"
          @change="(v: number) => emit('update', { sales_font_size: v })"
        />
      </el-form-item>

      <div class="ds-card">
        <div class="ds-card__head">
          <span>展示哪些商品</span>
          <span class="ds-card__count">
            {{ sourceMode === 'manual'
              ? `已选 ${selectedProductIds.length} 件`
              : (liveLoading ? '读取中…' : `${liveItems.length} 件已上架`) }}
          </span>
        </div>
        <el-form-item label="选取方式">
          <el-radio-group :model-value="sourceMode" @change="onSourceModeChange">
            <el-radio-button value="auto">按规则</el-radio-button>
            <el-radio-button value="manual">手动选择</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <template v-if="sourceMode === 'manual'">
          <el-form-item label="选择商品">
            <el-select
              :model-value="selectedProductIds"
              multiple
              filterable
              clearable
              collapse-tags
              collapse-tags-tooltip
              placeholder="请选择要展示的商品"
              style="width: 100%"
              :loading="productOptionsLoading"
              @change="onProductIdsChange"
            >
              <el-option
                v-for="item in productOptions"
                :key="String(item.id)"
                :label="`${item.name} ¥${item.price}`"
                :value="String(item.id)"
              />
            </el-select>
            <div class="ds-hint">可多选；画布按勾选顺序展示（受「显示数量」限制）</div>
          </el-form-item>
          <div v-if="selectedProductIds.length" class="ds-preview">
            <div v-for="item in selectedPreviewItems" :key="String(item.id)" class="ds-chip">
              <span class="ds-chip__name">{{ item.name }}</span>
              <span class="ds-chip__price">¥{{ item.price }}</span>
            </div>
          </div>
          <div v-else class="ds-empty">还没选商品，请在上方勾选</div>
        </template>

        <template v-else>
          <el-form-item label="商品分类">
            <el-select
              :model-value="queryParams.category_id ?? ''"
              clearable
              filterable
              placeholder="全部分类"
              style="width: 100%"
              @change="(v: string | number) => patchQuery({ category_id: v || undefined })"
            >
              <el-option label="全部分类" value="" />
              <el-option v-for="item in categoryOptions" :key="item.id" :label="item.name" :value="item.id" />
            </el-select>
            <div v-if="!categoryOptions.length" class="ds-hint">还没有分类，可先到商品管理创建</div>
          </el-form-item>
          <el-form-item label="商品类型">
            <el-select
              :model-value="queryParams.product_type || ''"
              clearable
              placeholder="全部类型"
              style="width: 100%"
              @change="(v: string) => patchQuery({ product_type: v || undefined })"
            >
              <el-option label="全部类型" value="" />
              <el-option label="实物商品" value="physical" />
              <el-option label="虚拟商品" value="digital" />
              <el-option label="服务商品" value="service" />
            </el-select>
          </el-form-item>
          <el-form-item label="排序方式">
            <el-select :model-value="sortBy" @change="onSortByChange" style="width: 100%">
              <el-option label="按销量排序" value="sales" />
              <el-option label="最新上架" value="newest" />
              <el-option label="价格从低到高" value="price_asc" />
              <el-option label="价格从高到低" value="price_desc" />
            </el-select>
          </el-form-item>
          <div v-if="liveItems.length" class="ds-preview">
            <div v-for="item in liveItems.slice(0, 3)" :key="item.id || item.name" class="ds-chip">
              <span class="ds-chip__name">{{ item.name }}</span>
              <span class="ds-chip__price">¥{{ item.price }}</span>
            </div>
            <div v-if="liveItems.length > 3" class="ds-more">画布还会再显示 {{ liveItems.length - 3 }} 件</div>
          </div>
          <div v-else-if="!liveLoading" class="ds-empty">当前筛选下没有已上架商品，画布会显示空态</div>
        </template>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getCategoryList, getProductList } from '@/api/product'
import { ComponentType, type ComponentInstance } from '@/types/page'
import { useEditorLiveItems } from '../composables/useEditorLiveItems'

type ProductOption = {
  id: string | number
  name: string
  price: string | number
  sales?: number
  image?: string
  status?: string
}

const DEMO_OPTIONS: ProductOption[] = [
  { id: 'demo-1', name: '跨境通用知识库', price: '199.00', sales: 128, status: 'on_sale' },
  { id: 'demo-2', name: '跨境财税知识库', price: '299.00', sales: 86, status: 'on_sale' },
]

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const categoryOptions = ref<{ id: number | string; name: string }[]>([])
const productOptions = ref<ProductOption[]>([])
const productOptionsLoading = ref(false)

const feedComponent = computed<ComponentInstance>(() => ({
  id: 'props-product-list',
  type: ComponentType.ProductList,
  props: data,
}))

const { items: liveItems, loading: liveLoading } = useEditorLiveItems(
  () => feedComponent.value,
  () => false,
)

const layoutValue = computed(() => {
  const raw = data.layout || 'grid'
  return ['grid', 'list', 'waterfall'].includes(raw) ? raw : 'grid'
})

const sourceMode = computed(() => (data.source_mode === 'manual' ? 'manual' : 'auto'))

const selectedProductIds = computed(() => {
  const raw = data.product_ids
  if (Array.isArray(raw)) return raw.map((id) => String(id))
  const fromDs = data.data_source?.params?.ids ?? data.data_source?.query?.ids
  if (typeof fromDs === 'string' && fromDs.trim()) {
    return fromDs.split(',').map((s: string) => s.trim()).filter(Boolean)
  }
  if (Array.isArray(fromDs)) return fromDs.map((id: any) => String(id))
  return []
})

const selectedPreviewItems = computed(() => {
  const map = new Map(productOptions.value.map((p) => [String(p.id), p]))
  return selectedProductIds.value
    .map((id) => map.get(String(id)))
    .filter(Boolean) as ProductOption[]
})

const queryParams = computed(() => {
  const ds = data.data_source || {}
  return { ...(ds.query || {}), ...(ds.params || {}), ...(ds.config?.params || {}) }
})

const sortBy = computed(() => queryParams.value.sort_by || 'sales')

function flattenCategories(nodes: any[], prefix = ''): { id: number | string; name: string }[] {
  const out: { id: number | string; name: string }[] = []
  for (const node of Array.isArray(nodes) ? nodes : []) {
    const id = node.id
    const name = String(node.name || '')
    if (id == null) continue
    const label = prefix ? `${prefix} / ${name}` : name
    out.push({ id, name: label })
    if (Array.isArray(node.children) && node.children.length) {
      out.push(...flattenCategories(node.children, label))
    }
  }
  return out
}

function toOption(item: any): ProductOption | null {
  if (!item) return null
  const id = item.id
  if (id == null || id === '') return null
  return {
    id,
    name: item.name || item.title || '未命名商品',
    price: item.price ?? '0.00',
    sales: Number(item.sales ?? item.salesCount ?? 0) || 0,
    image: item.image || item.cover || item.mainImage || item.coverImage || '',
    status: item.status || 'on_sale',
  }
}

function patchQuery(patch: Record<string, any>) {
  const params = { ...queryParams.value, status: 'on_sale', ...patch }
  delete params.ids
  Object.keys(params).forEach((key) => {
    if (params[key] === '' || params[key] === null || params[key] === undefined) delete params[key]
  })
  emit('update', {
    source_mode: 'auto',
    product_ids: [],
    data_source: {
      type: 'product',
      params,
      query: params,
    },
  })
}

function onLayoutChange(val: string) {
  const patch: Record<string, any> = { layout: val }
  if (val === 'list') patch.columns = 1
  if (val === 'waterfall') patch.columns = 2
  emit('update', patch)
}

function onSortByChange(val: string) {
  patchQuery({
    sort_by: val,
    sort_order: val === 'price_asc' ? 'asc' : 'desc',
  })
}

function onSourceModeChange(val: string) {
  if (val === 'manual') {
    emit('update', {
      source_mode: 'manual',
      product_ids: selectedProductIds.value,
    })
    return
  }
  patchQuery({})
}

function onProductIdsChange(ids: string[]) {
  const uniq = Array.from(new Set((ids || []).map((id) => String(id))))
  const map = new Map(productOptions.value.map((p) => [String(p.id), p]))
  const items = uniq
    .map((id) => map.get(id))
    .filter(Boolean)
    .map((p) => ({
      id: p!.id,
      name: p!.name,
      title: p!.name,
      price: String(p!.price),
      sales: p!.sales ?? 0,
      image: p!.image || '',
    }))
  emit('update', {
    source_mode: 'manual',
    product_ids: uniq,
    items,
    data_source: {
      type: 'product',
      params: { status: 'on_sale', ids: uniq.join(',') },
      query: { status: 'on_sale', ids: uniq.join(',') },
    },
  })
}

async function loadProductOptions() {
  productOptionsLoading.value = true
  try {
    const res = await getProductList({ current: 1, size: 100, status: 'on_sale' } as any)
    const payload = (res as any)?.data
    const list = Array.isArray(payload) ? payload : payload?.records || payload?.list || []
    const options = list.map(toOption).filter(Boolean) as ProductOption[]
    // 保留当前已选项 / 演示项，避免接口失败或下架后选项丢失
    const existing = [
      ...DEMO_OPTIONS,
      ...((Array.isArray(data.items) ? data.items : []).map(toOption).filter(Boolean) as ProductOption[]),
      ...options,
    ]
    const map = new Map<string, ProductOption>()
    existing.forEach((p) => {
      if (!map.has(String(p.id))) map.set(String(p.id), p)
    })
    productOptions.value = Array.from(map.values())
  } catch {
    const existing = [
      ...DEMO_OPTIONS,
      ...((Array.isArray(data.items) ? data.items : []).map(toOption).filter(Boolean) as ProductOption[]),
    ]
    const map = new Map<string, ProductOption>()
    existing.forEach((p) => {
      if (!map.has(String(p.id))) map.set(String(p.id), p)
    })
    productOptions.value = Array.from(map.values())
  } finally {
    productOptionsLoading.value = false
  }
}

onMounted(async () => {
  try {
    const res = await getCategoryList()
    const payload = (res as any)?.data
    const list = Array.isArray(payload) ? payload : payload?.records || payload?.list || []
    categoryOptions.value = flattenCategories(list)
  } catch {
    categoryOptions.value = []
  }
  await loadProductOptions()
})
</script>

<style scoped lang="scss">
.ds-card {
  margin-top: 8px;
  padding: 10px 10px 8px;
  background: #f8fafc;
  border: 1px solid #e3e8f0;
  border-radius: 10px;
}

.ds-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #334155;
  font-size: 12px;
  font-weight: 600;
}

.ds-card__count {
  color: #1769ff;
  font-weight: 500;
}

.ds-hint,
.ds-empty,
.ds-more {
  margin: 0 0 8px;
  color: #7b8798;
  font-size: 11px;
  line-height: 1.4;
}

.ds-hint--block {
  margin: 0 0 12px;
  padding: 8px 10px;
  background: #f5f7fb;
  border-radius: 6px;
}

.ds-preview {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
}

.ds-chip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px;
  background: #fff;
  border: 1px solid #edf1f7;
  border-radius: 8px;
}

.ds-chip__name {
  min-width: 0;
  overflow: hidden;
  color: #172033;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ds-chip__price {
  flex-shrink: 0;
  color: #e11d48;
  font-size: 12px;
  font-weight: 600;
}
</style>

