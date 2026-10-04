<template>
  <div
    class="wk-card wk-ask"
    :style="rootStyle"
  >
    <span v-if="editing" class="wk-edit-hint">编辑态：点击不会唤起提问</span>

    <div v-if="p.title" class="wk-ask__head">
      <span class="wk-title">{{ p.title }}</span>
    </div>

    <div class="wk-ask__host">
      <span
        v-if="p.hostAvatar"
        class="wk-ask__avatar"
        :style="avatarStyle(p.hostAvatar)"
      >
        <img :src="p.hostAvatar" alt="" />
      </span>
      <span v-else class="wk-ask__avatar wk-ask__avatar--text">{{ initial(p.hostName) }}</span>

      <div class="wk-ask__who">
        <div class="wk-ask__name-row">
          <span class="wk-ask__name">{{ p.hostName || '主理人' }}</span>
          <span v-if="p.hostRole" class="wk-ask__role">{{ p.hostRole }}</span>
        </div>
        <div class="wk-ask__stat">
          <span class="wk-ask__answered">已解答 {{ fmt(p.answeredCount) }} 次</span>
          <span v-if="p.showSla && p.responseSla" class="wk-ask__sla">
            <i class="wk-ask__dot" />{{ p.responseSla }}
          </span>
        </div>
      </div>
    </div>

    <p class="wk-ask__desc">{{ desc }}</p>

    <button
      v-if="p.ctaText"
      type="button"
      class="wk-ask__cta"
      :style="ctaStyle"
      @click.stop="ask"
    >
      {{ p.ctaText }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useWarmKit } from '../../shared/useWarmKit'
import { planetAskBannerDefaultProps } from './schema'
import type { ComponentInstance } from '@/types/page'

const props = defineProps<{
  component: ComponentInstance
}>()

const { safe: p, guard, editing, bg } = useWarmKit({
  defaults: planetAskBannerDefaultProps,
  source: computed(() => props.component?.props),
  editorMode: computed(() => false),
})

const rootStyle = computed(() => ({
  background: bg.value || '#FDF6EC',
  boxShadow: '0 4px 16px rgba(180, 83, 9, 0.06)',
}))

const ctaStyle = computed(() => ({
  background: p.value.accentColor || '#C2410C',
  boxShadow: '0 4px 16px rgba(180, 83, 9, 0.06)',
}))

const desc = computed(
  () =>
    pickText(p.value.subtitle) ||
    '政策看不懂、税号对不上、申报节点记不住，把具体场景抛进来，主理人按你的实际情况回答。',
)

function pickText(v: any) {
  return String(v || '').trim()
}

function fmt(n: any) {
  const v = Number(n)
  if (!Number.isFinite(v)) return '0'
  return v >= 10000 ? `${(v / 10000).toFixed(1)}w` : String(v)
}

function initial(name: any) {
  return String(name || '主').slice(0, 1)
}

function avatarStyle(src: string) {
  return { backgroundImage: `url(${src})`, backgroundSize: 'cover', backgroundPosition: 'center' }
}

function ask(e: Event) {
  if (editing.value) {
    guard(e)
    return
  }
  window.dispatchEvent(
    new CustomEvent('planet-ask-open', {
      detail: { host: p.value.hostName, link: p.value.askLink },
    }),
  )
}
</script>

<style scoped>
.wk-ask {
  position: relative;
  padding: 14px;
}
.wk-ask__head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 12px;
}
.wk-ask__host {
  display: flex;
  align-items: center;
  gap: 10px;
}
.wk-ask__avatar {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  flex-shrink: 0;
  background: #FDE8D8 center/cover no-repeat;
}
.wk-ask__avatar--text {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  color: #C2410C;
  background: #FDE8D8;
}
.wk-ask__who {
  flex: 1;
  min-width: 0;
}
.wk-ask__name-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.wk-ask__name {
  font-size: 14px;
  font-weight: 600;
  color: #292524;
}
.wk-ask__role {
  font-size: 11px;
  color: #B45309;
}
.wk-ask__stat {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
  font-size: 11px;
  color: #78716C;
}
.wk-ask__sla {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #0AAA75;
}
.wk-ask__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #0AAA75;
}
.wk-ask__desc {
  margin: 10px 0 0;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 12px;
  line-height: 1.7;
  color: #57534E;
  background: #FFFAF3;
}
.wk-ask__cta {
  display: block;
  width: 100%;
  margin-top: 12px;
  padding: 10px 0;
  border: none;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  color: #FFFDF9;
  cursor: pointer;
}
.wk-guard .wk-ask__cta {
  cursor: default;
}
</style>