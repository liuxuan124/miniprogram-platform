<template>
  <div class="render-member-plan">
    <div v-if="showBanner" class="mp-banner">
      <h3>{{ component.props.banner_title || '选择会员方案' }}</h3>
      <p>{{ component.props.banner_subtitle || '' }}</p>
    </div>

    <div v-if="state === 'loading'" class="mp-state">
      <div v-for="i in 2" :key="i" class="mp-skeleton" />
    </div>
    <div v-else-if="state === 'error'" class="mp-state">
      <p>方案加载失败</p>
      <button type="button" @click="refresh">重试</button>
    </div>
    <div v-else-if="state === 'empty'" class="mp-state">暂无可用会员方案</div>
    <div
      v-else
      class="mp-cards"
      :class="scrollDirection === 'horizontal' ? 'mp-cards--h' : 'mp-cards--v'"
    >
      <div
        v-for="plan in plans"
        :key="String(plan.id)"
        class="mp-card"
        :class="{ 'mp-card--rec': plan.recommend }"
      >
        <span v-if="plan.recommend" class="mp-badge">{{ badgeText }}</span>
        <div class="mp-name">{{ plan.name }}</div>
        <div class="mp-price">{{ plan.priceText || '见选购页' }}</div>
        <ul v-if="benefitMode === 'list' && plan.rights?.length" class="mp-rights">
          <li v-for="(r, i) in plan.rights.slice(0, 5)" :key="i">{{ r }}</li>
        </ul>
        <p v-else-if="plan.description" class="mp-desc">{{ plan.description }}</p>
      </div>
    </div>

    <div v-if="showAgreement" class="mp-agreement">{{ component.props.agreement_text }}</div>
    <div class="mp-bar">
      <button type="button" class="mp-checkout">立即开通</button>
    </div>
    <p v-if="iosAlt" class="mp-ios">{{ iosAlt }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { ComponentInstance } from '@/types/page'
import { loadHydratedComponent } from '@/utils/preview-datasource'

const props = defineProps<{ component: ComponentInstance; previewMode?: boolean }>()

type PlanRow = { id: number | string; name: string; description?: string; rights?: string[]; recommend?: boolean; priceText?: string }

const plans = ref<PlanRow[]>([])
const loading = ref(false)
const failed = ref(false)
const empty = ref(false)

const showBanner = computed(() => props.component.props?.show_banner !== false)
const benefitMode = computed(() => props.component.props?.benefit_mode || 'list')
const scrollDirection = computed(() => props.component.props?.scroll_direction || 'vertical')
const showAgreement = computed(() => props.component.props?.show_agreement !== false)
const badgeText = computed(() => props.component.props?.badge_text || '推荐')
const iosAlt = computed(() => String(props.component.props?.ios_alt_copy || '').trim())

const state = computed(() => {
  if (loading.value) return 'loading'
  if (failed.value) return 'error'
  if (empty.value || !plans.value.length) return 'empty'
  return 'data'
})

async function refresh() {
  loading.value = true
  failed.value = false
  try {
    if (props.previewMode) {
      plans.value = [
        { id: 1, name: '年度会员', priceText: '¥299/年', rights: ['全文解锁', '资料下载', '专属客服'], recommend: true },
        { id: 2, name: '季度会员', priceText: '¥99/季', rights: ['全文解锁', '积分加倍'] },
      ]
      empty.value = false
      return
    }
    const hydrated = await loadHydratedComponent(props.component)
    if (hydrated.props?._previewDataFailed) {
      failed.value = true
      plans.value = []
      empty.value = true
      return
    }
    plans.value = hydrated.props?.items || []
    empty.value = !plans.value.length
  } catch {
    failed.value = true
    empty.value = true
  } finally {
    loading.value = false
  }
}

onMounted(refresh)
watch(() => JSON.stringify(props.component.props?.data_source), refresh)
</script>

<style scoped>
.render-member-plan {
  position: relative;
  padding-bottom: 56px;
}
.mp-banner {
  padding: 12px 4px 16px;
}
.mp-banner h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
}
.mp-banner p {
  margin: 6px 0 0;
  font-size: 12px;
  color: #64748b;
}
.mp-cards--v {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.mp-cards--h {
  display: flex;
  gap: 10px;
  overflow-x: auto;
}
.mp-card {
  position: relative;
  border: 1px solid #e8dcc8;
  border-radius: 14px;
  padding: 14px;
  background: #fff;
  min-width: 160px;
}
.mp-card--rec {
  border-color: #c8923a;
  box-shadow: 0 8px 24px rgba(200, 146, 58, 0.15);
}
.mp-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 10px;
  background: #c8923a;
  color: #fff;
  padding: 2px 8px;
  border-radius: 999px;
}
.mp-name {
  font-weight: 700;
  font-size: 15px;
}
.mp-price {
  margin-top: 6px;
  color: #c8923a;
  font-size: 14px;
  font-weight: 600;
}
.mp-rights {
  margin: 10px 0 0;
  padding-left: 16px;
  font-size: 11px;
  color: #475569;
}
.mp-desc {
  margin: 8px 0 0;
  font-size: 11px;
  color: #64748b;
}
.mp-agreement {
  margin-top: 10px;
  font-size: 10px;
  color: #94a3b8;
  text-align: center;
}
.mp-bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 8px 0 0;
}
.mp-checkout {
  width: 100%;
  border: none;
  border-radius: 999px;
  padding: 11px;
  background: linear-gradient(135deg, #c8923a, #a66b1f);
  color: #fff;
  font-weight: 600;
}
.mp-ios {
  margin-top: 8px;
  font-size: 10px;
  color: #94a3b8;
  line-height: 1.5;
}
.mp-state {
  text-align: center;
  padding: 20px;
  font-size: 12px;
  color: #64748b;
}
.mp-skeleton {
  height: 88px;
  border-radius: 14px;
  background: #f1f5f9;
  margin-bottom: 8px;
}
</style>
