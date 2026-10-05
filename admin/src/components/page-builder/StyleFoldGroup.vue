<template>
  <section class="sfl" :class="{ 'is-open': open }">
    <button
      type="button"
      class="sfl__hd"
      :aria-expanded="open"
      @click="$emit('update:open', !open)"
    >
      <el-icon class="sfl__caret" :class="{ 'is-open': open }"><ArrowRight /></el-icon>
      <span class="sfl__title">{{ title }}</span>
      <!-- 折叠态就把摘要显示在标题行：全部收起时也能看出每组配了什么 -->
      <span v-if="!open && summary" class="sfl__summary">{{ summary }}</span>
      <slot name="badge" />
    </button>

    <!-- v-show 而非 v-if：折叠时保留内部组件实例，
         否则每次展开都要重建 el-select / 取色器，展开瞬间会闪一下 -->
    <div v-show="open" class="sfl__body">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import { ArrowRight } from '@element-plus/icons-vue'

/**
 * 样式 Tab 的扁平折叠分组（2026-10-06 视觉降噪新增）。
 *
 * 🔴 为什么不继续用「灰底卡片 + 内嵌 el-form」：
 * 面板里已经是「右栏 → 折叠面板 → 灰卡片 → 表单项」四层嵌套，
 * 再加一层卡片就成了「框套框」，运营的注意力全被边框吃掉，真正要调的字段反而看不见。
 * 这里**去掉外层灰底与边框**，只用一条 1px 分割线分组，标题行可点折叠。
 *
 * 折叠态在标题右侧显示 `summary`（由调用方给，如「圆角 16 · 间距 8」），
 * 这样「全部收起」时也能一眼扫完全部配置，不需要逐组展开。
 */
const props = withDefaults(
  defineProps<{
    title: string
    open?: boolean
    /** 折叠态摘要；留空则不显示 */
    summary?: string
  }>(),
  { open: true, summary: '' },
)

const emit = defineEmits<{ 'update:open': [value: boolean] }>()

defineExpose({ open: () => emit('update:open', true) })
void props
</script>

<style scoped>
.sfl {
  /* 分隔线分组：只留上边线，第一组不加，避免和 tab 头部之间出现双线 */
  padding-top: 8px;
  border-top: 1px solid #eef1f6;
}
.sfl:first-child {
  padding-top: 0;
  border-top: 0;
}

.sfl__hd {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  padding: 4px 2px;
  font-family: inherit;
  text-align: left;
  background: transparent;
  border: 0;
  border-radius: 5px;
  cursor: pointer;
  transition: background 0.15s;
}
.sfl__hd:hover { background: #f8fafc; }

.sfl__caret {
  flex: none;
  color: #a3aec0;
  font-size: 12px;
  transition: transform 0.18s;
}
.sfl__caret.is-open { transform: rotate(90deg); }

.sfl__title {
  flex: none;
  color: #475569;
  font-size: 12px;
  font-weight: 700;
}

.sfl__summary {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  color: #a8b3c4;
  font-size: 11px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.sfl__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 0 8px 16px;
}

/* 末组不需要额外下边距 */
.sfl:last-child .sfl__body { padding-bottom: 0; }
</style>