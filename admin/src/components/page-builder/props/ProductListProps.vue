<template>
  <div class="product-list-props">
    <el-form label-width="70px" size="small">
      <el-form-item label="标题">
        <el-input :model-value="data.title" @input="emit('update', { title: $event })" placeholder="模块标题" />
      </el-form-item>
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
      <el-form-item label="显示价格">
        <el-switch :model-value="data.show_price !== false" @change="emit('update', { show_price: $event as boolean })" />
      </el-form-item>
      <el-form-item label="显示销量">
        <el-switch :model-value="data.show_sales !== false" @change="emit('update', { show_sales: $event as boolean })" />
      </el-form-item>
      <el-form-item label="购物车">
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
      <TitleFontSizeFields
        :data="data"
        subtitle-label="元信息字号"
        :title-default="13"
        :subtitle-default="11"
        @update="(v) => emit('update', v)"
      />

      <div class="ds-card">
        <div class="ds-card__head">
          <span>展示哪些商品</span>
          <span class="ds-card__count">{{ liveLoading ? '读取中…' : `${liveItems.length} 件已上架` }}</span>
        </div>
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
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getCategoryList } from '@/api/product'
import { ComponentType, type ComponentInstance } from '@/types/page'
import TitleFontSizeFields from './TitleFontSizeFields.vue'
import { useEditorLiveItems } from '../composables/useEditorLiveItems'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const categoryOptions = ref<{ id: number | string; name: string }[]>([])

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

function patchQuery(patch: Record<string, any>) {
  const params = { ...queryParams.value, status: 'on_sale', ...patch }
  Object.keys(params).forEach((key) => {
    if (params[key] === '' || params[key] === null || params[key] === undefined) delete params[key]
  })
  emit('update', {
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

onMounted(async () => {
  try {
    const res = await getCategoryList()
    const payload = (res as any)?.data
    const list = Array.isArray(payload) ? payload : payload?.records || payload?.list || []
    categoryOptions.value = flattenCategories(list)
  } catch {
    categoryOptions.value = []
  }
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

