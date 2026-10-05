<template>
  <el-dialog
    v-model="visible"
    title="选择优惠券"
    width="780px"
    destroy-on-close
    append-to-body
  >
    <div class="csel">
      <div class="csel__bar">
        <el-input
          v-model="keyword"
          size="small"
          clearable
          placeholder="搜索券名称"
          :prefix-icon="Search"
          @input="resetPage"
        />
        <el-select v-model="typeFilter" size="small" style="width: 118px" placeholder="类型" clearable @change="resetPage">
          <el-option label="满减券" value="fixed" />
          <el-option label="折扣券" value="percent" />
        </el-select>
        <el-select v-model="statusFilter" size="small" style="width: 118px" placeholder="状态" @change="resetPage">
          <el-option label="已发布" value="published" />
          <el-option label="草稿" value="draft" />
          <el-option label="已停用" value="disabled" />
        </el-select>
        <el-button size="small" :loading="loading" @click="load">刷新</el-button>
        <span class="csel__count">已选 {{ draft.size }} / {{ MAX_PICK }}</span>
      </div>

      <div v-loading="loading" class="csel__body">
        <!-- 空态 -->
        <div v-if="!rows.length && !loading" class="csel__blank">
          <p class="csel__blank-title">没有可用的优惠券</p>
          <p class="csel__blank-hint">先到「营销 › 优惠券」创建并发布，再回到这里挑选。</p>
        </div>

        <!--券卡网格 -->
        <div v-else class="csel__grid">
          <button
            v-for="c in pagedRows"
            :key="c.id"
            type="button"
            class="csel__card"
            :class="{ 'is-on': draft.has(c.id), 'is-dim': isSoldOut(c) }"
            :disabled="!draft.has(c.id) && draft.size >= MAX_PICK"
            @click="toggle(c)"
          >
            <span class="csel__card-amount" :style="{ color: c.type === 'percent' ? '#F2762A' : '#F56C6C' }">
              {{ c.displayValue }}
            </span>
            <span class="csel__card-main">
              <span class="csel__card-name">{{ c.name }}</span>
              <span class="csel__card-cond">{{ c.condition }}</span>
              <span class="csel__card-meta">
                <em class="csel__tag" :class="`is-${c.status}`">{{ statusText(c.status) }}</em>
                <em v-if="isSoldOut(c)" class="csel__tag is-soldout">已抢光</em>
                <em v-else class="csel__tag is-plain">{{ c.usedCount }}/{{ c.totalCount }}</em>
              </span>
            </span>
            <span class="csel__card-check">
              <el-icon v-if="draft.has(c.id)"><Check /></el-icon>
            </span>
          </button>
        </div>

        <div v-if="rows.length > PAGE_SIZE" class="csel__pager">
          <el-button size="small" :disabled="page <= 1" @click="page -= 1">上一页</el-button>
          <span class="csel__page">{{ page }} / {{ totalPage }}</span>
          <el-button size="small" :disabled="page >= totalPage" @click="page += 1">下一页</el-button>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="csel__foot">
        <span class="csel__foot-hint">
          已选的 {{ draft.size }} 张会按当前顺序展示；顺序可在「内容」面板里拖拽调整。
        </span>
        <div class="csel__foot-ops">
          <el-button size="small" @click="visible = false">取消</el-button>
          <el-button size="small" type="primary" @click="onConfirm">确定</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getCouponList } from '@/api/coupon'
import { formatPercentDiscount } from '@/utils/couponDisplay'
import { COUPON_MANUAL_MAX } from './couponSchema'
import type { CouponPick } from './couponSchema'

/**
 * 手动自选模式的优惠券选择弹窗。
 *
 * 为什么需要：旧面板**只能自动读取**全部已发布券，运营想做「首页只挂 3 张精选券」
 * 只能改全局券库状态——那是拿线上投放配置当组件配置用，影响面完全错位。
 * 这里把「挑哪几张」的能力还给组件层。
 */
const props = defineProps<{ modelValue: CouponPick[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: CouponPick[]] }>()

const PAGE_SIZE = 24
const MAX_PICK = COUPON_MANUAL_MAX

interface Row {
  id: number
  name: string
  displayValue: string
  condition: string
  type: string
  status: string
  totalCount: number
  usedCount: number
}

const visible = ref(false)
const loading = ref(false)
const keyword = ref('')
const typeFilter = ref('')
const statusFilter = ref('published')
const page = ref(1)
const rows = ref<Row[]>([])
/** 本次弹窗内勾选的 id 集合（确认后才写回，允许「取消不丢」语义之外的临时选择） */
const draft = ref<Set<number>>(new Set())

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return rows.value.filter((r) => {
    if (kw && !r.name.toLowerCase().includes(kw)) return false
    if (typeFilter.value && r.type !== typeFilter.value) return false
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

function statusText(status: string): string {
  if (status === 'published') return '已发布'
  if (status === 'draft') return '草稿'
  if (status === 'disabled') return '已停用'
  if (status === 'expired') return '已过期'
  return status || '未知'
}

function isSoldOut(c: Row): boolean {
  return Number(c.totalCount) > 0 && Number(c.usedCount) >= Number(c.totalCount)
}

function formatRow(raw: any): Row {
  const type = String(raw?.type || 'fixed')
  const value = Number(raw?.value ?? raw?.amount ?? 0)
  const min = Number(raw?.minOrderAmount ?? raw?.min_amount ?? 0)
  return {
    id: Number(raw?.id),
    name: String(raw?.name || '优惠券'),
    displayValue: type === 'percent' ? formatPercentDiscount(value) : `¥${value}`,
    condition: min > 0 ? `满 ${min} 可用` : '无门槛',
    type,
    status: String(raw?.status || ''),
    totalCount: Number(raw?.totalCount ?? raw?.total_count ?? 0),
    usedCount: Number(raw?.usedCount ?? raw?.used_count ?? 0),
  }
}

async function load() {
  loading.value = true
  try {
    const res: any = await getCouponList({
      page: 1,
      page_size: 100,
      status: statusFilter.value || undefined,
    } as any)
    const payload = (res as any)?.data || {}
    const records = payload.records || payload.list || []
    rows.value = (Array.isArray(records) ? records : []).map(formatRow).filter((r: Row) => Number.isFinite(r.id))
  } catch {
    rows.value = []
  } finally {
    loading.value = false
  }
}

function toggle(c: Row) {
  const next = new Set(draft.value)
  if (next.has(c.id)) {
    next.delete(c.id)
  } else {
    if (next.size >= MAX_PICK) {
      ElMessage.warning(`最多选 ${MAX_PICK} 张`)
      return
    }
    next.add(c.id)
  }
  draft.value = next
}

function open() {
  // 打开时把已选同步进草稿，保留原顺序（按已选数组顺序回填）
  const next = new Set<number>()
  for (const p of props.modelValue || []) {
    const id = Number(p?.id)
    if (Number.isFinite(id)) next.add(id)
  }
  draft.value = next
  keyword.value = ''
  page.value = 1
  visible.value = true
  void load()
}

defineExpose({ open })

function onConfirm() {
  if (!draft.value.size) {
    ElMessage.warning('还没有选券')
    return
  }
  // 🔴 顺序按「原来已选的顺序 → 新勾选的追加到后面」，
  //    避免每次打开弹窗确认都把运营排好的顺序打乱。
  const picked: CouponPick[] = []
  for (const p of props.modelValue || []) {
    const id = Number(p?.id)
    if (draft.value.has(id) && !picked.some((x) => x.id === id)) picked.push(p)
  }
  for (const r of rows.value) {
    if (draft.value.has(r.id) && !picked.some((x) => x.id === r.id)) {
      picked.push({ id: r.id, name: r.name, display_value: r.displayValue, condition: r.condition })
    }
  }
  emit('update:modelValue', picked)
  visible.value = false
  ElMessage.success(`已选择 ${picked.length} 张券`)
}
</script>

<style lang="scss" scoped>
.csel__bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
}

.csel__bar :deep(.el-input) {
  max-width: 200px;
}

.csel__count {
  font-size: 11.5px;
  color: #a89c8d;
}

.csel__body {
  min-height: 300px;
  max-height: 420px;
  overflow-y: auto;
  padding: 2px;
}

.csel__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.csel__card {
  position: relative;
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 9px 10px;
  text-align: left;
  cursor: pointer;
  background: #fffaf9;
  border: 1px solid #f6e2e0;
  border-radius: 9px;

  &:hover:not(:disabled) {
    border-color: #eab8b3;
  }

  &.is-on {
    background: #fff4f2;
    border-color: var(--el-color-primary, #c08e6e);
  }

  &.is-dim {
    opacity: 0.55;
  }

  &:disabled {
    cursor: not-allowed;
  }
}

.csel__card-amount {
  flex: none;
  min-width: 52px;
  font-size: 19px;
  font-weight: 700;
  text-align: center;
}

.csel__card-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.csel__card-name {
  overflow: hidden;
  font-size: 12.5px;
  color: #3f3a35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.csel__card-cond {
  overflow: hidden;
  font-size: 11px;
  color: #8a7d6f;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.csel__card-meta {
  display: flex;
  gap: 4px;
  align-items: center;
  margin-top: 2px;
}

.csel__tag {
  padding: 0 5px;
  font-size: 9.5px;
  font-style: normal;
  line-height: 15px;
  color: #6b5b4e;
  background: #f2ece5;
  border-radius: 3px;

  &.is-published {
    color: #1a7f4f;
    background: #e3f6ec;
  }

  &.is-draft {
    color: #8a6d3b;
    background: #fdf3dc;
  }

  &.is-disabled,
  &.is-soldout {
    color: #9ca3af;
    background: #f0f1f3;
  }

  &.is-plain {
    color: #8a7d6f;
    background: transparent;
    border: 1px solid #e6ded4;
  }
}

.csel__card-check {
  display: grid;
  place-items: center;
  flex: none;
  width: 18px;
  height: 18px;
  color: #fff;
  background: transparent;
  border: 1px solid #ddd5c9;
  border-radius: 5px;
}

.csel__card.is-on .csel__card-check {
  background: var(--el-color-primary, #c08e6e);
  border-color: var(--el-color-primary, #c08e6e);
}

.csel__pager {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: center;
  margin-top: 12px;
}

.csel__page {
  font-size: 12px;
  color: #8a7d6f;
  font-variant-numeric: tabular-nums;
}

.csel__blank {
  padding: 46px 10px;
  text-align: center;
}

.csel__blank-title {
  margin: 0;
  font-size: 13px;
  color: #5c5249;
}

.csel__blank-hint {
  margin: 4px 0 0;
  font-size: 11.5px;
  color: #a89c8d;
}

.csel__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.csel__foot-hint {
  font-size: 11.5px;
  color: #a89c8d;
}

.csel__foot-ops {
  display: flex;
  gap: 8px;
  flex: none;
}
</style>
