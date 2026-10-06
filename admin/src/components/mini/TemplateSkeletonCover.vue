<script setup lang="ts">
/**
 * ============================================================================
 * 模板封面：结构化线框示意图
 * ============================================================================
 *
 * 为什么不用图片（2026-10-06 查证结论）：
 *   `public/` 下**没有任何真实的模板预览图**。之前所有"封面"都是从
 *   `images/nav-icons/` 里挑的图标素材，于是出现：
 *     · 暖阁整店 = 800×149 装饰横幅裁成方形 → 一整块深蓝
 *     · 内容社群 与 轻量三栏 共用 `_preview-gradient-set-final.png`
 *       （16 个行业图标 + 中文标签的拼贴图）→ 九宫格 + 底部切断
 *     · 3D 黏土插画 / 扁平图标 / 纯色块同屏混用
 *
 * 现在改成**按模板真实结构画线框**：
 *   ① 每张都不同（取决于模板实际有几个页面、每页放了什么组件）
 *   ② 反映真实结构 —— 看封面就知道这套模板长什么样
 *   ③ 风格天然统一（同一套线框语言，不引入新素材）
 *
 * 有骨架时画线框；没有骨架且调用方给了图片就退回图片；
 * 两者都没有时画一个明确的「无预览」占位（而不是拿素材凑）。
 */
import { computed } from 'vue'
import {
  extractTemplateSkeleton,
  skeletonAccentFor,
  type TemplateSkeleton,
} from '@/utils/template-thumb'

const props = withDefaults(
  defineProps<{
    /** 模板记录（整店用） */
    item?: Record<string, any> | null
    /** 直接给骨架（页面模板用） */
    skeleton?: TemplateSkeleton[]
    /** 兜底图片：只有没有骨架时才用 */
    fallbackImg?: string
    /** 用于稳定取色 */
    code?: string
  }>(),
  { item: null, skeleton: undefined, fallbackImg: '', code: '' },
)

const skeleton = computed<TemplateSkeleton[]>(() => {
  if (props.skeleton) return props.skeleton
  if (props.item) return extractTemplateSkeleton(props.item as any)
  return []
})

/** 有骨架就不需要图片了 —— 骨架是主方案，图片只是兜底 */
const useSkeleton = computed(() => skeleton.value.length > 0)
const showImg = computed(() => !useSkeleton.value && !!props.fallbackImg)

const accent = computed(() => {
  const fromDsl = skeleton.value.find((s) => s.accent)?.accent
  if (fromDsl) return fromDsl
  return skeletonAccentFor(props.code || props.item?.templateCode || '', 0)
})

/** 组件类型 → 线框块的具体样式（不同类型画不同形态，避免"全是灰条"） */
/**
 * 块的视觉权重 → flex 比例。
 *
 * 🔴 之前这里算的是固定 `height: 6 + w*3 px`，在改成纵向布局后
 *    固定高度 + flex 会互相打架（内容区被撑破或留大片空白）。
 *    现在只给 flex 权重，高度交给 flex 分配 —— 天然撑满。
 */
function blockStyle(b: { kind: string; weight: number }, i: number) {
  // 标题/文本类压扁（只占很小一条），其余按权重分高度
  const flat = b.kind === 'title' || b.kind === 'text' || b.kind === 'spacer'
  return {
    '--w': flat ? 0.4 : b.weight,
    opacity: 1 - i * 0.09,
  } as Record<string, string | number>
}
</script>

<template>
  <div class="tpl-skel" :style="{ '--tpl-accent': accent }">
    <!-- 线框封面：手机外框 + 内容块 + 底部 tab 指示 -->
    <div v-if="useSkeleton" class="tpl-skel__phone">
      <div class="tpl-skel__notch" />
      <div class="tpl-skel__screen">
        <div class="tpl-skel__blocks">
          <span
            v-for="(b, i) in skeleton[0].blocks"
            :key="i"
            class="tpl-skel__block"
            :class="`is-${b.kind}`"
            :style="blockStyle(b, i)"
          />
          <!-- 页面数 > 1 时，叠一层"还有更多页"的暗示 -->
          <span v-if="skeleton.length > 1" class="tpl-skel__more" />
        </div>
        <div class="tpl-skel__tabbar">
          <span
            v-for="(p, i) in skeleton"
            :key="i"
            class="tpl-skel__tab"
            :class="{ 'is-active': i === 0 }"
            :title="p.label"
          />
        </div>
      </div>
    </div>

    <!-- 兜底：没有骨架但有图 -->
    <img v-else-if="showImg" class="tpl-art-img" :src="fallbackImg" alt="" loading="lazy" />

    <!-- 明确占位：不用素材凑 -->
    <div v-else class="tpl-skel__empty">
      <span>暂无预览</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.tpl-skel {
  --tpl-accent: #4f46e5;
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  background: linear-gradient(160deg, color-mix(in srgb, var(--tpl-accent) 12%, #fff), #f6f7fb);
}

/* 手机外框：让"这是一套小程序模板"一眼可辨 */
/* 🔴 2026-10-06 改用绝对宽高而不是 inset 百分比。
     原来 `inset: 10% 22%` 在 16:10 的宽扁容器里算出「宽 56% / 高 80%」，
     再叠加 blocks 的 flex-wrap，实际渲染出来是一条**又窄又空**的白条，
     内容块几乎看不见 —— 截图里就是这样。
     现在：宽度按容器比例给足、高度按手机比例，块区用 flex 撑满。 */
.tpl-skel__phone {
  position: absolute;
  top: 8%;
  left: 50%;
  transform: translateX(-50%);
  width: 46%;
  height: 84%;
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  background: #fff;
  box-shadow:
    0 1px 0 rgba(15, 23, 42, 0.06),
    0 6px 16px -8px rgba(15, 23, 42, 0.22);
  overflow: hidden;
}
.tpl-skel__notch {
  width: 34%;
  height: 4px;
  margin: 4px auto 2px;
  border-radius: 0 0 4px 4px;
  background: #e2e8f0;
}
.tpl-skel__screen {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.tpl-skel__blocks {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 4px 5px;
  min-height: 0;
}
/* 纵向排列：块高由 flex 权重决定，整体撑满内容区 */
.tpl-skel__block {
  display: block;
  flex: var(--w, 1) 1 0;
  min-height: 4px;
  border-radius: 2px;
  background: color-mix(in srgb, var(--tpl-accent) 30%, #e2e8f0);
}
/* 列表类画成两张卡，视觉上更像"内容流" */
.tpl-skel__block.is-note_feed,
.tpl-skel__block.is-article_feed,
.tpl-skel__block.is-product_list,
.tpl-skel__block.is-content_list,
.tpl-skel__block.is-feed {
  border-radius: 2px 6px 6px 2px;
}
.tpl-skel__block.is-banner,
.tpl-skel__block.is-hero {
  border-radius: 4px;
  background: color-mix(in srgb, var(--tpl-accent) 46%, #e2e8f0);
}
.tpl-skel__block.is-title,
.tpl-skel__block.is-text {
  background: #cbd5e1;
}
.tpl-skel__more {
  display: block;
  width: 100%;
  height: 3px;
  margin-top: auto;
  border-radius: 2px;
  background: repeating-linear-gradient(
    90deg,
    #e2e8f0 0 6px,
    transparent 6px 10px
  );
}

/* 底部 tab：个数 = 真实页面数，是"这套模板有几个页"的直接视觉信息 */
.tpl-skel__tabbar {
  display: flex;
  gap: 2px;
  padding: 3px 5px 4px;
  border-top: 1px solid #eef2f7;
  background: #fff;
}
.tpl-skel__tab {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: #e2e8f0;
}
.tpl-skel__tab.is-active {
  background: var(--tpl-accent);
}

.tpl-skel__empty {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(135deg, #f1f5f9 0 8px, #f8fafc 8px 16px);
  color: #94a3b8;
  font-size: 12px;
}
</style>