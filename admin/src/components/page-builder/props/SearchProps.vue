<template>
  <div class="srch-props">
    <el-collapse v-model="openGroups" class="srch-collapse">
      <!-- ---------- 基础内容 ---------- -->
      <el-collapse-item name="basic">
        <template #title>
          <span class="srch-grp-title">
            基础内容
            <span class="srch-grp-badge">{{ rows.length }} 条轮播</span>
          </span>
        </template>

        <div class="srch-field">
          <label class="srch-label">
            占位提示词
            <FieldHint text="小程序端会按「轮播间隔」自动切换这些词，引导用户点进去。最多 6 条，每条 20 字。" />
          </label>

          <div v-if="rows.length === 0" class="srch-blank">
            <p class="srch-blank__title">还没有提示词</p>
            <p class="srch-blank__hint">留空会回落默认词；至少配 2 条才有轮播效果</p>
            <el-button type="primary" size="small" @click="addPlaceholder">+ 添加提示词</el-button>
          </div>

          <draggable
            v-else
            v-model="listProxy"
            item-key="uid"
            handle=".srch-ph__grip"
            :animation="160"
            ghost-class="srch-ph--ghost"
            class="srch-ph-list"
          >
            <template #item="{ element, index }">
              <div class="srch-ph">
                <span class="srch-ph__grip" title="拖拽调整轮播顺序" aria-label="拖拽排序">
                  <el-icon><Rank /></el-icon>
                </span>
                <el-input
                  class="srch-ph__input"
                  :model-value="element.text"
                  size="small"
                  clearable
                  :maxlength="MAX_LEN"
                  :placeholder="`第 ${index + 1} 条提示词`"
                  @update:model-value="(v: string) => patchPlaceholder(index, String(v))"
                />
                <span class="srch-ph__count">{{ (element.text || '').length }}/{{ MAX_LEN }}</span>
                <button
                  type="button"
                  class="srch-ph__ico"
                  :disabled="rows.length >= MAX_ITEMS"
                  :title="rows.length >= MAX_ITEMS ? `最多 ${MAX_ITEMS} 条` : '复制一条'"
                  @click="copyPlaceholder(index)"
                >
                  <el-icon><CopyDocument /></el-icon>
                </button>
                <button
                  type="button"
                  class="srch-ph__ico srch-ph__ico--danger"
                  title="删除"
                  @click="removePlaceholder(index)"
                >
                  <el-icon><Delete /></el-icon>
                </button>
              </div>
            </template>
          </draggable>

          <div class="srch-ph-ops">
            <el-button
              type="primary"
              text
              size="small"
              :disabled="rows.length >= MAX_ITEMS"
              @click="addPlaceholder"
            >
              + 添加提示词
            </el-button>
            <span v-if="rows.length >= MAX_ITEMS" class="srch-limit-tip">已达 {{ MAX_ITEMS }} 条上限</span>
          </div>
        </div>

        <div class="srch-field">
          <label class="srch-label">
            轮播间隔
            <FieldHint text="两条提示词自动切换的间隔，单位秒。填 1 秒节奏偏快，5 秒以上偏安静。" />
          </label>
          <div class="srch-num">
            <el-slider
              class="srch-num__bar"
              :model-value="cfg.placeholder_interval"
              :min="INTERVAL.min"
              :max="INTERVAL.max"
              :step="INTERVAL.step"
              :show-tooltip="false"
              @update:model-value="(v: number | number[]) => patch({ placeholder_interval: Number(v) })"
            />
            <el-input-number
              class="srch-num__input"
              :model-value="cfg.placeholder_interval"
              :min="INTERVAL.min"
              :max="INTERVAL.max"
              :step="INTERVAL.step"
              :controls="false"
              size="small"
              @change="(v: number | undefined) => patch({ placeholder_interval: Number(v) })"
            />
            <span class="srch-num__unit">秒</span>
          </div>
        </div>
      </el-collapse-item>

      <!-- ---------- 检索范围 ---------- -->
      <el-collapse-item name="scope">
        <template #title>
          <span class="srch-grp-title">
            检索范围
            <span class="srch-grp-badge">{{ scopeSummary(cfg.scopes) }}</span>
          </span>
        </template>

        <div class="srch-field">
          <label class="srch-label">
            搜索范围
            <FieldHint text="可多选。不勾任何一项 = 全部；只勾「活动」时点击会直接进活动列表页（与旧配置行为一致）。" />
          </label>

          <div class="srch-scope-row">
            <button
              type="button"
              class="srch-scope srch-scope--all"
              :class="{ 'is-on': isAllScope(cfg.scopes) }"
              @click="toggleAllScope"
            >
              <span class="srch-scope__label">全部</span>
              <span class="srch-scope__desc">内容与商品一起搜</span>
            </button>
          </div>

          <el-checkbox-group
            class="srch-scope-group"
            :model-value="cfg.scopes"
            @update:model-value="(v: any) => onScopesChange(v as SearchScopeKey[])"
          >
            <el-checkbox-tag
              v-for="opt in SCOPE_OPTIONS"
              :key="opt.value"
              :value="opt.value"
              :title="opt.desc"
              class="srch-tag"
            >
              {{ opt.label }}
            </el-checkbox-tag>
          </el-checkbox-group>

          <div class="srch-note">
            <FieldHint text="搜索范围只影响「点了之后去哪儿、搜什么」，不影响搜索框本身的样式。" />
          </div>
        </div>
      </el-collapse-item>

      <!-- ---------- 扩展功能 ---------- -->
      <el-collapse-item name="extend">
        <template #title>
          <span class="srch-grp-title">
            扩展功能
            <span class="srch-grp-badge">{{ RIGHT_ACTION.find((o) => o.value === cfg.right_action)?.label }} · {{ TAP_TARGET.find((o) => o.value === cfg.tap_target)?.label }}</span>
          </span>
        </template>

        <div class="srch-field">
          <label class="srch-label">
            右侧附加交互
            <FieldHint text="在搜索框右侧放一个动作位。移动端最常见的是「搜索」文字按钮，其次是扫码与分类入口。" />
          </label>
          <div class="srch-modes">
            <button
              v-for="opt in RIGHT_ACTION"
              :key="opt.value"
              type="button"
              class="srch-mode"
              :class="{ 'is-on': cfg.right_action === opt.value }"
              @click="patch({ right_action: opt.value })"
            >
              {{ opt.label }}
            </button>
          </div>

          <div v-if="cfg.right_action === 'button'" class="srch-sub">
            <label class="srch-label srch-label--sub">按钮文案</label>
            <el-input
              :model-value="cfg.right_action_text"
              size="small"
              clearable
              maxlength="6"
              placeholder="搜索"
              @update:model-value="(v: string) => patch({ right_action_text: v })"
            />
          </div>
        </div>

        <div class="srch-field">
          <label class="srch-label">
            跳转落地目标
            <FieldHint text="点击搜索框（不是右侧动作）时打开什么。" />
          </label>
          <div class="srch-mode-cards">
            <button
              v-for="opt in TAP_TARGET"
              :key="opt.value"
              type="button"
              class="srch-mode-card"
              :class="{ 'is-on': cfg.tap_target === opt.value }"
              @click="patch({ tap_target: opt.value })"
            >
              <span class="srch-mode-card__label">{{ opt.label }}</span>
              <span class="srch-mode-card__desc">{{ opt.desc }}</span>
            </button>
          </div>

          <div v-if="cfg.tap_target === 'link'" class="srch-sub">
            <label class="srch-label srch-label--sub">
              落地页面
              <FieldHint text="自定义模式下必须选一个存在的页面，否则真机点了会报「页面不存在」。" />
            </label>
            <LinkPickerField
              link-type="page"
              :link-url="cfg.link_url"
              @update:link-url="(v: string) => patch({ link_url: v })"
            />
            <div v-if="!cfg.link_url" class="srch-warn">
              <el-icon><WarningFilled /></el-icon>
              <span>还没选页面。留空时点搜索框会回落到默认搜索页，不会白屏。</span>
            </div>
          </div>
        </div>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import draggable from 'vuedraggable'
import { CopyDocument, Delete, Rank, WarningFilled } from '@element-plus/icons-vue'
import FieldHint from '../FieldHint.vue'
import LinkPickerField from '../LinkPickerField.vue'
import {
  SEARCH_PLACEHOLDER_MAX_LEN,
  SEARCH_PLACEHOLDER_MAX_ITEMS,
  SEARCH_PLACEHOLDER_INTERVAL,
  SEARCH_RIGHT_ACTION_OPTIONS,
  SEARCH_SCOPE_OPTIONS,
  SEARCH_TAP_TARGET_OPTIONS,
  isAllScope,
  normalizeSearchProps,
  scopeSummary,
  type SearchProps as SearchConfig,
  type SearchScopeKey,
} from '../search/searchSchema'

const props = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const MAX_LEN = SEARCH_PLACEHOLDER_MAX_LEN
const MAX_ITEMS = SEARCH_PLACEHOLDER_MAX_ITEMS
const INTERVAL = SEARCH_PLACEHOLDER_INTERVAL
const SCOPE_OPTIONS = SEARCH_SCOPE_OPTIONS
const RIGHT_ACTION = SEARCH_RIGHT_ACTION_OPTIONS
const TAP_TARGET = SEARCH_TAP_TARGET_OPTIONS

/** 归一化后的配置：面板展示与写入都以它为准（非法值在此已被夹紧） */
const cfg = computed<SearchConfig>(() => normalizeSearchProps(props.props))

/** 折叠分组默认全开，减少一次点击 */
const openGroups = ref<string[]>(['basic', 'scope', 'extend'])

/* ---------------- 提示词列表：本地缓冲 + 最后发出值守卫 ---------------- */

/**
 * 为什么需要本地缓冲（不能直接 v-model 到 cfg）：
 *   normalizePlaceholders 会**过滤掉空串**。若列表直接由 cfg 驱动，
 *   运营一点「清除」，该条就立刻从界面消失，无法继续编辑——这是明显的交互缺陷。
 *   所以列表状态放本地，允许临时空串；只有「非空文本」才写回 props。
 *
 * 为什么需要 lastEmitted 守卫：
 *   本地编辑会写回 props → cfg 变化 → 若无脑 watch 同步，列表会被自己回写的结果
 *   重新覆盖（正在输入的光标位置/未完成的中文拼音会被打断）。
 *   只在「收到的值 ≠ 我最后发出的值」时才重建，说明是外部改动（撤销/重置/切组件）。
 */
interface PhItem {
  uid: string
  text: string
}

let uidSeed = 0
function nextUid() {
  uidSeed += 1
  return `ph_${uidSeed.toString(36)}`
}

const rows = ref<PhItem[]>([])
const lastEmitted = ref<string>('')

function toRows(list: string[]): PhItem[] {
  return list.map((text) => ({ uid: nextUid(), text }))
}

watch(
  () => cfg.value.placeholders,
  (list) => {
    const incoming = JSON.stringify(list)
    if (incoming === lastEmitted.value) return
    rows.value = toRows(list)
    lastEmitted.value = incoming
  },
  { immediate: true },
)

/**
 * vuedraggable 需要可写数组。setter 收到的是重排后的完整列表，
 * 换回纯字符串数组整体回写即可，不需要逐项 diff。
 */
const listProxy = computed<PhItem[]>({
  get: () => rows.value,
  set: (next) => {
    rows.value = next
    flushRows()
  },
})

/* ---------------- 整体 patch ---------------- */
function patch(partial: Record<string, unknown>) {
  emit('update', { ...partial })
}

/**
 * 把本地行写回 props（过滤空串）。
 *
 * 🔴 全空时的处理很关键：若把 `[]` 落库，normalizePlaceholders 会立刻回落成
 *   3 条默认词 → cfg 变化 → watch 重建 rows → 运营刚清空就看到凭空冒出 3 行。
 *   所以全空时**不发 patch**、也不更新 lastEmitted：
 *   界面停在空态（明写「留空会回落默认词」），真机沿用上一份有效配置。
 */
function flushRows() {
  const next = rows.value.map((r) => r.text.trim()).filter(Boolean)
  if (!next.length) return
  lastEmitted.value = JSON.stringify(next)
  patch({ placeholders: next })
}

/* ---------------- 提示词列表 ---------------- */
function addPlaceholder() {
  if (rows.value.length >= MAX_ITEMS) return
  rows.value = [...rows.value, { uid: nextUid(), text: '' }]
  // 不立刻 flush：新行是空的，用户还没输内容，落库无意义
}

function removePlaceholder(index: number) {
  rows.value = rows.value.filter((_, i) => i !== index)
  flushRows()
}

function copyPlaceholder(index: number) {
  if (rows.value.length >= MAX_ITEMS) return
  const next = [...rows.value]
  next.splice(index + 1, 0, { uid: nextUid(), text: next[index]?.text || '' })
  rows.value = next
  flushRows()
}

/** 单条编辑：本地即时生效 + 非空才落库 */
function patchPlaceholder(index: number, value: string) {
  const next = [...rows.value]
  if (index < 0 || index >= next.length) return
  next[index] = { ...next[index], text: value }
  rows.value = next
  flushRows()
}

/* ---------------- 检索范围 ---------------- */
function onScopesChange(next: SearchScopeKey[]) {
  patch({ scopes: next })
}

/** 「全部」= 清空数组（不是塞一个 'all'）。已全选时再点不响应，允许反悔 */
function toggleAllScope() {
  if (isAllScope(cfg.value.scopes)) return
  patch({ scopes: [] })
}
</script>

<style lang="scss" scoped>
.srch-collapse {
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

.srch-grp-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  line-height: 1;
}

.srch-grp-badge {
  display: inline-flex;
  align-items: center;
  flex: none;
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

.srch-field {
  margin-top: 12px;
}

.srch-field:first-child {
  margin-top: 2px;
}

.srch-label {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
  font-size: 12px;
  color: #6b5b4e;
}

.srch-label--sub {
  color: #8a7d6f;
}

/* ---------- 空态 ---------- */
.srch-blank {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 14px 10px;
  text-align: center;
  background: #faf8f5;
  border: 1px dashed #ddd5c9;
  border-radius: 9px;
}

.srch-blank__title {
  margin: 0;
  font-size: 12.5px;
  color: #5c5249;
}

.srch-blank__hint {
  margin: 3px 0 9px;
  font-size: 11px;
  color: #a89c8d;
}

/* ---------- 提示词列表 ---------- */
.srch-ph-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.srch-ph {
  display: flex;
  gap: 5px;
  align-items: center;
  padding: 4px 6px 4px 4px;
  background: #fff;
  border: 1px solid #e8e2d9;
  border-radius: 8px;

  &:hover {
    border-color: #d8cfc2;
  }
}

.srch-ph--ghost {
  background: #f3ede4;
  border-style: dashed;
}

.srch-ph__grip {
  display: grid;
  place-items: center;
  flex: none;
  width: 15px;
  height: 22px;
  color: #b3a596;
  cursor: grab;
  background: transparent;
  border: 0;

  &:active {
    cursor: grabbing;
  }
}

.srch-ph__input {
  flex: 1;
  min-width: 0;
}

.srch-ph__count {
  flex: none;
  min-width: 34px;
  font-size: 10.5px;
  font-variant-numeric: tabular-nums;
  color: #b3a596;
  text-align: right;
}

.srch-ph__ico {
  display: grid;
  place-items: center;
  flex: none;
  width: 22px;
  height: 22px;
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
    opacity: 0.35;
    cursor: not-allowed;
  }
}

.srch-ph__ico--danger:hover:not(:disabled) {
  color: #c0392b;
  background: #fdeeec;
}

.srch-ph-ops {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 4px;
}

.srch-limit-tip {
  font-size: 11px;
  color: #b3a596;
}

.srch-note {
  margin-top: 6px;
}

/* ---------- 数值 ---------- */
.srch-num {
  display: flex;
  gap: 8px;
  align-items: center;
}

.srch-num__bar {
  flex: 1;
  min-width: 0;
  padding-right: 4px;
}

.srch-num__input {
  flex: none;
  width: 58px;
}

.srch-num__unit {
  flex: none;
  font-size: 11px;
  color: #94a3b8;
}

:deep(.srch-num__input .el-input__inner) {
  padding-right: 4px;
  padding-left: 8px;
  text-align: right;
}

/* ---------- 范围 ---------- */
.srch-scope-row {
  margin-bottom: 6px;
}

.srch-scope {
  display: flex;
  flex-direction: column;
  gap: 1px;
  width: 100%;
  padding: 7px 10px;
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

.srch-scope__label {
  font-size: 12px;
  font-weight: 600;
  color: #3f3a35;
}

.srch-scope__desc {
  font-size: 11px;
  color: #a89c8d;
}

.srch-scope-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.srch-tag {
  font-size: 12px;
  border-radius: 7px;
}

/* ---------- 模式按钮 ---------- */
.srch-modes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.srch-mode {
  flex: 1 1 auto;
  min-width: 62px;
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

.srch-mode-cards {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.srch-mode-card {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 7px 10px;
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

.srch-mode-card__label {
  font-size: 12px;
  font-weight: 600;
  color: #3f3a35;
}

.srch-mode-card__desc {
  font-size: 11px;
  color: #a89c8d;
}

.srch-sub {
  margin-top: 10px;
  padding: 9px 10px 10px;
  background: #faf8f5;
  border-radius: 8px;
}

.srch-warn {
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
</style>