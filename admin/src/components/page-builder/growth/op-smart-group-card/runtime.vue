<template>
  <div
    class="wk-card wk-group"
    :style="rootStyle"
  >
    <span v-if="editing" class="wk-edit-hint">editing</span>

    <div class="wk-group__head">
      <h4 class="wk-group__name">{{ p.groupName || '读者交流群' }}</h4>
      <span v-if="p.memberScale" class="wk-group__scale">{{ p.memberScale }}</span>
    </div>

    <div class="wk-group__main">
      <div class="wk-group__qrbox">
        <img v-if="p.qrImage" class="wk-group__qr" :src="p.qrImage" alt="群二维码" />
        <div v-else class="wk-group__qr wk-group__qr--ph">二维码</div>
        <p v-if="p.qrTip" class="wk-group__qrtip">{{ p.qrTip }}</p>
      </div>

      <ul class="wk-group__benefits">
        <li v-for="(b, i) in benefits" :key="b.id || i" class="wk-group__benefit">
          <span v-if="b.icon" class="wk-group__bicon">{{ b.icon }}</span>
          <span class="wk-group__btext">{{ b.text || '入群福利' }}</span>
        </li>
      </ul>
    </div>

    <div v-if="p.showFallback" class="wk-group__foot">
      <span class="wk-group__cta" :style="ctaStyle">{{ p.ctaText || '复制客服微信' }}</span>
      <span v-if="p.fallbackWechat" class="wk-group__wechat">{{ p.fallbackWechat }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useWarmKit } from '../../shared/useWarmKit'
import { opSmartGroupCardDefaultProps } from './schema'
import type { ComponentInstance } from '@/types/page'

const props = defineProps<{
  component: ComponentInstance
}>()

const { safe: p, items: benefits, guard, editing, bg } = useWarmKit({
  defaults: opSmartGroupCardDefaultProps,
  source: computed(() => props.component?.props),
  editorMode: computed(() => false),
  itemKey: 'benefits',
})

const rootStyle = computed(() => ({
  background: bg.value || '#FDF6EC',
  boxShadow: '0 4px 16px rgba(180, 83, 9, 0.06)',
}))

const ctaStyle = computed(() => ({
  color: p.value.accentColor || '#C2410C',
  borderColor: p.value.accentColor || '#C2410C',
}))
</script>

<style scoped>
.wk-group {
  position: relative;
  padding: 14px;
}
.wk-group__head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 12px;
}
.wk-group__name {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.5;
  color: #292524;
}
.wk-group__scale {
  font-size: 11px;
  color: #B45309;
}
.wk-group__main {
  display: flex;
  gap: 12px;
}
.wk-group__qrbox {
  flex: 0 0 84px;
  text-align: center;
}
.wk-group__qr {
  width: 84px;
  height: 84px;
  border-radius: 10px;
  object-fit: cover;
  background: #FFFAF3;
  border: 1px solid #F5E6D4;
}
.wk-group__qr--ph {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #B45309;
}
.wk-group__qrtip {
  margin: 6px 0 0;
  font-size: 10px;
  line-height: 1.5;
  color: #0AAA75;
}
.wk-group__benefits {
  flex: 1;
  margin: 0;
  padding: 0;
  list-style: none;
  min-width: 0;
}
.wk-group__benefit {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 5px 0;
}
.wk-group__benefit + .wk-group__benefit {
  border-top: 1px solid #F5E6D4;
}
.wk-group__bicon {
  flex-shrink: 0;
  font-size: 13px;
  line-height: 1.6;
}
.wk-group__btext {
  font-size: 12px;
  line-height: 1.6;
  color: #57534E;
}
.wk-group__foot {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #F5E6D4;
  display: flex;
  align-items: center;
  gap: 10px;
}
.wk-group__cta {
  padding: 5px 14px;
  border: 1px solid;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
}
.wk-group__wechat {
  font-size: 11px;
  color: #78716C;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
