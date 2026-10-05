<template>
  <el-dialog
    v-model="visible"
    title="选择秒杀商品"
    width="820px"
    destroy-on-close
    append-to-body
  >
    <div class="fs">
      <div class="fs__bar">
        <el-input
          v-model="keyword"
          size="small"
          clearable
          placeholder="搜索商品名称"
          :prefix-icon="Search"
          @input="resetPage"
        />
        <el-button size="small" :loading="loading" @click="load">刷新</el-button>
        <span class="fs__count">已选 {{ draft.size }} / {{ MAX_PICK }}</span>
      </div>

      <div class="fs__hint">
        勾选后可逐条设置<b>秒杀价</b>与<b>库存</b>；不填库存时端上按未售罄处理（进度条不显示）。
      </div>

      <div v-loading="loading" class="fs__body">
        <div v-if="!pagedRows.length && !loading" class="fs__blank">
          <p class="fs__blank-title">没有匹配的商品</p>
          <p class="fs__blank-hint">换个关键词，或先到「商品管理」上架商品。</p>
        </div>

        <template v-else>
          <div
            v-for="row in pagedRows"
            :key="row.id"
            class="fs__row"
            :class="{ 'is-on': draft.has(row.id) }"
          >
            <el-checkbox
              :model-value="draft.has(row.id)"
              size="small"
              :disabled="!draft.has(row.id) && draft.size >= MAX_PICK"
              @change="(v: any) => toggle(row, !!v)"
            />
            <span class="fs__thumb">
              <img v-if="row.cover" :src="row.cover" alt="" />
              <span v-else>📦</span>
            </span>
            <span class="fs__info">
              <span class="fs__name">{{ row.name }}</span>
              <span class="fs__price">
                售价 ¥{{ row.price }}
                <em v-if="row.stockTotal > 0" class="fs__stock">库存 {{ row.stockTotal }}</em>
              </span>
            </span>

            <!-- 已选：露出秒杀价与库存输入 -->
            <template v-if="draft.has(row.id)">
              <span class="fs__field">
                <span class="fs__field-label">秒杀价</span>
                <el-input
                  :model-value="draftValues[row.id]?.price ?? ''"
                  size="small"
                  placeholder="留空用售价"
                  style="width: 84px"
                  @update:model-value="(v: string) => setField(row.id, 'price', v)"
                />
              </span>
              <span class="fs__field">
                <span class="fs__field-label">库存</span>
                <el-input
                  :model-value="String(draftValues[row.id]?.stock ?? '')"
                  size="small"
                  placeholder="不限"
                  style="width: 70px"
                  @update:model-value="(v: string) => setField(row.id, 'stock', v)"
                />
              </span>
            </template>
          </div>
        </template>

        <div v-if="rows.length > PAGE_SIZE" class="fs__pager">
          <el-button size="small" :disabled="page <= 1" @click="page -= 1">上一页</el-button>
          <span class="fs__page">{{ page }} / {{ totalPage }}</span>
          <el-button size="small" :disabled="page >= totalPage" @click="page += 1">下一页</el-button>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="fs__foot">
        <span class="fs__foot-hint">
          已选 {{ draft.size }} 件，顺序可在「内容」面板拖拽调整。
        </span>
        <div class="fs__foot-ops">
          <el-button size="small" @click="visible = false">取消</el-button>
          <el-button size="small" type="primary" @click="onConfirm">确定</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getProductList } from '@/api/product'
import { FLASH_SALE_MANUAL_MAX, type FlashSaleItem } from './flashSaleSchema'

/**
 * 手动自选模式的商品选择弹窗。
 *
 * 为什么必须做弹窗而不是多选下拉：
 *   秒杀要配**秒杀价 + 库存**两个维度，下拉框里塞不下这些输入；
 *   而库存直接决定「进度条百分比」和「是否判售罄」——没有库存就等于没配秒杀。
 */
const props = defineProps<{ modelValue: FlashSaleItem[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: FlashSaleItem[]] }>()

const PAGE_SIZE = 20
const MAX_PICK = FLASH_SALE_MANUAL_MAX

interface Row {
  id: number
  name: string
  price: string
  cover: string
  stockTotal: number
}

const visible = ref(false)
const loading = ref(false)
const keyword = ref('')
const page = ref(1)
const rows = ref<Row[]>([])
/** 勾选的 id 集合 */
const draft = ref<Set<number>>(new Set())
/** 勾选项的秒杀价/库存输入值 */
const draftValues = ref<Record<number, { price: string; stock: string }>>({})

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return rows.value
  return rows.value.filter((r) => r.name.toLowerCase().includes(kw))
})

const totalPage = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)))
const pagedRows = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return filtered.value.slice(start, start + PAGE_SIZE)
})

function resetPage() {
  page.value = 1
}

async function load() {
  loading.value = true
  try {
    const res: any = await getProductList({ current: 1, size: 100, status: 'on_sale' } as any)
    const payload = (res as any)?.data
    const list = Array.isArray(payload) ? payload : payload?.records || payload?.list || []
    rows.value = (Array.isArray(list) ? list : []).map((r: any) => ({
      id: Number(r.id),
      name: String(r.name || r.title || '未命名商品'),
      price: String(r.price ?? '0.00'),
      cover: String(r.cover || r.image || r.icon || ''),
      stockTotal: Number(r.stock ?? 0) || 0,
    })).filter((r: Row) => Number.isFinite(r.id))
  } catch {
    rows.value = []
  } finally {
    loading.value = false
  }
}

function toggle(row: Row, on: boolean) {
  const next = new Set(draft.value)
  if (on) {
    if (next.size >= MAX_PICK) {
      ElMessage.warning(`最多选 ${MAX_PICK} 件`)
      return
    }
    next.add(row.id)
    if (!draftValues.value[row.id]) {
      draftValues.value = { ...draftValues.value, [row.id]: { price: '', stock: '' } }
    }
  } else {
    next.delete(row.id)
  }
  draft.value = next
}

function setField(id: number, key: 'price' | 'stock', value: string) {
  draftValues.value = {
    ...draftValues.value,
    [id]: { price: draftValues.value[id]?.price ?? '', stock: draftValues.value[id]?.stock ?? '', [key]: value },
  }
}

function open() {
  const next = new Set<number>()
  const values: Record<number, { price: string; stock: string }> = {}
  for (const it of props.modelValue || []) {
    const id = Number(it?.id)
    if (!Number.isFinite(id)) continue
    next.add(id)
    values[id] = {
      price: it.price === undefined || it.price === null ? '' : String(it.price),
      stock: it.stock === undefined || it.stock === null ? '' : String(it.stock),
    }
  }
  draft.value = next
  draftValues.value = values
  keyword.value = ''
  page.value = 1
  visible.value = true
  void load()
}

defineExpose({ open })

function onConfirm() {
  if (!draft.value.size) {
    ElMessage.warning('还没有选商品')
    return
  }
  // 顺序按「原已选顺序 → 新勾选追加」，避免每次确认都打乱运营排好的顺序
  const picked: FlashSaleItem[] = []
  const push = (id: number) => {
    if (picked.some((x) => Number(x.id) === id)) return
    const row = rows.value.find((r) => r.id === id)
    if (!row) return
    const v = draftValues.value[id] || { price: '', stock: '' }
    picked.push({
      id: row.id,
      name: row.name,
      // 秒杀价留空 → 回落售价（端上按售价渲染，不显示为 0 元）
      price: v.price.trim() || row.price,
      original_price: v.price.trim() ? row.price : '',
      stock: Number(v.stock) > 0 ? Number(v.stock) : 0,
      sold: 0,
      link_url: `/pkg-content/product-detail/product-detail?id=${row.id}`,
    })
  }
  for (const it of props.modelValue || []) {
    const id = Number(it?.id)
    if (Number.isFinite(id)) push(id)
  }
  for (const id of draft.value) push(id)

  emit('update:modelValue', picked)
  visible.value = false
  ElMessage.success(`已选择 ${picked.length} 件商品`)
}
</script>

<style lang="scss" scoped>
.fs__bar {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 8px;
}

.fs__bar :deep(.el-input) {
  max-width: 240px;
}

.fs__count {
  font-size: 11.5px;
  color: #a89c8d;
}

.fs__hint {
  margin-bottom: 8px;
  font-size: 11.5px;
  line-height: 1.5;
  color: #8a7d6f;
}

.fs__body {
  min-height: 300px;
  max-height: 420px;
  overflow-y: auto;
  padding: 2px;
}

.fs__row {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 7px 8px;
  border: 1px solid transparent;
  border-radius: 8px;

  &:hover {
    background: #faf8f5;
  }

  &.is-on {
    background: #fdf6f1;
    border-color: color-mix(in srgb, var(--el-color-primary, #c08e6e) 45%, #fff);
  }
}

.fs__thumb {
  display: grid;
  place-items: center;
  flex: none;
  width: 32px;
  height: 32px;
  overflow: hidden;
  font-size: 14px;
  background: #f1ede6;
  border-radius: 6px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.fs__info {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.fs__name {
  overflow: hidden;
  font-size: 12.5px;
  color: #3f3a35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fs__price {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 11px;
  color: #a89c8d;
}

.fs__stock {
  font-style: normal;
  color: #b3a596;
}

.fs__field {
  display: flex;
  flex: none;
  gap: 4px;
  align-items: center;
}

.fs__field-label {
  font-size: 11px;
  color: #8a7d6f;
  white-space: nowrap;
}

.fs__pager {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: center;
  margin-top: 12px;
}

.fs__page {
  font-size: 12px;
  color: #8a7d6f;
  font-variant-numeric: tabular-nums;
}

.fs__blank {
  padding: 46px 10px;
  text-align: center;
}

.fs__blank-title {
  margin: 0;
  font-size: 13px;
  color: #5c5249;
}

.fs__blank-hint {
  margin: 4px 0 0;
  font-size: 11.5px;
  color: #a89c8d;
}

.fs__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.fs__foot-hint {
  font-size: 11.5px;
  color: #a89c8d;
}

.fs__foot-ops {
  display: flex;
  gap: 8px;
  flex: none;
}
</style>
