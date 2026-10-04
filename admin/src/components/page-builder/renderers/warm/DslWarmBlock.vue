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
      <div v-if="authorList.length" class="wh-authors wh-authors--scroll">
        <div
          v-for="(item, ai) in authorList"
          :key="String(item.key || item.name || ai)"
          class="wh-author wh-clickable"
          @click.stop="onAuthorClick(item)"
        >
          <div v-if="item.apply" class="wh-author__av wh-author__av--apply">＋</div>
          <img v-else-if="item.avatar" class="wh-author__av" :src="String(item.avatar)" alt="" />
          <div v-else class="wh-author__av wh-author__av--initial">{{ (item.name || '作').slice(0, 1) }}</div>
          <span class="wh-author__n">{{ item.name }}</span>
          <span class="wh-author__r">{{ item.role }}</span>
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
      <div class="wh-hd">
        <span class="wh-hd__t serif">{{ config.title || '精品专栏' }}</span>
        <span class="wh-hd__a wh-clickable" @click.stop="onMoreClick">{{ config.more_text || '全部 ›' }}</span>
      </div>
      <div v-if="warm.columns?.length" class="wh-rail wh-rail--scroll">
        <div v-for="item in warm.columns" :key="String(item.id)" class="wh-col wh-clickable" @click.stop="onSimplePreviewClick(`专栏「${item.title || ''}」`)">
          <div class="wh-col__cv">
            <img :src="String(item.cover || '')" alt="" />
            <span v-if="item.badge" class="wh-tag wh-col__bdg" :class="{ gold: item.badgeGold }">{{ item.badge }}</span>
          </div>
          <span class="wh-col__h">{{ item.title }}</span>
          <span class="wh-col__p">{{ item.desc }}</span>
          <div class="wh-col__pr">
            {{ item.price }}
            <span v-if="item.origin" class="wh-col__s">{{ item.origin }}</span>
          </div>
        </div>
      </div>
      <div v-else class="wh-feed-empty">暂无专栏</div>
    </template>

    <!-- warm_planet_rec -->
    <template v-else-if="blockType === 'warm_planet_rec'">
      <div class="wh-hd">
        <span class="wh-hd__t serif">{{ config.title || '我的星球' }}</span>
        <span class="wh-hd__a wh-clickable" @click.stop="onMoreClick">{{ config.more_text || '进入 ›' }}</span>
      </div>

      <!-- 多星球横滑（与小程序端 _syncPlanetUi 同规则） -->
      <div v-if="planetCards.length > 1 && !warm.primaryOnly" class="wh-planets">
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

      <!-- 单卡：已设主星球 / 配置为单卡 / 只有一颗星球 -->
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
import { computed, inject, ref, type Ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { WarmPreviewView } from '@/utils/warmHomePreviewMap'
import type { ComponentInstance } from '@/types/page'
import {
  WARM_PREVIEW_VIEW_KEY,
  WARM_PREVIEW_ENABLED_KEY,
  WARM_PREVIEW_ON_SEG_KEY,
} from '@/composables/useWarmHomePreview'
import { buildWarmPreviewView } from '@/utils/warmHomePreviewMap'

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

/** 预览模式且数据未到位：整页 warm 区块统一占位，避免逐块空态跳变 */
const previewLoading = computed(() => previewEnabled.value && warm.value.loading === true)

const topBackground = computed(() => {
  const s = props.component.style || {}
  const bg = String(s.background_color || s.background || '').trim()
  return bg || ''
})

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
 * 作者列表数据源优先级（改自 2026-10-04）：
 *   1. DSL 里配了 props.authors → 用配的（运营可覆盖接口数据，支持自定义头像/名称/身份/跳转与末尾「＋」招募位）
 *   2. 没配 → 回落到首页聚合接口的 warm.authors（warm_home_config.authors），保持历史页面外观不变
 * 两条来源在这里归一成同一形状，渲染层不区分来源。
 */
const authorList = computed(() => {
  const cfg = config.value.authors
  const src: Array<Record<string, unknown>> = Array.isArray(cfg) && cfg.length
    ? (cfg as Array<Record<string, unknown>>)
    : (warm.value.authors || [])
  return src.map((a, i) => ({
    key: String(a.key || a.id || `author_${i}`),
    name: String(a.name || ''),
    role: String(a.role || ''),
    avatar: String(a.avatar || ''),
    url: String(a.url || ''),
    apply: a.apply === true,
  }))
})

/** 作者点击：招募位提示进投稿页；配了自定义 url 走预览跳转；否则提示真机进作者作品页 */
function onAuthorClick(item: { name?: string; url?: string; apply?: boolean }) {
  if (item.apply) {
    ElMessage.success('预览：打开招募投稿页（真机进入）')
    return
  }
  if (item.url) {
    openPreviewLink(String(item.url), `作者「${item.name || ''}」`)
    return
  }
  onSimplePreviewClick(`作者「${item.name || ''}」主页`)
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
 * planet_ids 勾选过滤 → planet_limit 截断 → planet_mode/primaryOnly 决定单卡或多卡。
 * 预览与真机必须同规则，否则运营在后台看到的效果和线上不一样。
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

const mainPlanet = computed<PlanetCard>(() => {
  const only = String(config.value.planet_mode || 'multi') === 'single' || warm.value.primaryOnly === true
  const cards = planetCards.value
  if (!only) return { title: '', emoji: '🪐', cta: '进入星球' }
  const primaryId = String(warm.value.primaryPlanetId || '')
  return (cards.find((p) => String(p.planetId) === primaryId) || cards[0] || { title: '', emoji: '🪐', cta: '进入星球' }) as PlanetCard
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
