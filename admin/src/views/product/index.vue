<template>
  <div class="product-page">
    <header class="page-head">
      <div>
        <h1>商品</h1>
        <p>资料包、咨询与实物，统一上架和下架</p>
      </div>
      <div class="page-head__actions">
        <el-button @click="openCategoryPage">分类</el-button>
        <el-button @click="exportCsv">导出</el-button>
        <el-button type="primary" @click="handleCreate">新建商品</el-button>
      </div>
    </header>

    <el-row :gutter="12" class="stat-cards">
      <el-col :span="6">
        <div class="stat-card">
          <span class="stat-label">近30天销售额</span>
          <strong>¥{{ Number(overviewStats.salesLast30Days || 0).toFixed(2) }}</strong>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <span class="stat-label">本月订单</span>
          <strong>{{ overviewStats.ordersThisMonth || 0 }}</strong>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <span class="stat-label">在售商品</span>
          <strong>{{ overviewStats.onSale }}</strong>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <span class="stat-label">详情转化率</span>
          <strong>{{ Number(overviewStats.detailConversionRate || 0).toFixed(1) }}%</strong>
        </div>
      </el-col>
    </el-row>

    <div class="type-tabs">
      <button type="button" :class="{ on: !typeTab }" @click="applyTypeTab('')">全部类型</button>
      <button type="button" :class="{ on: typeTab === 'virtual' }" @click="applyTypeTab('virtual')">虚拟</button>
      <button type="button" :class="{ on: typeTab === 'physical' }" @click="applyTypeTab('physical')">实物</button>
      <button type="button" :class="{ on: typeTab === 'membership' }" @click="applyTypeTab('membership')">会员社群</button>
      <button type="button" :class="{ on: typeTab === 'off_sale' }" @click="applyTypeTab('off_sale')">已下架</button>
    </div>

    <div class="status-tabs">
      <button type="button" :class="{ on: !searchForm.status }" @click="applyStatusFilter('')">
        全部 <b>{{ overviewStats.total }}</b>
      </button>
      <button type="button" :class="{ on: searchForm.status === 'on_sale' }" @click="applyStatusFilter('on_sale')">
        在售 <b>{{ overviewStats.onSale }}</b>
      </button>
      <button type="button" :class="{ on: searchForm.status === 'off_sale' }" @click="applyStatusFilter('off_sale')">
        下架 <b>{{ overviewStats.offSale }}</b>
      </button>
      <button type="button" :class="{ on: searchForm.status === 'draft' }" @click="applyStatusFilter('draft')">
        草稿 <b>{{ overviewStats.draft }}</b>
      </button>
      <span class="low-stock" v-if="overviewStats.lowStock">低库存 {{ overviewStats.lowStock }}</span>
    </div>

    <div class="toolbar">
      <el-input
        v-model="searchForm.keyword"
        class="toolbar-search"
        placeholder="搜索商品名称"
        clearable
        @keyup.enter="handleSearch"
      />
      <el-select v-model="searchForm.categoryId" class="toolbar-select" placeholder="分类" clearable>
        <el-option
          v-for="item in flatCategoryOptions"
          :key="item.id"
          :label="item.label"
          :value="item.id"
        />
      </el-select>
      <el-select v-model="searchForm.productType" class="toolbar-select" placeholder="类型" clearable>
        <el-option label="实物" value="physical" />
        <el-option label="数字" value="digital" />
        <el-option label="服务" value="service" />
      </el-select>
      <el-button @click="handleSearch">查询</el-button>
      <el-button text @click="resetSearch">重置</el-button>
      <div class="toolbar-spacer" />
      <el-button :disabled="!selectedRows.length" @click="batchToggleSale('on_sale')">
        上架{{ selectedRows.length ? ` ${selectedRows.length}` : '' }}
      </el-button>
      <el-button :disabled="!selectedRows.length" @click="batchToggleSale('off_sale')">下架</el-button>
      <el-button :disabled="!selectedRows.length" type="danger" plain @click="batchDelete">删除</el-button>
    </div>

    <section class="table-panel">

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
          row-key="id"
          class="product-table"
          table-layout="auto"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="44" />
          <el-table-column label="商品" min-width="280">
            <template #default="{ row }">
              <div class="product-cell">
                <div class="product-cover" :class="{ empty: !row.mainImage }">
                  <el-image v-if="row.mainImage" :src="row.mainImage" fit="cover" />
                  <span v-else>{{ row.icon || '▣' }}</span>
                </div>
                <div class="product-info">
                  <div class="product-name-line">
                    <span class="name" :title="row.name">{{ row.name }}</span>
                    <span
                      v-for="t in (row.productTypes || [row.productType])"
                      :key="t"
                      class="type-chip"
                    >{{ productTypeLabel(t) }}</span>
                  </div>
                  <div class="meta-line">
                    <span>{{ row.categoryName || '未分类' }}</span>
                    <span>ID {{ row.id }}</span>
                    <span>销量 {{ row.sales }}</span>
                  </div>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="价格" width="140" align="right">
            <template #default="{ row }">
              <span class="price">¥{{ Number(row.price || 0).toFixed(2) }}</span>
              <div v-if="row.memberPrice != null || row.member_price != null" class="meta-line">
                会员 ¥{{ Number(row.memberPrice ?? row.member_price).toFixed(2) }}
              </div>
            </template>
          </el-table-column>
          <el-table-column label="库存" width="88" align="center">
            <template #default="{ row }">
              <span :class="{ 'stock-warning': isLowStock(row) }">
                {{ formatStockLabel(row) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100" align="center">
            <template #default="{ row }">
              <span class="status-dot" :data-status="row.status">{{ statusLabel(row.status) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="更新" width="148">
            <template #default="{ row }">
              <span class="time">{{ row.updatedAt || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="" width="168" align="right">
            <template #default="{ row }">
              <div class="row-actions">
                <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
                <el-button link @click="toggleOnSale(row)">
                  {{ row.status === 'on_sale' ? '下架' : '上架' }}
                </el-button>
                <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
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

const typeTab = ref('' as '' | 'virtual' | 'physical' | 'membership' | 'off_sale')

const overviewStats = reactive({
  total: 0,
  onSale: 0,
  draft: 0,
  offSale: 0,
  lowStock: 0,
  salesLast30Days: 0,
  ordersThisMonth: 0,
  detailConversionRate: 0,
})

function exportCsv() {
  const header = ['ID', '名称', '类型', '价格', '会员价', '库存', '销量', '状态']
  const lines = tableData.value.map((row: any) => [
    row.id,
    row.name,
    row.productType || row.product_type,
    row.price,
    row.memberPrice ?? row.member_price ?? '',
    row.stock,
    row.sales,
    row.status,
  ].map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
  const blob = new Blob([`\uFEFF${header.join(',')}\n${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `products-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

function applyTypeTab(tab: '' | 'virtual' | 'physical' | 'membership' | 'off_sale') {
  typeTab.value = tab
  if (tab === 'off_sale') {
    searchForm.status = 'off_sale'
    searchForm.productType = ''
  } else if (tab === 'membership') {
    searchForm.status = ''
    searchForm.productType = 'membership' as any
  } else if (tab === 'physical') {
    searchForm.status = ''
    searchForm.productType = 'physical'
  } else if (tab === 'virtual') {
    searchForm.status = ''
    searchForm.productType = 'digital'
  } else {
    searchForm.productType = ''
  }
  pagination.page = 1
  fetchList()
}

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
    overviewStats.salesLast30Days = Number(data.salesLast30Days || 0)
    overviewStats.ordersThisMonth = Number(data.ordersThisMonth || 0)
    overviewStats.detailConversionRate = Number(data.detailConversionRate || 0)
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

/** 无 / 数字 */
function formatStockLabel(row: ProductRow) {
  const n = Number(row.stock)
  if (!Number.isFinite(n) || n <= 0) return '无'
  return String(n)
}

function isLowStock(row: ProductRow) {
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
  const price = Number.isFinite(minPrice) ? minPrice : (Number.isFinite(maxPrice) ? maxPrice : 0)
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

function applyStatusFilter(status: typeof searchForm.status) {
  searchForm.status = status
  handleSearch()
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
  padding: 8px 4px 32px;
}

.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;

  h1 {
    margin: 0;
    font-size: 26px;
    font-weight: 760;
    letter-spacing: -0.03em;
    color: #12151c;
  }

  p {
    margin: 6px 0 0;
    color: #7a8494;
    font-size: 13px;
  }
}

.page-head__actions {
  display: flex;
  gap: 8px;
}

.stat-cards { margin-bottom: 14px; }
.stat-card {
  background: #f8fafc;
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.stat-label { font-size: 12px; color: #909399; }
.type-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}
.type-tabs button {
  border: 1px solid #e4e7ed;
  background: #fff;
  border-radius: 8px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 13px;
}
.type-tabs button.on {
  border-color: #002fa7;
  color: #002fa7;
  background: #eef3ff;
}
.status-tabs {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 14px;
  padding: 4px;
  width: fit-content;
  background: #eef1f6;
  border-radius: 12px;

  button {
    border: 0;
    height: 34px;
    padding: 0 14px;
    border-radius: 9px;
    background: transparent;
    color: #5c6675;
    font-size: 13px;
    cursor: pointer;

    b {
      margin-left: 4px;
      font-weight: 750;
    }

    &.on {
      background: #fff;
      color: #12151c;
      box-shadow: 0 1px 2px rgba(16, 24, 40, 0.08);
    }
  }
}

.low-stock {
  margin-left: 10px;
  color: #b45309;
  font-size: 12px;
}

.toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.toolbar-search {
  width: 220px;
}

.toolbar-select {
  width: 150px;
}

.toolbar-spacer {
  flex: 1;
}

.table-panel {
  overflow: hidden;
  background: #fff;
  border: 1px solid #eceff4;
  border-radius: 16px;
}

.product-table {
  width: 100%;

  :deep(.el-table__inner-wrapper::before) {
    display: none;
  }

  :deep(th.el-table__cell) {
    background: #fafbfc;
    color: #8a93a0;
    font-weight: 600;
    font-size: 12px;
    border-bottom: 1px solid #eceff4;
  }

  :deep(td.el-table__cell) {
    border-bottom: 1px solid #f3f5f8;
    padding: 14px 0;
  }

  :deep(.el-table__row:hover > td.el-table__cell) {
    background: #f8fafc;
  }
}

.product-cell {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  padding: 2px 0;
}

.product-cover {
  flex: none;
  width: 64px;
  height: 64px;
  overflow: hidden;
  border-radius: 14px;
  background: #f3f4f7;
  display: grid;
  place-items: center;
  color: #9aa3b2;
  font-size: 18px;

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
  gap: 8px;
  min-width: 0;
}

.name {
  overflow: hidden;
  color: #12151c;
  font-size: 14px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.type-chip {
  flex: none;
  padding: 1px 7px;
  border-radius: 999px;
  background: #f1f4f8;
  color: #647187;
  font-size: 11px;
}

.meta-line {
  display: flex;
  gap: 10px;
  margin-top: 6px;
  color: #8a93a0;
  font-size: 12px;
}

.price {
  color: #12151c;
  font-variant-numeric: tabular-nums;
  font-weight: 720;
  letter-spacing: -0.02em;
}

.stock-warning {
  color: #b45309;
  font-weight: 650;
}

.status-dot {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #5c6675;
  font-size: 13px;

  &::before {
    content: '';
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #cbd5e1;
  }

  &[data-status='on_sale']::before {
    background: #12b76a;
  }

  &[data-status='off_sale']::before {
    background: #f79009;
  }

  &[data-status='draft']::before {
    background: #98a2b3;
  }
}

.time {
  color: #8a93a0;
  font-size: 12px;
}

.row-actions {
  display: inline-flex;
  justify-content: flex-end;
  white-space: nowrap;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px 16px;
}

@media (max-width: 860px) {
  .page-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .toolbar-search,
  .toolbar-select {
    width: 100%;
  }
}
</style>
