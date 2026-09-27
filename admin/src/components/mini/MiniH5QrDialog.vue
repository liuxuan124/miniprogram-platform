<template>
  <el-dialog
    :model-value="modelValue"
    class="mini-wb-overlay"
    :title="title"
    width="440px"
    destroy-on-close
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="qr-body">
      <p class="faint">{{ activeHint }}</p>

      <el-segmented
        v-if="showChannelSwitch"
        v-model="channel"
        :options="channelOptions"
        size="small"
        style="margin-bottom: 4px"
      />

      <div v-if="loading" class="qr-loading">生成预览中…</div>

      <template v-else-if="channel === 'wechat'">
        <img
          v-if="wxDataUrl"
          class="qr-img"
          :src="wxDataUrl"
          alt="体验版草稿预览小程序码"
        />
        <p v-else class="muted">{{ wxFallback }}</p>
        <p v-if="launchPath" class="url-text">进入页：{{ launchPath }}</p>
        <p v-if="expiresAt" class="faint">预览约 2 小时内有效</p>
        <el-button v-if="launchPath" type="primary" link @click="copyLaunchPath">复制带 pt 的路径</el-button>
      </template>

      <template v-else>
        <img v-if="dataUrl" class="qr-img" :src="dataUrl" alt="H5 预览二维码" />
        <p v-else class="muted">H5 二维码生成失败，可改用下方链接</p>
        <a v-if="url" class="link" :href="url" target="_blank" rel="noopener noreferrer">在电脑打开 H5 预览</a>
        <p v-if="url" class="url-text">{{ url }}</p>
      </template>
    </div>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">关闭</el-button>
      <el-button type="primary" :disabled="!primaryCopyText" @click="copyPrimary">
        {{ channel === 'wechat' ? '复制启动路径' : '复制 H5 链接' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import QRCode from 'qrcode'
import { useRouter } from 'vue-router'
import { createMiniPreviewToken } from '@/api/miniSite'

const props = withDefaults(defineProps<{
  modelValue: boolean
  /** draft=H5 | miniapp-draft=微信体验版+pt | live | release */
  mode?: 'draft' | 'miniapp-draft' | 'live' | 'release'
  releaseId?: number | string | null
  title?: string
  hint?: string
}>(), {
  mode: 'draft',
  title: '扫码预览',
  hint: '',
})

defineEmits<{ 'update:modelValue': [boolean] }>()

const router = useRouter()
const loading = ref(false)
const dataUrl = ref('')
const url = ref('')
const wxDataUrl = ref('')
const wxFallback = ref('未生成微信码：请确认已配置 AppID/Secret 并上传过体验版代码。')
const launchPath = ref('')
const expiresAt = ref('')
const channel = ref<'wechat' | 'h5'>('h5')

const showChannelSwitch = computed(() => props.mode === 'miniapp-draft')

const channelOptions = [
  { label: '微信体验版', value: 'wechat' },
  { label: '浏览器 H5', value: 'h5' },
]

const activeHint = computed(() => {
  if (props.hint) return props.hint
  if (props.mode === 'miniapp-draft') {
    return channel.value === 'wechat'
      ? '用微信扫下方小程序码，进入体验版并加载「待发布草稿」（顶部会有草稿角标）。'
      : '手机浏览器扫码查看 H5 草稿（与体验版真机效果可能略有差异）。'
  }
  return '手机浏览器扫码，看的是当前站点 H5 预览，不是微信官方小程序码。'
})

const primaryCopyText = computed(() => {
  if (channel.value === 'wechat' && launchPath.value) return launchPath.value
  return url.value
})

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return
    loading.value = true
    dataUrl.value = ''
    wxDataUrl.value = ''
    url.value = ''
    launchPath.value = ''
    expiresAt.value = ''
    channel.value = props.mode === 'miniapp-draft' ? 'wechat' : 'h5'
    try {
      await Promise.all([loadH5(), props.mode === 'miniapp-draft' ? loadWechat() : Promise.resolve()])
    } finally {
      loading.value = false
    }
  },
)

async function loadH5() {
  try {
    const query: Record<string, string> = { view: 'config' }
    if (props.mode === 'release' && props.releaseId != null) {
      query.releaseId = String(props.releaseId)
    } else {
      query.source = props.mode === 'live' ? 'live' : 'draft'
    }
    const { href } = router.resolve({ path: '/h5/miniapp-preview', query })
    url.value = `${window.location.origin}${href}`
    dataUrl.value = await QRCode.toDataURL(url.value, {
      width: 220,
      margin: 2,
      errorCorrectionLevel: 'M',
    })
  } catch {
    ElMessage.error('H5 二维码生成失败')
  }
}

async function loadWechat() {
  try {
    const vo = await createMiniPreviewToken(true)
    expiresAt.value = vo.expiresAt || ''
    const page = vo.pagePath || 'pages/index/index'
    const q = vo.launchQuery || (vo.token ? `pt=${vo.token}` : '')
    launchPath.value = q ? `${page}?${q}` : page
    if (vo.wxQrcodeBase64) {
      wxDataUrl.value = `data:image/png;base64,${vo.wxQrcodeBase64}`
    } else {
      wxFallback.value =
        '微信未返回小程序码（检查 AppID/Secret 与体验版是否已上传）。仍可用「复制启动路径」在开发者工具或带 query 的体验入口调试。'
    }
  } catch (e: any) {
    wxFallback.value = e?.message || '预览令牌签发失败'
  }
}

async function copyPrimary() {
  const text = primaryCopyText.value
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制')
  } catch {
    ElMessage.info(text)
  }
}

async function copyLaunchPath() {
  if (!launchPath.value) return
  try {
    await navigator.clipboard.writeText(launchPath.value)
    ElMessage.success('启动路径已复制')
  } catch {
    ElMessage.info(launchPath.value)
  }
}
</script>

<style scoped>
.qr-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
}
.qr-img {
  width: 220px;
  height: 220px;
  border: 1px solid var(--wb-line);
  border-radius: 12px;
  padding: 8px;
  background: #fff;
}
.qr-loading { color: #6b5b4e; padding: 40px 0; }
.url-text {
  font-size: 11px;
  color: #7a6a5c;
  word-break: break-all;
  margin: 0;
  max-width: 100%;
}
.faint { color: #7a6a5c; font-size: 12.5px; margin: 0; line-height: 1.5; }
.muted { color: #6b5b4e; font-size: 13px; line-height: 1.5; }
.link { color: var(--el-color-primary); font-weight: 500; text-decoration: none; }
</style>
