<template>
  <div class="sub-item-list">
    <!-- 空态：给出明确的下一步动作，而不是留一块空白 -->
    <div v-if="!items.length" class="sub-item-list__empty">
      <span class="sub-item-list__empty-text">{{ emptyText }}</span>
      <el-button size="small" type="primary" plain @click="emit('add')">
        {{ addText }}
      </el-button>
    </div>

    <template v-else>
      <div
        v-for="(item, i) in items"
        :key="keyOf(item, i)"
        class="sub-item"
        :class="{ 'is-open': !isCollapsed(i) }"
      >
        <!-- 折叠行：拖拽手柄 + 序号 + 实时标题 + 操作区 -->
        <div class="sub-item__head" @click="toggle(i)">
          <button
            type="button"
            class="sub-item__grip"
            :aria-label="`拖动排序第 ${i + 1} 项`"
            title="按住拖动排序"
            @click.stop
          >
            <el-icon :size="13"><Rank /></el-icon>
          </button>

          <el-icon class="sub-item__caret" :class="{ 'is-open': !isCollapsed(i) }">
            <ArrowRight />
          </el-icon>

          <span class="sub-item__idx">{{ i + 1 }}</span>

          <!-- 🔴 标题实时绑定子项内容，绝不写死「未命名」：
               传入的 titleOf 返回空串时才显示 placeholder（灰字，不是假标题）。 -->
          <span class="sub-item__title" :class="{ 'is-empty': !titleOf(item, i) }">
            {{ titleOf(item, i) || placeholder }}
          </span>

          <span class="sub-item__spacer" />

          <div class="sub-item__actions" @click.stop>
            <slot name="actions" :item="item" :index="i" />
            <el-tooltip content="删除" placement="top">
              <button
                type="button"
                class="sub-item__del"
                :aria-label="`删除第 ${i + 1} 项`"
                @click="emit('remove', i)"
              >
                <el-icon :size="13"><Delete /></el-icon>
              </button>
            </el-tooltip>
          </div>
        </div>

        <!-- 展开区：两行式卡片（首行媒体/开关，次行字段），避免单行横向挤压 -->
        <el-collapse-transition>
          <div v-show="!isCollapsed(i)" class="sub-item__body">
            <slot :item="item" :index="i" :update="(patch: Record<string, any>) => emit('update', i, patch)" />
          </div>
        </el-collapse-transition>
      </div>

      <el-button class="sub-item-list__add" size="small" plain @click="emit('add')">
        + {{ addText }}
      </el-button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ArrowRight, Delete, Rank } from '@element-plus/icons-vue'

/**
 * 多子项列表基件（作者列表 / 导航入口 / 分类 / 活动 / 群组… 共用）。
 *
 * 解决的四个共性问题：
 * ① 折叠：子项多时面板纵向爆炸 → 手风琴，同一时刻只展开一项。
 * ② 标题硬编码序号占位（曾写成「群 1」「活动 1」「分类 1」）→ 改为由外部
 *    `titleOf` 从子项真实字段取值，与内部「名称」输入实时联动；
 *    取不到值时显示灰字占位，而不是伪装成一个假标题。
 * ③ 操作散落：删除/上移下移各写一遍 → 收进 `actions` 插槽 + 内置删除。
 * ④ 单行挤压：头像/名称/开关挤一行变形 → 折叠头只放摘要，
 *    详细字段进展开区做两行式栅格。
 */
const props = withDefaults(
  defineProps<{
    items: any[]
    /** 子项标题，必须从 item 里取真实字段（如 item.name），禁止写死序号 */
    titleOf: (item: any, index: number) => string
    keyOf?: (item: any, index: number) => string | number
    addText?: string
    placeholder?: string
    emptyText?: string
    /** 默认展开第几项；-1 = 全部折叠 */
    defaultOpen?: number
  }>(),
  {
    keyOf: (_item: any, i: number) => i,
    addText: '添加一项',
    placeholder: '未填写',
    emptyText: '还没有配置任何项',
    defaultOpen: 0,
  }
)

const emit = defineEmits<{
  add: []
  remove: [index: number]
  update: [index: number, patch: Record<string, any>]
}>()

/**
 * 展开态用「显式集合」记录，而不是「折叠集合」。
 * 原因：折叠集合无法表达「只有第 2 项展开」这种状态 ——
 * 一旦集合非空，isCollapsed 就会把不在集合里的项全判为展开（多开），
 * 而集合为空时又依赖 defaultOpen（首次点击后行为突变）。
 * 显式集合的语义唯一：**集合里= 展开，其余全折叠**，无歧义。
 */
const openSet = ref(new Set<number>([props.defaultOpen]))

function isCollapsed(i: number) {
  return !openSet.value.has(i)
}

function toggle(i: number) {
  const next = new Set<number>()
  // 同一时刻只展开一项：点谁开谁，点已展开的则全部收起
  if (openSet.value.has(i)) {
    openSet.value = next
    return
  }
  next.add(i)
  openSet.value = next
}

// 项数变化时清理越界的展开态，避免删到中间项后状态错位
watch(
  () => props.items.length,
  (len) => {
    const next = new Set<number>()
    for (const i of openSet.value) if (i < len) next.add(i)
    openSet.value = next
  }
)
</script>

<style scoped>
.sub-item-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sub-item-list__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 18px 12px;
  background: #fafaf8;
  border: 1px dashed #e0d8ce;
  border-radius: 8px;
}

.sub-item-list__empty-text {
  color: #a3968a;
  font-size: 12.5px;
}

.sub-item-list__add {
  align-self: flex-start;
  color: var(--el-color-primary, #c08e6e);
  border-style: dashed;
  border-color: color-mix(in srgb, var(--el-color-primary, #c08e6e) 40%, #fff);
}

.sub-item {
  background: #fbfaf8;
  border: 1px solid #e8e1d8;
  border-radius: 8px;
  overflow: hidden;
  transition: border-color 0.15s, background 0.15s;
}

.sub-item:hover {
  border-color: #ddd2c4;
}

.sub-item.is-open {
  background: #fff;
  border-color: color-mix(in srgb, var(--el-color-primary, #c08e6e) 32%, #fff);
}

.sub-item__head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 8px;
  cursor: pointer;
  user-select: none;
}

.sub-item__grip {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  padding: 0;
  color: #c2b6a8;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: grab;
}

.sub-item__grip:hover {
  color: #8a7c6e;
  background: #efe9e2;
}

.sub-item__caret {
  flex: none;
  color: #b0a294;
  font-size: 12px;
  transition: transform 0.18s;
}

.sub-item__caret.is-open {
  transform: rotate(90deg);
}

.sub-item__idx {
  flex: none;
  min-width: 16px;
  color: #b3a696;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

/* 折叠态只显示单行标题，超出省略——长名称不会把整行撑破 */
.sub-item__title {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  color: #3d3128;
  font-size: 12.5px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 无标题时用灰字占位，避免「看起来有名字其实没有」 */
.sub-item__title.is-empty {
  color: #c4b9ac;
  font-weight: 400;
  font-style: italic;
}

.sub-item__spacer {
  flex: none;
  width: 4px;
}

.sub-item__actions {
  display: flex;
  align-items: center;
  gap: 1px;
  flex: none;
}

.sub-item__del {
  display: grid;
  place-items: center;
  width: 21px;
  height: 21px;
  padding: 0;
  color: #b9aca0;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
}

.sub-item__del:hover {
  color: var(--el-color-danger, #f56c6c);
  background: var(--el-color-danger-light-9, #fef0f0);
}

/* 展开区：两行式栅格留白，字段不挤 */
.sub-item__body {
  padding: 4px 10px 10px;
  border-top: 1px dashed #ece4da;
}

.sub-item__body :deep(.el-form-item) {
  margin-bottom: 10px;
}

.sub-item__body :deep(.el-form-item:last-child) {
  margin-bottom: 0;
}
</style>
