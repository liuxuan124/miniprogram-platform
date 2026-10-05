<template>
  <div class="conv-list">
    <!-- 状态 Tab -->
    <div class="conv-tabs">
      <button
        v-for="t in tabs"
        :key="t.key"
        type="button"
        class="conv-tab"
        :class="{ 'is-on': activeTab === t.key }"
        @click="$emit('update:activeTab', t.key)"
      >
        {{ t.label }}
        <span v-if="t.key === 'waiting' && waitingCount > 0" class="conv-tab__badge">
          {{ waitingCount > 99 ? '99+' : waitingCount }}
        </span>
      </button>
    </div>

    <!-- 搜索 -->
    <div class="conv-search">
      <el-input
        :model-value="keyword"
        placeholder="搜昵称 / 手机号 / 消息内容"
        clearable
        size="small"
        @update:model-value="(v: string) => $emit('update:keyword', v)"
      />
      <el-tooltip content="刷新列表" placement="bottom">
        <el-button size="small" text :loading="loading" @click="$emit('refresh')">刷新</el-button>
      </el-tooltip>
    </div>

    <!-- 列表 -->
    <div v-loading="loading" class="conv-scroll">
      <el-empty v-if="!loading && !filtered.length" :description="emptyText" :image-size="60" />

      <div
        v-for="c in filtered"
        :key="c.id"
        class="conv-item"
        :class="{ 'is-active': c.id === activeId, 'is-pinned': c.pinned }"
        @click="$emit('select', c)"
      >
        <div class="conv-item__avatar">
          <img v-if="c.avatar" :src="resolveUrl(c.avatar)" :alt="c.nickname" />
          <span v-else>{{ (c.nickname || '?').charAt(0) }}</span>
          <i v-if="c.agentUnread > 0" class="conv-item__dot" />
        </div>

        <div class="conv-item__body">
          <div class="conv-item__row1">
            <span class="conv-item__name">{{ c.nickname || '游客' }}</span>
            <span v-if="c.memberLabel" class="conv-item__member">{{ c.memberLabel }}</span>
            <el-tooltip v-if="c.pinned" content="已置顶" placement="top">
              <span class="conv-item__pin">置顶</span>
            </el-tooltip>
            <span class="conv-item__time">{{ shortTime(c.lastMessageAt) }}</span>
          </div>

          <div class="conv-item__row2">
            <span class="conv-item__source">{{ c.sourceLabel }}</span>
            <span class="conv-item__preview" :class="{ 'is-unread': c.agentUnread > 0 }">
              {{ c.lastMessageText || '（无消息）' }}
            </span>
          </div>
        </div>

        <!-- 悬浮快捷操作 -->
        <div class="conv-item__ops" @click.stop>
          <el-tooltip :content="c.pinned ? '取消置顶' : '置顶'" placement="left">
            <button type="button" class="conv-op" @click="$emit('toggle-pin', c)">
              {{ c.pinned ? '取消' : '置顶' }}
            </button>
          </el-tooltip>
          <el-tooltip :content="c.status === 'closed' ? '重开' : '标为已解决'" placement="left">
            <button
              type="button"
              class="conv-op"
              @click="$emit('toggle-resolve', c)"
            >
              {{ c.status === 'closed' ? '重开' : '解决' }}
            </button>
          </el-tooltip>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ImConversation } from '@/api/imWorkbench'
import { resolveMediaUrl } from '@/utils/media-url'

const props = defineProps<{
  conversations: ImConversation[]
  activeId: number | null
  loading: boolean
  keyword: string
  activeTab: string
}>()

defineEmits<{
  (e: 'select', c: ImConversation): void
  (e: 'refresh'): void
  (e: 'toggle-pin', c: ImConversation): void
  (e: 'toggle-resolve', c: ImConversation): void
  (e: 'update:keyword', v: string): void
  (e: 'update:activeTab', v: string): void
}>()

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'waiting', label: '待接入' },
  { key: 'active', label: '服务中' },
  { key: 'closed', label: '已结束' },
]

const waitingCount = computed(
  () => props.conversations.filter((c) => c.status === 'waiting').length,
)

/**
 * 「全部」= 待接入 + 服务中 + 已结束；其他 Tab 只看自己那类。
 * ⚠️ 不能直接按 tab 过滤后交给后端 —— 后端 listConversations 对未知 tab 返回全量，
 *    这里前端过滤才能让 Tab 语义正确（后端 tab 参数只认 waiting/active/closed）。
 */
const filtered = computed(() => {
  const t = props.activeTab
  if (!t || t === 'all') return props.conversations
  return props.conversations.filter((c) => c.status === t)
})

const emptyText = computed(() => {
  if (props.keyword) return '没有匹配的会话'
  if (props.activeTab === 'waiting') return '当前没有待接入的咨询'
  if (props.activeTab === 'active') return '当前没有服务中的会话'
  if (props.activeTab === 'closed') return '还没有已结束的会话'
  return '还没有咨询会话'
})

function shortTime(s?: string) {
  if (!s) return ''
  const raw = String(s).replace('T', ' ')
  if (raw.length < 16) return raw
  // 今天只显示时分，昨天显示「昨天」，更早显示月日
  const today = new Date()
  const d = new Date(raw.replace(/-/g, '/'))
  if (Number.isNaN(d.getTime())) return raw.slice(5, 16)
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  if (sameDay) return raw.slice(11, 16)
  const y = new Date(today)
  y.setDate(y.getDate() - 1)
  if (d.getFullYear() === y.getFullYear() && d.getMonth() === y.getMonth() && d.getDate() === y.getDate()) {
    return '昨天'
  }
  return raw.slice(5, 10)
}

function resolveUrl(url?: string) {
  return url ? resolveMediaUrl(url) : ''
}
</script>

<style lang="scss" scoped>
.conv-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  border-right: 1px solid var(--el-border-color-lighter);
}

.conv-tabs {
  display: flex;
  gap: 2px;
  padding: 8px 8px 6px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.conv-tab {
  flex: 1;
  border: none;
  background: transparent;
  padding: 5px 2px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  cursor: pointer;
  border-radius: 5px;
  position: relative;
  white-space: nowrap;
}

.conv-tab:hover {
  background: var(--el-fill-color-lighter);
}

.conv-tab.is-on {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

.conv-tab__badge {
  display: inline-block;
  min-width: 15px;
  padding: 0 4px;
  margin-left: 2px;
  border-radius: 8px;
  background: #e24b4a;
  color: #fff;
  font-size: 10px;
  line-height: 15px;
  text-align: center;
}

.conv-search {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.conv-search :deep(.el-input) {
  flex: 1;
  min-width: 0;
}

.conv-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.conv-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  cursor: pointer;
  border-bottom: 1px solid var(--el-border-color-extra-light);
  position: relative;
}

.conv-item:hover {
  background: var(--el-fill-color-lighter);
}

.conv-item.is-active {
  background: var(--el-color-primary-light-9);
}

.conv-item.is-pinned {
  border-left: 2px solid var(--el-color-warning);
}

.conv-item__avatar {
  position: relative;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--el-fill-color);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.conv-item__avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.conv-item__dot {
  position: absolute;
  top: -1px;
  right: -1px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #e24b4a;
  border: 1px solid #fff;
}

.conv-item__body {
  flex: 1;
  min-width: 0;
}

.conv-item__row1 {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.conv-item__name {
  font-size: 13px;
  color: var(--el-text-color-primary);
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conv-item__member {
  font-size: 10px;
  color: #b45309;
  background: #fef3c7;
  padding: 0 4px;
  border-radius: 3px;
  flex-shrink: 0;
}

.conv-item__pin {
  font-size: 10px;
  color: var(--el-color-warning);
  flex-shrink: 0;
}

.conv-item__time {
  margin-left: auto;
  font-size: 11px;
  color: var(--el-text-color-tertiary);
  flex-shrink: 0;
}

.conv-item__row2 {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-top: 2px;
}

.conv-item__source {
  font-size: 10px;
  color: var(--el-text-color-placeholder);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 3px;
  padding: 0 3px;
  flex-shrink: 0;
}

.conv-item__preview {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.conv-item__preview.is-unread {
  color: var(--el-text-color-primary);
  font-weight: 500;
}

.conv-item__ops {
  display: none;
  gap: 2px;
  flex-shrink: 0;
}

.conv-item:hover .conv-item__ops {
  display: flex;
}

.conv-item:hover .conv-item__preview {
  display: none;
}

.conv-op {
  border: 1px solid var(--el-border-color);
  background: var(--el-bg-color);
  border-radius: 3px;
  font-size: 11px;
  padding: 1px 5px;
  cursor: pointer;
  color: var(--el-text-color-regular);
}

.conv-op:hover {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}
</style>
