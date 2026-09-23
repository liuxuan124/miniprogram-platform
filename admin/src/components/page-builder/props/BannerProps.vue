<template>
  <div class="banner-props">
    <el-form label-width="70px" size="small">
      <el-form-item label="自动播放">
        <el-switch :model-value="data.autoplay" @change="emit('update', { autoplay: $event as boolean })" />
      </el-form-item>
      <el-form-item label="间隔时间">
        <el-input-number
          :model-value="data.interval"
          @change="emit('update', { interval: $event as number })"
          :min="1000"
          :max="10000"
          :step="500"
          controls-position="right"
        />
      </el-form-item>
      <el-form-item label="指示点">
        <el-switch :model-value="data.indicator_dots" @change="emit('update', { indicator_dots: $event as boolean })" />
      </el-form-item>
      <el-form-item label="裂图占位">
        <el-input
          :model-value="data.image_error_placeholder || ''"
          placeholder="图片加载失败时的占位图 URL（可选）"
          @change="(v: string) => emit('update', { image_error_placeholder: v })"
        />
      </el-form-item>
      <el-divider content-position="left">轮播图片</el-divider>
      <div v-for="(img, i) in (data.images || [])" :key="i" class="banner-item">
        <el-form-item :label="`图片${i + 1}`">
          <div class="banner-item-form">
            <div v-if="img.image" class="banner-thumb">
              <img :src="img.image" alt="" @error="onImgError" />
            </div>
            <el-input
              v-model="img.image"
              placeholder="图片URL / 直接粘贴截图"
              @change="handleImagesChange"
              @paste="handlePaste($event, i)"
            />
            <label class="upload-btn">
              {{ uploadingIndex === i ? '上传中…' : '本地上传' }}
              <input type="file" accept="image/*" style="display: none" @change="handleUpload($event, i)" />
            </label>
            <el-form-item label="标题" label-width="50px" class="nested-item">
              <el-input
                v-model="img.title"
                placeholder="轮播标题（可选）"
                @change="handleImagesChange"
              />
            </el-form-item>
            <el-form-item label="跳转" label-width="72px" class="nested-item nested-item--link">
              <LinkPickerField
                :link-type="img.link_type || 'page'"
                :link-url="img.link_url || ''"
                @update:link-type="(v) => { img.link_type = v; handleImagesChange() }"
                @update:link-url="(v) => { img.link_url = v; handleImagesChange() }"
              />
            </el-form-item>
            <div class="banner-item-actions">
              <el-tooltip content="删除此图" placement="top">
                <el-button
                  type="danger"
                  text
                  size="small"
                  aria-label="删除此图"
                  @click="removeImage(i)"
                >
                  <el-icon><Delete /></el-icon>
                </el-button>
              </el-tooltip>
            </div>
          </div>
        </el-form-item>
      </div>
      <el-button type="primary" text size="small" @click="addImage" style="margin-left: 70px">
        + 添加图片
      </el-button>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Delete } from '@element-plus/icons-vue'
import LinkPickerField from '../LinkPickerField.vue'
import { useImageUpload } from '../composables/useImageUpload'
import { onImgError } from '@/utils/imgFallback'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const { uploadImage } = useImageUpload()
const uploadingIndex = ref(-1)

function handleImagesChange() {
  emit('update', { images: [...data.images] })
}

async function uploadToIndex(file: File, index: number) {
  uploadingIndex.value = index
  try {
    await uploadImage(file, {
      maxSizeMB: 5,
      onSuccess: (url: string) => {
        data.images[index].image = url
        handleImagesChange()
      },
    })
  } finally {
    uploadingIndex.value = -1
  }
}

async function handleUpload(event: Event, index: number) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  await uploadToIndex(file, index)
  input.value = ''
}

/** 支持在 URL 输入框中直接粘贴剪贴板里的图片（如截图） */
async function handlePaste(event: ClipboardEvent, index: number) {
  const items = event.clipboardData?.items
  if (!items) return
  for (const item of items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) {
        event.preventDefault()
        await uploadToIndex(file, index)
      }
      return
    }
  }
}

function addImage() {
  const images = [...(data.images || []), { image: '', title: '', link_type: 'none', link_url: '' }]
  emit('update', { images })
}

function removeImage(index: number) {
  const images = [...data.images]
  images.splice(index, 1)
  emit('update', { images })
}
</script>

<style lang="scss" scoped>
.banner-item-form {
  width: 100%;

  .banner-thumb {
    width: 100%;
    height: 72px;
    margin-bottom: 4px;
    border-radius: 6px;
    overflow: hidden;
    background: #f1f5fb;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
  }

  .upload-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 26px;
    margin-top: 4px;
    padding: 0 12px;
    font-size: 12px;
    background: #fff;
    border: 1px solid #e3e8f0;
    border-radius: 6px;
    cursor: pointer;

    &:hover {
      border-color: var(--el-color-primary);
      color: var(--el-color-primary);
    }
  }

  .link-row {
    display: flex;
    gap: 4px;
    margin-top: 4px;
  }

  .nested-item {
    margin: 8px 0 0;

    :deep(.el-form-item__label) {
      white-space: nowrap;
    }
  }

  .nested-item--link :deep(.el-form-item__content) {
    min-width: 0;
  }

  .banner-item-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 4px;
  }
}
</style>
