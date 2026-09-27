<template>
  <div class="ops-concept" :class="`ops-concept--${variant}`">
    <p v-if="variant === 'overview'">
      <strong>内容配置版本</strong>：第 {{ liveReleaseNo ?? '—' }} 次同步
      <template v-if="liveReleaseAt"> · {{ liveReleaseAt }}</template>
      <template v-if="publisherName"> · {{ publisherName }}</template>
      <span v-if="pendingCount > 0" class="ops-concept__pending">
        · 有 {{ pendingCount }} 项待同步到线上配置
      </span>
    </p>
    <p v-else-if="variant === 'content'">{{ contentHint }}</p>
    <p v-else-if="variant === 'pages'">{{ contentHint }}</p>
    <p v-else-if="variant === 'publish'">{{ draftLiveHint }}</p>
    <p v-else-if="variant === 'appearance'">
      改导航、配色、整店模板后先<strong>保存草稿</strong>，再点<strong>保存并同步</strong>写入服务端；用户端是否已刷新需第二阶段真机验证（代码包在本地上传微信）。
    </p>
    <p v-else>{{ draftLiveHint }}</p>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { MINI_CONTENT_VS_PAGE_HINT, MINI_DRAFT_LIVE_HINT } from '@/constants/miniOpsConcept'

withDefaults(
  defineProps<{
    variant?: 'overview' | 'content' | 'publish' | 'appearance' | 'pages'
    liveReleaseNo?: number | null
    liveReleaseAt?: string | null
    publisherName?: string | null
    pendingCount?: number
  }>(),
  { variant: 'overview', pendingCount: 0 },
)

const router = useRouter()
const contentHint = MINI_CONTENT_VS_PAGE_HINT
const draftLiveHint = MINI_DRAFT_LIVE_HINT
</script>

<style scoped>
.ops-concept {
  padding: 12px 14px;
  border-radius: 10px;
  background: #fdf6ec;
  border: 1px solid #e8c4a8;
  font-size: 13px;
  line-height: 1.55;
  color: #4a3728;
}
.ops-concept strong {
  font-weight: 600;
  color: #2a1c12;
}
.ops-concept__pending {
  margin-left: 4px;
}
.ops-concept--publish {
  background: #f0f7ff;
  border-color: #c7daf5;
  color: #1e3a5f;
}
.ops-concept--content {
  background: #f4faf4;
  border-color: #c5dfc9;
}
</style>
