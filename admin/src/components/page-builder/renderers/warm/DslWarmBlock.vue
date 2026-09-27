<template>
  <div class="dsl-warm-block" :class="'dsl-warm-block--' + blockType">
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
      <div v-if="config.show_search !== false" class="wh-search" :class="{ 'wh-search--plain': usePlainChrome }">
        <span>🔍</span>
        <span class="wh-search__ph">{{ config.search_placeholder || '搜索文章、笔记、专栏……' }}</span>
        <span class="wh-search__btn">搜索</span>
      </div>
      <div v-if="config.show_nav !== false" class="wh-nav wh-nav--grid5">
        <template v-if="warm.navs?.length">
          <div v-for="item in warm.navs" :key="String(item.key)" class="wh-nav__item">
            <div class="wh-nav__ic">{{ item.icon }}</div>
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
        <span class="wh-hd__a">{{ config.more_text || '全部作者 ›' }}</span>
      </div>
      <div v-if="warm.authors?.length" class="wh-authors wh-authors--scroll">
        <div v-for="item in warm.authors" :key="String(item.id || item.name)" class="wh-author">
          <div v-if="item.apply" class="wh-author__av wh-author__av--apply">＋</div>
          <img v-else class="wh-author__av" :src="String(item.avatar || '')" alt="" />
          <span class="wh-author__n">{{ item.name }}</span>
          <span class="wh-author__r">{{ item.role }}</span>
        </div>
      </div>
      <div v-else class="wh-feed-empty">暂无作者</div>
    </template>

    <!-- warm_feature -->
    <template v-else-if="blockType === 'warm_feature'">
      <div v-if="warm.loadError" class="wh-feed-empty">加载失败，请刷新预览</div>
      <div v-else-if="warm.feature" class="wh-feature">
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
        <span class="wh-hd__a">{{ config.more_text || '全部 ›' }}</span>
      </div>
      <div v-if="warm.columns?.length" class="wh-rail wh-rail--scroll">
        <div v-for="item in warm.columns" :key="String(item.id)" class="wh-col">
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
        <span class="wh-hd__a">{{ config.more_text || '进入 ›' }}</span>
      </div>
      <div class="wh-planet">
        <div class="wh-planet__rw">
          <span class="wh-planet__ic">🪐</span>
          <span class="wh-planet__h">{{ warm.planet?.title }}</span>
          <span class="wh-planet__num">{{ warm.planet?.members }}</span>
        </div>
        <div class="wh-planet__ls">
          <div v-for="(item, pi) in planetItems" :key="pi" class="wh-planet__li">
            <span class="wh-planet__tag">{{ item.tag }}</span>
            <span class="wh-planet__tx">{{ item.text }}</span>
          </div>
        </div>
        <div class="wh-planet__go">{{ warm.planet?.cta || '进入星球' }}</div>
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
        <div v-if="item.type === 'grid'" class="wh-three">
          <span class="wh-post__h">{{ item.title }}</span>
          <div class="wh-three__gg">
            <img v-for="(img, gi) in (item.images || [])" :key="gi" :src="String(img)" alt="" />
          </div>
          <div class="wh-post__mt">
            <span class="wh-tag">{{ item.tag }}</span>
            <span>{{ item.meta }}</span>
          </div>
        </div>
        <div v-else class="wh-post">
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
  'preview-action': [payload: { tab: string; message: string }]
}>()

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

const topBackground = computed(() => {
  const s = props.component.style || {}
  const bg = String(s.background_color || s.background || '').trim()
  return bg || ''
})

function isMotaiPlainSkin(cfg: Record<string, unknown>) {
  if (String(cfg.greet_skin || '').trim() === 'plain') return true
  if (cfg.show_member_badge === true) return true
  if (String(cfg.brand_initial || '').trim()) return true
  const titleSize = Number(cfg.greet_title_font_size)
  const subSize = Number(cfg.greet_sub_font_size)
  if (Number.isFinite(titleSize) && titleSize > 0 && titleSize !== 20) return true
  if (Number.isFinite(subSize) && subSize > 0 && subSize !== 11) return true
  return false
}

const usePlainChrome = computed(() => isMotaiPlainSkin(config.value) || !!topBackground.value)

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

const planetItems = computed(() => {
  const items = warm.value.planet?.items
  return (Array.isArray(items) ? items : []) as Array<{ tag?: string; text?: string }>
})

function emitSeg(key: string) {
  emit('seg', key)
  onSegInjected(key)
}
</script>

<style src="@/styles/warm-home-blocks.css"></style>
<style scoped>
.dsl-warm-block {
  background: var(--bg, #fdf6ec);
  color: var(--ink, #2a1c12);
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
