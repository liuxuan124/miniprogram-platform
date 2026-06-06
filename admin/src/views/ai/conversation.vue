<template>
  <div class="ai-conversation-container">
    <!-- 对话列表 -->
    <el-card v-if="!showDetail" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>AI 对话记录</span>
        </div>
      </template>

      <!-- 筛选区 -->
      <el-form :inline="true" :model="queryParams" class="filter-form" @submit.prevent="fetchList">
        <el-form-item label="关键词">
          <el-input v-model="queryParams.keyword" placeholder="搜索对话内容" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item label="用户ID">
          <el-input-number v-model="queryParams.user_id" :min="1" controls-position="right" placeholder="用户ID" clearable style="width: 140px" />
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 260px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="fetchList">查询</el-button>
          <el-button icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 数据表格 -->
      <el-table
        v-loading="loading"
        :data="conversationList"
        border
        stripe
        style="width: 100%"
      >
        <el-table-column prop="id" label="ID" width="80" align="center" />
        <el-table-column label="用户" min-width="140">
          <template #default="{ row }">
            <div style="display: flex; align-items: center; gap: 8px">
              <el-avatar :size="28" :src="row.user_avatar">
                {{ row.user_nickname?.charAt(0) }}
              </el-avatar>
              <span>{{ row.user_nickname }}</span>
              <span class="text-muted">(#{{ row.user_id }})</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="miniapp_name" label="小程序" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.miniapp_name || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="first_message" label="首条消息" min-width="200" show-overflow-tooltip />
        <el-table-column prop="message_count" label="消息数" width="90" align="center" />
        <el-table-column prop="last_message_at" label="最后消息时间" width="170" align="center" />
        <el-table-column prop="created_at" label="创建时间" width="170" align="center" />
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleViewDetail(row)">查看</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="queryParams.page"
          v-model:page-size="queryParams.page_size"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="fetchList"
          @current-change="fetchList"
        />
      </div>
    </el-card>

    <!-- 对话详情 -->
    <el-card v-else shadow="hover">
      <template #header>
        <div class="card-header">
          <div style="display: flex; align-items: center; gap: 12px">
            <el-button icon="ArrowLeft" @click="showDetail = false">返回列表</el-button>
            <span>对话详情 #{{ currentConversation.id }}</span>
            <span class="text-muted">{{ currentConversation.user_nickname }}</span>
          </div>
        </div>
      </template>

      <div v-loading="detailLoading" class="chat-container">
        <div
          v-for="msg in messageList"
          :key="msg.id"
          :class="['chat-message', msg.role === AiMessageRole.User ? 'chat-message--user' : 'chat-message--assistant']"
        >
          <div class="chat-message__avatar">
            <el-avatar v-if="msg.role === AiMessageRole.Assistant" :size="32" class="avatar-ai">
              AI
            </el-avatar>
            <el-avatar v-else :size="32" :src="currentConversation.user_avatar">
              {{ currentConversation.user_nickname?.charAt(0) }}
            </el-avatar>
          </div>
          <div class="chat-message__body">
            <div class="chat-message__header">
              <span class="chat-message__role">
                {{ AiMessageRoleLabels[msg.role as AiMessageRole] || msg.role }}
              </span>
              <span v-if="msg.tokens" class="chat-message__tokens">tokens: {{ msg.tokens }}</span>
              <span class="chat-message__time">{{ msg.created_at }}</span>
            </div>
            <div class="chat-message__content">{{ msg.content }}</div>
          </div>
        </div>

        <el-empty v-if="!detailLoading && messageList.length === 0" description="暂无消息记录" />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { getAiConversations, getAiConversationDetail } from '@/api/ai'
import type { AiConversation, AiConversationMessage, AiConversationParams } from '@/types/ai'
import { AiMessageRole, AiMessageRoleLabels } from '@/types/ai'

/** 列表数据 */
const conversationList = ref<AiConversation[]>([])
const total = ref(0)
const loading = ref(false)
const dateRange = ref<string[]>([])

/** 查询参数 */
const queryParams = reactive<AiConversationParams>({
  page: 1,
  page_size: 20,
  keyword: '',
  user_id: undefined,
  start_date: undefined,
  end_date: undefined,
})

/** 获取列表 */
async function fetchList() {
  loading.value = true
  try {
    if (dateRange.value && dateRange.value.length === 2) {
      queryParams.start_date = dateRange.value[0]
      queryParams.end_date = dateRange.value[1]
    } else {
      queryParams.start_date = undefined
      queryParams.end_date = undefined
    }
    const res = await getAiConversations(queryParams)
    conversationList.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch {
    conversationList.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

/** 重置筛选 */
function handleReset() {
  queryParams.keyword = ''
  queryParams.user_id = undefined
  queryParams.page = 1
  queryParams.page_size = 20
  dateRange.value = []
  queryParams.start_date = undefined
  queryParams.end_date = undefined
  fetchList()
}

/** 对话详情 */
const showDetail = ref(false)
const detailLoading = ref(false)
const messageList = ref<AiConversationMessage[]>([])
const currentConversation = ref<Partial<AiConversation>>({})

async function handleViewDetail(row: AiConversation) {
  currentConversation.value = row
  showDetail.value = true
  detailLoading.value = true
  try {
    const res = await getAiConversationDetail(row.id)
    messageList.value = res.data || []
  } catch {
    messageList.value = []
  } finally {
    detailLoading.value = false
  }
}

onMounted(() => {
  fetchList()
})
</script>

<style lang="scss" scoped>
.ai-conversation-container {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .filter-form {
    margin-bottom: 16px;
  }

  .pagination-wrapper {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }

  .text-muted {
    color: #909399;
    font-size: 12px;
  }

  .chat-container {
    max-height: 600px;
    overflow-y: auto;
    padding: 16px 0;
  }

  .chat-message {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;

    &--user {
      flex-direction: row-reverse;

      .chat-message__body {
        align-items: flex-end;
      }

      .chat-message__content {
        background-color: #ecf5ff;
        border-radius: 12px 4px 12px 12px;
      }

      .chat-message__header {
        justify-content: flex-end;
      }
    }

    &--assistant {
      .chat-message__content {
        background-color: #f4f4f5;
        border-radius: 4px 12px 12px 12px;
      }
    }

    &__avatar {
      flex-shrink: 0;

      .avatar-ai {
        background-color: #409eff;
        color: #fff;
        font-size: 12px;
        font-weight: 600;
      }
    }

    &__body {
      display: flex;
      flex-direction: column;
      max-width: 70%;
      gap: 4px;
    }

    &__header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #909399;
    }

    &__role {
      font-weight: 500;
    }

    &__tokens {
      font-size: 11px;
      color: #b0b0b0;
    }

    &__time {
      font-size: 11px;
    }

    &__content {
      padding: 10px 14px;
      line-height: 1.6;
      font-size: 14px;
      white-space: pre-wrap;
      word-break: break-word;
    }
  }
}
</style>
