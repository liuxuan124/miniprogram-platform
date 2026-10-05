<template>
  <div class="save-state" :class="`save-state--${tone}`">
    <span class="save-state__ic">
      <el-icon :size="14"><component :is="icon" /></el-icon>
    </span>
    <div class="save-state__body">
      <span class="save-state__label">{{ conf.label }}</span>
      <span v-if="conf.hint" class="save-state__hint">{{ conf.hint }}</span>
    </div>
    <slot name="extra" />
    <el-button
      v-if="conf.showRetry && onRetry"
      size="small"
      text
      @click="onRetry()"
    >重试</el-button>
  </div>
</template>

<script setup lang="ts">
/**
 * 保存状态条（五态统一）
 *
 * 2026-10-06 之前的问题：各页各写一套文案，「已保存」「已存入草稿」「已保存（编辑中）」
 * 「有未保存的修改」混着出现，用户分不清「存下了吗」「上线了吗」——
 * 而这两件事是完全不同的：保存 = 存草稿，发布 = 对线上生效。
 *
 * 五态（互斥、有优先级，从上往下判）：
 *   saving    正在保存草稿        → 线上无变化
 *   error     保存失败            → 需要重试
 *   dirty     有未保存的修改      → 还没存
 *   pending   已存草稿待发布       → 存了但线上还是旧的
 *   saved     与线上一致 / 已发布 → 无需任何操作
 *
 * 每种状态都带一句「接下来该做什么」，避免用户只看到状态却不知道下一步。
 */
import { computed } from 'vue'
import {
  Loading, CircleCheck, Warning, RefreshRight, Promotion,
} from '@element-plus/icons-vue'

export type SaveState =
  | 'saving'   // 正在保存
  | 'error'    // 保存失败
  | 'dirty'    // 有未保存的修改
  | 'pending'  // 已存草稿，待发布
  | 'saved'    // 已保存且与线上一致

const props = defineProps<{
  state: SaveState
  /** 自定义提示（覆盖默认的「接下来做什么」） */
  hint?: string
  onRetry?: () => void
}>()

const CONFIG: Record<SaveState, {
  label: string
  hint: string
  icon: any
  tone: 'saving' | 'ok' | 'warn' | 'err'
  showRetry: boolean
}> = {
  saving: {
    label: '正在保存草稿…',
    hint: '保存完成后才能发布；此时线上仍是旧内容',
    icon: Loading,
    tone: 'saving',
    showRetry: false,
  },
  error: {
    label: '草稿保存失败',
    hint: '改动没有存进去，刷新会丢失。请检查网络后重试',
    icon: Warning,
    tone: 'err',
    showRetry: true,
  },
  dirty: {
    label: '有未保存的修改',
    hint: '改动还在浏览器里，尚未存入草稿',
    icon: RefreshRight,
    tone: 'warn',
    showRetry: false,
  },
  pending: {
    label: '已存入草稿，待发布',
    hint: '草稿已保存，但线上用户看到的还是上一版。到「发布与版本」发布后才生效',
    icon: Promotion,
    tone: 'warn',
    showRetry: false,
  },
  saved: {
    label: '与线上一致',
    hint: '当前没有待保存的改动',
    icon: CircleCheck,
    tone: 'ok',
    showRetry: false,
  },
}

const conf = computed(() => CONFIG[props.state] || CONFIG.saved)
const icon = computed(() => conf.value.icon)
const tone = computed(() => conf.value.tone)

function emitRetry() {
  props.onRetry?.()
}
</script>

<style scoped lang="scss">
.save-state {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 11px;
  border-radius: 8px;
  font-size: var(--font-caption);
  line-height: 1.5;
  border: 1px solid transparent;
}

.save-state__ic {
  display: inline-flex;
  flex: none;
}

/* 正文可读性：状态说明用 12.5px 而非 11px，长句不至于挤成一行 */
.save-state__body {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}

.save-state__label {
  font-weight: 600;
  white-space: nowrap;
}

.save-state__hint {
  color: var(--text-secondary);
  font-size: 12.5px;
  line-height: 1.5;
}

.save-state--saving {
  background: rgba(120, 110, 95, 0.08);
  border-color: rgba(120, 110, 95, 0.18);
  color: #6f6659;
}

.save-state--ok {
  background: rgba(47, 125, 79, 0.08);
  border-color: rgba(47, 125, 79, 0.2);
  color: #24673f;
}

.save-state--warn {
  background: rgba(180, 110, 15, 0.09);
  border-color: rgba(180, 110, 15, 0.22);
  color: #8f580c;
}

.save-state--err {
  background: rgba(180, 40, 40, 0.08);
  border-color: rgba(180, 40, 40, 0.24);
  color: #972626;
}
</style>
