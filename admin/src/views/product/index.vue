<template>
  <div class="product-page">
    <PageHeader
      kicker="商城管理 / 商品管理"
      title="商品管理"
      description="统一管理实物、数字权益和服务类商品，完成创建、上架、下架和库存巡检。"
    >
      <template #actions>
        <el-button @click="handleRefresh">刷新</el-button>
        <el-button @click="openCategoryPage">分类管理</el-button>
        <el-button type="primary" @click="handleCreate">新建商品</el-button>
      </template>
    </PageHeader>

    <section class="stat-grid">
      <div class="stat-card">
        <span>商品总数</span>
        <strong>{{ overviewStats.total }}</strong>
        <p>全量商品</p>
      </div>
      <div class="stat-card">
        <span>已上架</span>
        <strong>{{ overviewStats.onSale }}</strong>
        <p>小程序可见</p>
      </div>
      <div class="stat-card">
        <span>草稿 / 下架</span>
        <strong>{{ overviewStats.draft + overviewStats.offSale }}</strong>
        <p>草稿 {{ overviewStats.draft }} · 下架 {{ overviewStats.offSale }}</p>
      </div>
      <div class="stat-card warning">
        <span>低库存</span>
        <strong>{{ overviewStats.lowStock }}</strong>
        <p>非数字商品且库存 &lt; 10</p>
      </div>
    </section>

    <section class="filter-panel">
      <div class="filter-grid">
        <el-input
          v-model="searchForm.keyword"
          placeholder="搜索商品名称"
          clearable
          @keyup.enter="handleSearch"
        />
        <el-select v-model="searchForm.categoryId" placeholder="商品分类" clearable>
          <el-option
            v-for="item in flatCategoryOptions"
            :key="item.id"
            :label="item.label"
            :value="item.id"
          />
        </el-select>
        <el-select v-model="searchForm.productType" placeholder="商品类型" clearable>
          <el-option label="实物商品" value="physical" />
          <el-option label="数字商品" value="digital" />
          <el-option label="服务商品" value="service" />
        </el-select>
        <el-select v-model="searchForm.status" placeholder="商品状态" clearable>
          <el-option label="已上架" value="on_sale" />
          <el-option label="已下架" value="off_sale" />
          <el-option label="草稿" value="draft" />
        </el-select>
      </div>
      <div class="filter-actions">
        <el-button @click="resetSearch">重置</el-button>
        <el-button type="primary" @click="handleSearch">查询</el-button>
      </div>
    </section>

    <section class="table-panel">
      <div class="table-toolbar">
        <div>
          <strong>商品列表</strong>
          <span v-if="selectedRows.length">已选择 {{ selectedRows.length }} 项</span>
        </div>
        <div class="batch-actions">
          <el-button :disabled="!selectedRows.length" @click="batchToggleSale('on_sale')">批量上架</el-button>
          <el-button :disabled="!selectedRows.length" @click="batchToggleSale('off_sale')">批量下架</el-button>
          <el-button :disabled="!selectedRows.length" type="danger" plain @click="batchDelete">批量删除</el-button>
        </div>
      </div>

      <ListStateWrap
        :loading="loading"
        :empty="!loading && tableData.length === 0"
        empty-text="暂无商品数据"
        empty-description="可以新建商品，或调整筛选条件后重新查询"
        :skeleton-rows="pagination.pageSize > 10 ? 8 : 6"
        @retry="fetchList"
      >
        <template #empty-action>
          <el-button type="primary" @click="handleCreate">新建商品</el-button>
        </template>

        <el-table
          :data="tableData"
          stripe
          row-key="id"
          class="product-table"
          table-layout="auto"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="44" />
          <el-table-column label="商品" min-width="200">
            <template #default="{ row }">
              <div class="product-cell">
                <div class="product-cover" :class="{ empty: !row.mainImage }">
                  <el-image v-if="row.mainImage" :src="row.mainImage" fit="cover" />
                  <span v-else>{{ row.icon }}</span>
                </div>
                <div class="product-info">
                  <div class="product-name-line">
                    <span class="name" :title="row.name">{{ row.name }}</span>
                    <el-tag
                      v-for="t in (row.productTypes || [row.productType])"
                      :key="t"
                      size="small"
                      effect="plain"
                      :type="productTypeTagType(t)"
                    >
                      {{ productTypeLabel(t) }}
                    </el-tag>
                  </div>
                  <div class="meta-line">
                    <span>ID {{ row.id }}</span>
                    <span>{{ row.categoryName || '未分类' }}</span>
                    <span>销量 {{ row.sales }}</span>
                  </div>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="价格" width="100" align="right">
            <template #default="{ row }">
              <span class="price">¥{{ row.price.toFixed(2) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="库存" width="72" align="center">
            <template #default="{ row }">
              <span :class="{ 'stock-warning': isLowStock(row) }">
                {{ formatStockLabel(row) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="88" align="center">
            <template #default="{ row }">
              <el-tag :type="statusTagType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="更新时间" width="148" align="center">
            <template #default="{ row }">
              {{ row.updatedAt || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="168" align="right">
            <template #default="{ row }">
              <div class="row-actions">
                <el-button link type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
                <el-button
                  link
                  size="small"
                  :type="row.status === 'on_sale' ? 'warning' : 'success'"
                  @click="toggleOnSale(row)"
                >
                  {{ row.status === 'on_sale' ? '下架' : '上架' }}
                </el-button>
                <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-wrap">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.pageSize"
            :total="pagination.total"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="fetchList"
            @current-change="fetchList"
          />
        </div>
      </ListStateWrap>
    </section>

  </div>
</template>

<script setup lang="ts">
import { computed, onActivated, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import ListStateWrap from '@/components/ListStateWrap.vue'
import {
  deleteProduct,
  getCategoryList,
  getProductList,
  getProductStats,
  offSaleProduct,
  onSaleProduct,
} from '@/api/product'

interface ProductRow {
  id: number
  name: string
  icon: string
  mainImage: string
  categoryId?: number
  categoryName: string
  productType: 'physical' | 'digital' | 'service'
  productTypes: Array<'physical' | 'digital' | 'service'>
  price: number
  stock: number
  sales: number
  status: 'draft' | 'on_sale' | 'off_sale'
  updatedAt: string
}

interface CategoryNode {
  id: number
  name: string
  children: CategoryNode[]
}

const router = useRouter()
const loading = ref(false)
const tableData = ref<ProductRow[]>([])
const selectedRows = ref<ProductRow[]>([])
const categoryTree = ref<CategoryNode[]>([])

const searchForm = reactive({
  keyword: '',
  categoryId: undefined as number | undefined,
  productType: '' as '' | 'physical' | 'digital' | 'service',
  status: '' as '' | 'draft' | 'on_sale' | 'off_sale',
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

const overviewStats = reactive({
  total: 0,
  onSale: 0,
  draft: 0,
  offSale: 0,
  lowStock: 0,
})

async function handleRefresh() {
  await Promise.all([fetchList(), fetchStats()])
}

async function fetchStats() {
  try {
    const res: any = await getProductStats()
    const data = res?.data || {}
    overviewStats.total = Number(data.total || 0)
    overviewStats.onSale = Number(data.onSale || 0)
    overviewStats.draft = Number(data.draft || 0)
    overviewStats.offSale = Number(data.offSale || 0)
    overviewStats.lowStock = Number(data.lowStock || 0)
  } catch {
    /* ignore */
  }
}

function normalizeCategory(raw: any): CategoryNode {
  return {
    id: Number(raw.id),
    name: raw.name || '未命名分类',
    children: Array.isArray(raw.children) ? raw.children.map((c: any) => normalizeCategory(c)) : [],
  }
}

const flatCategoryOptions = computed(() => {
  const output: Array<{ id: number; label: string }> = []
  const walk = (arr: CategoryNode[], prefix = '') => {
    arr.forEach((item) => {
      output.push({ id: item.id, label: `${prefix}${item.name}` })
      if (item.children.length) walk(item.children, `${prefix}└ `)
    })
  }
  walk(categoryTree.value)
  return output
})

function inferType(raw: any): 'physical' | 'digital' | 'service' {
  const list = Array.isArray(raw.productTypes)
    ? raw.productTypes
    : (raw.productType || raw.product_type ? [raw.productType || raw.product_type] : [])
  const v = `${list[0] || ''}`.toLowerCase()
  if (v.includes('digital') || v.includes('数字')) return 'digital'
  if (v.includes('service') || v.includes('服务')) return 'service'
  return 'physical'
}

function normalizeStatus(raw: any): 'draft' | 'on_sale' | 'off_sale' {
  const v = `${raw.status || ''}`.toLowerCase()
  if (v === 'on_sale' || v === 'on' || v === '1') return 'on_sale'
  if (v === 'off_sale' || v === 'off' || v === '0') return 'off_sale'
  return 'draft'
}

function pickEmoji(type: 'physical' | 'digital' | 'service'): string {
  if (type === 'digital') return '💳'
  if (type === 'service') return '🧩'
  return '🛍️'
}

function isDigitalOnlyRow(row: ProductRow) {
  const types = row.productTypes?.length
    ? row.productTypes
    : row.productType
      ? [row.productType]
      : []
  return types.length > 0 && types.every((t) => t === 'digital')
}

/** 无限 / 无 / 数字 */
function formatStockLabel(row: ProductRow) {
  if (isDigitalOnlyRow(row)) return '无限'
  const n = Number(row.stock)
  if (!Number.isFinite(n) || n <= 0) return '无'
  return String(n)
}

function isLowStock(row: ProductRow) {
  if (isDigitalOnlyRow(row)) return false
  const n = Number(row.stock)
  return Number.isFinite(n) && n > 0 && n < 10
}

function formatDate(raw: any) {
  const value = raw?.updatedAt ?? raw?.updated_at ?? raw?.updateTime ?? raw?.createdAt ?? raw?.created_at ?? ''
  return String(value || '').replace('T', ' ').slice(0, 16)
}

function normalizeProduct(raw: any): ProductRow {
  const typesRaw = Array.isArray(raw.productTypes)
    ? raw.productTypes
    : (raw.productType || raw.product_type ? [raw.productType || raw.product_type] : ['physical'])
  const productTypes = typesRaw.map((t: string) => {
    const v = `${t}`.toLowerCase()
    if (v.includes('digital')) return 'digital'
    if (v.includes('service')) return 'service'
    return 'physical'
  }) as Array<'physical' | 'digital' | 'service'>
  const productType = productTypes[0] || inferType(raw)
  const minPrice = Number(raw.min_price ?? raw.minPrice ?? raw.price ?? 0)
  const maxPrice = Number(raw.max_price ?? raw.maxPrice ?? raw.price ?? minPrice)
  const price = Number.isFinite(minPrice) && minPrice > 0 ? minPrice : maxPrice || 0
  const stock = Number(raw.total_stock ?? raw.totalStock ?? raw.stock ?? 0)
  const sales = Number(raw.sales ?? raw.sales_count ?? raw.saleCount ?? 0)

  return {
    id: Number(raw.id),
    name: raw.name || '未命名商品',
    icon: pickEmoji(productType),
    mainImage: raw.main_image || raw.mainImage || raw.cover || raw.image || '',
    categoryId: Number(raw.category_id ?? raw.categoryId) || undefined,
    categoryName: raw.category_name || raw.categoryName || '未分类',
    productType,
    productTypes,
    price,
    stock,
    sales,
    status: normalizeStatus(raw),
    updatedAt: formatDate(raw),
  }
}

async function fetchCategories() {
  try {
    const res = await getCategoryList()
    const data = (res as any).data || []
    categoryTree.value = Array.isArray(data) ? data.map((item: any) => normalizeCategory(item)) : []
  } catch {
    categoryTree.value = []
  }
}

async function fetchList() {
  loading.value = true
  try {
    const params = {
      current: pagination.page,
      size: pagination.pageSize,
      page: pagination.page,
      page_size: pagination.pageSize,
      keyword: searchForm.keyword || undefined,
      categoryId: searchForm.categoryId,
      category_id: searchForm.categoryId,
      productType: searchForm.productType || undefined,
      status: searchForm.status || undefined,
    }
    const res = await getProductList(params as any)
    const data = (res as any).data || {}
    const list = data.records || data.list || data.items || []
    tableData.value = Array.isArray(list) ? list.map((item: any) => normalizeProduct(item)) : []
    pagination.total = Number(data.total || tableData.value.length || 0)
  } catch {
    tableData.value = []
    pagination.total = 0
    ElMessage.error('获取商品列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  fetchList()
}

function resetSearch() {
  searchForm.keyword = ''
  searchForm.categoryId = undefined
  searchForm.productType = ''
  searchForm.status = ''
  handleSearch()
}

function handleSelectionChange(rows: ProductRow[]) {
  selectedRows.value = rows
}

function openCategoryPage() {
  router.push({ name: 'CommerceProductCategory' })
}

const LIST_STATE_KEY = 'product_list_state'

function saveListState() {
  sessionStorage.setItem(LIST_STATE_KEY, JSON.stringify({
    page: pagination.page,
    pageSize: pagination.pageSize,
    searchForm: { ...searchForm },
  }))
}

function restoreListState() {
  try {
    const raw = sessionStorage.getItem(LIST_STATE_KEY)
    if (!raw) return
    const saved = JSON.parse(raw)
    if (saved.page) pagination.page = saved.page
    if (saved.pageSize) pagination.pageSize = saved.pageSize
    if (saved.searchForm) Object.assign(searchForm, saved.searchForm)
    sessionStorage.removeItem(LIST_STATE_KEY)
  } catch {
    // ignore
  }
}

function handleCreate() {
  saveListState()
  router.push({ name: 'ProductEdit' })
}

function handleEdit(row: ProductRow) {
  saveListState()
  router.push({ name: 'ProductEdit', params: { id: row.id } })
}

async function toggleOnSale(row: ProductRow) {
  try {
    if (row.status === 'on_sale') {
      await offSaleProduct(row.id)
      ElMessage.success('已下架')
    } else {
      await onSaleProduct(row.id)
      ElMessage.success('已上架')
    }
    await Promise.all([fetchList(), fetchStats()])
  } catch (err: any) {
    ElMessage.error(err?.message || '操作失败')
  }
}

async function batchToggleSale(target: 'on_sale' | 'off_sale') {
  if (!selectedRows.value.length) return
  try {
    await ElMessageBox.confirm(
      `确定${target === 'on_sale' ? '上架' : '下架'}选中的 ${selectedRows.value.length} 个商品吗？`,
      '批量操作确认',
      { type: 'warning' }
    )
    const requests = selectedRows.value.map((row) =>
      target === 'on_sale' ? onSaleProduct(row.id) : offSaleProduct(row.id)
    )
    const results = await Promise.allSettled(requests)
    const failed = results.filter((r) => r.status === 'rejected').length
    if (failed) {
      ElMessage.warning(`完成 ${results.length - failed} 个，失败 ${failed} 个`)
    } else {
      ElMessage.success('批量操作成功')
    }
    await Promise.all([fetchList(), fetchStats()])
  } catch (error) {
    if (error !== 'cancel') ElMessage.error('批量操作失败')
  }
}

async function handleDelete(row: ProductRow) {
  try {
    await ElMessageBox.confirm(`确定删除商品「${row.name}」吗？删除后不可恢复。`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    await deleteProduct(row.id)
    ElMessage.success('删除成功')
    await Promise.all([fetchList(), fetchStats()])
  } catch (error) {
    if (error !== 'cancel') ElMessage.error('删除失败')
  }
}

async function batchDelete() {
  if (!selectedRows.value.length) return
  try {
    await ElMessageBox.confirm(`确定删除选中的 ${selectedRows.value.length} 个商品吗？`, '批量删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    await Promise.all(selectedRows.value.map((row) => deleteProduct(row.id)))
    ElMessage.success('批量删除成功')
    await Promise.all([fetchList(), fetchStats()])
  } catch (error) {
    if (error !== 'cancel') ElMessage.error('批量删除失败')
  }
}

function productTypeLabel(type: string) {
  if (type === 'digital') return '数字'
  if (type === 'service') return '服务'
  return '实物'
}

function productTypeTagType(type: string) {
  if (type === 'digital') return 'primary'
  if (type === 'service') return 'warning'
  return 'success'
}

function statusLabel(status: ProductRow['status']) {
  if (status === 'on_sale') return '已上架'
  if (status === 'off_sale') return '已下架'
  return '草稿'
}

function statusTagType(status: ProductRow['status']) {
  if (status === 'on_sale') return 'success'
  if (status === 'off_sale') return 'warning'
  return 'info'
}

onMounted(async () => {
  restoreListState()
  await fetchCategories()
  await Promise.all([fetchList(), fetchStats()])
})

onActivated(async () => {
  await Promise.all([fetchList(), fetchStats()])
})
</script>

<style scoped lang="scss">
.product-page {
  padding: 4px 4px 24px;
  background: transparent;

  .filter-panel,
  .table-panel,
  .stat-card {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-elevated);
  }

  .hero-actions,
  .filter-actions,
  .batch-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  }

  .stat-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    margin: 14px 0;
  }

  .stat-card {
    padding: var(--space-4) 18px;
    box-shadow: var(--shadow-sm);

    span {
      color: var(--text-muted);
      font-size: var(--font-caption);
    }

    strong {
      display: block;
      margin-top: var(--space-2);
      color: var(--text);
      font-size: 26px;
      line-height: 1;
    }

    p {
      margin: var(--space-2) 0 0;
      color: var(--text-muted);
      font-size: var(--font-caption);
    }

    &.warning strong {
      color: var(--danger);
    }
  }

  .filter-panel {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 14px;
    padding: 14px;
  }

  .filter-grid {
    display: grid;
    grid-template-columns: minmax(220px, 1.4fr) repeat(3, minmax(150px, 1fr));
    gap: 10px;
    flex: 1;
  }

  .table-panel {
    padding: 14px;
    overflow-x: auto;
  }

  .product-table {
    width: 100%;

    :deep(.el-table__inner-wrapper::before) {
      display: none;
    }

    :deep(.el-table__body),
    :deep(.el-table__header) {
      width: 100% !important;
    }
  }

  .table-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 12px;

    strong {
      color: var(--text);
      font-size: var(--font-h3);
    }

    span {
      margin-left: var(--space-2);
      color: var(--text-muted);
      font-size: var(--font-caption);
    }
  }

  .product-cell {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .product-cover {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 48px;
    height: 48px;
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-page);
    font-size: 20px;

    :deep(.el-image) {
      width: 100%;
      height: 100%;
    }
  }

  .product-info {
    min-width: 0;
  }

  .product-name-line {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
  }

  .name {
    overflow: hidden;
    color: var(--text);
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .meta-line {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: var(--space-1);
    color: var(--text-muted);
    font-size: var(--font-caption);
  }

  .price {
    color: var(--danger);
    font-weight: 800;
  }

  .stock-warning {
    color: var(--danger);
    font-weight: 700;
  }

  .row-actions {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: nowrap;
    gap: 2px;
    white-space: nowrap;
  }

  .pagination-wrap {
    display: flex;
    justify-content: flex-end;
    margin-top: var(--space-4);
  }

  :deep(.el-button) {
    border-radius: var(--radius-sm);
    font-weight: 700;
  }

  :deep(.el-table th.el-table__cell) {
    color: var(--text-secondary);
    background: var(--bg-page);
    font-weight: 700;
  }

  :deep(.el-input__wrapper),
  :deep(.el-select__wrapper) {
    border-radius: var(--radius-sm);
  }
}

@media (max-width: 1180px) {
  .product-page {
    .stat-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .filter-panel,
    .table-toolbar {
      align-items: stretch;
      flex-direction: column;
    }

    .filter-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
}

@media (max-width: 720px) {
  .product-page {
    padding: 16px;

    .stat-grid,
    .filter-grid {
      grid-template-columns: 1fr;
    }
  }
}
</style>
