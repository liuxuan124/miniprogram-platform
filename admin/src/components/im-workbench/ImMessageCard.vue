<template>
  <!-- 富媒体消息渲染。商品卡 / 物流卡 / 系统事件 / 图片 / 文本 五种形态。
       ⚠️ 后台与小程序端共用同一套 payload 字段名（ImCardService 是唯一产出处），
          任何一端改字段名，另一端会静默渲染成空白卡片。 -->
  <div class="msg-wrap">
    <!-- 系统事件：居中胶囊 -->
    <div v-if="message.msgType === 'system_event'" class="sys-event">
      <span class="sys-event__title">{{ payloadOf('title') }}</span>
      <span v-if="payloadOf('desc')" class="sys-event__desc">{{ payloadOf('desc') }}</span>
    </div>

    <!-- 商品卡 -->
    <div v-else-if="message.msgType === 'product_card'" class="card product-card">
      <div class="product-card__body" @click="goLink(payloadOf('linkPath'))">
        <img
          v-if="payloadOf('coverUrl')"
          class="product-card__cover"
          :src="resolveUrl(payloadOf('coverUrl'))"
          :alt="payloadOf('title')"
        />
        <div v-else class="product-card__cover product-card__cover--empty">无图</div>
        <div class="product-card__info">
          <div class="product-card__title">{{ payloadOf('title') || '(商品已下架)' }}</div>
          <div class="product-card__price-row">
            <span class="product-card__price">¥{{ payloadOf('price') || '0' }}</span>
            <span v-if="payloadOf('originalPrice')" class="product-card__origin">
              ¥{{ payloadOf('originalPrice') }}
            </span>
            <span class="product-card__stock">库存 {{ payloadOf('stock') ?? 0 }}</span>
          </div>
        </div>
      </div>
      <div class="product-card__ops">
        <el-button size="small" text type="primary" @click="goLink(payloadOf('linkPath'))">
          查看详情
        </el-button>
        <el-button size="small" text @click="$emit('send-same', payloadOf('id'))">
          发送同款
        </el-button>
        <el-tag v-if="!payloadOf('available')" size="small" type="info" effect="plain">已下架</el-tag>
      </div>
    </div>

    <!-- 物流卡 -->
    <div v-else-if="message.msgType === 'logistics_card'" class="card logistics-card">
      <div class="logistics-card__head">
        <span class="logistics-card__express">{{ payloadOf('expressName') }}</span>
        <span class="logistics-card__status">{{ payloadOf('status') }}</span>
      </div>

      <div v-if="payloadOf('trackingNo')" class="logistics-card__no" @click="copyTrackingNo">
        <span>{{ payloadOf('trackingNo') }}</span>
        <span class="logistics-card__copy">{{ copied ? '已复制' : '复制单号' }}</span>
      </div>

      <div v-if="payloadOf('latestTrack')" class="logistics-card__latest">
        {{ payloadOf('latestTrack') }}
      </div>

      <!-- 轨迹列表：默认只显示最新一条，展开看全部 -->
      <div v-if="tracks.length" class="logistics-card__tracks" :class="{ 'is-open': tracksOpen }">
        <div
          v-for="(t, i) in visibleTracks"
          :key="i"
          class="track-item"
          :class="{ 'track-item--latest': i === 0 }"
        >
          <span class="track-item__time">{{ t.time }}</span>
          <span class="track-item__text">{{ t.context }}</span>
        </div>
      </div>

      <div v-if="tracks.length > 1" class="logistics-card__toggle">
        <el-button size="small" text type="primary" @click="tracksOpen = !tracksOpen">
          {{ tracksOpen ? '收起轨迹' : `查看全部 ${tracks.length} 条轨迹` }}
        </el-button>
      </div>

      <div class="logistics-card__ops">
        <el-button size="small" text type="primary" @click="goLink(payloadOf('linkPath'))">
          查看订单
        </el-button>
      </div>
    </div>

    <!-- 图片 -->
    <div v-else-if="message.msgType === 'image'" class="card image-msg">
      <img
        :src="resolveUrl(payloadOf('url'))"
        class="image-msg__img"
        :alt="payloadOf('url')"
        @click="preview"
      />
    </div>

    <!-- 文本 -->
    <div v-else class="text-msg">{{ message.text }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { ImMessage } from '@/api/imWorkbench'
import { resolveMediaUrl } from '@/utils/media-url'

const props = defineProps<{ message: ImMessage }>()
defineEmits<{ (e: 'send-same', productId: number): void }>()

const tracksOpen = ref(false)
const copied = ref(false)

const payload = computed<Record<string, any>>(() => props.message.payload || {})

function payloadOf(key: string): any {
  return payload.value[key]
}

const tracks = computed<Array<{ time: string; context: string }>>(() => {
  const raw = payload.value.tracks
  return Array.isArray(raw) ? raw : []
})

const visibleTracks = computed(() => (tracksOpen.value ? tracks.value : tracks.value.slice(0, 1)))

function resolveUrl(url?: string) {
  return url ? resolveMediaUrl(url) : ''
}

/** 小程序路径不能直接用 window.open（后台是 SPA，路径是小程序端路由）。复制链接让客服自己去小程序发更实际。 */
function goLink(link?: string) {
  if (!link) {
    ElMessage.info('该卡片未配置跳转地址')
    return
  }
  navigator.clipboard
    ?.writeText(link)
    .then(() => ElMessage.success('已复制跳转路径，可在小程序中打开'))
    .catch(() => ElMessage.warning('复制失败，请手动记录：' + link))
}

async function copyTrackingNo() {
  const no = payloadOf('trackingNo')
  if (!no) return
  try {
    await navigator.clipboard.writeText(String(no))
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    ElMessage.warning('复制失败')
  }
}

function preview() {
  const url = resolveUrl(payloadOf('url'))
  if (url) window.open(url, '_blank')
}
</script>

<style lang="scss" scoped>
.msg-wrap {
  max-width: 100%;
}

.sys-event {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px 0;
}

.sys-event__title {
  font-size: 12px;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-light);
  padding: 3px 10px;
  border-radius: 10px;
}

.sys-event__desc {
  font-size: 11px;
  color: var(--el-text-color-tertiary);
}

.card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-bg-color);
  overflow: hidden;
  max-width: 320px;
}

.product-card__body {
  display: flex;
  gap: 10px;
  padding: 10px;
  cursor: pointer;
}

.product-card__body:hover {
  background: var(--el-fill-color-lighter);
}

.product-card__cover {
  width: 56px;
  height: 56px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
  background: var(--el-fill-color-light);
}

.product-card__cover--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

.product-card__info {
  flex: 1;
  min-width: 0;
}

.product-card__title {
  font-size: 13px;
  line-height: 1.4;
  color: var(--el-text-color-primary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-card__price-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-top: 4px;
  flex-wrap: wrap;
}

.product-card__price {
  color: #c2410c;
  font-weight: 500;
  font-size: 14px;
}

.product-card__origin {
  font-size: 11px;
  color: var(--el-text-color-tertiary);
  text-decoration: line-through;
}

.product-card__stock {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  margin-left: auto;
}

.product-card__ops {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 6px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.logistics-card {
  padding: 10px 12px;
}

.logistics-card__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.logistics-card__express {
  font-size: 13px;
  color: var(--el-text-color-primary);
}

.logistics-card__status {
  font-size: 11px;
  color: #0f6e56;
  background: #e1f5ee;
  padding: 1px 6px;
  border-radius: 8px;
}

.logistics-card__no {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 6px;
  padding: 4px 8px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
  font-family: var(--el-font-family-monospace, monospace);
  font-size: 12px;
  cursor: pointer;
}

.logistics-card__no:hover {
  background: var(--el-fill-color);
}

.logistics-card__copy {
  font-family: var(--font-sans);
  font-size: 11px;
  color: var(--el-color-primary);
  flex-shrink: 0;
}

.logistics-card__latest {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-regular);
}

.logistics-card__tracks {
  margin-top: 8px;
  border-left: 2px solid var(--el-border-color);
  padding-left: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 168px;
  overflow-y: auto;
}

.track-item {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.track-item__time {
  font-size: 11px;
  color: var(--el-text-color-tertiary);
}

.track-item__text {
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.track-item--latest .track-item__text {
  color: var(--el-text-color-primary);
}

.logistics-card__toggle {
  margin-top: 4px;
}

.logistics-card__ops {
  margin-top: 4px;
  border-top: 1px solid var(--el-border-color-lighter);
  padding-top: 4px;
}

.image-msg__img {
  max-width: 180px;
  max-height: 180px;
  border-radius: 6px;
  display: block;
  cursor: pointer;
}

.text-msg {
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  max-width: 360px;
}
</style>
