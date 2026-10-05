<template>
  <div class="cp-props">
    <el-collapse v-model="openGroups" class="cp-collapse">
      <!-- ==================== 数据来源 ==================== -->
      <el-collapse-item name="source">
        <template #title>
          <span class="cp-grp-title">
            数据来源
            <span class="cp-grp-badge">
              {{ cfg.data_mode === 'auto' ? '自动读取' : `手动 · ${rows.length} 张` }}
            </span>
          </span>
        </template>

        <div class="cp-field">
          <label class="cp-label">
            来源模式
            <FieldHint text="自动读取 = 按条件从券库取；手动自选 = 自己挑几张固定展示（不改券库状态）。" />
          </label>
          <div class="cp-mode-cards">
            <button
              v-for="opt in DATA_MODE_OPTIONS"
              :key="opt.value"
              type="button"
              class="cp-mode-card"
              :class="{ 'is-on': cfg.data_mode === opt.value }"
              @click="patch({ data_mode: opt.value })"
            >
              <span class="cp-mode-card__label">{{ opt.label }}</span>
              <span class="cp-mode-card__desc">{{ opt.desc }}</span>
            </button>
          </div>
        </div>

        <!-- ---------- 自动读取 ---------- -->
        <template v-if="cfg.data_mode === 'auto'">
          <div class="cp-field">
            <label class="cp-label">
              筛选条件
              <FieldHint text="可多选。不勾任何一项 = 全部类型；「新人券」指限定新用户领取的券。" />
            </label>
            <el-checkbox-group
              class="cp-filter-group"
              :model-value="cfg.filter_types"
              @update:model-value="(v: any) => patch({ filter_types: v as CouponFilterType[] })"
            >
              <el-checkbox-tag
                v-for="opt in FILTER_OPTIONS"
                :key="opt.value"
                :value="opt.value"
                class="cp-tag"
              >
                {{ opt.label }}
              </el-checkbox-tag>
            </el-checkbox-group>
            <div class="cp-hint">
              「通用券」= 全场通用券；「满减券/折扣券」按券类型区分。
            </div>
          </div>

          <div class="cp-field">
            <label class="cp-label">
              排序方式
              <FieldHint text="按面额排序对折扣券按折扣力度折算（几折 → 相当几折让利）。" />
            </label>
            <div class="cp-sorts">
              <button
                v-for="opt in SORT_OPTIONS"
                :key="opt.value"
                type="button"
                class="cp-sort"
                :class="{ 'is-on': cfg.sort === opt.value }"
                :title="opt.desc"
                @click="patch({ sort: opt.value })"
              >
                {{ opt.label }}
              </button>
            </div>
            <div class="cp-hint">{{ sortDesc }}</div>
          </div>
        </template>

        <!-- ---------- 手动自选 ---------- -->
        <template v-else>
          <div class="cp-field">
            <label class="cp-label">
              已选优惠券
              <FieldHint text="点下面按钮挑券；选完可在这里拖拽排序、删除。顺序即展示顺序。" />
            </label>

            <div v-if="!rows.length" class="cp-blank">
              <p class="cp-blank__title">还没选券</p>
              <p class="cp-blank__hint">手动模式必须至少选 1 张，否则组件不渲染任何内容</p>
              <el-button type="primary" size="small" @click="openPicker">+ 选择优惠券</el-button>
            </div>

            <draggable
              v-else
              v-model="listProxy"
              item-key="uid"
              handle=".cp-pick__grip"
              :animation="160"
              ghost-class="cp-pick--ghost"
              class="cp-pick-list"
            >
              <template #item="{ element, index }">
                <div class="cp-pick">
                  <button
                    type="button"
                    class="cp-pick__grip"
                    :aria-label="`拖动排序第 ${index + 1} 张`"
                    title="按住拖动排序（不会删掉）"
                    @click.stop
                    @mousedown.stop
                  >
                    <el-icon :size="13"><Rank /></el-icon>
                  </button>
                  <span class="cp-pick__amount">{{ element.display_value || '—' }}</span>
                  <span class="cp-pick__main">
                    <span class="cp-pick__name">{{ element.name || `券 #${element.id}` }}</span>
                    <span class="cp-pick__cond">{{ element.condition || '' }}</span>
                  </span>
                  <button
                    type="button"
                    class="cp-pick__ico"
                    :disabled="index === 0"
                    title="上移"
                    @click="moveRow(index, -1)"
                  >
                    <el-icon><Top /></el-icon>
                  </button>
                  <button
                    type="button"
                    class="cp-pick__ico"
                    :disabled="index === rows.length - 1"
                    title="下移"
                    @click="moveRow(index, 1)"
                  >
                    <el-icon><Bottom /></el-icon>
                  </button>
                  <button
                    type="button"
                    class="cp-pick__ico cp-pick__ico--danger"
                    title="移除"
                    @click="removeRow(index)"
                  >
                    <el-icon><Delete /></el-icon>
                  </button>
                </div>
              </template>
            </draggable>

            <div class="cp-pick-ops">
              <el-button type="primary" size="small" @click="openPicker">+ 选择优惠券</el-button>
              <el-button v-if="rows.length" size="small" @click="openPicker">重新挑选</el-button>
            </div>
          </div>
        </template>

        <!-- ---------- 展示数量 ---------- -->
        <div class="cp-field">
          <label class="cp-label">
            展示数量
            <FieldHint text="1~10 张。手动模式超出已选张数时按已选数量展示，不会补空位。" />
          </label>
          <NumSliderRow
            :model-value="cfg.display_limit"
            :min="LIMIT.min"
            :max="LIMIT.max"
            :step="LIMIT.step"
            :fallback="LIMIT.fallback"
            @update:model-value="(v: number) => patch({ display_limit: v })"
          />
          <div v-if="cfg.data_mode === 'manual' && rows.length < cfg.display_limit" class="cp-warn">
            <el-icon><WarningFilled /></el-icon>
            <span>已选 {{ rows.length }} 张，少于展示数量 {{ cfg.display_limit }}，多余的位会留空。</span>
          </div>
        </div>
      </el-collapse-item>

      <!-- ==================== 标题栏 ==================== -->
      <el-collapse-item name="header">
        <template #title>
          <span class="cp-grp-title">
            标题栏
            <span class="cp-grp-badge">{{ cfg.title || '未命名' }}{{ cfg.show_more ? ' · 含更多' : '' }}</span>
          </span>
        </template>

        <div class="cp-field">
          <label class="cp-label">主标题</label>
          <el-input
            :model-value="cfg.title"
            size="small"
            clearable
            maxlength="12"
            placeholder="领券中心"
            @update:model-value="(v: string) => patch({ title: v })"
          />
        </div>

        <div class="cp-field">
          <div class="cp-switch-row">
            <span class="cp-switch-row__label">
              显示「查看更多」
              <FieldHint text="开启后在标题右侧显示一个入口，可配文案与跳转。" />
            </span>
            <el-switch
              :model-value="cfg.show_more"
              @update:model-value="(v: boolean) => patch({ show_more: v })"
            />
          </div>
        </div>

        <template v-if="cfg.show_more">
          <div class="cp-field">
            <label class="cp-label cnp-label--sub">入口文案</label>
            <el-input
              :model-value="cfg.more_text"
              size="small"
              clearable
              maxlength="6"
              placeholder="更多"
              @update:model-value="(v: string) => patch({ more_text: v })"
            />
          </div>

          <div class="cp-field">
            <label class="cp-label cnp-label--sub">
              跳转链接
              <FieldHint text="点按钮从页面 / 商品 / 内容里选，不用手打路径。" />
            </label>
            <button type="button" class="cp-link" @click="linkPickerRef?.open()">
              <span class="cp-link__tag">{{ moreLinkTag }}</span>
              <span class="cp-link__text">{{ cfg.more_link || '未设置（点了不跳转）' }}</span>
              <span class="cp-link__act">{{ cfg.more_link ? '重新选择' : '选择' }}</span>
            </button>
          </div>
        </template>
      </el-collapse-item>

      <!-- ==================== 按钮与兜底 ==================== -->
      <el-collapse-item name="button">
        <template #title>
          <span class="cp-grp-title">
            按钮与兜底
            <span class="cp-grp-badge">{{ cfg.claim_text }} / {{ cfg.use_text }} / {{ cfg.sold_out_text }}</span>
          </span>
        </template>

        <div class="cp-three">
          <div class="cp-three__cell">
            <span class="cp-three__label">待领取</span>
            <el-input
              :model-value="cfg.claim_text"
              size="small"
              clearable
              maxlength="6"
              @update:model-value="(v: string) => patch({ claim_text: v })"
            />
          </div>
          <div class="cp-three__cell">
            <span class="cp-three__label">已领取</span>
            <el-input
              :model-value="cfg.use_text"
              size="small"
              clearable
              maxlength="6"
              @update:model-value="(v: string) => patch({ use_text: v })"
            />
          </div>
          <div class="cp-three__cell">
            <span class="cp-three__label">已抢光</span>
            <el-input
              :model-value="cfg.sold_out_text"
              size="small"
              clearable
              maxlength="6"
              @update:model-value="(v: string) => patch({ sold_out_text: v })"
            />
          </div>
        </div>

        <div class="cp-field">
          <div class="cp-switch-row">
            <span class="cp-switch-row__label">
              无可用优惠券时自动隐藏组件
              <FieldHint text="开启后：券全部领完/过期时整块不渲染，页面不留空壳。关闭则显示占位文案。" />
            </span>
            <el-switch
              :model-value="cfg.auto_hide_when_empty"
              @update:model-value="(v: boolean) => patch({ auto_hide_when_empty: v })"
            />
          </div>
          <div class="cp-hint">
            {{ cfg.auto_hide_when_empty
              ? '当前：会隐藏。这是更安全的默认——券抢光后页面不该留一块空白。'
              : '当前：会显示占位文案「暂无可用券」。适合同步页/长期挂载场景。' }}
          </div>
        </div>
      </el-collapse-item>
    </el-collapse>

    <CouponSelectDialog
      ref="pickerRef"
      :model-value="cfg.manual_items"
      @update:model-value="(v) => patch({ manual_items: v })"
    />
    <!-- 「查看更多」跳转：复用分类导航那套树状/搜索选择器（有 open() 弹窗能力），
         LinkPickerField 是内联表单且无 open()，做不了「点按钮弹面板」。 -->
    <CategoryLinkPicker
      ref="linkPickerRef"
      :model-value="cfg.more_link"
      @update:model-value="(v: string) => patch({ more_link: v })"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import draggable from 'vuedraggable'
import { Bottom, Delete, Rank, Top, WarningFilled } from '@element-plus/icons-vue'
import FieldHint from '../FieldHint.vue'
import NumSliderRow from './NumSliderRow.vue'
import CategoryLinkPicker from '../categoryNav/CategoryLinkPicker.vue'
import CouponSelectDialog from '../coupon/CouponSelectDialog.vue'
import {
  COUPON_DATA_MODE_OPTIONS,
  COUPON_FILTER_OPTIONS,
  COUPON_LIMIT,
  COUPON_SORT_OPTIONS,
  normalizeCouponProps,
  type CouponFilterType,
  type CouponPick,
  type CouponProps as CouponConfig,
  type CouponSort,
} from '../coupon/couponSchema'

const props = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const DATA_MODE_OPTIONS = COUPON_DATA_MODE_OPTIONS
const FILTER_OPTIONS = COUPON_FILTER_OPTIONS
const SORT_OPTIONS = COUPON_SORT_OPTIONS
const LIMIT = COUPON_LIMIT

const cfg = computed<CouponConfig>(() => normalizeCouponProps(props.props))
const openGroups = ref<string[]>(['source', 'header', 'button'])
const pickerRef = ref<InstanceType<typeof CouponSelectDialog> | null>(null)
const linkPickerRef = ref<InstanceType<typeof CategoryLinkPicker> | null>(null)

const sortDesc = computed(() => SORT_OPTIONS.find((o) => o.value === cfg.value.sort)?.desc || '')

const LINK_TAG_TEXT: Record<string, string> = {
  page: '页面',
  product: '商品',
  content: '内容',
  webview: '网页',
  url: '链接',
  miniapp: '小程序',
  none: '无跳转',
}

const moreLinkTag = computed(() => {
  const raw = cfg.value.more_link
  if (!raw) return '无跳转'
  if (raw.startsWith('http')) return '网页'
  if (raw.includes('product-detail')) return '商品'
  return '页面'
})

/* ---------------- 手动选券列表 ---------------- */

/**
 * 直接 v-model 到 cfg 会踩与 Search/CategoryNav 同样的坑：
 * 归一化会过滤非法 id，直接驱动会让「刚加的空行」在界面上抖动。
 * 这里用本地 rows 承载 uid（拖拽需要稳定 key），落库时剥掉。
 */
interface PickRow extends CouponPick {
  uid: string
}

let uidSeed = 0
function nextUid() {
  uidSeed += 1
  return `cpk_${uidSeed.toString(36)}`
}

const rows = ref<PickRow[]>(cfg.value.manual_items.map((it) => ({ ...it, uid: nextUid() })))
let lastEmitted = JSON.stringify(cfg.value.manual_items)

/** vuedraggable 需要可写数组；setter 收到的是重排后的完整列表，整体回写即可 */
const listProxy = computed<PickRow[]>({
  get: () => rows.value,
  set: (next) => {
    rows.value = next
    flushRows()
  },
})

/** 本地行 → 纯业务字段（剥掉 uid 再落库） */
function flushRows() {
  const next = rows.value.map(({ uid: _uid, ...rest }) => ({
    id: Number(rest.id),
    name: String(rest.name || ''),
    display_value: String(rest.display_value || ''),
    condition: String(rest.condition || ''),
  }))
  lastEmitted = JSON.stringify(next)
  patch({ manual_items: next })
}

/**
 * 外部改动（撤销 / 重置默认 / 切换组件）时重建本地行。
 * lastEmitted 守卫防「自己写回的结果把自己覆盖」——
 * 否则拖完一次序，列表会立刻被回写值重排一次，手感是「松手又弹回去」。
 */
watch(
  () => JSON.stringify(normalizeCouponProps(props.props).manual_items),
  (incoming) => {
    if (incoming === lastEmitted) return
    const list = JSON.parse(incoming) as CouponPick[]
    rows.value = (Array.isArray(list) ? list : []).map((it) => ({ ...it, uid: nextUid() }))
    lastEmitted = incoming
  },
)

function patch(partial: Record<string, unknown>) {
  emit('update', { ...partial })
}

function openPicker() {
  pickerRef.value?.open()
}

function removeRow(index: number) {
  rows.value = rows.value.filter((_, i) => i !== index)
  flushRows()
}

/** 上移/下移：拖不动时也能用按钮调序（触屏端拖拽精度低，按钮更稳） */
function moveRow(index: number, delta: number) {
  const target = index + delta
  if (target < 0 || target >= rows.value.length) return
  const next = [...rows.value]
  const [moved] = next.splice(index, 1)
  next.splice(target, 0, moved)
  rows.value = next
  flushRows()
}
</script>

<style lang="scss" scoped>
.cp-collapse {
  border: 0;

  :deep(.el-collapse-item__header),
  :deep(.el-collapse-item__wrap) {
    border-bottom-color: #efe9e0;
  }

  /* 🔴 line-height 必须归零：header 默认 line-height 会被内部 <span> badge 继承 */
  :deep(.el-collapse-item__header) {
    height: 38px;
    padding: 0 2px;
    font-size: 13px;
    font-weight: 600;
    line-height: 1;
    color: #3f3a35;
  }

  :deep(.el-collapse-item__content) {
    padding: 4px 2px 14px;
  }
}

.cp-grp-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  line-height: 1;
}

.cp-grp-badge {
  display: inline-flex;
  align-items: center;
  flex: none;
  max-width: 168px;
  /* 🔴 必须显式给 height + line-height：badge 是 <span>，
     会继承 el-collapse-item__header 的 line-height（实测 48px）被撑成竖长条 */
  height: 17px;
  padding: 0 6px;
  overflow: hidden;
  font-size: 10.5px;
  font-weight: 400;
  line-height: 17px;
  color: #a89c8d;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: #f7f3ec;
  border-radius: 5px;
}

.cp-field {
  margin-top: 12px;
}

.cp-field:first-child {
  margin-top: 2px;
}

.cp-label {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
  font-size: 12px;
  color: #6b5b4e;
}

.cnp-label--sub {
  color: #8a7d6f;
}

.cp-hint {
  margin-top: 6px;
  font-size: 11px;
  line-height: 1.5;
  color: #a89c8d;
}

.cp-warn {
  display: flex;
  gap: 5px;
  align-items: flex-start;
  margin-top: 7px;
  font-size: 11px;
  line-height: 1.5;
  color: #a4763a;

  .el-icon {
    flex-shrink: 0;
    margin-top: 2px;
  }
}

/* ---------- 模式卡 ---------- */
.cp-mode-cards {
  display: flex;
  gap: 6px;
}

.cp-mode-card {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  text-align: left;
  cursor: pointer;
  background: #fff;
  border: 1px solid #e8e2d9;
  border-radius: 8px;

  &:hover {
    border-color: #d8cfc2;
  }

  &.is-on {
    background: #fdf6f1;
    border-color: var(--el-color-primary, #c08e6e);
  }
}

.cp-mode-card__label {
  font-size: 12.5px;
  font-weight: 600;
  color: #3f3a35;
}

.cp-mode-card__desc {
  font-size: 11px;
  line-height: 1.4;
  color: #a89c8d;
}

.cp-mode-card.is-on .cp-mode-card__label {
  color: var(--el-color-primary, #c08e6e);
}

/* ---------- 筛选 / 排序 ---------- */
.cp-filter-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.cp-tag {
  font-size: 12px;
  border-radius: 7px;
}

.cp-sorts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.cp-sort {
  flex: 1 1 auto;
  min-width: 88px;
  padding: 6px 6px;
  font-family: inherit;
  font-size: 12px;
  color: #6b5b4e;
  cursor: pointer;
  background: #fff;
  border: 1px solid #e8e2d9;
  border-radius: 7px;

  &:hover {
    border-color: #d8cfc2;
  }

  &.is-on {
    font-weight: 600;
    color: var(--el-color-primary, #c08e6e);
    background: #fdf6f1;
    border-color: var(--el-color-primary, #c08e6e);
  }
}

/* ---------- 空态 ---------- */
.cp-blank {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 10px;
  text-align: center;
  background: #faf8f5;
  border: 1px dashed #ddd5c9;
  border-radius: 9px;
}

.cp-blank__title {
  margin: 0;
  font-size: 12.5px;
  color: #5c5249;
}

.cp-blank__hint {
  margin: 3px 0 10px;
  font-size: 11px;
  color: #a89c8d;
}

/* ---------- 已选券列表 ---------- */
.cp-pick-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cp-pick {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 6px 8px 6px 4px;
  background: #fff;
  border: 1px solid #e8e2d9;
  border-radius: 8px;

  &:hover {
    border-color: #d8cfc2;
  }
}

.cp-pick--ghost {
  background: #f3ede4;
  border-style: dashed;
}

.cp-pick__grip {
  display: grid;
  place-items: center;
  flex: none;
  width: 18px;
  height: 24px;
  padding: 0;
  color: #c2b6a8;
  cursor: grab;
  background: transparent;
  border: 0;
  border-radius: 4px;

  &:hover {
    color: #8a7c6e;
    background: #efe9e2;
  }

  &:active {
    cursor: grabbing;
  }
}

.cp-pick__amount {
  flex: none;
  min-width: 44px;
  font-size: 14px;
  font-weight: 700;
  color: #f56c6c;
  text-align: center;
}

.cp-pick__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.cp-pick__name {
  overflow: hidden;
  font-size: 12.5px;
  color: #3f3a35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cp-pick__cond {
  overflow: hidden;
  font-size: 10.5px;
  color: #a89c8d;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cp-pick__ico {
  display: grid;
  place-items: center;
  flex: none;
  width: 22px;
  height: 22px;
  padding: 0;
  color: #8a7d6f;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 5px;

  &:hover:not(:disabled) {
    color: var(--el-color-primary, #c08e6e);
    background: #f6f2ec;
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
}

.cp-pick__ico--danger:hover:not(:disabled) {
  color: #c0392b;
  background: #fdeeec;
}

.cp-pick-ops {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

/* ---------- 开关行 ---------- */
.cp-switch-row {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
}

.cp-switch-row__label {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #6b5b4e;
}

/* ---------- 三列文案 ---------- */
.cp-three {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.cp-three__cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.cp-three__label {
  font-size: 11px;
  color: #8a7d6f;
}

/* ---------- 链接 ---------- */
.cp-link {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
  padding: 6px 8px;
  text-align: left;
  cursor: pointer;
  background: #faf8f5;
  border: 1px solid #e8e2d9;
  border-radius: 7px;

  &:hover {
    border-color: var(--el-color-primary, #c08e6e);
  }
}

.cp-link__tag {
  flex: none;
  padding: 1px 7px;
  font-size: 11px;
  color: var(--el-color-primary, #c08e6e);
  background: #fff;
  border-radius: 6px;
}

.cp-link__text {
  flex: 1;
  overflow: hidden;
  font-size: 11.5px;
  color: #6b5b4e;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cp-link__act {
  flex: none;
  font-size: 11px;
  color: #a89c8d;
}

/* LinkPickerField 复用但视觉上隐藏：它的展开态是内联表单，
   这里要的是「点按钮弹面板」，故用 ref 调open() 后立即收起内联渲染。
   display:none 会让它拿不到尺寸，故用零尺寸定位而非 display:none。 */
.cp-hidden-picker {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}
</style>
