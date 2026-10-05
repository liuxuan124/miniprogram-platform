<template>
  <el-dialog
    :model-value="modelValue"
    title="从商品库选择专栏"
    :width="680"
    :close-on-click-modal="false"
    append-to-body
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
    @open="load"
  >
    <div class="cpk">
      <div class="cpk__bar">
        <el-input
          v-model="keyword"
          clearable
          placeholder="搜专栏名称"
          :prefix-icon="Search"
          @input="debouncedLoad"
        />
        <el-select v-model="statusFilter" style="width: 120px" @change="load">
          <el-option label="全部状态" value="" />
          <el-option label="在售" value="on_sale" />
          <el-option label="下架" value="off_sale" />
        </el-select>
        <span class="cpk__count">
          已选 <b>{{ selected.length }}</b> / {{ max }}
        </span>
      </div>

      <div class="cpk__hint">
        列表只显示商品类型为「专栏」（付费专栏）的条目 —— 这类商品在小程序端渲染为专栏卡片。
      </div>

      <div v-if="loading" class="cpk__msg">加载中…</div>
      <div v-else-if="error" class="cpk__msg cpk__msg--err">
        {{ error }}
        <el-button link type="primary" size="small" @click="load">重试</el-button>
      </div>
      <div v-else-if="!rows.length" class="cpk__msg">
        没有匹配的专栏商品。可到「商品管理 → 新建」时把类型选为「专栏」。
      </div>

      <div v-else class="cpk__body">
        <div class="cpk__list">
          <label
            v-for="p in rows"
            :key="String(p.id)"
            class="cpk__item"
            :class="{
              'is-on': isPicked(p),
              'is-disabled': !isPicked(p) && selected.length >= max,
            }"
          >
            <input
              type="checkbox"
              :checked="isPicked(p)"
              :disabled="!isPicked(p) && selected.length >= max"
              @change="toggle(p)"
            />
            <img
              v-if="p.main_image"
              class="cpk__thumb"
              :src="p.main_image"
              alt=""
              loading="lazy"
            />
            <span v-else class="cpk__thumb cpk__thumb--ph">专栏</span>
            <span class="cpk__meta">
              <b class="cpk__name">{{ p.name }}</b>
              <i class="cpk__sub">
                <template v-if="priceOf(p)">{{ priceOf(p) }}</template>
                <template v-if="p.status">· {{ statusText(p.status) }}</template>
                <template v-if="p.author_name">· {{ p.author_name }}</template>
              </i>
            </span>
          </label>
        </div>

        <div class="cpk__side">
          <div class="cpk__side-h">已选顺序</div>
          <div v-if="!selectedRows.length" class="cpk__side-empty">左侧勾选后，这里按勾选顺序排列</div>
          <ol v-else class="cpk__picked">
            <li v-for="(p, i) in selectedRows" :key="`p-${p.id}`" class="cpk__picked-item">
              <span class="cpk__picked-no">{{ i + 1 }}</span>
              <span class="cpk__picked-name">{{ p.name }}</span>
              <button type="button" class="cpk__picked-act" @click="move(i, -1)">↑</button>
              <button type="button" class="cpk__picked-act" @click="move(i, 1)">↓</button>
              <button type="button" class="cpk__picked-act cpk__picked-act--del" @click="remove(p)">✕</button>
            </li>
          </ol>
        </div>
      </div>
    </div>

    <template #footer>
      <span class="cpk__foot-tip">顺序即展示顺序，最多 {{ max }} 个</span>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="confirm">确定（{{ selected.length }}）</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
/**
 * 专栏选择弹窗（warm_columns 的「手动指定」用）。
 *
 * 为什么自己写而不用现成的 el-select：
 * 需要**封面缩略图 + 已选顺序可调** —— 专栏卡片的视觉主体就是封面，
 * 光看名字挑不出来；顺序即横滑展示顺序，必须能上下调。
 *
 * 真实数据源是 `mp_product` 里 `product_type='column'` 的行（付费专栏），
 * 不是独立的专栏表 —— 这一点原先的属性面板文案写错了（"来自首页聚合接口里的真实商品/星球"）。
 */
import { computed, ref, watch } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { getProductList } from '@/api/product'
import type { ProductRecord } from '@/types/product'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    /** 已选商品 id（保持顺序） */
    modelIds?: number[]
    /** 最多可选个数，与展示数量上限一致 */
    max?: number
  }>(),
  { modelIds: () => [], max: 10 },
)

const emit = defineEmits<{
  'update:modelValue': [boolean]
  confirm: [ids: number[]]
}>()

const rows = ref<ProductRecord[]>([])
const loading = ref(false)
const error = ref('')
const keyword = ref('')
const statusFilter = ref('')
const selected = ref<number[]>([])

let timer: ReturnType<typeof setTimeout> | null = null

function debouncedLoad() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(load, 300)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await getProductList({
      productType: 'column',
      // 后台商品列表用 current/size 还是 page/page_size，两种都带上（见 memory 的接口对齐口径）
      current: 1,
      size: 100,
      status: statusFilter.value || undefined,
      keyword: keyword.value || undefined,
    } as any)
    const data = (res as any)?.data
    const list = Array.isArray(data)
      ? data
      : data?.records || data?.list || data?.items || []
    rows.value = list
      .filter((p: ProductRecord) => p && p.id != null)
      // ⚠️ 接口的 productType 过滤未必生效（不同后端版本字段名不同），前端再兜一层
      .filter((p: any) => !p.productType || p.productType === 'column')
  } catch (e: any) {
    rows.value = []
    error.value = e?.message || '加载专栏列表失败'
  } finally {
    loading.value = false
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    // 每次打开以传入值为准，避免上次未确认的选择残留
    selected.value = [...props.modelIds]
    keyword.value = ''
    statusFilter.value = ''
    load()
  },
)

function isPicked(p: ProductRecord) {
  return selected.value.includes(p.id)
}

function toggle(p: ProductRecord) {
  const i = selected.value.indexOf(p.id)
  if (i >= 0) {
    selected.value.splice(i, 1)
    return
  }
  if (selected.value.length >= props.max) return
  selected.value.push(p.id)
}

function remove(p: ProductRecord) {
  selected.value = selected.value.filter((id) => id !== p.id)
}

function move(i: number, delta: number) {
  const next = i + delta
  if (next < 0 || next >= selected.value.length) return
  const arr = [...selected.value]
  const tmp = arr[i]
  arr[i] = arr[next]
  arr[next] = tmp
  selected.value = arr
}

/** 已选 id → 商品行；当前页没有的（跨页选择）只显示 id，避免列表跳变 */
const selectedRows = computed(() =>
  selected.value
    .map((id) => rows.value.find((p) => p.id === id))
    .filter(Boolean) as ProductRecord[],
)

function priceOf(p: ProductRecord) {
  const v = p.min_price ?? p.max_price
  return v != null && Number(v) > 0 ? `¥${Number(v).toFixed(0)}` : ''
}

function statusText(s: string) {
  return s === 'on_sale' ? '在售' : s === 'off_sale' ? '下架' : s
}

function confirm() {
  emit('confirm', [...selected.value])
  emit('update:modelValue', false)
}

defineExpose({ reload: load })
</script>

<style scoped lang="scss">
.cpk__bar {
  display: flex;
  gap: 8px;
  align-items: center;
}

.cpk__count {
  flex-shrink: 0;
  color: #7b8798;
  font-size: 12px;

  b {
    color: #c2410c;
  }
}

.cpk__hint {
  margin-top: 8px;
  padding: 7px 10px;
  color: #6b7a8d;
  font-size: 12px;
  line-height: 1.5;
  background: #f5f7fb;
  border-radius: 6px;
}

.cpk__msg {
  padding: 24px 0;
  color: #7b8798;
  font-size: 13px;
  text-align: center;
}

.cpk__msg--err {
  color: #b42318;
}

.cpk__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 224px;
  gap: 12px;
  margin-top: 12px;
}

.cpk__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 360px;
  padding-right: 4px;
  overflow-y: auto;
}

.cpk__item {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 7px 9px;
  cursor: pointer;
  border: 1px solid #e3e8f0;
  border-radius: 8px;
  transition: 0.15s;

  &:hover {
    background: #faf7f4;
    border-color: #d9c7b4;
  }

  &.is-on {
    background: #f7efe7;
    border-color: #c08e6e;
  }

  &.is-disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
}

.cpk__thumb {
  flex: 0 0 34px;
  width: 34px;
  height: 34px;
  object-fit: cover;
  border-radius: 6px;
}

.cpk__thumb--ph {
  display: grid;
  place-items: center;
  color: #b3a596;
  font-size: 11px;
  font-style: normal;
  background: #f1ece5;
}

.cpk__meta {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.cpk__name {
  overflow: hidden;
  color: #172033;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cpk__sub {
  color: #94a3b8;
  font-size: 11px;
  font-style: normal;
}

.cpk__side {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  background: #f8fafc;
  border-radius: 8px;
}

.cpk__side-h {
  color: #334155;
  font-size: 12px;
  font-weight: 600;
}

.cpk__side-empty {
  color: #94a3b8;
  font-size: 11px;
  line-height: 1.5;
}

.cpk__picked {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 0;
  margin: 0;
  overflow-y: auto;
  list-style: none;
}

.cpk__picked-item {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 5px 6px;
  background: #fff;
  border: 1px solid #e3e8f0;
  border-radius: 6px;
}

.cpk__picked-no {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  color: #fff;
  font-size: 10px;
  line-height: 16px;
  text-align: center;
  background: #c08e6e;
  border-radius: 50%;
}

.cpk__picked-name {
  flex: 1;
  overflow: hidden;
  color: #334155;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cpk__picked-act {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  padding: 0;
  color: #64748b;
  font-size: 11px;
  line-height: 1;
  background: #f1f5f9;
  border: 0;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    color: #c2410c;
  }
}

.cpk__picked-act--del:hover {
  color: #b42318;
}

.cpk__foot-tip {
  float: left;
  color: #94a3b8;
  font-size: 12px;
  line-height: 32px;
}
</style>
