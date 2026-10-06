<template>
  <div class="fs-props">
    <el-collapse v-model="openGroups" class="fs-collapse">
      <!-- ==================== 标题栏与倒计时 ==================== -->
      <el-collapse-item name="header">
        <template #title>
          <span class="fs-grp-title">
            标题与倒计时
            <span class="fs-grp-badge">{{ countdownBadge }}</span>
          </span>
        </template>

        <!-- 主标题 + 图标 -->
        <div class="fs-field">
          <label class="fs-label">主标题</label>
          <div class="fs-title-row">
            <button
              type="button"
              class="fs-icon-trigger"
              :class="{ 'is-empty': !cfg.title_icon }"
              title="点击选择标题图标"
              @click="iconPickerIndex = 0"
            >
              <img v-if="isImageIcon(cfg.title_icon)" :src="cfg.title_icon" alt="" />
              <span v-else-if="cfg.title_icon">{{ cfg.title_icon }}</span>
              <span v-else class="fs-icon-trigger__default">⏱</span>
            </button>
            <el-input
              class="fs-title-row__input"
              :model-value="cfg.title"
              size="small"
              clearable
              maxlength="12"
              placeholder="限时秒杀"
              @update:model-value="(v: string) => patch({ title: v })"
            />
            <el-button v-if="cfg.title_icon" size="small" text @click="patch({ title_icon: '' })">清除</el-button>
          </div>
          <div class="fs-hint">左侧图标留空则用默认时钟；可换成 emoji 或上传图片。</div>
        </div>

        <!-- 右侧操作区 -->
        <div class="fs-field">
          <div class="fs-switch-row">
            <span class="fs-switch-row__label">
              显示「查看全部」
              <FieldHint text="开启后标题右侧出现入口，可配文案与跳转。" />
            </span>
            <el-switch
              :model-value="cfg.show_more"
              @update:model-value="(v: boolean) => patch({ show_more: v })"
            />
          </div>
        </div>

        <template v-if="cfg.show_more">
          <div class="fs-field">
            <label class="fs-label fs-label--sub">入口文案</label>
            <el-input
              :model-value="cfg.more_text"
              size="small"
              clearable
              maxlength="6"
              placeholder="更多"
              @update:model-value="(v: string) => patch({ more_text: v })"
            />
          </div>
          <div class="fs-field">
            <label class="fs-label fs-label--sub">
              跳转路由
              <FieldHint text="点按钮从页面 / 商品 / 内容里选，不用手打路径。" />
            </label>
            <button type="button" class="fs-link" @click="linkPickerRef?.open()">
              <span class="fs-link__tag">{{ moreLinkTag }}</span>
              <span class="fs-link__text">{{ cfg.more_link || '未设置（点了不跳转）' }}</span>
              <span class="fs-link__act">{{ cfg.more_link ? '重新选择' : '选择' }}</span>
            </button>
          </div>
        </template>

        <!-- 倒计时 -->
        <div class="fs-field">
          <div class="fs-switch-row">
            <span class="fs-switch-row__label">
              显示倒计时
              <FieldHint text="超过 24 小时自动显示「X天 HH:mm:ss」，否则「HH:mm:ss」。" />
            </span>
            <el-switch
              :model-value="cfg.countdown"
              @update:model-value="onCountdownToggle"
            />
          </div>
        </div>

        <template v-if="cfg.countdown">
          <!-- 实时预览 -->
          <div class="fs-field">
            <label class="fs-label fs-label--sub">当前预览</label>
            <div class="fs-count-preview" :class="`is-${cfg.countdown_style}`">
              <template v-if="cfg.countdown_style === 'flip'">
                <span class="fs-count-preview__label">{{ previewPrefix }}</span>
                <span v-if="previewParts.showDays" class="fs-count-preview__cell">{{ previewParts.days }}天</span>
                <span class="fs-count-preview__cell">{{ pad(previewParts.hours) }}</span>
                <span class="fs-count-preview__cell">{{ pad(previewParts.minutes) }}</span>
                <span class="fs-count-preview__cell">{{ pad(previewParts.secondsOfMinute) }}</span>
              </template>
              <template v-else>
                {{ previewPrefix }} {{ previewParts.text }}
              </template>
            </div>
            <div v-if="!cfg.start_time" class="fs-hint">
              未设置「开始时间」，倒计时固定按{{ previewPrefix }}计算。
            </div>
          </div>

          <div class="fs-field">
            <label class="fs-label fs-label--sub">
              倒计时风格
              <FieldHint text="方块翻牌器用主题色做高对比底；极简纯文本不抢标题视线。" />
            </label>
            <BuilderSegmented
              :model-value="cfg.countdown_style"
              block
              :options="COUNTDOWN_STYLE_OPTIONS"
              @update:model-value="(v) => patch({ countdown_style: v as CountdownStyle })"
            />
          </div>

          <div class="fs-field">
            <label class="fs-label fs-label--sub">
              开始时间
              <FieldHint text="选填。填了且未到该时间时显示「距开始」文案；不填则只按结束时间算。" />
            </label>
            <input
              type="datetime-local"
              class="fs-datetime"
              :value="startLocal"
              step="60"
              @input="onStartInput"
            />
            <el-button v-if="cfg.start_time" size="small" text @click="patch({ start_time: '' })">
              清除开始时间
            </el-button>
          </div>

          <div class="fs-field">
            <label class="fs-label fs-label--sub">结束时间</label>
            <input
              type="datetime-local"
              class="fs-datetime"
              :value="endLocal"
              :min="minLocal"
              step="60"
              @input="onEndInput"
            />
            <div class="fs-quick">
              <button
                v-for="h in QUICK_HOURS"
                :key="h"
                type="button"
                class="fs-quick__btn"
                @click="setQuickHours(h)"
              >{{ h }}小时后</button>
              <button type="button" class="fs-quick__btn" @click="setQuickHours(24 * 3)">3天后</button>
            </div>
            <div class="fs-hint">
              「3天后」用于验证「X天 HH:mm:ss」折算 —— 会显示成「3天 HH:mm:ss」而不是「72:00:00」。
            </div>
          </div>

          <div class="fs-field">
            <label class="fs-label fs-label--sub">状态文案</label>
            <div class="fs-two">
              <div class="fs-two__cell">
                <span class="fs-two__label">未开始</span>
                <el-input
                  :model-value="cfg.pending_text"
                  size="small"
                  clearable
                  maxlength="6"
                  @update:model-value="(v: string) => patch({ pending_text: v })"
                />
              </div>
              <div class="fs-two__cell">
                <span class="fs-two__label">进行中</span>
                <el-input
                  :model-value="cfg.running_text"
                  size="small"
                  clearable
                  maxlength="6"
                  @update:model-value="(v: string) => patch({ running_text: v })"
                />
              </div>
            </div>
          </div>
        </template>
      </el-collapse-item>

      <!-- ==================== 数据来源 ==================== -->
      <el-collapse-item name="source">
        <template #title>
          <span class="fs-grp-title">
            数据来源
            <span class="fs-grp-badge">
              {{ cfg.data_mode === 'activity' ? '自动关联活动' : `手动 · ${rows.length} 件` }}
            </span>
          </span>
        </template>

        <div class="fs-field">
          <label class="fs-label">
            来源模式
            <FieldHint text="自动关联 = 取当前进行中的秒杀活动；手动自选 = 自己挑商品并配秒杀价与库存。" />
          </label>
          <div class="fs-mode-cards">
            <button
              v-for="opt in DATA_MODE_OPTIONS"
              :key="opt.value"
              type="button"
              class="fs-mode-card"
              :class="{ 'is-on': cfg.data_mode === opt.value }"
              @click="patch({ data_mode: opt.value })"
            >
              <span class="fs-mode-card__label">{{ opt.label }}</span>
              <span class="fs-mode-card__desc">{{ opt.desc }}</span>
            </button>
          </div>
        </div>

        <div v-if="cfg.data_mode === 'manual'" class="fs-field">
          <label class="fs-label fs-label--sub">
            已选商品
            <FieldHint text="点下面按钮挑商品；选完可拖拽排序、删除。顺序即展示顺序。" />
          </label>

          <div v-if="!rows.length" class="fs-blank">
            <p class="fs-blank__title">还没选商品</p>
            <p class="fs-blank__hint">手动模式必须至少选 1 件，否则组件不渲染商品</p>
            <el-button type="primary" size="small" @click="openProductDialog">+ 选择秒杀商品</el-button>
          </div>

          <draggable
            v-else
            v-model="listProxy"
            item-key="uid"
            handle=".fs-pick__grip"
            :animation="160"
            ghost-class="fs-pick--ghost"
            class="fs-pick-list"
          >
            <template #item="{ element, index }">
              <div class="fs-pick">
                <button
                  type="button"
                  class="fs-pick__grip"
                  :aria-label="`拖动排序第 ${index + 1} 件`"
                  title="按住拖动排序（不会删掉）"
                  @click.stop
                  @mousedown.stop
                >
                  <el-icon :size="13"><Rank /></el-icon>
                </button>
                <span class="fs-pick__main">
                  <span class="fs-pick__name">{{ element.name || `商品 #${index + 1}` }}</span>
                  <span class="fs-pick__meta">
                    <em class="fs-pick__price">¥{{ element.price || '--' }}</em>
                    <em v-if="Number(element.stock) > 0" class="fs-pick__stock">
                      库存 {{ element.stock }} · 已售 {{ Number(element.sold) || 0 }}
                    </em>
                    <em v-else class="fs-pick__stock fs-pick__stock--none">未设库存</em>
                  </span>
                </span>
                <button
                  type="button"
                  class="fs-pick__ico"
                  :disabled="index === 0"
                  title="上移"
                  @click="moveRow(index, -1)"
                >
                  <el-icon><Top /></el-icon>
                </button>
                <button
                  type="button"
                  class="fs-pick__ico"
                  :disabled="index === rows.length - 1"
                  title="下移"
                  @click="moveRow(index, 1)"
                >
                  <el-icon><Bottom /></el-icon>
                </button>
                <button
                  type="button"
                  class="fs-pick__ico fs-pick__ico--danger"
                  title="移除"
                  @click="removeRow(index)"
                >
                  <el-icon><Delete /></el-icon>
                </button>
              </div>
            </template>
          </draggable>

          <div class="fs-pick-ops">
            <el-button type="primary" size="small" @click="openProductDialog">
              {{ rows.length ? '+ 继续添加' : '+ 选择秒杀商品' }}
            </el-button>
          </div>
        </div>

        <div class="fs-field">
          <div class="fs-switch-row">
            <span class="fs-switch-row__label">
              活动结束或商品售罄时自动隐藏组件
              <FieldHint text="开启后无活动/全部售罄时整块不渲染，页面不留空壳。" />
            </span>
            <el-switch
              :model-value="cfg.auto_hide_when_done"
              @update:model-value="(v: boolean) => patch({ auto_hide_when_done: v })"
            />
          </div>
        </div>

        <div class="fs-field">
          <label class="fs-label fs-label--sub">商品数量</label>
          <NumSliderRow
            :model-value="cfg.limit"
            :min="LIMIT.min"
            :max="LIMIT.max"
            :step="LIMIT.step"
            :fallback="LIMIT.fallback"
            @update:model-value="(v: number) => patch({ limit: v })"
              semantic="count"
          />
        </div>
      </el-collapse-item>

      <!-- ==================== 卡片展示要素 ==================== -->
      <el-collapse-item name="display">
        <template #title>
          <span class="fs-grp-title">
            展示要素
            <span class="fs-grp-badge">{{ displaySummary }}</span>
          </span>
        </template>

        <div class="fs-field">
          <div class="fs-switch-row">
            <span class="fs-switch-row__label">显示划线原价</span>
            <el-switch
              :model-value="cfg.show_original_price"
              @update:model-value="(v: boolean) => patch({ show_original_price: v })"
            />
          </div>
          <div class="fs-switch-row">
            <span class="fs-switch-row__label">
              显示抢购进度条
              <FieldHint text="开启后展示已抢百分比与进度条。库存未设时不显示。" />
            </span>
            <el-switch
              :model-value="cfg.show_progress"
              @update:model-value="(v: boolean) => patch({ show_progress: v })"
            />
          </div>
          <div class="fs-switch-row">
            <span class="fs-switch-row__label">显示卡片抢购按钮</span>
            <el-switch
              :model-value="cfg.show_buy_button"
              @update:model-value="(v: boolean) => patch({ show_buy_button: v })"
            />
          </div>
        </div>

        <template v-if="cfg.show_buy_button">
          <div class="fs-field">
            <label class="fs-label fs-label--sub">
              按钮文案
              <FieldHint text="售罄/结束态自动置灰，不需要单独配灰度色。" />
            </label>
            <div class="fs-three">
              <div class="fs-three__cell">
                <span class="fs-three__label">进行中</span>
                <el-input
                  :model-value="cfg.buy_text_running"
                  size="small"
                  clearable
                  maxlength="6"
                  @update:model-value="(v: string) => patch({ buy_text_running: v })"
                />
              </div>
              <div class="fs-three__cell">
                <span class="fs-three__label">预热中</span>
                <el-input
                  :model-value="cfg.buy_text_pending"
                  size="small"
                  clearable
                  maxlength="6"
                  @update:model-value="(v: string) => patch({ buy_text_pending: v })"
                />
              </div>
              <div class="fs-three__cell">
                <span class="fs-three__label">已售罄</span>
                <el-input
                  :model-value="cfg.buy_text_soldout"
                  size="small"
                  clearable
                  maxlength="6"
                  @update:model-value="(v: string) => patch({ buy_text_soldout: v })"
                />
              </div>
            </div>
          </div>
        </template>

        <div class="fs-field">
          <label class="fs-label fs-label--sub">
            角标
            <FieldHint text="自动折扣率按「秒杀价 / 原价」算，如 ¥50 秒杀 ¥25 显示「5折」；价格缺失时不显示角标。" />
          </label>
          <div class="fs-modes">
            <button
              v-for="opt in BADGE_OPTIONS"
              :key="opt.value"
              type="button"
              class="fs-mode"
              :class="{ 'is-on': cfg.badge_mode === opt.value }"
              :title="opt.desc"
              @click="patch({ badge_mode: opt.value })"
            >
              {{ opt.label }}
            </button>
          </div>
          <div v-if="cfg.badge_mode === 'custom'" class="fs-field fs-field--tight">
            <el-input
              :model-value="cfg.badge_text"
              size="small"
              clearable
              maxlength="4"
              placeholder="如 爆款 / 新品"
              @update:model-value="(v: string) => patch({ badge_text: v })"
            />
            <span class="fs-count">{{ (cfg.badge_text || '').length }}/4</span>
          </div>
        </div>
      </el-collapse-item>
    </el-collapse>

    <CategoryIconPicker
      v-if="iconPickerIndex >= 0"
      :model-value="cfg.title_icon"
      @update:model-value="(v: string) => { patch({ title_icon: v }); iconPickerIndex = -1 }"
    />
    <CategoryLinkPicker
      ref="linkPickerRef"
      :model-value="cfg.more_link"
      @update:model-value="(v: string) => patch({ more_link: v })"
    />
    <FlashSaleProductDialog
      ref="productDialogRef"
      :model-value="cfg.manual_items"
      @update:model-value="(v) => patch({ manual_items: v })"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import draggable from 'vuedraggable'
import { Bottom, Delete, Rank, Top } from '@element-plus/icons-vue'
import BuilderSegmented from '../BuilderSegmented.vue'
import FieldHint from '../FieldHint.vue'
import NumSliderRow from './NumSliderRow.vue'
import CategoryIconPicker from '../categoryNav/CategoryIconPicker.vue'
import CategoryLinkPicker from '../categoryNav/CategoryLinkPicker.vue'
import FlashSaleProductDialog from '../flashSale/FlashSaleProductDialog.vue'
import {
  COUNTDOWN_STYLE_OPTIONS as COUNTDOWN_STYLES,
  FLASH_SALE_BADGE_OPTIONS,
  FLASH_SALE_DATA_MODE_OPTIONS,
  FLASH_SALE_LIMIT,
  buildCountdownParts,
  defaultFlashSaleEndTime,
  normalizeFlashSaleProps,
  parseFlashSaleTime,
  type CountdownStyle,
  type FlashSaleItem,
  type FlashSaleProps as FlashConfig,
} from '../flashSale/flashSaleSchema'
import { isImageIcon } from '../categoryNav/categoryNavSchema'

const props = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const DATA_MODE_OPTIONS = FLASH_SALE_DATA_MODE_OPTIONS
const COUNTDOWN_STYLE_OPTIONS = COUNTDOWN_STYLES
const BADGE_OPTIONS = FLASH_SALE_BADGE_OPTIONS
const LIMIT = FLASH_SALE_LIMIT
const QUICK_HOURS = [1, 2, 24]

const cfg = computed<FlashConfig>(() => normalizeFlashSaleProps(props.props))
const openGroups = ref<string[]>(['header', 'source', 'display'])
const iconPickerIndex = ref(-1)
const linkPickerRef = ref<InstanceType<typeof CategoryLinkPicker> | null>(null)
const productDialogRef = ref<InstanceType<typeof FlashSaleProductDialog> | null>(null)

/* ---------------- 倒计时预览（每 10 秒刷一次即可看清折算） ---------------- */
const now = ref(Date.now())
const tickTimer = setInterval(() => { now.value = Date.now() }, 1000)
onUnmounted(() => clearInterval(tickTimer))

const previewParts = computed(() =>
  buildCountdownParts(
    parseFlashSaleTime(cfg.value.end_time),
    parseFlashSaleTime(cfg.value.start_time),
    now.value,
  ),
)

const previewPrefix = computed(() => {
  if (previewParts.value.expired) return '已结束'
  return previewParts.value.pending ? cfg.value.pending_text : cfg.value.running_text
})

const countdownBadge = computed(() => {
  if (!cfg.value.countdown) return '倒计时已关'
  return previewParts.value.expired ? '已结束' : `${previewPrefix.value} ${previewParts.value.text}`
})

const displaySummary = computed(() => {
  const on: string[] = []
  if (cfg.value.show_original_price) on.push('原价')
  if (cfg.value.show_progress) on.push('进度')
  if (cfg.value.show_buy_button) on.push('按钮')
  if (cfg.value.badge_mode !== 'none') on.push('角标')
  return on.length ? on.join(' / ') : '全隐藏'
})

const moreLinkTag = computed(() => {
  const raw = cfg.value.more_link
  if (!raw) return '无跳转'
  if (raw.startsWith('http')) return '网页'
  if (raw.includes('product-detail')) return '商品'
  return '页面'
})

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/* ---------------- 手动商品列表 ---------------- */

/**
 * 本地rows + lastEmitted 守卫（与 Search/CategoryNav/Coupon 同一套路）：
 * 归一化会过滤非法 id，直接 v-model 会让「刚加的空行」在界面上抖动。
 */
interface PickRow extends FlashSaleItem {
  uid: string
}

let uidSeed = 0
function nextUid() {
  uidSeed += 1
  return `fsp_${uidSeed.toString(36)}`
}

const rows = ref<PickRow[]>(cfg.value.manual_items.map((it) => ({ ...it, uid: nextUid() })))
let lastEmitted = JSON.stringify(cfg.value.manual_items)

const listProxy = computed<PickRow[]>({
  get: () => rows.value,
  set: (next) => {
    rows.value = next
    flushRows()
  },
})

function flushRows() {
  const next = rows.value.map(({ uid: _uid, ...rest }) => ({ ...rest }))
  lastEmitted = JSON.stringify(next)
  patch({ manual_items: next, items: next })
}

watch(
  () => JSON.stringify(normalizeFlashSaleProps(props.props).manual_items),
  (incoming) => {
    if (incoming === lastEmitted) return
    const list = JSON.parse(incoming) as FlashSaleItem[]
    rows.value = (Array.isArray(list) ? list : []).map((it) => ({ ...it, uid: nextUid() }))
    lastEmitted = incoming
  },
)

function removeRow(index: number) {
  rows.value = rows.value.filter((_, i) => i !== index)
  flushRows()
}

function moveRow(index: number, delta: number) {
  const target = index + delta
  if (target < 0 || target >= rows.value.length) return
  const next = [...rows.value]
  const [moved] = next.splice(index, 1)
  next.splice(target, 0, moved)
  rows.value = next
  flushRows()
}

function openProductDialog() {
  productDialogRef.value?.open()
}

/* ---------------- patch ---------------- */
function patch(partial: Record<string, unknown>) {
  emit('update', { ...partial })
}

function onCountdownToggle(v: boolean) {
  // 开启时若没有结束时间，给个 2 小时后的默认值（否则画布只能显示「请设置结束时间」）
  patch({ countdown: v, ...(v && !cfg.value.end_time ? { end_time: defaultFlashSaleEndTime() } : {}) })
}

/* ---------------- 时间输入 ---------------- */
function formatDateTime(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function toLocal(raw?: string): string {
  const ms = parseFlashSaleTime(raw)
  if (ms === null) return ''
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const endLocal = computed(() => toLocal(cfg.value.end_time))
const startLocal = computed(() => toLocal(cfg.value.start_time))

const minLocal = computed(() => toLocal(formatDateTime(new Date())))

function onEndInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  const ms = parseFlashSaleTime(val)
  // 🔴 非法值不写入：写进去会让画布显示「时间格式无效」，且回滚不掉
  if (ms === null) return
  patch({ end_time: formatDateTime(new Date(ms)) })
}

function onStartInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  if (!val) {
    patch({ start_time: '' })
    return
  }
  const ms = parseFlashSaleTime(val)
  if (ms === null) return
  patch({ start_time: formatDateTime(new Date(ms)) })
}

function setQuickHours(hours: number) {
  patch({ end_time: formatDateTime(new Date(Date.now() + hours * 3600 * 1000)) })
}
</script>

<style lang="scss" scoped>
.fs-collapse {
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

.fs-grp-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  line-height: 1;
}

.fs-grp-badge {
  display: inline-flex;
  align-items: center;
  flex: none;
  max-width: 172px;
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

.fs-field {
  margin-top: 12px;
}

.fs-field:first-child {
  margin-top: 2px;
}

.fs-field--tight {
  margin-top: 7px;
}

.fs-label {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
  font-size: 12px;
  color: #6b5b4e;
}

.fs-label--sub {
  color: #8a7d6f;
}

.fs-hint {
  margin-top: 5px;
  font-size: 11px;
  line-height: 1.5;
  color: #a89c8d;
}

.fs-count {
  flex: none;
  font-size: 10.5px;
  color: #c4b9ac;
}

/* ---------- 标题行 ---------- */
.fs-title-row {
  display: flex;
  gap: 7px;
  align-items: center;
}

.fs-title-row__input {
  flex: 1;
  min-width: 0;
}

.fs-icon-trigger {
  display: grid;
  place-items: center;
  flex: none;
  width: 32px;
  height: 32px;
  overflow: hidden;
  font-size: 15px;
  cursor: pointer;
  background: #f7f3ec;
  border: 1px solid #e8e2d9;
  border-radius: 7px;

  img {
    width: 20px;
    height: 20px;
    object-fit: contain;
  }

  &:hover {
    border-color: var(--el-color-primary, #c08e6e);
  }

  &.is-empty .fs-icon-trigger__default {
    opacity: 0.75;
  }
}

/* ---------- 倒计时预览 ---------- */
.fs-count-preview {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 8px 10px;
  font-size: 12px;
  color: #6b5b4e;
  background: #faf8f5;
  border: 1px solid #eee7dd;
  border-radius: 8px;
}

.fs-count-preview__label {
  margin-right: 3px;
  font-size: 11px;
  color: #a89c8d;
}

/* 方块翻牌器预览 */
.fs-count-preview.is-flip .fs-count-preview__cell {
  min-width: 24px;
  padding: 2px 4px;
  font-family: 'SF Mono', ui-monospace, Menlo, Consolas, monospace;
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #fff;
  text-align: center;
  background: var(--el-color-primary, #c08e6e);
  border-radius: 4px;
}

/* ---------- 开关行 ---------- */
.fs-switch-row {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  padding: 3px 0;
}

.fs-switch-row__label {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #6b5b4e;
}

/* ---------- 模式卡 ---------- */
.fs-mode-cards {
  display: flex;
  gap: 6px;
}

.fs-mode-card {
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

.fs-mode-card__label {
  font-size: 12.5px;
  font-weight: 600;
  color: #3f3a35;
}

.fs-mode-card__desc {
  font-size: 11px;
  line-height: 1.4;
  color: #a89c8d;
}

.fs-mode-card.is-on .fs-mode-card__label {
  color: var(--el-color-primary, #c08e6e);
}

.fs-modes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.fs-mode {
  flex: 1 1 auto;
  min-width: 76px;
  padding: 6px 4px;
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

/* ---------- 时间输入 ---------- */
.fs-datetime {
  width: 100%;
  height: 30px;
  padding: 0 9px;
  font-size: 12.5px;
  color: #1f2937;
  background: #fff;
  border: 1px solid #e8e2d9;
  border-radius: 7px;
  outline: none;
  box-sizing: border-box;

  &:focus {
    border-color: var(--el-color-primary, #c08e6e);
  }
}

.fs-quick {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 7px;
}

.fs-quick__btn {
  padding: 4px 10px;
  font-size: 11.5px;
  color: #6b5b4e;
  cursor: pointer;
  background: #faf8f5;
  border: 1px solid #e8e2d9;
  border-radius: 999px;

  &:hover {
    color: var(--el-color-primary, #c08e6e);
    border-color: var(--el-color-primary, #c08e6e);
  }
}

/* ---------- 两列/三列 ---------- */
.fs-two {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.fs-two__cell,
.fs-three__cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.fs-two__label,
.fs-three__label {
  font-size: 11px;
  color: #8a7d6f;
}

.fs-three {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

/* ---------- 空态 ---------- */
.fs-blank {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 10px;
  text-align: center;
  background: #faf8f5;
  border: 1px dashed #ddd5c9;
  border-radius: 9px;
}

.fs-blank__title {
  margin: 0;
  font-size: 12.5px;
  color: #5c5249;
}

.fs-blank__hint {
  margin: 3px 0 10px;
  font-size: 11px;
  color: #a89c8d;
}

/* ---------- 已选商品 ---------- */
.fs-pick-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.fs-pick {
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

.fs-pick--ghost {
  background: #f3ede4;
  border-style: dashed;
}

.fs-pick__grip {
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

.fs-pick__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.fs-pick__name {
  overflow: hidden;
  font-size: 12.5px;
  color: #3f3a35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fs-pick__meta {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 10.5px;
  font-style: normal;
}

.fs-pick__price {
  font-weight: 600;
  color: #f56c6c;
  font-style: normal;
}

.fs-pick__stock {
  color: #a89c8d;
  font-style: normal;
}

.fs-pick__stock--none {
  color: #c4b9ac;
}

.fs-pick__ico {
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

.fs-pick__ico--danger:hover:not(:disabled) {
  color: #c0392b;
  background: #fdeeec;
}

.fs-pick-ops {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

/* ---------- 链接 ---------- */
.fs-link {
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

.fs-link__tag {
  flex: none;
  padding: 1px 7px;
  font-size: 11px;
  color: var(--el-color-primary, #c08e6e);
  background: #fff;
  border-radius: 6px;
}

.fs-link__text {
  flex: 1;
  overflow: hidden;
  font-size: 11.5px;
  color: #6b5b4e;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fs-link__act {
  flex: none;
  font-size: 11px;
  color: #a89c8d;
}
</style>
