<template>
  <div class="commerce-wb mw-page" v-loading="loading">
    <div class="head">
      <div>
        <h1 class="h1">商品</h1>
        <div class="sub">按类型筛选 · 虚拟自动交付，实物填单号发货</div>
      </div>
      <div class="actions">
        <button type="button" class="btn primary" @click="goCreate">
          <MiniIcon name="plus" :size="15" />新建商品
        </button>
      </div>
    </div>

    <div class="tabs-line" role="tablist">
      <button
        v-for="t in typeTabs"
        :key="t.k"
        type="button"
        :class="{ on: typeTab === t.k }"
        @click="typeTab = t.k; fetchList()"
      >{{ t.l }}</button>
    </div>

    <div v-if="missingImageHint" class="hint warn">
      <MiniIcon name="img" :size="16" />
      <span><b>{{ missingImageHint }}</b>，用户在小程序里可能看到空白图。</span>
    </div>

    <div class="filters">
      <label class="search">
        <MiniIcon name="search" :size="15" />
        <input v-model="keyword" type="search" placeholder="搜索商品名称" @keyup.enter="fetchList" />
      </label>
      <span class="faint">共 {{ total }} 个</span>
    </div>

    <div v-if="listError" class="empty-box">
      {{ listError }}
      <button type="button" class="btn sm" style="margin-left:8px" @click="fetchList">重试</button>
    </div>

    <div v-else class="group">
      <div class="chead">
        <span style="flex:1;padding-left:58px">商品</span>
        <span class="c-price">价格</span>
        <span class="c-num">库存</span>
        <span style="width:140px">上架</span>
      </div>
      <div v-if="!list.length" class="muted" style="padding:28px;text-align:center">这一类还没有商品</div>
      <div v-for="p in list" :key="p.id" class="crow" :class="{ testrow: isTest(p) }">
        <div
          class="cthumb"
          :style="{ width: '44px', height: '44px', background: p.main_image ? '#FCEBDD' : 'var(--rs)', color: p.main_image ? '' : 'var(--r)' }"
        >
          <MiniIcon :name="p.main_image ? typeIcon(p) : 'img'" :size="18" />
        </div>
        <div class="cmain">
          <button type="button" class="ctitle" @click="goEdit(p.id)">{{ p.name }}</button>
          <div class="cmeta">
            <span>{{ typeLabel(p) }}</span>
            <span v-if="p.category_name">{{ p.category_name }}</span>
            <span v-if="!p.main_image" class="tag t-err">缺图</span>
            <span v-if="isTest(p)" class="tag t-err">测试</span>
            <span v-if="p.status === 'draft'" class="tag t-draft">草稿</span>
          </div>
        </div>
        <div class="c-price">
          <b>{{ priceText(p) }}</b>
        </div>
        <div class="c-num">{{ p.total_stock == null ? '—' : p.total_stock }}</div>
        <div style="display:flex;gap:6px;align-items:center;width:140px">
          <label class="switch" :title="onSale(p) ? '下架' : '上架'">
            <input type="checkbox" :checked="onSale(p)" @change="toggleShelf(p)" />
            <span />
          </label>
          <button type="button" class="btn soft sm" @click="goEdit(p.id)">编辑</button>
          <button type="button" class="iconbtn" :title="isTest(p) ? '取消测试' : '标为测试'" @click="toggleTest(p)">
            <MiniIcon name="flask" :size="14" />
          </button>
        </div>
      </div>
    </div>

    <div v-if="total > pageSize" class="filters" style="justify-content:flex-end;margin-top:12px">
      <button type="button" class="btn sm" :disabled="page <= 1" @click="page--; fetchList()">上一页</button>
      <span class="faint">{{ page }} / {{ Math.max(1, Math.ceil(total / pageSize)) }}</span>
      <button type="button" class="btn sm" :disabled="page * pageSize >= total" @click="page++; fetchList()">下一页</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import MiniIcon from '@/components/mini/MiniIcon.vue'
import { getProductList, onSaleProduct, offSaleProduct } from '@/api/product'
import { setProductTestFlag } from '@/api/commerceOps'
import type { ProductRecord } from '@/types/product'

const router = useRouter()
const loading = ref(false)
const listError = ref('')
const list = ref<ProductRecord[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const keyword = ref('')
const typeTab = ref('all')

const typeTabs = [
  { k: 'all', l: '全部' },
  { k: 'virtual', l: '虚拟' },
  { k: 'physical', l: '实物' },
  { k: 'off', l: '下架' },
  { k: 'test', l: '测试' },
]

const missingImageHint = computed(() => {
  const n = list.value.filter((p) => !p.main_image && !isTest(p)).length
  return n ? `${n} 个商品缺少主图` : ''
})

function isTest(p: any) {
  return !!(p?.isTest ?? p?.is_test ?? p?.test)
}

function onSale(p: ProductRecord) {
  return p.status === 'on_sale'
}

function typeLabel(p: ProductRecord) {
  const t = (p.productType || '').toLowerCase()
  if (t.includes('physical')) return '实物'
  if (t.includes('member')) return '会员'
  if (t.includes('service')) return '服务'
  if (t.includes('course')) return '课程'
  return '虚拟'
}

function typeIcon(p: ProductRecord) {
  const t = (p.productType || '').toLowerCase()
  if (t.includes('physical')) return 'truck'
  if (t.includes('member')) return 'crown'
  if (t.includes('service')) return 'chat'
  if (t.includes('course')) return 'doc'
  return 'box'
}

function priceText(p: ProductRecord) {
  const n = Number(p.min_price ?? 0)
  return n ? `¥${n}` : '免费'
}

function goCreate() {
  router.push('/commerce/product/edit')
}

function goEdit(id: number) {
  router.push(`/commerce/product/edit/${id}`)
}

async function fetchList() {
  loading.value = true
  listError.value = ''
  try {
    const params: Record<string, unknown> = {
      current: page.value,
      size: pageSize,
      page: page.value,
      page_size: pageSize,
      keyword: keyword.value || undefined,
    }
    if (typeTab.value === 'virtual') params.productType = 'virtual'
    else if (typeTab.value === 'physical') params.productType = 'physical'
    else if (typeTab.value === 'off') params.status = 'off_sale'
    else if (typeTab.value === 'test') params.isTest = true

    const res: any = await getProductList(params as any)
    const data = res?.data ?? res ?? {}
    let rows: ProductRecord[] = data.records || data.items || data.list || []
    if (typeTab.value === 'test') {
      rows = rows.filter((p) => isTest(p))
    } else if (typeTab.value !== 'all' && typeTab.value !== 'off') {
      rows = rows.filter((p) => !isTest(p))
    }
    list.value = rows
    total.value = Number(data.total ?? rows.length)
  } catch (e: any) {
    listError.value = e?.message || '商品列表加载失败'
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

async function toggleShelf(p: ProductRecord) {
  try {
    if (onSale(p)) {
      await offSaleProduct(p.id)
      ElMessage.success('已下架')
    } else {
      await onSaleProduct(p.id)
      ElMessage.success('已上架')
    }
    await fetchList()
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  }
}

async function toggleTest(p: ProductRecord) {
  const next = !isTest(p)
  try {
    await setProductTestFlag(p.id, next)
    ElMessage.success(next ? '已标为测试商品' : '已取消测试标记')
    await fetchList()
  } catch (e: any) {
    ElMessage.error(e?.message || '标记失败（commerce-ops 可能未上线）')
  }
}

onMounted(fetchList)
</script>
