<script setup lang="ts">
/**
 * 实时移动端模拟器（Split-View 右半边）
 *
 * 🔴 为什么不用 DevicePreview（iframe）？
 *   任务书要求「左侧修改导航名称/换绑页面/改品牌色时，右侧无刷新实时重渲染」。
 *   iframe 预览是加载真实页面，它做不到"改配置立刻在屏上出现"——
 *   要等发版 → iframe 刷新，这在交互上等于没有联动。
 *   所以这里**自己渲染**：把 tabBar 的名称/图标/选中态和品牌色直接画出来。
 *
 * 它画的是「导航与品牌外壳」的真实结构（Tab 数量、名称、图标、主色、
 * Logo、品牌眉题），不画页面内容 —— 内容归装修器预览管，这里只管外壳，
 * 这样才能保证"改一个字屏幕上就变一个字"。
 */
import { computed } from 'vue'
import type { NavTab } from '@/types/miniapp'

const props = withDefaults(
  defineProps<{
    tabs: NavTab[]
    /** 品牌主色，#RRGGBB */
    accent: string
    /** 小程序名称 */
    appName: string
    /** 品牌眉题（英文副标） */
    eyebrow?: string
    logoUrl?: string
    logoMark?: string
    /** 品牌介绍 */
    intro?: string
    /** 缩放 */
    zoom?: '75' | '100'
    /** 当前选中的 tab 下标 */
    activeIdx?: number
  }>(),
  { zoom: '100', activeIdx: 0, eyebrow: '', logoUrl: '', logoMark: '', intro: '' },
)

/** 只画可见的（enabled !== false）Tab —— 与小程序端渲染口径一致 */
const visibleTabs = computed(() =>
  props.tabs.filter((t) => (t as any).enabled !== false).slice(0, 5),
)

const activeIndex = computed(() => {
  const i = props.tabs.findIndex((t, idx) => idx === props.activeIdx)
  const visibleBefore = props.tabs
    .slice(0, Math.max(0, i))
    .filter((t) => (t as any).enabled !== false).length
  return Math.max(0, visibleBefore)
})

const scale = computed(() => (props.zoom === '75' ? 0.75 : 1))

const mark = computed(() => props.logoMark || props.appName.slice(0, 1) || '·')
</script>

<template>
  <div class="sim">
    <div class="sim__stage" :style="{ transform: `scale(${scale})` }">
      <div class="sim__phone">
        <!-- 灵动岛 -->
        <div class="sim__island" />
        <div class="sim__screen">
          <!-- 状态栏 -->
          <div class="sim__status">
            <span class="sim__time">9:41</span>
            <span class="sim__sigs">
              <i class="sim__sig" /><i class="sim__sig" /><i class="sim__sig sim__sig--bat" />
            </span>
          </div>

          <!-- 品牌区：Logo / 名称 / 眉题 / 介绍 -->
          <div class="sim__brand">
            <div class="sim__logo" :style="{ background: accent }">
              <img v-if="logoUrl" :src="logoUrl" alt="" class="sim__logo-img" />
              <span v-else class="sim__logo-mark">{{ mark }}</span>
            </div>
            <div class="sim__brand-text">
              <div v-if="eyebrow" class="sim__eyebrow">{{ eyebrow }}</div>
              <div class="sim__name">{{ appName || '未命名小程序' }}</div>
              <div v-if="intro" class="sim__intro">{{ intro }}</div>
            </div>
          </div>

          <!-- 内容占位：明确标注这里不画内容，避免误以为预览失真 -->
          <div class="sim__body">
            <div class="sim__ph" style="width: 62%; height: 10px" />
            <div class="sim__ph" style="width: 100%; height: 46px; border-radius: 8px" />
            <div class="sim__ph" style="width: 88%" />
            <div class="sim__ph" style="width: 74%" />
            <div class="sim__ph" style="width: 100%; height: 46px; border-radius: 8px" />
          </div>

          <!-- 底部 Tab：真实反映 tabs 配置 -->
          <div class="sim__tabbar">
            <div
              v-for="(t, i) in visibleTabs"
              :key="t.id || i"
              class="sim__tab"
              :class="{ 'is-on': i === activeIndex }"
              :style="i === activeIndex ? { color: accent } : undefined"
            >
              <img v-if="t.icon" :src="t.icon" alt="" class="sim__tab-icon" />
              <span v-else class="sim__tab-dot" :style="{ background: i === activeIndex ? accent : '#cbd5e1' }" />
              <span class="sim__tab-text">{{ t.text || `导航${i + 1}` }}</span>
            </div>
            <div v-if="!visibleTabs.length" class="sim__tab-empty">尚未配置底部导航</div>
          </div>
        </div>
      </div>
    </div>

    <p class="sim__note">
      实时预览<b>导航与品牌外壳</b>；页面内容请到「页面管理 › 装修」查看。
    </p>
  </div>
</template>

<style scoped lang="scss">
.sim {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px 12px;
}
.sim__stage {
  transform-origin: top center;
  transition: transform var(--saas-t-slow) var(--saas-spring);
}

/* iPhone 外壳：细边框 + 圆角，不用重阴影 */
.sim__phone {
  position: relative;
  width: 268px;
  padding: 10px;
  border: 1px solid #d8dee9;
  border-radius: var(--saas-r-phone);
  background: #fff;
  box-shadow: var(--saas-shadow-lg);
}
.sim__island {
  position: absolute;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  width: 78px;
  height: 20px;
  border-radius: var(--saas-r-full);
  background: #111827;
  z-index: 2;
}
.sim__screen {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 540px;
  border-radius: 32px;
  background: #fff;
  overflow: hidden;
}

/* 状态栏 */
.sim__status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 18px;
  flex: none;
}
.sim__time { font-size: 12px; font-weight: 600; color: #0f172a; }
.sim__sigs { display: flex; align-items: flex-end; gap: 2px; height: 10px; }
.sim__sig { width: 3px; background: #0f172a; border-radius: 1px; }
.sim__sig:nth-child(1) { height: 4px; }
.sim__sig:nth-child(2) { height: 7px; }
.sim__sig--bat { width: 14px; height: 8px; border-radius: 2px; }

/* 品牌区 */
.sim__brand {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 14px 18px 10px;
  flex: none;
}
.sim__logo {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  overflow: hidden;
  flex: none;
}
.sim__logo-img { width: 100%; height: 100%; object-fit: cover; }
.sim__logo-mark { color: #fff; font-size: 20px; font-weight: 700; }
.sim__brand-text { min-width: 0; }
.sim__eyebrow {
  font-size: 9px;
  letter-spacing: 0.14em;
  color: #94a3b8;
  text-transform: uppercase;
}
.sim__name {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sim__intro {
  margin-top: 2px;
  font-size: 11px;
  color: #64748b;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 内容占位 */
.sim__body {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 12px 18px;
  flex: 1;
}
.sim__ph {
  height: 10px;
  border-radius: 5px;
  background: #f1f5f9;
}

/* 底部 Tab */
.sim__tabbar {
  display: flex;
  align-items: stretch;
  justify-content: space-around;
  height: 58px;
  padding-bottom: 6px;
  border-top: 1px solid #e2e8f0;
  background: #fff;
  flex: none;
}
.sim__tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  flex: 1;
  color: #94a3b8;
}
.sim__tab.is-on { font-weight: 600; }
.sim__tab-icon { width: 20px; height: 20px; }
.sim__tab-dot { width: 18px; height: 18px; border-radius: 50%; }
.sim__tab-text {
  font-size: 10px;
  line-height: 1.2;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 2px;
}
.sim__tab-empty {
  align-self: center;
  font-size: 11px;
  color: #cbd5e1;
}

.sim__note {
  margin: 0;
  font-size: var(--saas-fs-cap);
  color: var(--saas-ink-3);
  text-align: center;
  line-height: 1.6;
  b { color: var(--saas-ink-2); font-weight: 600; }
}
</style>