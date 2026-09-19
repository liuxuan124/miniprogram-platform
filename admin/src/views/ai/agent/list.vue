<template>
  <div class="agent-list-page">
    <PageHeader
      kicker="系统 / 智能 Agent"
      title="智能 Agent"
      description="按岗位管理模型、Prompt、语料库与发布。未单独配置的岗位会借用客服配置。"
    >
      <template #actions>
        <el-button type="primary" plain @click="$router.push('/ai/knowledge')">AI 语料库</el-button>
        <el-button type="primary" @click="$router.push('/ai/drafts')">草稿箱</el-button>
      </template>
    </PageHeader>

    <el-card shadow="never" class="public-switch-card">
      <div class="public-switch">
        <div>
          <strong>小程序 Agent 入口</strong>
          <span class="muted">agent_public_enabled · 默认关闭，用户看不到 AI 入口</span>
        </div>
        <el-switch v-model="agentPublicEnabled" :loading="savingPublic" @change="onPublicToggle" />
      </div>
    </el-card>

    <el-card shadow="never" class="public-switch-card">
      <div class="trigger-head">
        <strong>触发位（需先打开总开关）</strong>
        <el-button size="small" type="primary" :loading="savingTriggers" @click="saveTriggers">保存</el-button>
      </div>
      <div class="trigger-row">
        <span>搜索页「问问暖阁」</span>
        <el-switch v-model="triggerConfig.searchEntry" />
      </div>
      <div class="trigger-row">
        <span>首页悬浮入口</span>
        <el-switch v-model="triggerConfig.homeFab" />
      </div>
      <div class="trigger-row">
        <span>星球页悬浮入口</span>
        <el-switch v-model="triggerConfig.planetFab" />
      </div>
    </el-card>

    <el-row :gutter="16" v-loading="loading">
      <el-col v-for="card in roleCards" :key="card.role" :xs="24" :sm="12" :lg="8">
        <el-card shadow="never" class="role-card">
          <div class="role-card__head">
            <div class="role-card__icon">{{ roleIcon(card.role) }}</div>
            <div class="role-card__title">
              <span class="role-card__name">{{ card.name || ROLE_NAMES[card.role] || card.role }}</span>
              <el-tag v-if="card.configured" size="small" type="success">已配置</el-tag>
              <el-tag v-else size="small" type="warning">未配置</el-tag>
            </div>
          </div>

          <div v-if="card.configured" class="role-card__meta">
            <div>{{ card.model || '—' }} · v{{ card.version ?? 0 }}</div>
            <div v-if="card.updatedAt" class="role-card__muted">更新于 {{ formatDate(card.updatedAt) }}</div>
            <div v-if="card.todayCalls != null" class="role-card__stats">
              今日 {{ card.todayCalls }} 次
              <template v-if="card.todayTokens != null"> · {{ card.todayTokens }} tokens</template>
              <template v-if="card.todayCost != null"> · ¥{{ card.todayCost }}</template>
            </div>
          </div>

          <el-alert
            v-else
            type="warning"
            :closable="false"
            show-icon
            class="role-card__warn"
          >
            <template #title>
              未配置，正在借用{{ fallbackLabel(card.fallbackTo) }}配置
            </template>
          </el-alert>

          <div class="role-card__actions">
            <el-button
              v-if="card.configured"
              type="primary"
              @click="goConfig(card.role)"
            >
              配置
            </el-button>
            <el-button
              v-else
              type="warning"
              @click="goConfig(card.role)"
            >
              立即配置
            </el-button>
            <el-button @click="goSandbox(card.role)">沙盒测试</el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-empty v-if="!loading && roleCards.length === 0" description="暂无岗位数据" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import { ElMessage } from 'element-plus'
import { get, put } from '@/api/request'
import { getAgentRoles } from '@/api/agent'
import { ROLE_NAMES } from '@/constants/agentRoles'
import { useIndustryProfileStore } from '@/stores/industry-profile'
import type { AgentRoleCard } from '@/types/agent'

const router = useRouter()
const industryProfileStore = useIndustryProfileStore()
const loading = ref(false)
const roleCards = ref<AgentRoleCard[]>([])
const agentPublicEnabled = ref(false)
const savingPublic = ref(false)
const savingTriggers = ref(false)
const triggerConfig = reactive({
  searchEntry: true,
  homeFab: false,
  planetFab: true,
})

async function loadPublicSwitch() {
  try {
    const res = await get<any>('/api/v1/admin/agent/public-enabled')
    agentPublicEnabled.value = Boolean((res as any)?.data?.enabled)
  } catch {
    agentPublicEnabled.value = false
  }
}

async function onPublicToggle(val: boolean) {
  savingPublic.value = true
  try {
    await put('/api/v1/admin/agent/public-enabled', { enabled: val })
    ElMessage.success(val ? '已开放小程序入口' : '已关闭小程序入口')
  } catch (e: any) {
    agentPublicEnabled.value = !val
    ElMessage.error(e?.message || '保存失败')
  } finally {
    savingPublic.value = false
  }
}

async function loadTriggerConfig() {
  try {
    const res = await get<any>('/api/v1/admin/agent/trigger-config')
    const data = (res as any)?.data ?? res ?? {}
    triggerConfig.searchEntry = data.searchEntry !== false
    triggerConfig.homeFab = Boolean(data.homeFab)
    triggerConfig.planetFab = data.planetFab !== false
  } catch {
    /* keep defaults */
  }
}

async function saveTriggers() {
  savingTriggers.value = true
  try {
    await put('/api/v1/admin/agent/trigger-config', { ...triggerConfig })
    ElMessage.success('触发位已保存')
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    savingTriggers.value = false
  }
}

const FALLBACK_ORDER: AgentRoleCard[] = [
  { role: 'service', name: '客服助手', configured: false },
  { role: 'content_ops', name: '内容运营', configured: false, fallbackTo: 'service' },
  { role: 'page_builder', name: '页面搭建', configured: false, fallbackTo: 'service' },
]

function roleIcon(role: string) {
  if (role === 'service') return '🎧'
  if (role === 'content_ops') return '✍️'
  if (role === 'page_builder') return '🧩'
  return '🤖'
}

function fallbackLabel(fallback?: string) {
  if (!fallback) return '客服'
  return ROLE_NAMES[fallback] || fallback
}

function formatDate(value?: string) {
  if (!value) return '—'
  return value.replace('T', ' ').slice(0, 16)
}

function goConfig(role: string) {
  router.push(`/ai/agent/${role}`)
}

function goSandbox(role: string) {
  router.push({ path: `/ai/agent/${role}`, query: { tab: 'sandbox' } })
}

function filterByIndustry(list: AgentRoleCard[]) {
  return list.filter((card) => industryProfileStore.isAgentRoleAllowed(card.role))
}

async function loadRoles() {
  loading.value = true
  try {
    if (!industryProfileStore.loaded) await industryProfileStore.load()
    const res = await getAgentRoles()
    const list = res.data || []
    roleCards.value = filterByIndustry(list.length > 0 ? list : FALLBACK_ORDER)
  } catch {
    roleCards.value = filterByIndustry(FALLBACK_ORDER)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadRoles()
  void loadPublicSwitch()
  void loadTriggerConfig()
})
</script>

<style scoped lang="scss">
.agent-list-page {
  padding: 20px;
}
.public-switch-card { margin-bottom: 16px; }
.public-switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.trigger-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.trigger-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-top: 1px solid var(--el-border-color-lighter);
}
.public-switch .muted {
  display: block;
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
.role-card {
  margin-bottom: 16px;
  border-radius: 12px;
  &--soon {
    opacity: 0.92;
  }
}
.role-card__head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 12px;
}
.role-card__icon {
  font-size: 28px;
  line-height: 1;
}
.role-card__title {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.role-card__name {
  font-weight: 700;
  font-size: 16px;
}
.role-card__meta {
  font-size: 13px;
  line-height: 1.6;
  margin-bottom: 12px;
}
.role-card__muted {
  font-size: 12px;
  color: var(--text-muted);
}
.role-card__stats {
  margin-top: 4px;
  color: var(--text-muted);
  font-size: 12px;
}
.role-card__warn {
  margin-bottom: 12px;
}
.role-card__soon-text {
  margin-bottom: 12px;
  font-size: 12px;
}
.role-card__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
