<template>
  <div
    class="wk-card wk-creator"
    :style="rootStyle"
  >
    <span v-if="editing" class="wk-edit-hint">editing</span>

    <div class="wk-creator__head">
      <span v-if="p.showStatus && p.statusTag" class="wk-creator__tag" :style="tagStyle">
        {{ p.statusTag }}
      </span>
      <h4 class="wk-creator__slogan">{{ p.slogan || '招募标语' }}</h4>
    </div>

    <p v-if="p.incomeText" class="wk-creator__income">{{ p.incomeText }}</p>

    <div v-if="p.ctaText" class="wk-creator__foot">
      <span class="wk-creator__cta" :style="ctaStyle">{{ p.ctaText }} →</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useWarmKit } from '../../shared/useWarmKit'
import { opCreatorBannerDefaultProps } from './schema'
import type { ComponentInstance } from '@/types/page'

const props = defineProps<{
  component: ComponentInstance
}>()

const { safe: p, guard, editing, bg } = useWarmKit({
  defaults: opCreatorBannerDefaultProps,
  source: computed(() => props.component?.props),
  editorMode: computed(() => false),
})

const rootStyle = computed(() => ({
  background: bg.value || '#FDF6EC',
  boxShadow: '0 4px 16px rgba(180, 83, 9, 0.06)',
  borderLeft: `3px solid ${p.value.accentColor || '#C2410C'}`,
}))

const tagStyle = computed(() => ({
  background: p.value.tagColor || '#0AAA75',
}))

const ctaStyle = computed(() => ({
  color: p.value.accentColor || '#C2410C',
  borderColor: p.value.accentColor || '#C2410C',
}))
</script>

<style scoped>
.wk-creator {
  position: relative;
  padding: 14px;
}
.wk-creator__head {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.wk-creator__tag {
  align-self: flex-start;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  line-height: 1.7;
  color: #FFFDF9;
}
.wk-creator__slogan {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.65;
  color: #292524;
}
.wk-creator__income {
  margin: 8px 0 0;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: #B45309;
  background: #FFFAF3;
}
.wk-creator__foot {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #F5E6D4;
}
.wk-creator__cta {
  display: inline-block;
  padding: 5px 14px;
  border: 1px solid;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
}
</style>
