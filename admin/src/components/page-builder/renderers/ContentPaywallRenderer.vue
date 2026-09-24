<template>
  <div class="paywall" :class="'paywall--' + (component.props.theme || 'warm')">
    <div class="paywall__fade" />
    <div class="paywall__box">
      <h4>{{ component.props.title || '解锁全文' }}</h4>
      <p>{{ component.props.hint || '开通后可查看完整内容' }}</p>
      <button type="button" class="paywall__btn">{{ component.props.button_text || '立即解锁' }}</button>
      <p v-if="component.props.secondary_text" class="paywall__alt">{{ component.props.secondary_text }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ComponentInstance } from '@/types/page'

defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()
</script>

<style scoped>
.paywall {
  position: relative;
  margin-top: -40px;
  padding: 48px 16px 0;
}
.paywall__fade {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 64px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0), #fdf6ec 85%);
  pointer-events: none;
}
.paywall__box {
  position: relative;
  border-radius: 16px;
  padding: 18px 16px;
  text-align: center;
  background: linear-gradient(150deg, #fff6ea, #fdeedb);
  border: 1px solid #f0e0c8;
}
.paywall__box h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #172033;
}
.paywall__box p {
  margin: 8px 0 14px;
  font-size: 12px;
  line-height: 1.6;
  color: #5c6570;
}
.paywall__btn {
  border: none;
  border-radius: 999px;
  padding: 10px 28px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #c8923a, #a66b1f);
  cursor: default;
}
.paywall__alt {
  margin-top: 10px !important;
  margin-bottom: 0 !important;
  font-size: 11px;
  color: #9aa3ad;
}
.paywall--blue .paywall__box {
  background: linear-gradient(150deg, #eef5ff, #e3edff);
  border-color: #c8d9f5;
}
.paywall--blue .paywall__fade {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0), #f5f8ff 85%);
}
</style>
