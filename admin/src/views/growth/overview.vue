<template>
  <div class="growth-page" v-loading="loading">
    <PageHeader title="增长与数据" subtitle="漏斗、券效果、搜索洞察、订阅与实验（MVP）">
      <template #actions>
        <el-button @click="loadAll" :loading="loading">刷新</el-button>
      </template>
    </PageHeader>

    <el-alert v-if="narrative" :title="narrative" type="success" show-icon :closable="false" class="mb" />

    <el-row :gutter="16">
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>转化漏斗（近 {{ days }} 天）</template>
          <el-table :data="funnel" size="small">
            <el-table-column prop="event" label="事件" />
            <el-table-column prop="count" label="次数" width="100" />
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>优惠券效果</template>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="核销次数">{{ coupon.useCount || 0 }}</el-descriptions-item>
            <el-descriptions-item label="优惠总额">¥{{ coupon.discountTotal || 0 }}</el-descriptions-item>
            <el-descriptions-item label="带动实付 GMV">¥{{ coupon.payGmv || 0 }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="mt">
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>热搜词</template>
          <el-table :data="hot" size="small" max-height="280">
            <el-table-column prop="keyword" label="关键词" />
            <el-table-column prop="count" label="次数" width="80" />
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>无结果词（选题清单）</template>
          <el-table :data="noResult" size="small" max-height="280">
            <el-table-column prop="keyword" label="关键词" />
            <el-table-column prop="count" label="次数" width="80" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="mt">
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>内容带货榜</template>
          <el-table :data="contentGmv" size="small" max-height="280">
            <el-table-column prop="contentId" label="内容 ID" width="100" />
            <el-table-column prop="orderCount" label="订单数" width="90" />
            <el-table-column prop="gmv" label="GMV" />
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>订阅消息模板</template>
          <el-form label-width="110px" size="small">
            <el-form-item v-for="scene in scenes" :key="scene" :label="scene">
              <el-input v-model="tplMap[scene]" placeholder="微信模板 ID" @change="saveTpl(scene)" />
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { get, put } from '@/api/request'

const loading = ref(false)
const days = 7
const narrative = ref('')
const funnel = ref<any[]>([])
const coupon = reactive<any>({})
const hot = ref<any[]>([])
const noResult = ref<any[]>([])
const contentGmv = ref<any[]>([])
const scenes = ['order_status', 'appointment_remind', 'activity_remind', 'coupon_expire']
const tplMap = reactive<Record<string, string>>({})

async function loadAll() {
  loading.value = true
  try {
    const [f, c, s, g, n, t] = await Promise.all([
      get('/api/v1/admin/growth/funnel', { days }),
      get('/api/v1/admin/growth/coupon-effect'),
      get('/api/v1/admin/growth/search-insights'),
      get('/api/v1/admin/growth/content-gmv'),
      get('/api/v1/admin/growth/insight-narrative'),
      get('/api/v1/admin/growth/subscribe/templates'),
    ])
    funnel.value = (f as any).data?.funnel || []
    Object.assign(coupon, (c as any).data || {})
    hot.value = (s as any).data?.hot || []
    noResult.value = (s as any).data?.noResult || []
    contentGmv.value = (g as any).data || []
    narrative.value = (n as any).data?.narrative || ''
    scenes.forEach((sc) => { tplMap[sc] = '' })
    ;((t as any).data || []).forEach((row: any) => {
      if (row.scene) tplMap[row.scene] = row.templateId || ''
    })
  } finally {
    loading.value = false
  }
}

async function saveTpl(scene: string) {
  await put('/api/v1/admin/growth/subscribe/templates', {
    scene,
    templateId: tplMap[scene],
    title: scene,
    enabled: 1,
  })
}

onMounted(loadAll)
</script>

<style scoped>
.growth-page { padding: 0 4px 24px; }
.mb { margin-bottom: 16px; }
.mt { margin-top: 16px; }
</style>
