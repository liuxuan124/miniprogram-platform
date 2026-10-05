<template>
  <el-dialog
    v-model="visible"
    title="添加商品"
    width="820px"
    destroy-on-close
    append-to-body
  >
    <div class="pl">
      <div class="pl__bar">
        <el-input
          v-model="keyword"
          size="small"
          clearable
          placeholder="搜索商品名称"
          :prefix-icon="Search"
          @input="resetPage"
        />
        <el-select v-model="typeFilter" size="small" style="width: 116px" placeholder="类型" clearable @change="resetPage">
          <el-option label="实物商品" value="physical" />
          <el-option label="虚拟商品" value="digital" />
          <el-option label="服务商品" value="service" />
        </el-select>
        <el-button size="small" :loading="loading" @click="load">刷新</el-button>
        <span class="pl__count">已选 {{ draft.length }} / {{ MAX_PICK }}</span>
      </div>

      <div class="pl__hint">
        勾选后可在右侧调整顺序 —— <b>展示顺序 = 勾选顺序</b>，画布与真机都按它排。
      </div>

      <div class="pl__body">
        <!-- 左：可选商品 -->
        <div v-loading="loading" class="pl__pool">
          <div v-if="!pagedRows.length && !loading" class="pl__blank">
            没有匹配的商品
          </div>
          <label
            v-for="row in pagedRows"
            :key="row.id"
            class="pl__row"
            :class="{ 'is-on': draft.includes(row.id) }"
          >
            <el-checkbox
              :model-value="draft.includes(row.id)"
              size="small"
              :disabled="!draft.includes(row.id) && draft.length >= MAX_PICK"
              @change="(v: any) => toggle(row.id, !!v)"
            />
            <span class="pl__thumb">
              <img v-if="row.image" :src="row.image" alt="" />
              <span v-else>🛍️</span>
            </span>
            <span class="pl__info">
              <span class="pl__name">{{ row.name }}</span>
              <span class="pl__meta">
                <em class="pl__price" :class="{ 'is-free': isFree(row) }">
                  {{ isFree(row) ? '免费' : `¥${row.price}` }}
                </em>
                <em v-if="row.sales > 0" class="pl__sales">已售 {{ row.sales }}</em>
              </span>
            </span>
          </label>

          <div v-if="rows.length > PAGE_SIZE" class="pl__pager">
            <el-button size="small" :disabled="page <= 1" @click="page -= 1">上一页</el-button>
            <span class="pl__page">{{ page }} / {{ totalPage }}</span>
            <el-button size="small" :disabled="page >= totalPage" @click="page += 1">下一页</el-button>
          </div>
        </div>

        <!-- 右：已选（可拖拽排序） -->
        <div class="pl__picked">
          <div class="pl__picked-head">
            <span>已选商品</span>
            <el-button v-if="draft.length" size="small" text @click="draft = []">清空</el-button>
          </div>

          <div v-if="!draft.length" class="pl__picked-blank">
            左侧勾选商品后<br />会出现在这里，可拖拽排序
          </div>

          <draggable
            v-else
            v-model="draftRows"
            item-key="id"
            handle=".pl__picked-grip"
            :animation="160"
            ghost-class="pl__picked--ghost"
            class="pl__picked-list"
            @end="onDragEnd"
          >
            <template #item="{ element, index }">
              <div class="pl__picked-row">
                <button type="button" class="pl__picked-grip" title="拖动排序" @click.stop @mousedown.stop>
                  <el-icon :size="12"><Rank /></el-icon>
                </button>
                <span class="pl__picked-idx">{{ index + 1 }}</span>
                <span class="pl__picked-name">{{ element.name }}</span>
                <button
                  type="button"
                  class="pl__picked-ico"
                  title="移除"
                  @click="removeAt(index)"
                >
                  <el-icon :size="12"><Delete /></el-icon>
                </button>
              </div>
            </template>
          </draggable>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="pl__foot">
        <span class="pl__foot-hint">{{ draft.length ? `将按这 ${draft.length} 件的顺序展示` : '还没选商品' }}</span>
        <div class="pl__foot-ops">
          <el-button size="small" @click="visible = false">取消</el-button>
          <el-button size="small" type="primary" @click="onConfirm">确定</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import draggable from 'vuedraggable'
import { Delete, Rank, Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getProductList } from '@/api/product'
import { pickProductCoverUrl } from '@/utils/product-cover'
import { PRODUCT_LIST_MANUAL_MAX } from './productListSchema'

/**
 * 手动添加商品的弹窗（左右分栏：左选右排序）。
 *
 * 为什么不用多选下拉：
 *   商品列表的核心诉求是「**顺序**」—— 首页第 1 位放主推、第 2 位放利润款。
 *   多选下拉只能选集合、给不了顺序，运营还得记 id 顺序手填。
 *   左侧勾选 → 右侧实时追加 → 拖拽调整，顺序即id 数组顺序。
 */
const props = defineProps<{
  /** 已选 id（保持顺序） */
  modelValue: string[]
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()

const PAGE_SIZE = 20
const MAX_PICK = PRODUCT_LIST_MANUAL_MAX

interface Row {
  id: string
  name: string
  price: string
  sales: number
  image: string
  productType: string
}

const visible = ref(false)
const loading = ref(false)
const keyword = ref('')
const typeFilter = ref('')
const page = ref(1)
const rows = ref<Row[]>([])
/** 已选 id 顺序 */
const draft = ref<string[]>([])
/** 右侧拖拽列表：带 name 便于展示，id 与 draft 一一对应 */
const draftRows = ref<Array<{ id: string; name: string }>>([])

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return rows.value.filter((r) => {
    if (kw && !r.name.toLowerCase().includes(kw)) return false
    if (typeFilter.value && r.productType !== typeFilter.value) return false
    return true
  })
})

const totalPage = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)))
const pagedRows = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return filtered.value.slice(start, start + PAGE_SIZE)
})

function resetPage() {
  page.value = 1
}

function isFree(row: Row): boolean {
  return Number(row.price) === 0
}

function syncDraftRows(ids: string[]) {
  const map = new Map(rows.value.map((r) => [r.id, r]))
  draftRows.value = ids.map((id) => ({ id, name: map.get(id)?.name || `商品 ${id}` }))
}

async function load() {
  loading.value = true
  try {
    const res: any = await getProductList({ current: 1, size: 100, status: 'on_sale' } as any)
    const payload = (res as any)?.data
    const list = Array.isArray(payload) ? payload : payload?.records || payload?.list || []
    rows.value = (Array.isArray(list) ? list : []).map((r: any) => {
      const id = String(r.id ?? '')
      return {
        id,
        name: String(r.name || r.title || '未命名商品'),
        price: String(r.price ?? '0.00'),
        sales: Number(r.sales ?? r.salesCount ?? 0) || 0,
        image: pickProductCoverUrl(r),
        productType: String(r.product_type || r.productType || ''),
      }
    }).filter((r: Row) => !!r.id)
  } catch {
    rows.value = []
  } finally {
    loading.value = false
  }
}

function toggle(id: string, on: boolean) {
  if (on) {
    if (draft.value.includes(id)) return
    if (draft.value.length >= MAX_PICK) {
      ElMessage.warning(`最多选 ${MAX_PICK} 件`)
      return
    }
    draft.value = [...draft.value, id]
  } else {
    draft.value = draft.value.filter((x) => x !== id)
  }
  syncDraftRows(draft.value)
}

function removeAt(index: number) {
  draft.value = draft.value.filter((_, i) => i !== index)
  syncDraftRows(draft.value)
}

/** 拖拽结束：把右侧顺序写回 draft（拖拽过程中 draftRows 已被 v-model 更新） */
function onDragEnd() {
  draft.value = draftRows.value.map((r) => r.id)
}

function open() {
  draft.value = [...(props.modelValue || [])]
  keyword.value = ''
  typeFilter.value = ''
  page.value = 1
  visible.value = true
  void load().then(() => syncDraftRows(draft.value))
}

defineExpose({ open })

function onConfirm() {
  const next = draftRows.value.length
    ? draftRows.value.map((r) => r.id)
    : draft.value
  emit('update:modelValue', next)
  visible.value = false
  ElMessage.success(`已添加 ${next.length} 件商品`)
}
</script>

<style lang="scss" scoped>
.pl__bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.pl__bar :deep(.el-input) {
  max-width: 220px;
}

.pl__count {
  font-size: 11.5px;
  color: #a89c8d;
}

.pl__hint {
  margin-bottom: 8px;
  font-size: 11.5px;
  line-height: 1.5;
  color: #8a7d6f;
}

.pl__body {
  display: flex;
  gap: 12px;
  min-height: 340px;
}

/* ---------- 左：可选池 ---------- */
.pl__pool {
  flex: 1;
  min-width: 0;
  max-height: 400px;
  overflow-y: auto;
  padding: 2px;
}

.pl__row {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 6px 8px;
  cursor: pointer;
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

.pl__thumb {
  display: grid;
  place-items: center;
  flex: none;
  width: 34px;
  height: 34px;
  overflow: hidden;
  font-size: 15px;
  background: #f1ede6;
  border-radius: 6px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.pl__info {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.pl__name {
  overflow: hidden;
  font-size: 12.5px;
  color: #3f3a35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pl__meta {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 11px;
  font-style: normal;
}

.pl__price {
  font-weight: 600;
  color: #e11d48;
  font-style: normal;
}

/* 🔴 0 元商品在选择器里就要能看出来，不能和付费商品长得一样 */
.pl__price.is-free {
  color: #1fa97a;
}

.pl__sales {
  color: #b3a596;
  font-style: normal;
}

.pl__blank {
  padding: 40px 10px;
  font-size: 12.5px;
  color: #b3a596;
  text-align: center;
}

.pl__pager {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: center;
  margin-top: 10px;
}

.pl__page {
  font-size: 12px;
  color: #8a7d6f;
  font-variant-numeric: tabular-nums;
}

/* ---------- 右：已选（可拖拽） ---------- */
.pl__picked {
  display: flex;
  flex: none;
  flex-direction: column;
  width: 208px;
  padding: 8px;
  background: #faf8f5;
  border: 1px solid #eee7dd;
  border-radius: 8px;
}

.pl__picked-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #5c5249;
}

.pl__picked-blank {
  flex: 1;
  padding: 26px 6px;
  font-size: 11.5px;
  line-height: 1.7;
  color: #c4b9ac;
  text-align: center;
}

.pl__picked-list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  max-height: 320px;
  overflow-y: auto;
}

.pl__picked-row {
  display: flex;
  gap: 5px;
  align-items: center;
  padding: 5px 6px;
  background: #fff;
  border: 1px solid #e8e2d9;
  border-radius: 6px;
}

.pl__picked--ghost {
  background: #f0e9e0;
  border-style: dashed;
}

.pl__picked-grip {
  display: grid;
  place-items: center;
  flex: none;
  width: 15px;
  height: 20px;
  padding: 0;
  color: #c2b6a8;
  cursor: grab;
  background: transparent;
  border: 0;
  border-radius: 3px;

  &:hover {
    color: #8a7c6e;
    background: #efe9e2;
  }

  &:active {
    cursor: grabbing;
  }
}

.pl__picked-idx {
  flex: none;
  min-width: 14px;
  font-size: 10.5px;
  font-variant-numeric: tabular-nums;
  color: #b3a596;
  text-align: right;
}

.pl__picked-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 11.5px;
  color: #3f3a35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pl__picked-ico {
  display: grid;
  place-items: center;
  flex: none;
  width: 19px;
  height: 19px;
  padding: 0;
  color: #b9aca0;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 4px;

  &:hover {
    color: var(--el-danger, #f56c6c);
    background: var(--el-danger-light-9, #fef0f0);
  }
}

.pl__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.pl__foot-hint {
  font-size: 11.5px;
  color: #a89c8d;
}

.pl__foot-ops {
  display: flex;
  gap: 8px;
  flex: none;
}
</style>
