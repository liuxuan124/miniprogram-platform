<template>
  <div class="pf-style">
    <!--
      2026-10-06 视觉降噪：三段扁平成折叠分组（灰卡片 → 分割线），
      所有灰色长说明收进字段右侧的「?」，继承品牌色不再挂黄色大提示条，
      改为在字段行上打「[继承中]」置灰小标签。
    -->
    <StyleFoldGroup v-model:open="tabOpen" title="标签栏外观" :summary="tabSummary">
      <div class="fld">
        <BuilderSegmented
          :model-value="tabStyle.variant"
          :options="TAB_STYLE_OPTIONS"
          block
          aria-label="选项卡风格"
          @update:model-value="(v: string | number) => patchTabStyle({ variant: String(v) })"
        />
      </div>

      <div class="switch-row">
        <span class="switch-row__lab">滚动吸顶</span>
        <el-switch
          :model-value="tabStyle.sticky"
          @change="(v: boolean) => patchTabStyle({ sticky: v })"
        />
      </div>

      <!-- 吸顶避让：只在开启吸顶时有意义 -->
      <div v-if="tabStyle.sticky" class="fld">
        <BuilderSegmented
          :model-value="tabStyle.sticky_offset_mode"
          :options="OFFSET_MODE_OPTIONS"
          block
          aria-label="吸顶避让方式"
          @update:model-value="(v: string | number) => patchTabStyle({ sticky_offset_mode: String(v) })"
        />
        <p v-if="tabStyle.sticky_offset_mode === 'manual'" class="fld__tip">
          手动值 {{ tabStyle.sticky_offset }}px；自动建议 {{ suggestedOffset }}px。
        </p>
        <p v-else class="fld__tip">
          自动避让 {{ suggestedOffset }}px<template v-if="suggestedOffset === 0">（上方无顶栏/公告）</template>
        </p>
      </div>

      <div class="switch-row">
        <span class="switch-row__lab">
          继承品牌色
          <el-tooltip content="开启后下方颜色不生效，标签栏跟随页面主色。适合批量换肤；要做独立配色请先关掉。" placement="top" :show-after="200">
            <span class="pf-q" role="button" tabindex="0">?</span>
          </el-tooltip>
        </span>
        <el-switch
          :model-value="tabStyle.inherit_brand"
          @change="(v: boolean) => patchTabStyle({ inherit_brand: v })"
        />
      </div>

      <!--
        继承中：字段行整体置灰 + 行尾小标签，而不是原来那条占一整行的黄色提示。
        置灰让「这三个色现在改不了」一眼可见，标签则说明原因，
        两件事分开表达，运营不用读完一整段话才知道发生了什么。
      -->
      <template v-for="c in COLOR_FIELDS" :key="c.field">
        <div class="color-line" :class="{ 'is-inherited': tabStyle.inherit_brand }">
          <span class="color-line__lab">
            {{ c.label }}
            <el-tooltip :content="c.hint" placement="top" :show-after="200">
              <span class="pf-q" role="button" tabindex="0">?</span>
            </el-tooltip>
          </span>
          <span v-if="tabStyle.inherit_brand" class="pf-tag-inherit">继承中</span>
          <ColorFieldRow
            v-else
            :field="c.field"
            :value="tabStyle[c.field]"
            @update="onColorUpdate"
          />
        </div>
      </template>
    </StyleFoldGroup>

    <StyleFoldGroup v-model:open="cardOpen" title="卡片与列表" :summary="cardSummary">
      <CompactSliderRow
        label="卡片下间距"
        hint="本卡片与上一条卡片之间的距离。"
        :model-value="cardStyle.margin_bottom"
        :min="0"
        :max="40"
        :step="1"
        @update:model-value="(v: number) => patchCardStyle({ margin_bottom: v })"
      />

      <CompactSliderRow
        label="卡片内边距"
        hint="卡片内容与卡片边缘的距离。注意与组件整体的外边距是两回事。"
        :model-value="cardStyle.padding"
        :min="0"
        :max="28"
        :step="1"
        @update:model-value="(v: number) => patchCardStyle({ padding: v })"
      />

      <div class="fld">
        <span class="fld__lab">卡片圆角</span>
        <div class="chips">
          <button
            v-for="r in RADII"
            :key="r"
            type="button"
            class="chip"
            :class="{ 'is-on': cardStyle.radius === r }"
            @click="patchCardStyle({ radius: r })"
          >
            {{ r }}px
          </button>
        </div>
      </div>

      <div class="fld">
        <span class="fld__lab">
          卡片阴影
          <el-tooltip text="层级越高卡片越「浮」。信息密度大时建议「轻」，避免多层卡片互相干扰。" placement="top" :show-after="200">
            <span class="pf-q" role="button" tabindex="0">?</span>
          </el-tooltip>
        </span>
        <div class="chips">
          <button
            v-for="s in SHADOWS"
            :key="s.value"
            type="button"
            class="chip"
            :class="{ 'is-on': cardStyle.shadow === s.value }"
            :title="s.shadow"
            @click="patchCardStyle({ shadow: s.value as any })"
          >
            {{ s.label }}
          </button>
        </div>
      </div>

      <div class="fld">
        <span class="fld__lab">图片布局</span>
        <BuilderSegmented
          :model-value="cardStyle.image_ratio"
          :options="IMAGE_RATIO_OPTIONS"
          block
          aria-label="图片布局"
          @update:model-value="(v: string | number) => patchCardStyle({ image_ratio: String(v) })"
        />
      </div>
    </StyleFoldGroup>

    <StyleFoldGroup v-model:open="visOpen" title="内容可见性" :summary="visSummary">
      <div class="switch-row">
        <span class="switch-row__lab">
          展示置顶角标
          <el-tooltip content="关闭后卡片左上角的「置顶」标记不再显示，但置顶排序仍然生效。" placement="top" :show-after="200">
            <span class="pf-q" role="button" tabindex="0">?</span>
          </el-tooltip>
        </span>
        <el-switch
          :model-value="visibility.show_top_badge"
          @change="(v: boolean) => patchVisibility({ show_top_badge: v })"
        />
      </div>
      <div class="switch-row">
        <span class="switch-row__lab">
          展示互动数据
          <el-tooltip content="控制底部点赞/评论/收藏/分享这一行。关闭后互动入口整体隐藏。" placement="top" :show-after="200">
            <span class="pf-q" role="button" tabindex="0">?</span>
          </el-tooltip>
        </span>
        <el-switch
          :model-value="visibility.show_interactions"
          @change="(v: boolean) => patchVisibility({ show_interactions: v })"
        />
      </div>
      <CompactSliderRow
        label="正文截断行数"
        hint="超出后折叠并显示省略号。0 行 = 完整展示不截断。"
        :model-value="visibility.clamp_lines"
        :min="0"
        :max="CLAMP_MAX"
        :step="1"
        @update:model-value="(v: number) => patchVisibility({ clamp_lines: v })"
      />
    </StyleFoldGroup>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import BuilderSegmented from '../BuilderSegmented.vue'
import ColorFieldRow from './ColorFieldRow.vue'
import CompactSliderRow from '../CompactSliderRow.vue'
import StyleFoldGroup from '../StyleFoldGroup.vue'
import { usePageStore } from '@/stores/page'
import {
  PLANET_CARD_RADII,
  PLANET_CLAMP_MAX,
  PLANET_SHADOWS,
  PLANET_TAB_STYLES,
  normalizePlanetCardStyle,
  normalizePlanetTabStyle,
  normalizePlanetVisibility,
  resolvePlanetStickyOffset,
} from '@/utils/preview-planet'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const pageStore = usePageStore()

const TAB_STYLE_OPTIONS = PLANET_TAB_STYLES.map((t) => ({ value: t.value, label: t.label, title: t.desc }))
const OFFSET_MODE_OPTIONS = [
  { value: 'auto', label: '自动避让', title: '按页面上方组件高度累加' },
  { value: 'manual', label: '手动指定', title: '自己填偏移像素' },
]
const RADII = PLANET_CARD_RADII
const SHADOWS = PLANET_SHADOWS
const CLAMP_MAX = PLANET_CLAMP_MAX
const IMAGE_RATIO_OPTIONS = [
  { value: 'square', label: '九宫格 1:1', title: '裁成正方形，版面整齐' },
  { value: 'auto', label: '原图比例', title: '保留原始宽高比，长图不裁' },
]

/** 折叠态：标签栏默认展开（高频），卡片与可见性收起 */
const tabOpen = ref(true)
const cardOpen = ref(false)
const visOpen = ref(false)

/** 三色字段：与 normalizePlanetTabStyle 的字段名一一对应 */
const COLOR_FIELDS: Array<{ field: 'active_bg' | 'active_text' | 'text'; label: string; hint: string }> = [
  { field: 'active_bg', label: '激活背景色', hint: '选中分段的底色。「滑块」「纯文本」风格下此色不作为背景使用。' },
  { field: 'active_text', label: '激活文字色', hint: '选中分段的文字色。' },
  { field: 'text', label: '未激活文字色', hint: '未选中分段的文字色。' },
]

const tabStyle = computed(() => normalizePlanetTabStyle(data.tabStyle))
const cardStyle = computed(() => normalizePlanetCardStyle(data.cardStyle))
const visibility = computed(() => normalizePlanetVisibility(data.visibility))

/** 折叠摘要：全部收起也能扫完配置 */
const tabSummary = computed(() => {
  const v = tabStyle.value
  // ⚠️ 必须显式标 string[]：PLANET_TAB_STYLES 是 as const，
  // 不标的话 TS 会把 parts 推成「胶囊/滑块/纯文本」的窄联合，
  // 后面 push('吸顶') 报 TS2345。
  const parts: string[] = [
    PLANET_TAB_STYLES.find((t) => t.value === v.variant)?.label || v.variant,
  ]
  if (v.sticky) parts.push(v.sticky_offset_mode === 'manual' ? `吸顶 ${v.sticky_offset}px` : '吸顶')
  if (v.inherit_brand) parts.push('继承品牌色')
  return parts.join(' · ')
})

const cardSummary = computed(() => {
  const c = cardStyle.value
  return `圆角 ${c.radius} · 内边距 ${c.padding} · 下间距 ${c.margin_bottom}`
})

const visSummary = computed(() => {
  const v = visibility.value
  const parts: string[] = []
  if (!v.show_top_badge) parts.push('无角标')
  if (!v.show_interactions) parts.push('无互动')
  parts.push(v.clamp_lines > 0 ? `截 ${v.clamp_lines} 行` : '不截断')
  return parts.join(' · ')
})

/**
 * 自动避让建议值：拿同页里排在本组件之前的顶部常驻组件高度累加。
 * 与画布渲染器 / 小程序端同一函数（resolvePlanetStickyOffset），
 * 三处同规则才不会出现「面板说 120、画布 0、真机穿透」。
 */
const suggestedOffset = computed(() => {
  const all = pageStore.dsl?.components || []
  const selfId = pageStore.selectedComponentId
  const selfIdx = all.findIndex((it) => it.id === selfId)
  const above = selfIdx >= 0 ? all.slice(0, selfIdx) : []
  return resolvePlanetStickyOffset(above)
})

/**
 * tabStyle / cardStyle 都是嵌套对象，而 store 的 updateComponentProps 是浅合并 ——
 * 只 emit `{tabStyle:{variant:'line'}}` 会把 sticky / 颜色等同级字段冲掉。
 * 所以两个 patch 都整体回写归一化后的完整对象。
 */
function patchTabStyle(partial: Record<string, unknown>) {
  emit('update', { tabStyle: { ...tabStyle.value, ...partial } })
}

/** ColorFieldRow 回传 { field, value }，转接成局部 patch；null（重置）落为空串 */
function onColorUpdate(payload: { field: string; value: string | null }) {
  patchTabStyle({ [payload.field]: payload.value || '' })
}

function patchCardStyle(partial: Record<string, unknown>) {
  emit('update', { cardStyle: { ...cardStyle.value, ...partial } })
}

/**
 * visibility 同样是嵌套对象，store 的 updateComponentProps 是浅合并，
 * 必须整对象回写，否则会把同级的 show_top_badge 冲掉。
 */
function patchVisibility(partial: Record<string, unknown>) {
  emit('update', { visibility: { ...visibility.value, ...partial } })
}
</script>

<style scoped>
.pf-style { display: flex; flex-direction: column; }

.fld { display: flex; flex-direction: column; gap: 4px; }
.fld__lab {
  display: flex; align-items: center; gap: 3px;
  color: #64748b; font-size: 12px;
}
.fld__tip { margin: 0; color: #a8b3c4; font-size: 11px; line-height: 1.4; }

/* 问号：与 PropsPanel / CompactSliderRow 同款 */
.pf-q {
  display: inline-grid;
  place-items: center;
  flex: none;
  width: 13px; height: 13px;
  color: #a8b3c4; font-size: 9px; font-weight: 700; line-height: 1;
  border: 1px solid #dbe2ec; border-radius: 50%;
  cursor: help;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.pf-q:hover,
.pf-q:focus-visible {
  color: #64748b; background: #f1f5f9; border-color: #cbd5e1; outline: none;
}

.switch-row {
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px; min-height: 28px;
}
.switch-row__lab {
  display: flex; align-items: center; gap: 3px;
  color: #64748b; font-size: 12px;
}

/* 颜色行：标签 + 控件一行；继承中则整行置灰并在行尾打小标签 */
.color-line {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 30px;
}
.color-line__lab {
  display: flex; align-items: center; gap: 3px;
  flex: none; width: 80px; min-width: 0;
  overflow: hidden;
  color: #64748b; font-size: 12px;
  white-space: nowrap; text-overflow: ellipsis;
}

/* 继承中：置灰 + 说明原因的小标签，替代原来那条占一整行的黄色提示 */
.color-line.is-inherited { opacity: 0.55; }
.pf-tag-inherit {
  flex: none;
  padding: 1px 6px;
  color: #94a3b8; font-size: 10px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
}

.chips { display: flex; gap: 6px; }
.chip {
  flex: 1 1 0; min-width: 0; padding: 4px 6px;
  color: #64748b; font-family: inherit; font-size: 12px;
  background: #fff; border: 1px solid #e3e8f0; border-radius: 7px; cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.chip:hover { color: var(--el-color-primary, #c08e6e); border-color: color-mix(in srgb, var(--el-color-primary, #c08e6e) 40%, #e3e8f0); }
.chip.is-on {
  color: var(--el-color-primary, #c08e6e); font-weight: 600;
  background: color-mix(in srgb, var(--el-color-primary, #c08e6e) 10%, #fff);
  border-color: color-mix(in srgb, var(--el-color-primary, #c08e6e) 45%, #e3e8f0);
}
</style>
