<template>
  <div class="agent-list-page">
    <PageHeader
      kicker="系统 / 智能 Agent"
      title="智能 Agent"
      description="按岗位管理模型、Prompt、知识库与发布。未单独配置的岗位会借用客服配置。"
    >
      <template #actions>
        <el-button type="primary" plain @click="$router.push('/ai/knowledge')">知识库管理</el-button>
      </template>
    </PageHeader>

    <el-row :gutter="16" v-loading="loading">
      <el-col v-for="card in roleCards" :key="card.role" :xs="24" :sm="12" :lg="8">
        <el-card shadow="never" class="role-card" :class="{ 'role-card--soon': card.comingSoon }">
          <div class="role-card__head">
            <div class="role-card__icon">{{ roleIcon(card.role) }}</div>
            <div class="role-card__title">
              <span class="role-card__name">{{ card.name || ROLE_NAMES[card.role] || card.role }}</span>
              <el-tag v-if="card.comingSoon" size="small" type="info">即将上线</el-tag>
              <el-tag v-else-if="card.configured" size="small" type="success">已配置</el-tag>
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
            v-else-if="!card.comingSoon"
            type="warning"
            :closable="false"
            show-icon
            class="role-card__warn"
          >
            <template #title>
              未配置，正在借用{{ fallbackLabel(card.fallbackTo) }}配置
            </template>
          </el-alert>

          <div v-else class="role-card__muted role-card__soon-text">
            页面搭建 Agent 预留中，可先查看占位配置。
          </div>

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
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import { getAgentRoles } from '@/api/agent'
import { ROLE_NAMES } from '@/constants/agentRoles'
import type { AgentRoleCard } from '@/types/agent'

const router = useRouter()
const loading = ref(false)
const roleCards = ref<AgentRoleCard[]>([])

const FALLBACK_ORDER: AgentRoleCard[] = [
  { role: 'service', name: '客服助手', configured: false },
  { role: 'content_ops', name: '内容运营', configured: false, fallbackTo: 'service' },
  { role: 'page_builder', name: '页面搭建', configured: false, comingSoon: true },
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

async function loadRoles() {
  loading.value = true
  try {
    const res = await getAgentRoles()
    const list = res.data || []
    if (list.length > 0) {
      roleCards.value = list
    } else {
      roleCards.value = FALLBACK_ORDER
    }
  } catch {
    roleCards.value = FALLBACK_ORDER
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadRoles()
})
</script>

<style scoped lang="scss">
.agent-list-page {
  padding: 20px;
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
