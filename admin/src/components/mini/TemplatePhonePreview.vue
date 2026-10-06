<script setup lang="ts">
/**
 * ============================================================================
 * 整店模板预览：可交互手机壳
 * ============================================================================
 *
 * 🔴 2026-10-06 新增。原来预览是**一张静态图**（`previewSrc` 单URL），
 *   而整店模板本身是 3~5 个联动页面 —— 运营点开预览只能看到其中一页，
 *   **无法评估这套模板真实的动线与多页结构**，预览形同虚设。
 *
 * 现在：底部 tab 可点击切换，每个页面渲染该页的真实组件结构。
 * 数据全部来自模板快照，**不编造内容**。
 *
 * 为什么要自己画而不是接 H5 预览：
 *   模板快照是「页面 + DSL」的结构数据，不是可运行的小程序代码；
 *   要真跑起来得先在本地建项目、走发布流程 —— 成本极高且慢。
 *   对"评估这套模板长什么样"这个目标，结构线框已经足够，
 *   而且**比静态图更诚实**（静态图可能与实际结构不符）。
 */
import { computed, ref, watch } from 'vue'
import { extractTemplateSkeleton, skeletonAccentFor, type TemplateSkeleton } from '@/utils/template-thumb'
import MiniIcon from '@/components/mini/MiniIcon.vue'

const props = defineProps<{
  /** 模板记录（整店用） */
  item?: Record<string, any> | null
  /** 已解析好的骨架（可选，优先用它） */
  skeleton?: TemplateSkeleton[]
  title?: string
}>()

const pages = computed<TemplateSkeleton[]>(() => {
  if (props.skeleton) return props.skeleton
  if (props.item) return extractTemplateSkeleton(props.item as any)
  return []
})

const active = ref(0)

// 换模板时回到第一页 —— 否则会停在上一个模板的第 3 页，
// 切到只有 2 页的模板就出现空白（典型的"状态没跟着数据重置"）
watch(
  () => props.item,
  () => {
    active.value = 0
  },
)

// 模板页数变化时夹紧当前下标，避免越界
watch(
  () => pages.value.length,
  (n) => {
    if (active.value > n - 1) active.value = Math.max(0, n - 1)
  },
)

const current = computed(() => pages.value[active.value] || null)
const accent = computed(
  () => current.value?.accent || skeletonAccentFor(String(props.item?.templateCode || ''), active.value),
)

function blockStyle(b: { kind: string; weight: number }, i: number) {
  const flat = b.kind === 'title' || b.kind === 'text' || b.kind === 'spacer'
  return { '--w': flat ? 0.4 : b.weight, opacity: 1 - i * 0.09 } as Record<string, string | number>
}
</script>

<template>
  <div class="tpl-iphone" :style="{ '--tpl-accent': accent }">
    <!-- 状态栏 -->
    <div class="tpl-iphone__bar">
      <span>9:41</span>
      <span class="tpl-iphone__notch" />
      <span>▮▮▮</span>
    </div>

    <!-- 页面内容 -->
    <div class="tpl-iphone__screen">
      <div v-if="current" class="tpl-iphone__blocks">
        <span
          v-for="(b, i) in current.blocks"
          :key="i"
          class="tpl-iphone__block"
          :class="`is-${b.kind}`"
          :style="blockStyle(b, i)"
        />
      </div>
      <div v-else class="tpl-iphone__empty">
        <MiniIcon name="doc" :size="18" />
        <span>这套模板没有可预览的页面结构</span>
      </div>
    </div>

    <!-- 🔴 底部 tab：可点击切换，个数 = 模板真实页面数 -->
    <div v-if="pages.length" class="tpl-iphone__tabbar">
      <button
        v-for="(p, i) in pages"
        :key="i"
        type="button"
        class="tpl-iphone__tab"
        :class="{ 'is-active': i === active }"
        :title="p.label || `第 ${i + 1} 页`"
        @click="active = i"
      >
        <span class="tpl-iphone__dot" />
        <span class="tpl-iphone__label">{{ p.label || `第${i + 1}页` }}</span>
      </button>
    </div>

    <!-- 页码指示：多页时必须让人知道"还有别的页" -->
    <div v-if="pages.length > 1" class="tpl-iphone__pager">
      <button type="button" :disabled="active === 0" title="上一页" @click="active -= 1">
        <MiniIcon name="back" :size="12" />
      </button>
      <span>{{ active + 1 }} / {{ pages.length }}</span>
      <button
        type="button"
        :disabled="active >= pages.length - 1"
        title="下一页"
        @click="active += 1"
      >
        <MiniIcon name="chev" :size="12" />
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.tpl-iphone {
  --tpl-accent: #4f46e5;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 300px;
  margin: 0 auto;
  border: 8px solid #1f2937;
  border-radius: 26px;
  background: #fff;
  box-shadow: 0 12px 28px -14px rgb(15 23 42 / 0.4);
  overflow: hidden;
}

.tpl-iphone__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 12px;
  background: #fff;
  font-family: var(--saas-mono);
  font-size: 10px;
  color: #94a3b8;
}
.tpl-iphone__notch {
  width: 34px;
  height: 4px;
  border-radius: 0 0 4px 4px;
  background: #e2e8f0;
}

.tpl-iphone__screen {
  flex: 1;
  min-height: 340px;
  background: #f8fafc;
}

.tpl-iphone__blocks {
  display: flex;
  flex-direction: column;
  gap: 5px;
  height: 100%;
  padding: 8px;
}
.tpl-iphone__block {
  display: block;
  flex: var(--w, 1) 1 0;
  min-height: 6px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--tpl-accent) 26%, #e2e8f0);
}
.tpl-iphone__block.is-banner,
.tpl-iphone__block.is-hero,
.tpl-iphone__block.is-warm_home,
.tpl-iphone__block.is-warm_shop,
.tpl-iphone__block.is-warm_feed,
.tpl-iphone__block.is-warm_article,
.tpl-iphone__block.is-warm_note,
.tpl-iphone__block.is-warm_mall,
.tpl-iphone__block.is-warm_community,
.tpl-iphone__block.is-warm_course {
  background: color-mix(in srgb, var(--tpl-accent) 44%, #e2e8f0);
}
.tpl-iphone__block.is-note_feed,
.tpl-iphone__block.is-article_feed,
.tpl-iphone__block.is-product_list,
.tpl-iphone__block.is-content_list,
.tpl-iphone__block.is-feed {
  border-radius: 3px 9px 9px 3px;
}
.tpl-iphone__block.is-title,
.tpl-iphone__block.is-text {
  background: #cbd5e1;
}

.tpl-iphone__empty {
  display: grid;
  place-items: center;
  gap: 6px;
  height: 100%;
  color: #94a3b8;
  font-size: 12px;
  text-align: center;
  padding: 0 16px;
}

/* 🔴 tab 可点击：这是本次的核心 —— 原来只能看静态图 */
.tpl-iphone__tabbar {
  display: flex;
  gap: 2px;
  padding: 6px 4px 7px;
  border-top: 1px solid #eef2f7;
  background: #fff;
}
.tpl-iphone__tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 3px 2px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  font-family: inherit;
  cursor: pointer;
  transition: background var(--saas-t) var(--saas-ease);
  &:hover { background: #f1f5f9; }
  &.is-active { background: color-mix(in srgb, var(--tpl-accent) 10%, transparent); }
}
.tpl-iphone__dot {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  background: #cbd5e1;
  transition: background var(--saas-t) var(--saas-ease);
}
.tpl-iphone__tab.is-active .tpl-iphone__dot {
  background: var(--tpl-accent);
}
.tpl-iphone__label {
  max-width: 100%;
  overflow: hidden;
  font-size: 9px;
  line-height: 1.2;
  color: #94a3b8;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.tpl-iphone__tab.is-active .tpl-iphone__label {
  color: var(--tpl-accent);
  font-weight: 600;
}

.tpl-iphone__pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 5px 8px 7px;
  border-top: 1px solid #f1f5f9;
  background: #fff;
  font-family: var(--saas-mono);
  font-size: 10px;
  color: #94a3b8;
  button {
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    border: 1px solid #e2e8f0;
    border-radius: 5px;
    background: #fff;
    color: #64748b;
    cursor: pointer;
    &:disabled { opacity: 0.4; cursor: not-allowed; }
    &:not(:disabled):hover { border-color: var(--tpl-accent); color: var(--tpl-accent); }
  }
}
</style>