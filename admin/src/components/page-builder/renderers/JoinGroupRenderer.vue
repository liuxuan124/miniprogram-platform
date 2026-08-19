<template>
  <div class="render-join-group split-text-typography">
    <div class="jg-card">
      <div class="jg-avatar">
        <img v-if="avatarUrl" :src="avatarUrl" alt="" />
        <div v-else class="jg-avatar__fallback">👥</div>
      </div>
      <div class="jg-main">
        <div class="jg-title">{{ titleText }}</div>
        <div v-if="tagList.length" class="jg-tags">
          <span v-for="(tag, i) in tagList" :key="`${tag}-${i}`" class="jg-tag">{{ tag }}</span>
        </div>
      </div>
      <button type="button" class="jg-btn" @click.stop="openSheet">{{ buttonText }}</button>
    </div>

    <Teleport to="body">
      <div v-if="sheetVisible" class="jg-mask" @click.self="closeAll">
        <div class="jg-sheet" @click.stop>
          <div class="jg-sheet__head">
            <span class="jg-sheet__title">{{ sheetTitle }}</span>
            <button type="button" class="jg-sheet__close" aria-label="关闭" @click="closeAll">×</button>
          </div>
          <div class="jg-sheet__list">
            <button
              v-for="group in groupList"
              :key="group.id"
              type="button"
              class="jg-group"
              @click="openQr(group)"
            >
              <div class="jg-group__icon">
                <img v-if="group.iconUrl" :src="group.iconUrl" alt="" />
                <span v-else>👥</span>
              </div>
              <span class="jg-group__name">{{ group.name }}</span>
              <span class="jg-group__arrow">›</span>
            </button>
            <div v-if="!groupList.length" class="jg-empty">暂未配置群</div>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="qrVisible && activeGroup" class="jg-mask jg-mask--qr" @click.self="closeQr">
        <div class="jg-qr" @click.stop>
          <div class="jg-qr__head">
            <span>{{ activeGroup.name }}</span>
            <button type="button" class="jg-sheet__close" aria-label="关闭" @click="closeQr">×</button>
          </div>
          <div class="jg-qr__body">
            <img
              v-if="activeGroup.qrcodeUrl"
              ref="qrImgRef"
              :src="activeGroup.qrcodeUrl"
              alt="群二维码"
              class="jg-qr__img"
              crossorigin="anonymous"
            />
            <div v-else class="jg-empty">尚未上传二维码</div>
            <p class="jg-qr__tip">{{ tipText }}</p>
            <button
              v-if="activeGroup.qrcodeUrl"
              type="button"
              class="jg-qr__save"
              @click="onSavePreview"
            >
              保存图片
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { normalizeUploadUrl } from '@/api/system'
import type { ComponentInstance } from '@/types/page'

type GroupView = {
  id: string
  name: string
  iconUrl: string
  qrcodeUrl: string
}

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const emit = defineEmits<{
  'preview-action': [payload: { tab: string; message: string }]
}>()

const sheetVisible = ref(false)
const qrVisible = ref(false)
const activeGroup = ref<GroupView | null>(null)
const qrImgRef = ref<HTMLImageElement | null>(null)

const titleText = computed(() => String(props.component.props?.title || '跨境电商交流群').trim() || '跨境电商交流群')
const buttonText = computed(() => String(props.component.props?.button_text || '加入群聊').trim() || '加入群聊')
const sheetTitle = computed(() => String(props.component.props?.sheet_title || '加入群聊').trim() || '加入群聊')
const tipText = computed(() => String(props.component.props?.tip_text || '长按二维码可识别加群').trim() || '长按二维码可识别加群')
const avatarUrl = computed(() => normalizeUploadUrl(String(props.component.props?.avatar || '')))
const tagList = computed(() => {
  const raw = props.component.props?.tags
  if (!Array.isArray(raw)) return []
  return raw.map((t: any) => String(t || '').trim()).filter(Boolean).slice(0, 6)
})
const groupList = computed<GroupView[]>(() => {
  const raw = Array.isArray(props.component.props?.groups) ? props.component.props.groups : []
  return raw.map((g: any, i: number) => ({
    id: String(g.id || `g_${i + 1}`),
    name: String(g.name || `群 ${i + 1}`).trim() || `群 ${i + 1}`,
    iconUrl: normalizeUploadUrl(String(g.icon || '')),
    qrcodeUrl: normalizeUploadUrl(String(g.qrcode || '')),
  }))
})

function openSheet() {
  sheetVisible.value = true
  qrVisible.value = false
  activeGroup.value = null
  if (props.previewMode) {
    emit('preview-action', { tab: 'home', message: '打开群列表' })
  }
}

function openQr(group: GroupView) {
  activeGroup.value = group
  qrVisible.value = true
}

function closeQr() {
  qrVisible.value = false
  activeGroup.value = null
}

function closeAll() {
  closeQr()
  sheetVisible.value = false
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(objectUrl)
}

function canvasFromImage(img: HTMLImageElement): Blob | null {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth || img.width
    canvas.height = img.naturalHeight || img.height
    if (!canvas.width || !canvas.height) return null
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
    const parts = dataUrl.split(',')
    const bin = atob(parts[1] || '')
    const arr = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
    return new Blob([arr], { type: 'image/jpeg' })
  } catch {
    return null
  }
}

async function onSavePreview() {
  const raw = activeGroup.value?.qrcodeUrl
  if (!raw) return
  let url = raw.startsWith('//') ? `https:${raw}` : raw
  // 尽量改写为同源 /uploads/...，避免跨域导致只能打开新标签
  const uploadPath = url.match(/\/uploads\/.+$/i)?.[0]
  if (uploadPath) url = uploadPath
  const filename = `${(activeGroup.value?.name || '群二维码').replace(/[\\/:*?"<>|]/g, '_')}.jpg`

  // 1) 优先 fetch 成文件下载（不打开新页）
  try {
    const res = await fetch(url, { mode: 'cors', credentials: 'omit' })
    if (res.ok) {
      triggerBlobDownload(await res.blob(), filename)
      ElMessage.success('已保存到本地')
      return
    }
  } catch {
    // continue
  }

  // 2) 用已展示的图片画布导出（需图片服务允许跨域）
  const img = qrImgRef.value
  if (img && img.complete) {
    const blob = canvasFromImage(img)
    if (blob) {
      triggerBlobDownload(blob, filename)
      ElMessage.success('已保存到本地')
      return
    }
  }

  ElMessage.error('无法直接下载（图片跨域限制）。请在小程序端点「保存图片」存到相册，或右键二维码另存为')
}
</script>

<style lang="scss" scoped>
.render-join-group {
  width: 100%;
}

.jg-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: #fff;
  border: 1px solid #e8edf5;
  border-radius: var(--card-radius, 14px);
  box-shadow: 0 4px 14px rgba(28, 43, 76, 0.05);
}

.jg-avatar {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 0;
  background: #eef3ff;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
}

.jg-avatar__fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 22px;
}

.jg-main {
  flex: 1;
  min-width: 0;
}

.jg-title {
  color: #172033;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.jg-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}

.jg-tag {
  padding: 1px 8px;
  color: #3b6cff;
  font-size: 11px;
  line-height: 1.5;
  border: 1px solid #b7c9ff;
  border-radius: 999px;
}

.jg-btn {
  flex-shrink: 0;
  padding: 7px 12px;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  background: #2f6bff;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
}

.jg-mask {
  position: fixed;
  inset: 0;
  z-index: 4000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(15, 23, 42, 0.45);
}

.jg-mask--qr {
  align-items: center;
}

.jg-sheet {
  width: min(390px, 100%);
  max-height: 70vh;
  overflow: auto;
  background: #fff;
  border-radius: 18px 18px 0 0;
  padding: 14px 16px 20px;
}

.jg-sheet__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.jg-sheet__title {
  color: #5b8cff;
  font-size: 16px;
  font-weight: 700;
}

.jg-sheet__close {
  width: 28px;
  height: 28px;
  color: #94a3b8;
  font-size: 22px;
  line-height: 1;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.jg-group {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 4px;
  background: transparent;
  border: 0;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  text-align: left;
}

.jg-group__icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: #fff;
  font-size: 18px;
  background: #3b82f6;
  border-radius: 10px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.jg-group__name {
  flex: 1;
  min-width: 0;
  color: #172033;
  font-size: 15px;
  font-weight: 600;
}

.jg-group__arrow {
  color: #cbd5e1;
  font-size: 22px;
}

.jg-qr {
  width: min(320px, calc(100% - 40px));
  padding: 14px 16px 18px;
  background: #fff;
  border-radius: 16px;
}

.jg-qr__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  color: #172033;
  font-size: 15px;
  font-weight: 700;
}

.jg-qr__body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.jg-qr__img {
  width: 200px;
  height: 200px;
  object-fit: contain;
  border: 1px solid #e8edf5;
  border-radius: 10px;
  background: #fff;
}

.jg-qr__tip {
  margin: 0;
  color: #94a3b8;
  font-size: 12px;
  text-align: center;
}

.jg-qr__save {
  padding: 8px 18px;
  color: #fff;
  font-size: 13px;
  background: #2f6bff;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
}

.jg-empty {
  padding: 18px 8px;
  color: #94a3b8;
  font-size: 13px;
  text-align: center;
}
</style>
