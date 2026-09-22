<template>
  <el-dialog
    :model-value="modelValue"
    class="mini-wb-overlay"
    :title="title"
    width="420px"
    destroy-on-close
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="qr-body">
      <p class="faint">{{ hint }}</p>
      <div v-if="loading" class="qr-loading">生成二维码中…</div>
      <img v-else-if="dataUrl" class="qr-img" :src="dataUrl" alt="预览二维码" />
      <p v-else class="muted">生成失败，可改用下方链接在浏览器打开</p>
      <a v-if="url" class="link" :href="url" target="_blank" rel="noopener noreferrer">在电脑打开预览</a>
      <p v-if="url" class="url-text">{{ url }}</p>
    </div>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">关闭</el-button>
      <el-button type="primary" :disabled="!url" @click="copyUrl">复制链接</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import QRCode from 'qrcode'
import { useRouter } from 'vue-router'

const props = withDefaults(defineProps<{
  modelValue: boolean
  /** draft | live | release */
  mode?: 'draft' | 'live' | 'release'
  releaseId?: number | string | null
  title?: string
  hint?: string
}>(), {
  mode: 'draft',
  title: '扫码预览',
  hint: '手机浏览器扫码，看的是当前站点预览（H5），不是微信官方小程序码。配置微信后可在「上传代码包」生成体验版。',
})

defineEmits<{ 'update:modelValue': [boolean] }>()

const router = useRouter()
const loading = ref(false)
const dataUrl = ref('')
const url = ref('')

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return
    loading.value = true
    dataUrl.value = ''
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
      ElMessage.error('生成二维码失败')
    } finally {
      loading.value = false
    }
  },
)

async function copyUrl() {
  if (!url.value) return
  try {
    await navigator.clipboard.writeText(url.value)
    ElMessage.success('链接已复制')
  } catch {
    ElMessage.info(url.value)
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
  border: 1px solid #e8dfd3;
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
.muted { color: #6b5b4e; }
.link { color: #b4430f; font-weight: 500; text-decoration: none; }
</style>
