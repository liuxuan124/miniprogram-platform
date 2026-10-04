<template>
  <div
    class="wk-card wk-gate"
    :style="rootStyle"
  >
    <span v-if="editing" class="wk-edit-hint">editing</span>

    <div class="wk-gate__top">
      <img v-if="p.cover" class="wk-gate__cover" :src="p.cover" alt="封面" />
      <div v-else class="wk-gate__cover wk-gate__cover--ph">白皮书</div>

      <div class="wk-gate__info">
        <h4 class="wk-gate__title">{{ p.title || '白皮书标题' }}</h4>
        <div v-if="p.showMeta" class="wk-gate__meta">
          <span v-if="p.pageCount" class="wk-gate__chip">{{ p.pageCount }} 页</span>
          <span v-if="p.fileSize" class="wk-gate__chip">{{ p.fileSize }}</span>
          <span class="wk-gate__chip wk-gate__chip--lock">PDF</span>
        </div>
      </div>
    </div>

    <p v-if="p.description" class="wk-gate__desc">{{ p.description }}</p>

    <div v-if="isLead" class="wk-gate__form">
      <el-input
        v-if="showName"
        v-model="leadName"
        class="wk-gate__input"
        size="small"
        placeholder="请输入您的姓名"
        @click.stop
      />
      <el-input
        v-model="leadPhone"
        class="wk-gate__input"
        size="small"
        placeholder="请输入手机号"
        @click.stop
      />
    </div>

    <div class="wk-gate__foot">
      <span class="wk-gate__cta" :style="ctaStyle">{{ p.ctaText || '免费解锁' }}</span>
    </div>
    <p v-if="isLead" class="wk-gate__tip">提交即视为同意我们通过电话或短信与你联系</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useWarmKit } from '../../shared/useWarmKit'
import { opGatedDownloadDefaultProps } from './schema'
import type { ComponentInstance } from '@/types/page'

const props = defineProps<{
  component: ComponentInstance
}>()

const { safe: p, guard, editing, bg } = useWarmKit({
  defaults: opGatedDownloadDefaultProps,
  source: computed(() => props.component?.props),
  editorMode: computed(() => false),
})

/** 留资模式的临时输入态，画布内不触发任何请求 */
const leadName = ref('')
const leadPhone = ref('')

const rootStyle = computed(() => ({
  background: bg.value || '#FDF6EC',
  boxShadow: '0 4px 16px rgba(180, 83, 9, 0.06)',
}))

const isLead = computed(() => p.value.unlockMode === 'lead')

const showName = computed(() => isLead.value && p.value.leadFields === 'name_phone')

const ctaStyle = computed(() => ({
  background: p.value.accentColor || '#C2410C',
}))
</script>

<style scoped>
.wk-gate {
  position: relative;
  padding: 14px;
}
.wk-gate__top {
  display: flex;
  gap: 12px;
}
.wk-gate__cover {
  flex: 0 0 72px;
  width: 72px;
  height: 96px;
  border-radius: 8px;
  object-fit: cover;
  background: #FFFAF3;
  border: 1px solid #F5E6D4;
}
.wk-gate__cover--ph {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #B45309;
  writing-mode: vertical-rl;
  letter-spacing: 2px;
}
.wk-gate__info {
  flex: 1;
  min-width: 0;
}
.wk-gate__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.55;
  color: #292524;
}
.wk-gate__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.wk-gate__chip {
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 10px;
  line-height: 1.7;
  color: #B45309;
  background: #FFFAF3;
  border: 1px solid #F5E6D4;
}
.wk-gate__chip--lock {
  color: #FFFDF9;
  background: #B45309;
  border-color: #B45309;
}
.wk-gate__desc {
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.7;
  color: #57534E;
}
.wk-gate__form {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.wk-gate__input {
  width: 100%;
}
.wk-gate__foot {
  margin-top: 14px;
}
.wk-gate__cta {
  display: block;
  padding: 9px 0;
  border-radius: 999px;
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  color: #FFFDF9;
}
.wk-gate__tip {
  margin: 8px 0 0;
  font-size: 10px;
  line-height: 1.6;
  color: #78716C;
}
</style>
