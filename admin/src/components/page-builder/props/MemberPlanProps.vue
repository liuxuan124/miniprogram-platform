<template>
  <div class="member-plan-props">
    <el-form label-width="88px" size="small">
      <el-divider content-position="left">方案来源</el-divider>
      <el-form-item label="范围">
        <el-radio-group
          :model-value="data.scope || 'platform'"
          @change="(v: string) => patchScope(v)"
        >
          <el-radio-button value="platform">平台会员</el-radio-button>
          <el-radio-button value="planet">星球会员</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="data.scope === 'planet'" label="星球">
        <el-input
          :model-value="data.planet_id"
          placeholder="星球 ID"
          @update:model-value="(v: string) => emit('update', { planet_id: v })"
        />
      </el-form-item>
      <el-form-item label="推荐档位">
        <el-select
          :model-value="data.recommend_plan_id"
          clearable
          filterable
          placeholder="选择推荐方案"
          style="width: 100%"
          @change="(v: number | null) => emit('update', { recommend_plan_id: v ?? undefined })"
        >
          <el-option v-for="p in planOptions" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>
      </el-form-item>

      <el-divider content-position="left">展示</el-divider>
      <el-form-item label="顶部横幅">
        <el-switch :model-value="data.show_banner !== false" @change="(v: boolean) => emit('update', { show_banner: v })" />
      </el-form-item>
      <el-form-item label="横幅标题">
        <el-input :model-value="data.banner_title" @update:model-value="(v: string) => emit('update', { banner_title: v })" />
      </el-form-item>
      <el-form-item label="横幅副标题">
        <el-input :model-value="data.banner_subtitle" @update:model-value="(v: string) => emit('update', { banner_subtitle: v })" />
      </el-form-item>
      <el-form-item label="权益展示">
        <el-radio-group
          :model-value="data.benefit_mode || 'list'"
          @change="(v: string) => emit('update', { benefit_mode: v })"
        >
          <el-radio-button value="list">列表</el-radio-button>
          <el-radio-button value="desc">描述</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="排列方向">
        <el-radio-group
          :model-value="data.scroll_direction || 'vertical'"
          @change="(v: string) => emit('update', { scroll_direction: v })"
        >
          <el-radio-button value="vertical">纵向</el-radio-button>
          <el-radio-button value="horizontal">横向滑动</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="推荐角标">
        <el-input :model-value="data.badge_text" @update:model-value="(v: string) => emit('update', { badge_text: v })" />
      </el-form-item>
      <el-form-item label="服务协议">
        <el-switch :model-value="data.show_agreement !== false" @change="(v: boolean) => emit('update', { show_agreement: v })" />
      </el-form-item>
      <el-form-item label="协议文案">
        <el-input :model-value="data.agreement_text" @update:model-value="(v: string) => emit('update', { agreement_text: v })" />
      </el-form-item>
      <el-form-item label="iOS 提示">
        <el-input
          type="textarea"
          :rows="2"
          :model-value="data.ios_alt_copy"
          @update:model-value="(v: string) => emit('update', { ios_alt_copy: v })"
        />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { ComponentInstance } from '@/types/page'
import { getMembershipPlanList, type MembershipPlan } from '@/api/membershipPlan'

const { props: data } = defineProps<{ props: ComponentInstance['props'] }>()
const emit = defineEmits<{ update: [patch: Record<string, unknown>] }>()

const planOptions = ref<MembershipPlan[]>([])

async function loadPlans() {
  const scope = data.scope || 'platform'
  const res = await getMembershipPlanList({
    scope: scope as 'platform' | 'planet',
    planetId: data.planet_id || undefined,
  })
  planOptions.value = (res?.data || []).filter((p) => p.status === 1)
}

function patchScope(scope: string) {
  emit('update', {
    scope,
    data_source: {
      type: 'membership_plan',
      params: { scope, planetId: scope === 'planet' ? data.planet_id : undefined, status: 1 },
    },
  })
}

onMounted(loadPlans)
</script>
