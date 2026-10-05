<template>
  <div class="dsl-warm-block" :class="'dsl-warm-block--' + blockType">
    <!-- 预览数据加载中：所有 warm 区块统一占位，数据到位后一次性渲染，避免各块空态文案先出再跳变（观感像加载两次） -->
    <div v-if="previewLoading" class="wh-loading">加载中…</div>
    <template v-else>
    <!-- warm_greet -->
    <div
      v-if="blockType === 'warm_greet'"
      class="wh-top"
      :class="{ 'wh-top--default-bg': !topBackground, 'wh-top--plain-chrome': usePlainChrome }"
      :style="topStyle"
    >
      <div class="wh-greet">
        <div class="wh-greet__person">
          <img v-if="showAvatarImage" class="wh-av" :src="avatarSrc" alt="" @error="avatarBroken = true" />
          <div v-else class="wh-av wh-av--initial">{{ brandInitial }}</div>
          <div class="wh-greet__tx">
            <span class="wh-greet__h serif" :style="greetTitleStyle">{{ warm.greetTitle }}</span>
            <span v-if="warm.isLoggedIn" class="wh-greet__p" :style="greetSubStyle">
              已连续阅读 <span class="wh-b">{{ warm.streakDays }}</span> 天 · 今日更新 {{ warm.todayCount }} 篇
            </span>
            <span v-else class="wh-greet__p" :style="greetSubStyle">今日更新 {{ warm.todayCount }} 篇 · 点击登录同步记录</span>
          </div>
        </div>
        <button
          v-if="config.show_member_badge === true"
          type="button"
          class="wh-member-badge"
          @click.stop="onMemberBadgeClick"
        >
          {{ memberBadgeLabel }}
        </button>
        <div v-else-if="config.show_notice !== false" class="wh-bell">
          <span class="wh-bell__ico">🔔</span>
          <span v-if="warm.noticeDot" class="wh-bell__dot" />
        </div>
      </div>
      <div v-if="config.show_search !== false" class="wh-search wh-clickable" :class="{ 'wh-search--plain': usePlainChrome }" @click.stop="onSearchClick">
        <span>🔍</span>
        <span class="wh-search__ph">{{ config.search_placeholder || '搜索文章、笔记、专栏……' }}</span>
        <span class="wh-search__btn">搜索</span>
      </div>
      <div v-if="config.show_nav !== false" class="wh-nav wh-nav--grid5">
        <template v-if="warm.navs?.length">
          <div v-for="item in warm.navs" :key="String(item.key)" class="wh-nav__item wh-clickable" @click.stop="onNavClick(item)">
            <!-- 图标双模：素材库图片用img 铺满方块；否则按 emoji 文本渲染 -->
            <div class="wh-nav__ic" :class="{ 'wh-nav__ic--img': isImageIcon(item.icon) }">
              <img v-if="isImageIcon(item.icon)" :src="String(item.icon)" alt="" />
              <template v-else>{{ item.icon }}</template>
            </div>
            <span>{{ item.label }}</span>
          </div>
        </template>
        <div v-else class="wh-nav__empty">快捷入口未配置：请在右侧编辑金刚区并「保存到首页配置」，或在本页 warm_greet 的 navs 中填写。</div>
      </div>
    </div>

    <!-- warm_authors -->
    <template v-else-if="blockType === 'warm_authors'">
      <div class="wh-hd">
        <span class="wh-hd__t serif">{{ config.title || '暖阁出品' }}</span>
        <span class="wh-hd__a wh-clickable" @click.stop="onMoreClick">{{ config.more_text || '全部作者 ›' }}</span>
      </div>
      <div v-if="authorList.length || recruitSlot" class="wh-authors wh-authors--scroll">
        <div
          v-for="(item, ai) in authorList"
          :key="String(item.key || item.name || ai)"
          class="wh-author wh-clickable"
          @click.stop="onAuthorClick(item)"
        >
          <img v-if="item.avatar" class="wh-author__av" :src="String(item.avatar)" alt="" />
          <div v-else class="wh-author__av wh-author__av--initial">{{ (item.name || '作').slice(0, 1) }}</div>
          <span class="wh-author__n">{{ item.name }}</span>
          <span class="wh-author__r">{{ item.role }}</span>
        </div>
        <!-- 招募位：组件级配置，固定追加在列表末尾（V122） -->
        <div
          v-if="recruitSlot"
          class="wh-author wh-author--recruit wh-clickable"
          @click.stop="onRecruitClick"
        >
          <div class="wh-author__av wh-author__av--apply">{{ recruitSlot.iconText || '＋' }}</div>
          <span class="wh-author__n">{{ recruitSlot.label || '招募中' }}</span>
        </div>
      </div>
      <div v-else class="wh-feed-empty">{{ config.empty_text || '暂无作者' }}</div>
    </template>

    <!-- warm_feature -->
    <template v-else-if="blockType === 'warm_feature'">
      <div v-if="warm.loadError" class="wh-feed-empty">加载失败，请刷新预览</div>
      <div v-else-if="warm.feature" class="wh-feature wh-clickable" @click.stop="onSimplePreviewClick(`精选「${warm.feature.title || ''}」`)">
        <img class="wh-feature__img" :src="String(warm.feature.cover || '')" alt="" />
        <div class="wh-feature__sc" />
        <div class="wh-feature__bd">
          <span class="wh-tag soft">{{ warm.feature.tag }}</span>
          <span class="wh-feature__h serif">{{ warm.feature.title }}</span>
          <div v-if="featureMeta.length" class="wh-feature__mt">
            <span v-for="(m, mi) in featureMeta" :key="mi">{{ m }}<span v-if="mi < featureMeta.length - 1"> · </span></span>
          </div>
        </div>
      </div>
      <div v-else-if="!warm.loading" class="wh-feed-empty">{{ config.empty_text || '暂无精选内容' }}</div>
    </template>

    <!-- warm_columns -->
    <template v-else-if="blockType === 'warm_columns'">
      <!--
        auto_hide_when_empty 整块不渲染。
        ⚠️ 只在**非预览态**生效（见 hideColumnsWhenEmpty）：装修器画布要保留空态文案，
        否则运营改了配置却看不到任何反馈，无法判断「是隐藏了还是没数据」。
      -->
      <template v-if="!hideColumnsWhenEmpty">
        <div class="wh-hd">
          <span class="wh-hd__t serif">{{ config.title || '精品专栏' }}</span>
          <span class="wh-hd__a wh-clickable" @click.stop="onMoreClick">{{ config.more_text || '全部 ›' }}</span>
        </div>
        <div
          v-if="columnItems.length"
          class="wh-rail"
          :class="`wh-rail--${columnLayout}`"
          :style="{ gap: `${columnGap}px` }"
        >
          <div
            v-for="item in columnItems"
            :key="String(item.id)"
            class="wh-col wh-clickable"
            :class="{ 'is-mock': isMockColumn(item.id) }"
            :style="{ borderRadius: `${columnRadius}px` }"
            @click.stop="onSimplePreviewClick(`专栏「${item.title || ''}」`)"
          >
            <div class="wh-col__cv">
              <img v-if="item.cover" :src="String(item.cover)" alt="" />
              <span v-else class="wh-col__cv-ph">封面</span>
              <span v-if="showColumnBadge && item.badge" class="wh-tag wh-col__bdg" :class="{ gold: item.badgeGold }">{{ item.badge }}</span>
            </div>
            <span class="wh-col__h">{{ item.title }}</span>
            <span v-if="showColumnDesc && item.desc" class="wh-col__p">{{ item.desc }}</span>
            <div v-if="(showColumnHost && item.host) || (showColumnLessons && item.lessons)" class="wh-col__mt">
              <span v-if="showColumnHost && item.host" class="wh-col__host">{{ item.host }}</span>
              <span v-if="showColumnLessons && item.lessons" class="wh-col__ls">{{ item.lessons }}</span>
            </div>
            <div v-if="showColumnPrice && item.price" class="wh-col__pr">
              {{ item.price }}
              <span v-if="item.origin" class="wh-col__s">{{ item.origin }}</span>
            </div>
          </div>
        </div>
        <div v-else class="wh-feed-empty">{{ config.empty_text || '暂无专栏' }}</div>
      </template>
    </template>
    <!-- warm_planet_rec -->
    <template v-else-if="blockType === 'warm_planet_rec'">
      <div class="wh-hd">
        <span class="wh-hd__t serif">{{ config.title || '我的星球' }}</span>
        <span class="wh-hd__a wh-clickable" @click.stop="onMoreClick">{{ config.more_text || '进入 ›' }}</span>
      </div>

      <!--
        多星球横滑。
        ⚠️ 判据里**刻意不包含 warm.primaryOnly**（2026-10-05 修复）：
        端上 dsl-warm-block.js 的 only = single || primaryOnly || cards.length <= 1，
        这里的 primaryOnly 是**小程序端用户态**（当前访客是否已设过常驻主星球），
        来自 /api/v1/mp/home/warm 的用户维度数据 —— **装修器画布预览时它恒为 true**。
        于是原 `v-if="planetCards.length > 1 && !warm.primaryOnly"` 让多卡分支
        **永远进不去**：运营在属性面板把「展示模式」在多星球横滑/只展示主星球之间
        来回切，画布毫无反应（两种模式都渲染同一张单卡）。
        画布预览的职责是「让运营看到后台配置的效果」，所以必须无条件服从 planet_mode；
        primaryOnly 属于线上用户态，只保留给下面「设为主星球」入口判断（那里确实是用户态）。
        ⚠️ 端上同规则未改（线上行为不变：已加入的用户仍自动收成单卡）。
      -->
      <div v-if="planetCards.length > 1 && !isSinglePlanetMode" class="wh-planets">
        <div class="wh-planets__row">
          <div
            v-for="(card, ci) in planetCards"
            :key="card.planetId || ci"
            class="wh-pcard wh-clickable"
            @click.stop="onPlanetClick(card)"
          >
            <div class="wh-pcard__rw">
              <span class="wh-pcard__ic">{{ card.emoji || '🪐' }}</span>
              <span class="wh-pcard__h">{{ card.title }}</span>
              <span v-if="card.primary" class="wh-pcard__main">主</span>
              <span v-if="card.joined" class="wh-pcard__joined">已加入</span>
            </div>
            <span v-if="card.subtitle" class="wh-pcard__sub">{{ card.subtitle }}</span>
            <div class="wh-pcard__ls">
              <div v-for="(item, ii) in planetItemsOf(card)" :key="ii" class="wh-pcard__li">
                <span class="wh-pcard__tag">{{ item.tag }}</span>
                <span class="wh-pcard__tx">{{ item.text }}</span>
              </div>
              <div v-if="!planetItemsOf(card).length" class="wh-pcard__li wh-pcard__li--empty">暂无热点</div>
            </div>
            <div class="wh-pcard__ft">
              <span class="wh-pcard__cta">{{ card.cta || '进入星球' }}</span>
              <span class="wh-pcard__go">{{ card.joined ? '进入 ›' : '加入 ›' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 单卡通栏：后台配置为「只展示主星球」，或只勾选了 1 颗星球 -->
      <div v-else class="wh-planet wh-clickable" @click.stop="onPlanetClick(mainPlanet)">
        <div class="wh-planet__rw">
          <span class="wh-planet__ic">{{ mainPlanet.emoji || '🪐' }}</span>
          <span class="wh-planet__h">{{ mainPlanet.title }}</span>
          <span v-if="mainPlanet.joined" class="wh-pcard__joined">已加入</span>
          <span class="wh-planet__num">{{ mainPlanet.members }}</span>
        </div>
        <div class="wh-planet__ls">
          <div v-for="(item, ii) in planetItemsOf(mainPlanet)" :key="ii" class="wh-planet__li">
            <span class="wh-planet__tag">{{ item.tag }}</span>
            <span class="wh-planet__tx">{{ item.text }}</span>
          </div>
          <div v-if="!planetItemsOf(mainPlanet).length" class="wh-planet__li wh-planet__li--empty">暂无热点</div>
        </div>
        <div class="wh-planet__ft">
          <span class="wh-planet__cta">{{ mainPlanet.cta || '进入星球' }}</span>
          <span v-if="showSetMain" class="wh-planet__setmain">设为主星球</span>
        </div>
      </div>

      <div v-if="showSetMain" class="wh-planets__more wh-clickable" @click.stop="onPickMain">
        <span class="wh-planets__morelink">选一个主星球 ›</span>
      </div>
    </template>

    <!-- warm_feed -->
    <template v-else-if="blockType === 'warm_feed'">
      <div v-if="warm.segs?.length" class="wh-segs">
        <span
          v-for="seg in warm.segs"
          :key="String(seg.key)"
          class="wh-seg"
          :class="{ on: seg.on }"
          @click.stop="emitSeg(String(seg.key))"
        >{{ seg.label }}</span>
      </div>
      <div v-if="!warm.feed?.length" class="wh-feed-empty">
        {{ warm.loadError ? '内容加载失败' : '该分类暂无内容' }}
      </div>
      <template v-for="item in warm.feed" :key="String(item.id || item.title)">
        <div v-if="item.type === 'grid'" class="wh-three wh-clickable" @click.stop="onSimplePreviewClick(`「${item.title || ''}」`)">
          <span class="wh-post__h">{{ item.title }}</span>
          <div class="wh-three__gg">
            <img v-for="(img, gi) in (item.images || [])" :key="gi" :src="String(img)" alt="" />
          </div>
          <div class="wh-post__mt">
            <span class="wh-tag">{{ item.tag }}</span>
            <span>{{ item.meta }}</span>
          </div>
        </div>
        <div v-else class="wh-post wh-clickable" @click.stop="onSimplePreviewClick(`「${item.title || ''}」`)">
          <div class="wh-post__tx">
            <span class="wh-post__h">{{ item.title }}</span>
            <span v-if="item.summary" class="wh-post__p">{{ item.summary }}</span>
            <div class="wh-post__mt">
              <span class="wh-tag" :class="{ gold: item.tagGold }">{{ item.tag }}</span>
              <span>{{ item.meta }}</span>
            </div>
          </div>
          <img v-if="item.cover" class="wh-post__im" :src="String(item.cover)" alt="" />
        </div>
      </template>
      <div class="wh-end">—— {{ config.footer || '暖阁 · 慢一点，也很好' }} ——</div>
      <div class="wh-safe" />
    </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref, watch, type Ref } from 'vue'
import { ElMessage } from 'element-plus'
import { get } from '@/api/request'
import type { WarmPreviewView } from '@/utils/warmHomePreviewMap'
import type { ComponentInstance } from '@/types/page'
import {
  WARM_PREVIEW_VIEW_KEY,
  WARM_PREVIEW_ENABLED_KEY,
  WARM_PREVIEW_ON_SEG_KEY,
} from '@/composables/useWarmHomePreview'
import { buildWarmPreviewView } from '@/utils/warmHomePreviewMap'
import {
  COLUMN_CONFIG_DEFAULTS,
  COLUMN_MOCK_ITEMS,
  isMockColumn,
  previewMockEnabled,
  resolveColumnLayout,
} from '@/components/page-builder/columnConfig'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const emit = defineEmits<{
  seg: [key: string]
  'preview-action': [payload: { tab?: string; message?: string; previewPath?: string }]
}>()

/** 金刚区图标双模判断：素材库图片（/uploads/ 开头或http 链接）走 img，emoji 走文本 */
function isImageIcon(icon: unknown): boolean {
  const s = String(icon || '').trim()
  return s.startsWith('/uploads/') || /^https?:\/\//i.test(s)
}

const injectedView = inject<Ref<WarmPreviewView> | null>(WARM_PREVIEW_VIEW_KEY, null)
const previewEnabled = inject<Ref<boolean>>(WARM_PREVIEW_ENABLED_KEY, ref(false))
const onSegInjected = inject<(key: string) => void>(WARM_PREVIEW_ON_SEG_KEY, () => {})

const blockType = computed(() => String(props.component.type || ''))
const config = computed(() => props.component.props || {})
const avatarBroken = ref(false)

const warm = computed(() => {
  if (previewEnabled.value && injectedView?.value) {
    return injectedView.value
  }
  return buildWarmPreviewView(null, { loading: true })
})

/**
 * 预览模式且数据未到位：整页warm 区块统一占位，避免逐块空态跳变。
 *
 * 例外：品牌专栏在编辑期要靠演示卡片体现排版（preview_mock 开启时），
 * 等数据到位才出卡会让运营先看到「暂无专栏」再突然跳成 4 张卡，观感像出错。
 * 所以加载期就先用演示卡渲染 —— 它本来就只在装修器生效，真机不受影响。
 */
const previewLoading = computed(
  () =>
    previewEnabled.value &&
    warm.value.loading === true &&
    !(blockType.value === 'warm_columns' && previewMockEnabled(config.value)),
)

const topBackground = computed(() => {
  const s = props.component.style || {}
  const bg = String(s.background_color || s.background || '').trim()
  return bg || ''
})

/* ------------------------------------------------------------------ *
 * 品牌专栏（warm_columns）
 *
 * 真实数据 = warm_home_config.columnProductIds 里运营勾选的付费专栏商品
 * （mp_product.product_type='column'），由 /mp/home/warm 聚合下发。
 *
 * 🔴 编辑期演示卡片（2026-10-05 新增）：
 * 新页面没配 columnProductIds 时它是空数组，画布只会显示一句「暂无专栏」，
 * 运营既看不到卡片长什么样，也分不清「该配内容还是调样式」。
 * 所以**装修器画布**在 preview_mock 开启且真实数据为空时注入演示卡；
 * 真机端（miniapp/components/dsl-warm-block）**绝不注入**，线上不能出现假专栏。
 * ------------------------------------------------------------------ */

const columnLimit = computed(() => {
  const n = Number(config.value.limit)
  if (!Number.isFinite(n)) return COLUMN_CONFIG_DEFAULTS.limit
  return Math.min(10, Math.max(1, Math.round(n)))
})

const columnLayout = computed(() => resolveColumnLayout(config.value.layout))

const columnGap = computed(() => {
  const n = Number(config.value.item_gap)
  if (!Number.isFinite(n)) return 10
  return Math.min(24, Math.max(4, Math.round(n)))
})

const columnRadius = computed(() => {
  const n = Number(config.value.card_radius)
  if (!Number.isFinite(n)) return 14
  return Math.min(20, Math.max(0, Math.round(n)))
})

/** 三个显隐开关：老 DSL 没写过这些键 → 默认全开（保持历史页面外观不变） */
const showColumnDesc = computed(() => config.value.show_desc !== false)
const showColumnBadge = computed(() => config.value.show_badge !== false)
const showColumnHost = computed(() => config.value.show_host !== false)
const showColumnLessons = computed(() => config.value.show_lessons !== false)
const showColumnPrice = computed(() => config.value.show_price !== false)

/** 手动指定时按 column_ids 顺序取；未指定/取不到则回落到聚合接口给的全部 */
const columnItems = computed<Array<Record<string, any>>>(() => {
  const all = Array.isArray(warm.value.columns) ? warm.value.columns : []
  if (config.value.fetch_mode === 'manual') {
    const ids = Array.isArray(config.value.column_ids)
      ? config.value.column_ids.map((x: unknown) => String(x))
      : []
    if (ids.length) {
      const picked: Array<Record<string, any>> = []
      for (const id of ids) {
        const hit = all.find((c) => String(c.id) === id)
        if (hit) picked.push(hit)
      }
      // 指定了但一个都没命中（商品下架/配置残留）→ 交给下面 Mock 兜底，
      // 而不是显示「暂无专栏」让人以为操作没生效
      if (picked.length) return picked.slice(0, columnLimit.value)
    }
  }
  if (all.length) return all.slice(0, columnLimit.value)
  if (previewMockEnabled(config.value)) {
    return COLUMN_MOCK_ITEMS.slice(0, columnLimit.value).map((m) => ({ ...m }))
  }
  return []
})

/**
 * 「无数据时隐藏」只在**真机端**生效；装修器画布一律保留区块与空态文案。
 *
 * ⚠️ 判据不能用 `props.previewMode`：装修器画布渲染时**根本不传** previewMode
 * （undefined），`!undefined === true` 会把画布也判成真机 → 画布上区块整个消失，
 * 运营改了配置却看不到任何反馈。实测踩过：hideColumnsWhenEmpty 恒为 true。
 *
 * 正解：靠 `previewEnabled`（装修器注入的「编辑期预览」开关）判定画布，
 * 它在画布上一定是 true，在 H5/弹窗等真机预览态下是 false。
 */
const isBuilderCanvas = computed(() => previewEnabled.value === true)

const hideColumnsWhenEmpty = computed(
  () =>
    !isBuilderCanvas.value &&
    config.value.auto_hide_when_empty !== false &&
    columnItems.value.length === 0,
)

/**
 * 顶部视觉皮肤判定。
 * 规则（改自 2026-10-03）：
 *   - greet_skin 显式写了 'plain' 或 'classic' → 以它为准，单选开关说什么就是什么；
 *   - greet_skin 为空（老 DSL 从没选过）→ 才回退到旧的「旁路触发」启发式，
 *     保证历史页面的外观不变。
 * 修复的问题：原来无论选哪个，只要配了会员标签/品牌首字/改过字号，就恒为 plain，
 * 用户点单选组看不到任何变化，误以为「点击没反应」。
 */
function isMotaiPlainSkin(cfg: Record<string, unknown>) {
  const explicit = String(cfg.greet_skin || '').trim()
  if (explicit === 'plain') return true
  if (explicit === 'classic') return false
  // 未显式选择：沿用旧启发式，避免老页面样式突变
  if (cfg.show_member_badge === true) return true
  if (String(cfg.brand_initial || '').trim()) return true
  const titleSize = Number(cfg.greet_title_font_size)
  const subSize = Number(cfg.greet_sub_font_size)
  if (Number.isFinite(titleSize) && titleSize > 0 && titleSize !== 20) return true
  if (Number.isFinite(subSize) && subSize > 0 && subSize !== 11) return true
  return false
}

const usePlainChrome = computed(() => isMotaiPlainSkin(config.value))

const topStyle = computed(() => {
  const pad = `${warm.value.statusBarHeight || 20}px`
  if (topBackground.value) {
    return { paddingTop: pad, background: topBackground.value }
  }
  return { paddingTop: pad }
})

const greetTitleStyle = computed(() => {
  const n = Number(config.value.greet_title_font_size)
  const size = Number.isFinite(n) && n > 0 ? n : 20
  return { fontSize: `${size}px`, fontWeight: '700' }
})

const greetSubStyle = computed(() => {
  const n = Number(config.value.greet_sub_font_size)
  const size = Number.isFinite(n) && n > 0 ? n : 11
  return { fontSize: `${size}px` }
})

const brandInitial = computed(() => {
  const fromProp = String(config.value.brand_initial || '').trim()
  if (fromProp) return fromProp.slice(0, 1)
  const name = String(warm.value.brandName || '').trim()
  if (name) return name.slice(0, 1)
  return '暖'
})

const avatarSrc = computed(() => {
  const u = String(warm.value.userAvatar || '').trim()
  if (!u || u.includes('default-avatar')) return ''
  if (u.startsWith('http') || u.startsWith('/')) return u
  return ''
})

const showAvatarImage = computed(() => !!avatarSrc.value && !avatarBroken.value)

const memberBadgeLabel = computed(() => {
  const custom = String(warm.value.memberBadgeLabel || '').trim()
  if (custom) return custom
  if (warm.value.isPlatformMember) {
    return String(warm.value.memberLevelName || config.value.member_active_label || '年度会员').trim() || '年度会员'
  }
  return String(config.value.member_cta_label || '开通会员 ›').trim() || '开通会员 ›'
})

function onMemberBadgeClick() {
  const link = String(config.value.member_link || '/pages/member-center/member-center').trim()
    || '/pages/member-center/member-center'
  emit('preview-action', {
    tab: 'mine',
    message: `已打开会员中心（${link}）`,
  })
  ElMessage.success('预览：会员标签')
}

const featureMeta = computed(() => {
  const meta = warm.value.feature?.meta
  return Array.isArray(meta) ? meta : []
})

/**
 * 作者列表数据源（V122 重构，与小程序端 dsl-warm-block.js 的 resolveAuthors 必须同规则）。
 *
 * 三条来源，归一成同一形状：
 *   1. source_mode = dynamic → 走聚合接口（作者库按标签+排序实时拉取）
 *   2. source_mode = manual（或未写该字段）且 authors 非空 → 用配的快照
 *   3. 都没配 → 回落到首页聚合接口的 warm.authors（warm_home_config.authors），
 *      保持历史页面外观不变（老草稿零改动也能正常渲染）
 *
 * 快照模式下 authors 里可能残留 apply=true 的旧招募位条目，
 * 这里过滤掉并喂给 recruitSlot —— 招募位已从「每条一个开关」解耦为组件级配置。
 */
const authorSourceMode = computed(() => {
  const raw = String((config.value as Record<string, unknown>).source_mode || '')
  return raw === 'dynamic' ? 'dynamic' : 'manual'
})

/** 归一化单条作者：兼容老字段名、套用 customTitle 覆盖、绑定主页路径 */
function normalizeAuthorItem(a: Record<string, unknown>, i: number) {
  const name = String(a.nickname || a.name || '')
  const originTitle = String(a.title || a.role || '')
  // customTitle 只覆盖首页展示，不动作者库档案
  const role = String(a.customTitle || originTitle || '')
  const authorId = a.authorId ? Number(a.authorId) : 0
  const homePath = String(a.homePath || a.url || (authorId ? buildAuthorHomePath(authorId, name) : ''))
  return {
    key: String(a.key || a.id || `author_${i}`),
    id: authorId || a.id || '',
    name,
    role,
    avatar: String(a.avatar || ''),
    homePath,
  }
}

/** 作者主页路径：与 admin/src/api/author.ts 的 authorHomePath 同一规则 */
function buildAuthorHomePath(authorId: number | string, name: string) {
  const n = String(name || '').trim()
  return `/pkg-content/author-feed/author-feed?id=${authorId}${n ? `&author=${n}` : ''}`
}

/** dynamic 模式下拉到的作者（画布预览用，与属性面板的预览是同一个接口） */
const dynamicAuthors = ref<Array<Record<string, unknown>>>([])

/** 从配置里取作者条目列表（剥掉旧招募位条目） */
function authorCfgList(): Array<Record<string, unknown>> {
  const cfg = (config.value.authors || []) as Array<Record<string, unknown>>
  const list = Array.isArray(cfg) ? cfg.filter(Boolean) : []
  return list.filter((a) => a.apply !== true)
}

/** 旧数据里的招募位条目（apply=true） */
function legacyRecruitItem(): Record<string, unknown> | null {
  const cfg = (config.value.authors || []) as Array<Record<string, unknown>>
  if (!Array.isArray(cfg)) return null
  return cfg.find((a) => a && a.apply === true) || null
}

/**
 * 招募位配置（纯计算，无副作用）。
 * 优先级：新 recruitment_slot 字段 → 旧 authors 里的 apply 条目（向后兼容）。
 */
const recruitSlot = computed(() => {
  const slot = (config.value.recruitment_slot || {}) as Record<string, unknown>
  const legacy = legacyRecruitItem()
  const enabled = slot.enabled === true || (slot.enabled === undefined && !!legacy)
  if (!enabled) return null
  return {
    iconText: String(slot.icon_text || '＋'),
    label: String(slot.label || '招募中'),
    targetPath: String(slot.target_path || (legacy ? String(legacy.url || '') : '')),
  }
})

async function loadDynamicAuthors() {
  const cfg = (config.value.dynamic_config || {}) as Record<string, unknown>
  const tags = Array.isArray(cfg.tag_ids) ? (cfg.tag_ids as string[]) : []
  const sortBy = String(cfg.sort_by || 'weight')
  const limitRaw = Number(cfg.limit)
  const limit = Number.isFinite(limitRaw) ? Math.min(8, Math.max(3, Math.round(limitRaw))) : 5
  try {
    const res: any = await get<any>('/api/v1/mp/authors', {
      tags: tags.join(','),
      sortBy,
      limit,
    })
    const rows = res?.data
    dynamicAuthors.value = Array.isArray(rows) ? rows : rows?.records || []
  } catch {
    dynamicAuthors.value = []
  }
}

watch(
  () => [
    blockType.value,
    authorSourceMode.value,
    JSON.stringify((config.value.dynamic_config || {})),
  ],
  () => {
    if (blockType.value !== 'warm_authors') return
    if (authorSourceMode.value === 'dynamic') loadDynamicAuthors()
  },
  { immediate: true },
)

const authorList = computed(() => {
  const cfgList = authorCfgList()

  let source: Array<Record<string, unknown>>
  if (authorSourceMode.value === 'dynamic') {
    source = dynamicAuthors.value.map((a) => ({
      ...a,
      role: a.title,
      homePath: a.homePath || (a.id ? buildAuthorHomePath(String(a.id), String(a.name || '')) : ''),
    }))
  } else if (cfgList.length) {
    source = cfgList
  } else {
    // 都没配 → 回落到首页聚合接口，历史页面外观不变
    source = (warm.value.authors || []) as Array<Record<string, unknown>>
  }

  return source.filter(Boolean).map((a, i) => normalizeAuthorItem(a, i))
})

/** 作者点击：配了 homePath 走预览跳转；否则提示真机进作者作品页 */
function onAuthorClick(item: { name?: string; homePath?: string }) {
  if (item.homePath) {
    openPreviewLink(String(item.homePath), `作者「${item.name || ''}」`)
    return
  }
  onSimplePreviewClick(`作者「${item.name || ''}」主页`)
}

/** 招募位点击：读组件级 targetPath，不再依赖条目内的 apply 标记 */
function onRecruitClick() {
  const path = recruitSlot.value?.targetPath
  if (path) {
    openPreviewLink(String(path), '创作者招募')
    return
  }
  ElMessage.success('预览：打开创作者招募页（真机进入）')
}

/** 取任意一张星球卡的热点条目 */
function planetItemsOf(card: unknown) {
  const items = (card as { items?: unknown })?.items
  return (Array.isArray(items) ? items : []) as Array<{ tag?: string; text?: string }>
}

type PlanetCard = {
  planetId?: string
  title?: string
  members?: string
  cta?: string
  emoji?: string
  subtitle?: string
  joined?: boolean
  primary?: boolean
  introUrl?: string
  feedUrl?: string
}

/**
 * 星球卡归一化，规则与小程序端 dsl-warm-block._syncPlanetUi 一致：
 * planet_ids 勾选过滤 → planet_limit 截断 → planet_mode 决定单卡或多卡。
 *
 * ⚠️ 与端点的差异只有一处（见 isSinglePlanetMode 的注释）：不引入 primaryOnly 用户态。
 * 其余（过滤/截断/单卡挑主星球）必须与端上完全一致，否则运营在后台看到的
 * 和线上不一样，发布后就是「预览与真机不符」的事故。
 */
const planetCards = computed<PlanetCard[]>(() => {
  const cfg = config.value
  const all = (Array.isArray(warm.value.planets) && warm.value.planets.length
    ? warm.value.planets
    : [warm.value.planet || { planetId: 'warm-main', title: '', emoji: '🪐', cta: '进入星球' }]) as PlanetCard[]
  const wantIds = Array.isArray(cfg.planet_ids)
    ? (cfg.planet_ids as unknown[]).map((x) => String(x || '').trim()).filter(Boolean)
    : []
  let cards = wantIds.length
    ? wantIds.map((id) => all.find((p) => String(p.planetId) === id)).filter(Boolean) as PlanetCard[]
    : all.slice()
  const limit = Number(cfg.planet_limit)
  if (Number.isFinite(limit) && limit > 0 && cards.length > limit) {
    cards = cards.slice(0, limit)
  }
  return cards
})

/**
 * 是否收敛成单张通栏卡。
 *
 * 🔴 与端上 `_syncPlanetUi` 的**唯一差异**：这里不含 `warm.primaryOnly`。
 * 那是小程序端用户态（当前访客是否已设常驻主星球），装修器预览时恒为 true，
 * 混进来会让「展示模式」这个后台配置彻底失效（切模式画布无反应）。
 * 端上仍保留 primaryOnly —— 线上「已加入的用户自动收成单卡」是产品行为，不能改。
 */
const isSinglePlanetMode = computed(
  () => String(config.value.planet_mode || 'multi') === 'single',
)

const mainPlanet = computed<PlanetCard>(() => {
  const cards = planetCards.value
  // 单卡模式优先挑主星球；挑不到退回第一张，避免出现空白卡
  const primaryId = String(warm.value.primaryPlanetId || '')
  return (cards.find((p) => String(p.planetId) === primaryId) || cards[0] || {
    title: '',
    emoji: '🪐',
    cta: '进入星球',
  }) as PlanetCard
})

/** 已设主星球或这张就是主星球时，不再给「设为主星球」入口 */
const showSetMain = computed(() =>
  !!mainPlanet.value.planetId && mainPlanet.value.primary !== true && warm.value.primaryOnly !== true,
)

function onPlanetClick(card: PlanetCard) {
  const cfg = config.value
  const action = String(cfg.planet_action || '')
  const goFeed = action === 'feed' || action === 'always_feed'
    || (action !== 'intro' && !!card.joined)
  const url = goFeed ? card.feedUrl : card.introUrl
  const what = goFeed ? '星球动态' : '星球介绍'
  if (url) {
    openPreviewLink(url, card.title || what)
  } else {
    onSimplePreviewClick(card.title || what)
  }
}

function onPickMain() {
  openPreviewLink('/pkg-content/planet-list/planet-list', '星球列表')
}

function emitSeg(key: string) {
  emit('seg', key)
  onSegInjected(key)
}

/** 把真机链接解析成预览内的页面路径：custom 壳提取 path 参数，普通路径去前导斜杠与 query */
function resolvePreviewPath(raw: string): string {
  let u = String(raw || '').trim()
  if (!u) return ''
  u = u.replace(/^\//, '')
  const m = u.match(/^pages\/custom\/custom\?path=([^&]+)/)
  if (m) {
    try {
      return decodeURIComponent(m[1])
    } catch {
      return m[1]
    }
  }
  return u.split('?')[0]
}

/** 有链接 → 交给父级预览跳转（有快照则切页，无快照提示）；无链接 → 提示未配置 */
function openPreviewLink(url: string, label: string) {
  const path = resolvePreviewPath(url)
  if (path) {
    emit('preview-action', { previewPath: path, message: `已打开「${label}」` })
  } else {
    ElMessage.info(`「${label}」未配置链接`)
  }
}

function onNavClick(item: Record<string, unknown>) {
  openPreviewLink(String(item.url || ''), String(item.label || '入口'))
}

function onSearchClick() {
  ElMessage.success('预览：打开搜索页（真机进入搜索）')
}

function onMoreClick() {
  const moreUrl = String(config.value.more_url || config.value.moreUrl || '')
  const label = String(config.value.more_text || '更多').replace(/[›>\s]+$/u, '')
  if (moreUrl) {
    openPreviewLink(moreUrl, label || '更多')
  } else {
    ElMessage.success(`预览：打开「${label || '更多'}」列表（真机跳转）`)
  }
}

/** 详情类元素（文章/专栏/作者/精选/星球）：预览无详情快照，提示即可 */
function onSimplePreviewClick(what: string) {
  ElMessage.success(`预览：打开${what}（真机查看详情）`)
}
</script>

<style src="@/styles/warm-home-blocks.css"></style>
<style scoped>
.dsl-warm-block {
  background: var(--bg, #fdf6ec);
  color: var(--ink, #2a1c12);
}
/* 预览数据加载中的中性占位：避免先闪现默认问候/「快捷入口未配置」再跳变 */
.wh-loading {
  padding: 56px 16px;
  text-align: center;
  font-size: 12px;
  color: #a1897a;
}
/* 预览内可点击元素（对齐真机 bindtap 的交互反馈） */
.wh-clickable {
  cursor: pointer;
  transition: opacity 0.15s ease;
}
.wh-clickable:hover {
  opacity: 0.82;
}
.wh-clickable:active {
  opacity: 0.65;
}
.wh-authors--scroll,
.wh-rail--scroll {
  display: flex;
  overflow-x: auto;
  gap: 0;
  padding: 4px 16px 12px;
  -webkit-overflow-scrolling: touch;
}
.wh-authors--scroll .wh-author {
  flex: 0 0 auto;
}
.wh-rail--scroll .wh-col {
  flex: 0 0 auto;
}

/* ---------------------------------------------------------------- *
 * 品牌专栏三种布局（layout 配置）
 *   scroll 横向滚动：保持原实现，flex 容器 + 固定宽卡 + overflow-x
 *   grid   双列网格：两列等宽，换行排布
 *   single 单列大卡：整宽大卡，卡内图文上下堆叠
 * 共用同一套 DOM，只改容器的 display/grid 与卡的宽度 —— 三份结构必然走偏。
 * ---------------------------------------------------------------- */
.wh-rail--grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  padding: 4px 16px 12px;
}

.wh-rail--grid .wh-col {
  min-width: 0;
}

.wh-rail--single {
  display: flex;
  flex-direction: column;
  padding: 4px 16px 12px;
}

.wh-rail--single .wh-col {
  display: grid;
  grid-template-columns: 104px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
}

.wh-rail--single .wh-col__cv {
  height: 78px;
}

/* 无封面时的色块占位：比 <img src=""> 的破图态干净，且能看出「这块该有图」 */
.wh-col__cv-ph {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  color: #b3a596;
  font-size: 12px;
  background: linear-gradient(135deg, #f1ece5, #e7ddd0);
}

.wh-col__mt {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 4px;
  color: #9aa5b1;
  font-size: 11px;
}

.wh-col__host {
  color: #7b8798;
}

.wh-col__ls {
  padding: 1px 6px;
  color: #8c3208;
  background: #f7efe7;
  border-radius: 999px;
}

/* 演示卡片：一眼可辨，避免运营把示例内容误当成真实内容 */
.wh-col.is-mock {
  opacity: 0.92;
  outline: 1px dashed #d3bfae;
  outline-offset: -1px;
}
.wh-feature__img {
  object-fit: cover;
}
.wh-col__cv img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.wh-seg {
  cursor: pointer;
}
</style>
