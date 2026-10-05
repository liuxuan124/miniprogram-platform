<template>
  <div class="ops-concept" :class="`ops-concept--${variant}`">
    <p v-if="variant === 'overview'">
      <strong>线上配置</strong>：
      <template v-if="liveReleaseNo != null">第 {{ liveReleaseNo }} 次发布</template>
      <template v-else>尚无发布记录</template>
      <template v-if="liveSemver">（版本号 {{ liveSemver }}）</template>
      <template v-if="liveReleaseAt"> · {{ liveReleaseAt }}</template>
      <template v-if="publisherName"> · {{ publisherName }}</template>
      <span v-if="pendingCount > 0" class="ops-concept__pending">
        · 有 {{ pendingCount }} 项已存草稿、待发布到线上
      </span>
    </p>
    <p v-else-if="variant === 'content'">{{ contentHint }}</p>
    <p v-else-if="variant === 'pages'">{{ contentHint }}</p>
    <p v-else-if="variant === 'publish'">{{ draftLiveHint }}</p>
    <p v-else-if="variant === 'appearance'">
      <!--
        2026-10-05 文案统一：原来这里写「先保存草稿，再点保存并同步」，
        「保存并同步」是本次要消灭的混淆说法（保存与发布是两件事）。
        统一口径：改动自动存草稿 → 去「发布与版本」发布配置。
      -->
      这里的改动会<strong>自动存入草稿</strong>，线上暂不变化；
      确认无误后到<strong>「发布与版本」</strong>发布配置才会对用户生效。
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
    /** 🔴 内容版本号（形如 1.12.0），与「第几次发布」是两个概念，别混用 */
    liveSemver?: string | null
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
