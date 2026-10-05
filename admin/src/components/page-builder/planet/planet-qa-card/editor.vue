<template>
  <div
    class="wk-card wk-qa"
    :class="{ 'wk-guard': editing }"
    :style="rootStyle"
    @click="guard($event)"
  >
    <div v-if="p.title || p.subtitle" class="wk-qa__head">
      <span v-if="p.title" class="wk-title">{{ p.title }}</span>
      <span v-if="p.subtitle" class="wk-sub">{{ p.subtitle }}</span>
    </div>

    <div v-if="!items.length" class="wk-empty">暂无精选问答</div>

    <article v-for="(it, i) in items" :key="it.id || i" class="wk-qa__item">
      <h4 class="wk-qa__q">{{ it.question || '提问摘要' }}</h4>
      <div class="wk-qa__answerer">
        <span v-if="it.answererAvatar" class="wk-qa__avatar" :style="avatarStyle(it.answererAvatar)">
          <img :src="it.answererAvatar" alt="" />
        </span>
        <span v-else class="wk-qa__avatar wk-qa__avatar--text">{{ initial(it.answerer) }}</span>
        <span class="wk-qa__who">{{ it.answerer || '主理人' }}</span>
        <span v-if="it.answererRole" class="wk-qa__role">{{ it.answererRole }}</span>
      </div>
      <p class="wk-qa__a" :style="answerStyle">{{ it.answer || '回复摘要' }}</p>
      <div v-if="p.showViews || p.showLikes" class="wk-qa__meta">
        <span v-if="p.showViews" class="wk-qa__stat">👁 {{ fmt(it.views) }}</span>
        <span v-if="p.showLikes" class="wk-qa__stat">♥ {{ fmt(it.likes) }}</span>
      </div>
    </article>

    <div v-if="p.moreText" class="wk-qa__more" :style="{ color: p.accentColor }">
      {{ p.moreText }} →
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useWarmKit } from '../../shared/useWarmKit'
import { planetQaCardDefaultProps } from './schema'
import type { ComponentInstance } from '@/types/page'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const { safe: p, items, guard, editing, bg } = useWarmKit({
  defaults: planetQaCardDefaultProps,
  source: computed(() => props.component?.props),
  editorMode: computed(() => !props.previewMode),
  itemKey: 'items',
  limitKey: 'limit',
})

const rootStyle = computed(() => ({
  background: bg.value || '#FDF6EC',
  boxShadow: '0 4px 16px rgba(180, 83, 9, 0.06)',
}))

const answerStyle = computed(() => ({
  display: '-webkit-box',
  WebkitLineClamp: String(p.value.summaryLines || 3),
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
}))

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
</script>

<style scoped>
.wk-qa {
  padding: 14px;
}
.wk-qa__head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 10px;
}
.wk-qa__item {
  padding: 12px 0;
  border-top: 1px solid #F5E6D4;
}
.wk-qa__item:first-of-type {
  border-top: none;
  padding-top: 2px;
}
.wk-qa__q {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.6;
  color: #292524;
}
.wk-qa__answerer {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}
.wk-qa__avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  flex-shrink: 0;
  background: #FDE8D8 center/cover no-repeat;
}
.wk-qa__avatar--text {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #C2410C;
  background: #FDE8D8;
}
.wk-qa__who {
  font-size: 12px;
  font-weight: 500;
  color: #57534E;
}
.wk-qa__role {
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10px;
  color: #B45309;
  background: #FDE8D8;
}
.wk-qa__a {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: #57534E;
}
.wk-qa__meta {
  display: flex;
  gap: 14px;
  margin-top: 8px;
}
.wk-qa__stat {
  font-size: 11px;
  color: #78716C;
}
.wk-qa__more {
  padding-top: 12px;
  text-align: center;
  font-size: 13px;
  font-weight: 500;
}
.wk-empty {
  padding: 24px 0;
  text-align: center;
  font-size: 13px;
  color: #78716C;
}
</style>
