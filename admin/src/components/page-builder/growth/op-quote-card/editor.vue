<template>
  <div
    class="wk-card wk-quote"
    :class="{ 'wk-guard': editing }"
    :style="rootStyle"
    @click="guard($event)"
  >
    <span v-if="editing" class="wk-edit-hint">editing</span>

    <div class="wk-quote__body" :class="alignClass" :style="quoteStyle">
      <span v-if="p.showQuoteMark" class="wk-quote__mark" :style="markStyle">「</span>
      <p class="wk-quote__text">{{ p.quote || '金句正文' }}</p>
    </div>

    <div v-if="p.author || p.authorTitle" class="wk-quote__by" :class="alignClass">
      <span v-if="p.author" class="wk-quote__author" :style="{ color: p.accentColor }">
        —— {{ p.author }}
      </span>
      <span v-if="p.authorTitle" class="wk-quote__title">{{ p.authorTitle }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useWarmKit } from '../../shared/useWarmKit'
import { opQuoteCardDefaultProps } from './schema'
import type { ComponentInstance } from '@/types/page'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const { safe: p, guard, editing, bg } = useWarmKit({
  defaults: opQuoteCardDefaultProps,
  source: computed(() => props.component?.props),
  editorMode: computed(() => !props.previewMode),
})

const rootStyle = computed(() => ({
  background: bg.value || '#FDF6EC',
  boxShadow: '0 4px 16px rgba(180, 83, 9, 0.06)',
}))

const alignClass = computed(() =>
  p.value.align === 'left' ? 'wk-quote__body--left' : 'wk-quote__body--center',
)

const quoteStyle = computed(() => {
  const size = Number(p.value.fontSize)
  return { fontSize: `${Number.isFinite(size) && size > 0 ? size : 19}px` }
})

const markStyle = computed(() => ({
  color: p.value.paperTint || '#F5E6D4',
}))
</script>

<style scoped>
.wk-quote {
  position: relative;
  padding: 22px 18px;
}
.wk-quote__body {
  position: relative;
}
.wk-quote__body--center {
  text-align: center;
}
.wk-quote__body--left {
  text-align: left;
}
.wk-quote__mark {
  position: absolute;
  top: -14px;
  left: 8px;
  font-size: 56px;
  line-height: 1;
  pointer-events: none;
  user-select: none;
}
.wk-quote__body--center .wk-quote__mark {
  left: 50%;
  transform: translateX(-50%);
}
.wk-quote__text {
  position: relative;
  margin: 0;
  font-weight: 600;
  line-height: 1.75;
  color: #292524;
  letter-spacing: 0.3px;
}
.wk-quote__by {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.wk-quote__author {
  font-size: 12px;
  font-weight: 500;
}
.wk-quote__title {
  font-size: 11px;
  line-height: 1.6;
  color: #78716C;
}
</style>
