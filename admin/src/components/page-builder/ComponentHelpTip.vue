<template>
  <div
    ref="anchorEl"
    class="comp-help-wrap"
    :class="{ 'comp-help-wrap--auto': fitContent }"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
  >
    <slot />

    <Teleport to="body">
      <div
        v-if="visible && help"
        class="comp-help-pop"
        :class="{ 'comp-help-pop--wide': withPreview && previewMounted }"
        :style="popStyle"
        role="tooltip"
        @mouseenter="keepOpen"
        @mouseleave="onLeave"
      >
        <div class="comp-help-pop__head">
          <el-icon :size="13" class="comp-help-pop__icon" :style="{ color: accentColor }">
            <component :is="iconComponent" />
          </el-icon>
          <b>{{ label }}</b>
          <span
            v-if="categoryLabel"
            class="comp-help-pop__cat"
            :style="{ background: visual.activeBg, color: visual.iconColor }"
          >
            {{ categoryLabel }}
          </span>
        </div>

        <!-- 真实骨架缩略图：复用区块缩略图的 renderer 缩放方案（375 画幅等比缩放） -->
        <div v-if="withPreview && previewMounted" class="comp-help-pop__preview">
          <BlockThumbnail :nodes="previewNodes" :width="PREVIEW_W" :height="PREVIEW_H" />
          <span class="comp-help-pop__previewTag">1:1 实际排版</span>
        </div>

        <dl class="comp-help-pop__body">
          <div class="comp-help-pop__row">
            <dt class="comp-help-pop__k comp-help-pop__k--what">是什么</dt>
            <dd class="comp-help-pop__v">{{ help.what }}</dd>
          </div>
          <div class="comp-help-pop__row">
            <dt class="comp-help-pop__k comp-help-pop__k--how">怎么用</dt>
            <dd class="comp-help-pop__v">{{ help.how }}</dd>
          </div>
          <div class="comp-help-pop__row">
            <dt class="comp-help-pop__k comp-help-pop__k--when">什么时候用</dt>
            <dd class="comp-help-pop__v">{{ help.when }}</dd>
          </div>
        </dl>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
/**
 * 组件卡片 hover 说明浮层
 *
 * 为什么自己写而不用 el-tooltip：
 * 1. 卡片是 <button draggable>，被 tooltip 包裹后 draggable 行为在部分浏览器会丢；
 * 2. 需要「鼠标移到浮层上不消失」（三段文字要能选中复制），el-tooltip 默认做不到；
 * 3. 浮层要贴在卡片右侧且自动避让窗口边缘，逻辑简单可控。
 *
 * 交互：hover 250ms 后出现 → 移到浮层上保持 → 移出即关 → 按下/开始拖拽立刻关。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import * as ElementPlusIcons from '@element-plus/icons-vue'
import { getComponentHelp, type ComponentHelp } from './componentHelp'
import BlockThumbnail from './BlockThumbnail.vue'
import { getDefaultProps, getDefaultStyle } from './componentRegistry'
import { CATEGORY_VISUALS, type PanelCategory } from './panelDesign'
import type { ComponentInstance, ComponentType } from '@/types/page'

/**
 * ⚠️ 两个 boolean prop 必须用 withDefaults 显式给默认值，**不能靠 `?:` 省略**。
 *
 * Vue 会把 `withPreview?: boolean` 编译成 `{ type: Boolean }`，而 Boolean 类型的
 * absent 语义是「未传 = false」而不是 undefined —— 于是 `props.withPreview !== false`
 * 恒为 false，骨架预览静默不渲染（实测：浮层只有文字、无缩略图、不报任何错）。
 * 排查这个问题花了好几轮，因为它不报错、只是「少了个东西」。
 */
const props = withDefaults(
  defineProps<{
    type: string
    label: string
    categoryLabel?: string
    icon?: string
    /** 所属分类，用于给浮层图标/标签上语义色；不传则用内容类配色 */
    category?: string
    /**
     * 宽度自适应内容，而不是撑满父格。
     *
     * 默认（卡片网格里）必须撑满，否则 grid item 变成 wrapper 后卡片不再被
     * stretch 拉伸，整列参差不齐。但「最近使用」横滑胶囊栏里相反 ——
     * 撑满会把每个胶囊拉成等宽长条，既难看又挤掉能显示的胶囊个数。
     */
    fitContent?: boolean
    /** 是否展示真实骨架缩略图（容器类组件自身无视觉意义，关掉更省资源） */
    withPreview?: boolean
  }>(),
  { fitContent: false, withPreview: true },
)

/** 分类语义色：与 ComponentPanel 的 is-* 类同源，避免两处色值漂移 */
const visual = computed(
  () => CATEGORY_VISUALS[(props.category as PanelCategory) ?? 'content'] ?? CATEGORY_VISUALS.content,
)
const accentColor = computed(() => visual.value.iconColor)

const HOVER_DELAY = 250
/** 卡片 → 浮层之间的鼠标移动间隙：离开卡片后延迟关闭，指针进入浮层即取消 */
const LEAVE_GRACE = 180
const POP_WIDTH = 268
/** 带骨架预览时浮层加宽：缩略图 168 + 文字区，两栏排布 */
const POP_WIDTH_PREVIEW = 400
const PREVIEW_W = 168
const PREVIEW_H = 150
const GAP = 10

/** 容器/布局类组件预览出来只是一张空壳色块，看了等于没看 —— 直接不渲染 */
const NO_PREVIEW_TYPES = new Set<string>([
  'container',
  'spacer',
  'divider',
  'section_bg',
  'layout_overlap_wrapper',
  'layout_paper_sheet',
  'layout_sticky_wrapper',
  'layout_flexible_grid',
  'warm_planet',
  'warm_shop',
  'warm_mine',
])

const withPreview = computed(
  () => props.withPreview !== false && !NO_PREVIEW_TYPES.has(props.type),
)

/**
 * 预览实例：用组件的**默认 props** 现场造一棵只读组件树。
 *
 * 为什么不存截图：真实 renderer 渲染 = 所见即所得，组件改版后自动跟随，
 * 不存在「死图要重新生成」。为什么不走 store.addComponent：那会往画布真插组件、
 * 触发 dirty 标记与历史快照 —— hover 看一眼就把页面改了，绝对不行。
 */
const previewNodes = computed<ComponentInstance[]>(() => {
  if (!withPreview.value) return []
  const t = props.type as ComponentType
  if (!getDefaultProps(t)) return []
  return [
    {
      id: `preview-${t}`,
      type: t,
      props: getDefaultProps(t),
      style: getDefaultStyle(t),
    },
  ]
})

const anchorEl = ref<HTMLElement | null>(null)
const visible = ref(false)
const help = ref<ComponentHelp | null>(getComponentHelp(props.type))
/**
 * 按下后是否抑制本次打开。
 *
 * 不能只 close()：按下瞬间浏览器会补发一对 mouseenter/mouseleave（draggable
 * 元素的原生行为），mouseleave 排的 LEAVE_GRACE 关闭定时器会与随后的 open 定时器
 * 打架，实测表现为「按下后浮层又弹回来」。所以按下 = 本次交互内彻底不再打开。
 */
let suppressed = false
let timer: ReturnType<typeof setTimeout> | null = null
let anchor = ref({ x: 0, y: 0, h: 0 })

const iconComponent = computed(
  () => (props.icon && (ElementPlusIcons as any)[props.icon]) || 'Document',
)

function measure() {
  const el = anchorEl.value
  if (!el) return
  const r = el.getBoundingClientRect()
  anchor.value = { x: r.left, y: r.top, h: r.height }
}

/** 默认贴右侧；右侧放不下就翻到左侧；纵向做边界收拢 */
const popStyle = computed(() => {
  // 预览未就绪时先按窄版定位，就绪后再切宽版 —— 反之会在 268/400 之间跳一下
  const w = withPreview.value && previewMounted.value ? POP_WIDTH_PREVIEW : POP_WIDTH
  const flip = anchor.value.x + GAP + w > window.innerWidth - 8
  const left = flip
    ? Math.max(8, anchor.value.x - w - GAP)
    : anchor.value.x + GAP
  // 带骨架图时预留更高的高度，否则底部三段说明会被视口切掉
  const estHeight = withPreview.value ? 400 : 250
  const top = Math.max(8, Math.min(anchor.value.y, window.innerHeight - estHeight - 8))
  return { left: `${left}px`, top: `${top}px`, width: `${w}px` }
})

function clear() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

/**
 * 骨架缩略图的挂载时机。
 *
 * 为什么不跟浮层一起渲染：BlockThumbnail 内部会拉起 22 个异步 renderer chunk，
 * 与属性面板同一批次更新。实测属性面板里的 WarmHomeBlockProps 有个既存的
 * `Failed to resolve component: SubItemList` 渲染异常，Vue 渲染批处理被它中断时，
 * **同一批次里尚未完成挂载的浮层 preview 节点会一起丢失**（表现：浮层只有文字、
 * 没有缩略图，且不报错）。
 * 错开一帧（rAF）挂载即可避开这个共批中断，同时视觉上无感（预览出现略晚一帧）。
 */
const previewMounted = ref(false)
let rafId = 0

function schedulePreview() {
  if (previewMounted.value) return
  cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(() => {
    previewMounted.value = true
  })
}

function open() {
  if (!help.value) return
  measure()
  visible.value = true
  if (withPreview.value) schedulePreview()
}

function onEnter() {
  if (!help.value || suppressed) return
  clear()
  timer = setTimeout(open, HOVER_DELAY)
}

/**
 * 离开卡片不立刻关：指针从卡片移到浮层有几十像素路程，
 * 直接关会让浮层「追不上鼠标」，读三段说明根本做不到。
 */
function onLeave() {
  clear()
  timer = setTimeout(() => {
    visible.value = false
  }, LEAVE_GRACE)
}

function keepOpen() {
  clear()
}

/**
 * 按下 = 用户要拖拽/插入了，浮层必须让位，且本次交互内不再弹出。
 *
 * ⚠️ 两个坑，都踩过：
 * 1. **必须用 document 上的捕获阶段监听**，不能写在 wrapper 上：
 *    卡片是 draggable="true"，浏览器按下即进入潜在拖拽序列，元素级的
 *    mousedown / pointerdown 根本不会派发到 DOM（探针实测：卡片只收到
 *    mouseenter+mouseleave，按下事件凭空消失）。捕获阶段在拖拽序列之前。
 * 2. **不能用 contains() 判断按下是否落在本卡片上**：
 *    wrapper 用 display:flex + slot，slot 内容被编译成注释节点隔断，
 *    `wrapper.contains(event.target)` 恒为 false（实测 target 是卡片内的
 *    <button>，closest('.comp-help-wrap') 也拿不到）。改用几何判定 ——
 *    坐标不受 DOM 结构影响。
 *
 * 解除条件同样不用「计时」或「靠 leave 事件」：draggable 元素会补发
 * enter/leave 对，基于事件顺序的判断必漏（表现为「按下后浮层又弹回来」）。
 * 改用 mousemove 探测指针是否真的离开卡片包围盒 —— 坐标是唯一可靠事实。
 */
function hitAnchor(event: { clientX: number; clientY: number }): boolean {
  const el = anchorEl.value
  if (!el) return false
  const r = el.getBoundingClientRect()
  // 留 2px 容差：卡片贴边时边框像素会算出「差一像素」
  return (
    event.clientX >= r.left - 2 &&
    event.clientX <= r.right + 2 &&
    event.clientY >= r.top - 2 &&
    event.clientY <= r.bottom + 2
  )
}

function onDocPointerDown(event: PointerEvent) {
  if (hitAnchor(event)) suppress()
}

function suppress() {
  clear()
  suppressed = true
  visible.value = false
  window.addEventListener('mousemove', onDocMouseMove, true)
}

function onDocMouseMove(event: MouseEvent) {
  if (!hitAnchor(event)) releaseSuppress()
}

function releaseSuppress() {
  window.removeEventListener('mousemove', onDocMouseMove, true)
  suppressed = false
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocPointerDown, true)
})

/** 卸载时必须清掉 window/document 上的捕获阶段监听与 rAF，否则每张卡片都泄漏一个 */
onBeforeUnmount(() => {
  clear()
  releaseSuppress()
  cancelAnimationFrame(rafId)
  document.removeEventListener('pointerdown', onDocPointerDown, true)
})
</script>

<style lang="scss" scoped>
/*
 * wrapper 存在的唯一理由：接住 hover 事件，让浮层由「卡片」触发而不是
 * 监听整个 grid（80 张卡各挂一份 document 监听既浪费又会互相干扰）。
 *
 * ⚠️ 必须 display:flex 让内部卡片撑满，否则会**破坏 grid 等高**：
 * 加了 wrapper 后 grid item 从 <button> 变成 <div>，卡片不再受
 * `align-items: stretch` 拉伸，只按自身内容高度渲染 —— 表现为
 * 「星球顶栏」这类少字卡片比「分区标题」矮一行，整列参差不齐。
 *
 * 用 flex + flex:1 而不是 height:100%：后者在 grid item 里会因为
 * 高度解析顺序（grid 先定 wrapper 高度→再算子元素 100%）出现部分浏览器
 * 上的塌陷。flex 由父级 stretch 直接驱动，行为稳定。
 *
 * 另注：display:flex 会让 slot 内容被编译成注释节点隔断，
 * 所以本组件的命中判定必须用几何判定而非 wrapper.contains(target)。
 */
.comp-help-wrap {
  display: flex;
  min-width: 0;

  > :deep(*) {
    flex: 1;
    min-width: 0;
  }
}

/* 自适应宽度模式：横滑胶囊栏用，按内容宽度排布 */
.comp-help-wrap--auto {
  flex: 0 0 auto;

  > :deep(*) {
    flex: 0 0 auto;
  }
}
</style>

<style>
/* 浮层 Teleport 到 body，无 scoped —— 需作用在 body 下 */
.comp-help-pop {
  position: fixed;
  z-index: 3400;
  padding: 11px 12px 10px;
  font-size: 12px;
  line-height: 1.6;
  color: #3a2f26;
  background: #fffdfa;
  border: 1px solid #e8dfd3;
  border-radius: 10px;
  box-shadow: 0 8px 28px rgb(70 50 30 / 16%);
  animation: comp-help-fade 0.16s ease;
}

/* 移开平滑淡出：浮层消失不该是「啪」地一下没了 */
@keyframes comp-help-fade {
  from {
    opacity: 0;
    transform: translateY(-3px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 带骨架图：左图右文两栏，避免文字被压到 130px 宽 */
.comp-help-pop--wide {
  padding: 10px 12px 10px;
}

.comp-help-pop__preview {
  position: relative;
  display: flex;
  justify-content: center;
  padding: 8px 0 9px;
  margin-bottom: 8px;
  border-bottom: 1px dashed #e8dfd3;
}

.comp-help-pop__previewTag {
  position: absolute;
  right: 0;
  bottom: 11px;
  padding: 0 5px;
  color: #a99c8e;
  font-size: 10px;
  background: #fffdfa;
  border-radius: 3px;
}

.comp-help-pop__head {
  display: flex;
  align-items: center;
  gap: 5px;
  padding-bottom: 7px;
  margin-bottom: 7px;
  border-bottom: 1px dashed #e8dfd3;

  b {
    color: #2a1f17;
    font-size: 13px;
    font-weight: 700;
  }
}

.comp-help-pop__icon {
  color: #c08e6e;
}

.comp-help-pop__cat {
  padding: 0 6px;
  margin-left: auto;
  color: #a99c8e;
  font-size: 10.5px;
  background: #f7f1ea;
  border-radius: 999px;
}

.comp-help-pop__body {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin: 0;
}

.comp-help-pop__row {
  display: flex;
  gap: 7px;
  align-items: flex-start;
}

.comp-help-pop__k {
  flex-shrink: 0;
  padding: 1px 5px;
  margin: 0;
  font-size: 10.5px;
  font-weight: 600;
  line-height: 1.6;
  white-space: nowrap;
  border-radius: 4px;
}

.comp-help-pop__k--what {
  color: #8a5a2b;
  background: #f6ead9;
}

.comp-help-pop__k--how {
  color: #2f6b4f;
  background: #e6f2ea;
}

.comp-help-pop__k--when {
  color: #6b4a8a;
  background: #efe8f6;
}

.comp-help-pop__v {
  flex: 1;
  min-width: 0;
  margin: 0;
  color: #4a3d33;
  font-size: 12px;
  line-height: 1.6;
  word-break: break-word;
}
</style>
