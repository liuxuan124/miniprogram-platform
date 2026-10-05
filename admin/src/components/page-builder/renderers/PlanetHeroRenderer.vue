<template>
  <section class="ph" :style="wrapStyle">
    <div class="ph__rw">
      <div class="ph__logo">
        <img v-if="isImageLogo" class="ph__logo-img" :src="logo" alt="" />
        <template v-else>{{ logo }}</template>
      </div>
      <div class="ph__meta">
        <strong class="ph__title">{{ title }}</strong>
        <span class="ph__subtitle">{{ subtitle }}</span>
      </div>
      <div v-if="showActions" class="ph__actions">
        <!--
          ⚠️ 身份互斥是这个组件的核心约束（缺一就会「所见非所得」）：

          ① 游客态：**只**渲染加入按钮 —— 有效期条、续费、切换都必须消失。
          ② 会员态：才渲染有效期条。
          ③ 切换按钮**只在会员态**出现：游客还没有「主星球」可切换，
             渲染它等于给一个必然无效的操作入口。

          此前 showSwitch 与身份无关独立判定，于是「切换」会在游客态冒出来；
          面板提示写着「画布显示加入按钮」，实际右上角却是「切换」—— 即本 bug。
        -->
        <button
          v-if="isMember && showSwitch"
          type="button"
          class="ph__switch"
          @click.stop="emit('preview-action', { message: `切换星球（${switchBtnText}）` })"
        >
          {{ switchBtnText }}
        </button>
        <!-- 加入按钮只在「未加入」态出现；会员态改为展示续费入口 -->
        <button
          v-if="isGuest && showJoinBtn"
          type="button"
          class="ph__join"
          @click.stop="emit('preview-action', { message: `加入星球（${joinText}）` })"
        >
          {{ joinText }}
        </button>
        <button
          v-else-if="isMember && showRenewBtn"
          type="button"
          class="ph__renew"
          @click.stop="emit('preview-action', { message: `续费（${renewText}）` })"
        >
          {{ renewText }}
        </button>
      </div>
    </div>

    <div
      v-if="visibleKpis.length"
      class="ph__kpis"
      :class="`ph__kpis--${kpiStyle}`"
      :style="[glassEnabled ? glassStyle : {}, kpiGridStyle]"
    >
      <div v-for="(kpi, i) in visibleKpis" :key="`${kpi.label}-${i}`" class="ph__kpi">
        <strong>{{ kpi.value }}<em v-if="kpi.suffix">{{ kpi.suffix }}</em></strong>
        <span>{{ kpi.label }}</span>
      </div>
    </div>

    <!--
      有效期条**只在会员态出现**（业务上与「加入」互斥）。
      此前无条件渲染，截图里「加入」和「剩余 185 天」同时出现 —— 运营无法判断上线后长什么样。
    -->
    <div v-if="isMember && showExpireNotice" class="ph__expire" @click.stop="onRenew">
      🎫 {{ expireText }}
    </div>

    <div
      v-if="showGroupNotice"
      class="ph__join-row"
      :style="glassEnabled ? glassStyle : undefined"
      @click.stop="onJoinRow"
    >
      <span>{{ joinRowText }}</span>
      <strong>{{ joinRowGo }}</strong>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * 星球顶栏（PlanetHeader）画布渲染层。
 *
 * 规则与小程序端 `miniapp/components/dsl-planet-hero` 严格一致，双端同规则。
 */
import { computed } from 'vue'
import type { ComponentInstance } from '@/types/page'
import {
  PLANET_CONTENT_DEFAULTS,
  PLANET_STYLE_DEFAULTS,
  renderExpireTemplate,
  resolveBgCss,
  resolveLogoMode,
  type PlanetKpiItem,
} from '../planetHeroConfig'

const props = defineProps<{ component: ComponentInstance; previewMode?: boolean }>()
const emit = defineEmits<{ 'preview-action': [payload: any] }>()

/** 老字段 logo_emoji 兼容：新字段 logo_value 优先 */
const logo = computed(() => {
  const s = props.component.props || {}
  const v = s.logo_value ?? s.logo_emoji
  return String(v || PLANET_CONTENT_DEFAULTS.logo_value)
})

const isImageLogo = computed(() => resolveLogoMode(logo.value) === 'image')

const title = computed(() => String((props.component.props || {}).title || PLANET_CONTENT_DEFAULTS.title))
const subtitle = computed(() =>
  String((props.component.props || {}).subtitle || PLANET_CONTENT_DEFAULTS.subtitle),
)

/**
 * 编辑期预览身份。
 *
 * ⚠️ 老 DSL 没有这个键 → 默认「未加入」。这是**故意**的：
 * 新页面本来就没有会员态，凭空给一个「已加入」的默认画布会让运营以为是线上效果。
 */
const identity = computed(() =>
  (props.component.props || {}).preview_identity === 'member' ? 'member' : 'guest',
)
const isGuest = computed(() => identity.value === 'guest')
const isMember = computed(() => identity.value === 'member')

const showSwitch = computed(
  () => (props.component.props || {}).show_switch_btn === true,
)
const switchBtnText = computed(() =>
  String((props.component.props || {}).switch_btn_text || PLANET_CONTENT_DEFAULTS.switch_btn_text),
)

const showJoinBtn = computed(
  () => (props.component.props || {}).show_join_btn !== false,
)
const joinText = computed(() =>
  String((props.component.props || {}).join_text || PLANET_CONTENT_DEFAULTS.join_text),
)

const showRenewBtn = computed(
  () => (props.component.props || {}).show_renew_btn === true,
)
const renewText = computed(() =>
  String((props.component.props || {}).renew_text || PLANET_CONTENT_DEFAULTS.renew_text),
)

const showExpireNotice = computed(() => {
  const s = props.component.props || {}
  // 老 DSL 只有 expire_text 文本，没有开关：文本非空即视为开启（保持历史页面外观）
  if (s.show_expire_notice !== undefined) return s.show_expire_notice === true
  return String(s.expire_text || '').trim() !== ''
})

const expireText = computed(() =>
  renderExpireTemplate(
    (props.component.props || {}).expire_text || PLANET_CONTENT_DEFAULTS.expire_text,
  ),
)

const showGroupNotice = computed(
  () => (props.component.props || {}).show_group_notice !== false,
)
const joinRowText = computed(() =>
  String((props.component.props || {}).join_row_text || PLANET_CONTENT_DEFAULTS.join_row_text),
)
const joinRowGo = computed(() =>
  String((props.component.props || {}).join_row_go || PLANET_CONTENT_DEFAULTS.join_row_go),
)

/**
 * 操作区容器是否渲染。
 * ⚠️ 必须与模板里的三个 v-if **同一套判定**，否则会出现两种畸形：
 *   - 漏算 → 容器不渲染但里面有按钮（按钮看不见）
 *   - 多算 → 容器渲染但空着（右侧留一块空白）
 * 切换按钮已改为会员态专属，故这里也要带 isMember。
 */
const showActions = computed(
  () => (isMember.value ? showSwitch.value || showRenewBtn.value : showJoinBtn.value),
)

const kpis = computed<PlanetKpiItem[]>(() => {
  const raw = (props.component.props || {}).kpis
  return Array.isArray(raw) ? (raw as PlanetKpiItem[]) : PLANET_CONTENT_DEFAULTS.kpis
})

/**
 * 只渲染「有内容」的 KPI。
 *
 * ⚠️ 这里曾有一个真实缺陷：模板里写过 `.slice(0, 3)`，面板配到 4 项时
 * 画布只显示前 3 项 —— 配置与预览脱节，运营会以为第 4 项没保存成功。
 * 现在**不截断**，改为过滤掉完全空白的项（空项在画布上是一块空槽，比不显示更糟）。
 * 上限（4 项）由属性面板的 `addKpi` 拦截 + 这里是最后一道兜底。
 */
const visibleKpis = computed<PlanetKpiItem[]>(() =>
  kpis.value.filter((k) => String(k?.value ?? '').trim() || String(k?.label ?? '').trim()),
)

/**
 * 栅格列数按**实际渲染条数**动态给，不写死 2/3/4 三档类名。
 * 少一项时其余项自动平分宽度（4 项→四列，3 项→三列），
 * 不会像固定类名那样出现「4 项配置挤进 3 列格子」的情况。
 */
const kpiGridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${Math.max(1, visibleKpis.value.length)}, minmax(0, 1fr))`,
}))

/** 仅用于保留原有 `ph__kpis--glass/plain` 的外框与内部分隔样式 */
const kpiStyle = computed(() =>
  (props.component.props || {}).kpi_style === 'plain' ? 'plain' : 'glass',
)

/**
 * 样式字段也存 props（项目既有约定：stylePanelMap 只有 props 通道，没有 style 通道）。
 * ⚠️ 曾经写成 `component.style`，而面板改的是 props —— 两边不一致导致「拖滑块画布不动」。
 */
const style = computed(() => (props.component.props || {}) as Record<string, any>)

const wrapStyle = computed(() => {
  const s = style.value
  const radius = Number(s.radius)
  const padding = Number(s.padding)
  return {
    background: resolveBgCss({
      bg_type: s.bg_type ?? PLANET_STYLE_DEFAULTS.bg_type,
      bg_preset: s.bg_preset ?? PLANET_STYLE_DEFAULTS.bg_preset,
      bg_gradient: s.bg_gradient ?? PLANET_STYLE_DEFAULTS.bg_gradient,
      bg_image: s.bg_image ?? PLANET_STYLE_DEFAULTS.bg_image,
    } as any),
    borderRadius: `${Number.isFinite(radius) ? Math.min(24, Math.max(0, radius)) : 0}px`,
    padding: `${Number.isFinite(padding) ? Math.min(24, Math.max(12, padding)) : 18}px`,
  }
})

/** 毛玻璃开关：默认开（与样式面板一致） */
const glassEnabled = computed(() => style.value.glass !== false)

/** 毛玻璃：给 KPI 卡与社群条加半透背景（无 backdrop-filter 时至少还有底色） */
const glassStyle = computed(() =>
  glassEnabled.value ? { background: 'rgba(255,255,255,.14)' } : {},
)

function onRenew() {
  emit('preview-action', { message: '续费入口' })
}

function onJoinRow() {
  const t = (props.component.props || {}).group_action_type || 'link'
  emit(
    'preview-action',
    { message: t === 'qrcode' ? '弹出群活码弹窗' : '跳转加群页' },
  )
}
</script>

<style scoped>
.ph {
  position: relative;
  box-sizing: border-box;
  overflow: hidden;
  width: 100%;
  color: #fff;
}
.ph::after,
.ph::before {
  position: absolute;
  content: '';
  pointer-events: none;
  background: rgba(255,255,255,.09);
  border-radius: 999px;
}
.ph::after { width: 230px; height: 230px; top: -96px; right: -80px; }
.ph::before { width: 150px; height: 150px; bottom: -80px; left: -60px; background: rgba(255,255,255,.07); }
.ph__rw { position: relative; z-index: 1; display: flex; align-items: center; gap: 13px; margin-top: 4px; }
.ph__logo {
  display: grid;
  place-items: center;
  flex: none;
  width: 58px;
  height: 58px;
  overflow: hidden;
  font-size: 28px;
  background: rgba(255,255,255,.16);
  border: .5px solid rgba(255,255,255,.25);
  border-radius: 20px;
}
.ph__logo-img { width: 100%; height: 100%; object-fit: cover; }
.ph__meta { flex: 1; min-width: 0; }
.ph__title { display: block; font-family: "Songti SC", "Noto Serif SC", serif; font-size: 20px; font-weight: 750; letter-spacing: -.02em; }
.ph__subtitle { display: block; margin-top: 5px; font-size: 11.5px; line-height: 1.35; opacity: .82; }
.ph__actions { position: relative; z-index: 2; display: flex; flex: none; gap: 6px; margin-left: auto; }
.ph__actions button { height: 32px; padding: 0 12px; font-size: 12px; font-weight: 700; cursor: pointer; border-radius: 999px; }
.ph__switch { color: #fff; background: rgba(255,255,255,.18); border: .5px solid rgba(255,255,255,.35); }
.ph__join { color: #9a3412; background: #fff; border: 0; }
.ph__renew { color: #9a3412; background: #fde68a; border: 0; }
.ph__kpis { position: relative; z-index: 1; display: grid; gap: 7px; min-height: 56px; margin-top: 16px; }
/* 列数由 kpiGridStyle 按实际条数动态注入（repeat(n, minmax(0,1fr))），
   不再写死 2/3/4 三档类名 —— 写死会在条数变化时留下错位的空列。 */
.ph__kpi { padding: 9px 4px; text-align: center; }
.ph__kpis--glass .ph__kpi { background: rgba(255,255,255,.12); border: .5px solid rgba(255,255,255,.14); border-radius: 13px; }
/* 无底色极简：靠底部细线分隔，不占视觉重量 */
.ph__kpis--plain .ph__kpi { border-bottom: .5px solid rgba(255,255,255,.2); border-radius: 0; }
.ph__kpi strong, .ph__kpi span { display: block; }
.ph__kpi strong { font-size: 15px; font-weight: 780; }
.ph__kpi strong em { margin-left: 1px; font-size: 10px; font-style: normal; font-weight: 600; opacity: .8; }
.ph__kpi span { margin-top: 2px; font-size: 9.5px; opacity: .78; }
.ph__expire { position: relative; z-index: 1; margin-top: 11px; font-size: 10.5px; cursor: pointer; opacity: .72; }
.ph__join-row {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 12px;
  margin-top: 11px;
  font-size: 11.5px;
  cursor: pointer;
  background: rgba(255,255,255,.14);
  border: .5px solid rgba(255,255,255,.16);
  border-radius: 12px;
}
.ph__join-row strong { flex: none; margin-left: auto; font-weight: 760; }
</style>
