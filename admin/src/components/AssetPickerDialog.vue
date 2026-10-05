<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="760px"
    destroy-on-close
  >
    <div class="asset-picker">
      <div class="asset-toolbar">
        <el-input
          v-model="keyword"
          clearable
          placeholder="搜索素材名称"
          prefix-icon="Search"
          @keyup.enter="fetchAssets"
        />
        <el-button icon="Refresh" @click="fetchAssets">刷新</el-button>
      </div>

      <!--
        本地上传入口。
        🔴 口径（2026-10-06）：**所有上传素材的动作都先跳素材库，需要新素材时在这里从本地上传**。
        之前「素材库」是个纯选择器，空态文案却写着「请先用『本地上传』上传」——
        而那个「本地上传」在弹窗里根本不存在，运营会陷进死循环（先传→没入口→只能关掉→回表单传）。
        现在上传能力收进素材库，表单侧只保留「打开素材库」这一个动作。
      -->
      <el-upload
        class="asset-uploader"
        :show-file-list="false"
        :accept="mediaType === 'video' ? 'video/mp4,video/*' : 'image/*'"
        :http-request="uploadToLibrary"
        :disabled="uploading"
      >
        <el-button type="primary" :icon="Upload" :loading="uploading">
          {{ isVideo ? '上传视频到素材库' : '上传图片到素材库' }}
        </el-button>
      </el-upload>

      <div class="asset-upload-note">
        新素材会自动入库并出现在列表里{{ multiple ? '，可直接点选' : '，并自动选中' }}。
      </div>

      <div v-if="multiple" class="asset-hint">
        点击选中，再点取消；选中序号按点击顺序。已选
        <strong>{{ selectedUrls.length }}</strong> 张
      </div>

      <div v-loading="loading" class="asset-grid">
        <button
          v-for="item in assets"
          :key="item.id"
          type="button"
          class="asset-card"
          :class="{ active: isSelected(item.url) }"
          @click="toggleSelect(item.url)"
        >
          <video
            v-if="mediaType === 'video'"
            class="asset-card__video"
            :src="resolveAssetUrl(item.url)"
            :poster="item.thumbUrl ? resolveAssetUrl(item.thumbUrl) : undefined"
            preload="metadata"
            muted
            playsinline
          />
          <img v-else :src="resolveAssetUrl(item.thumbUrl || item.url)" :alt="item.name" />
          <span class="asset-card__play" v-if="mediaType === 'video'">▶</span>
          <span>{{ item.name || '未命名素材' }}</span>
          <i v-if="isSelected(item.url)" class="asset-order">{{ orderOf(item.url) }}</i>
        </button>
        <el-empty v-if="!loading && assets.length === 0" :description="emptyText" />
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button
        v-if="multiple"
        type="primary"
        :disabled="!selectedUrls.length"
        @click="confirmSelect"
      >
        确认选择 ({{ selectedUrls.length }})
      </el-button>
      <el-button v-else type="primary" :disabled="!selectedUrls.length" @click="confirmSelect">
        {{ mediaType === 'video' ? '选择视频' : '选择图片' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Upload } from '@element-plus/icons-vue'
import { get, post } from '@/api/request'
import { uploadFile } from '@/api/system'

interface AssetItem {
  id: number
  name: string
  type: string
  url: string
  thumbUrl?: string
}

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    /** 多选：点击切换选中，顺序为点击顺序 */
    multiple?: boolean
    /** 素材类型：image=图片（默认） / video=视频 */
    mediaType?: 'image' | 'video'
  }>(),
  { multiple: false, mediaType: 'image' },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  /** 单选：返回一张图 URL */
  (e: 'select', url: string): void
  /** 多选：按点击顺序返回 URL 列表 */
  (e: 'select-many', urls: string[]): void
}>()

const keyword = ref('')
const loading = ref(false)
const uploading = ref(false)
const assets = ref<AssetItem[]>([])
/** 选中 URL（原始接口返回值），顺序 = 点击顺序 */
const selectedUrls = ref<string[]>([])

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const isVideo = computed(() => props.mediaType === 'video')
const dialogTitle = computed(() => {
  const what = isVideo.value ? '视频' : '图片'
  if (isVideo.value) return '从素材库选择宣传视频'
  return props.multiple ? `从素材库批量选择${what}` : `从素材库选择${what}`
})
/**
 * 空态文案要指向**弹窗内真实存在的入口**。
 * 🔴 原来写「请先用『本地上传』上传」，但那个按钮当时就在这个弹窗里——
 * 运营照着提示找了一圈根本找不到，只能关掉弹窗回表单上传。空态文案指不存在的操作 = 死循环。
 */
const emptyText = computed(() =>
  isVideo.value
    ? '素材库里还没有视频，点上方「上传视频到素材库」即可加入'
    : '素材库里还没有图片，点上方「上传图片到素材库」即可加入',
)

/**
 * 素材 URL 归一。
 * 不能用 window.location.origin：管理后台在 admin.* 域，而 /uploads 静态资源只由 api.* 提供，
 * 拼错域名的图在小程序和后台预览里都是 404。口径与 api/system.ts 的 normalizeUploadUrl 保持一致。
 */
function resolveAssetUrl(url: string) {
  if (!url) return ''
  if (/^(https?:\/\/|data:image\/)/i.test(url)) return url
  const target = (import.meta.env.VITE_API_TARGET as string | undefined) || window.location.origin
  const origin = target.replace(/\/+$/, '')
  return url.startsWith('/') ? `${origin}${url}` : `${origin}/${url}`
}

function isSelected(url: string) {
  return selectedUrls.value.includes(url)
}

function orderOf(url: string) {
  return selectedUrls.value.indexOf(url) + 1
}

function toggleSelect(url: string) {
  if (!url) return
  if (props.multiple) {
    const idx = selectedUrls.value.indexOf(url)
    if (idx >= 0) {
      selectedUrls.value = selectedUrls.value.filter((u) => u !== url)
    } else {
      selectedUrls.value = [...selectedUrls.value, url]
    }
    return
  }
  selectedUrls.value = selectedUrls.value[0] === url ? [] : [url]
}

async function fetchAssets() {
  loading.value = true
  try {
    const res = await get<any>('/api/v1/admin/assets', {
      current: 1,
      size: 100,
      type: props.mediaType,
      keyword: keyword.value || undefined,
    })
    assets.value = (res.data?.records || []).filter((item: AssetItem) => item.url)
  } finally {
    loading.value = false
  }
}

/**
 * 上传到素材库并入库。
 * ⚠️ 为什么要在这里「上传 + 登记 + 刷新 + 自动选中」四步一起做：
 * 只上传不登记 → 素材库里选不到（下次又要重新传）；只登记不上传 → 库里是坏链。
 * ⚠️ 登记失败**不阻断**（与商品编辑页同口径）：文件已经传上去了，选中照样能用，
 * 只是它不会出现在素材库列表里；此时提示用户而不是静默。
 */
async function uploadToLibrary(options: { file: File }) {
  uploading.value = true
  const file = options.file
  try {
    const res = await uploadFile(file)
    const rawUrl: string = res?.data?.url || ''
    if (!rawUrl) throw new Error('上传返回地址为空')

    let registered = true
    try {
      await post('/api/v1/admin/assets', {
        name: file.name,
        type: props.mediaType,
        url: rawUrl,
        thumbUrl: props.mediaType === 'image' ? rawUrl : '',
        size: file.size,
      })
    } catch {
      registered = false
    }

    // uploadFile 已 normalize 过，这里直接用；仍走一次 resolve 保证与列表同源
    const url = resolveAssetUrl(rawUrl)
    await fetchAssets()
    // 自动选中：单选直接替换；多选追加到末尾
    selectedUrls.value = props.multiple
      ? [...selectedUrls.value.filter((u) => resolveAssetUrl(u) !== url), url]
      : [url]

    if (registered) ElMessage.success('已上传到素材库')
    else ElMessage.warning('文件已上传，但未能登记到素材库（可在素材库管理页补登记）')
  } catch (err: any) {
    ElMessage.error(err?.message || '上传失败')
  } finally {
    uploading.value = false
  }
}

function confirmSelect() {
  if (!selectedUrls.value.length) return
  const resolved = selectedUrls.value.map((u) => resolveAssetUrl(u))
  if (props.multiple) {
    emit('select-many', resolved)
  } else {
    emit('select', resolved[0])
  }
  visible.value = false
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      selectedUrls.value = []
      fetchAssets()
    }
  },
)
</script>

<style scoped>
.asset-picker {
  display: grid;
  gap: 14px;
}

.asset-toolbar {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
}

/* 本地上传：与搜索框同排，靠右 */
.asset-uploader {
  display: flex;
  justify-content: flex-end;
  margin-top: -6px;
}

.asset-upload-note {
  margin: -8px 0 0;
  color: #8a95a6;
  font-size: 12px;
  text-align: right;
}

.asset-hint {
  color: #6b7b93;
  font-size: 13px;
}

.asset-hint strong {
  color: var(--color-primary);
}

.asset-grid {
  min-height: 260px;
  max-height: 420px;
  overflow: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
  gap: 12px;
}

.asset-card {
  position: relative;
  height: 144px;
  padding: 8px;
  display: grid;
  grid-template-rows: 1fr auto;
  gap: 8px;
  border: 1px solid #dfe6f1;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  text-align: left;
}

.asset-card:hover,
.asset-card.active {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.14);
}

.asset-card img {
  width: 100%;
  height: 96px;
  object-fit: cover;
  border-radius: 6px;
  background: #f5f7fb;
}

.asset-card__video {
  width: 100%;
  height: 96px;
  object-fit: cover;
  border-radius: 6px;
  background: #0f1115;
  display: block;
}

.asset-card__play {
  position: absolute;
  top: 46px;
  left: 50%;
  transform: translateX(-50%);
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(0, 0, 0, .55);
  color: #fff;
  font-size: 12px;
  line-height: 30px;
  text-align: center;
  pointer-events: none;
}

.asset-card span {
  min-width: 0;
  color: #4b5568;
  font-size: 12px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.asset-order {
  position: absolute;
  top: 12px;
  left: 12px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--color-primary);
  color: #fff;
  font-size: 12px;
  font-style: normal;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 4px rgba(23, 105, 255, 0.35);
}
</style>
