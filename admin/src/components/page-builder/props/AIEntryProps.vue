<template>
  <div class="ai-entry-props">
    <el-form label-width="80px" size="small">
      <el-form-item label="标题">
        <el-input :model-value="data.title || ''" @input="emit('update', { title: $event })" placeholder="AI智能助手" />
      </el-form-item>
      <el-form-item label="描述">
        <el-input
          :model-value="data.description || ''"
          @input="emit('update', { description: $event })"
          placeholder="可推荐商品、文章、活动"
        />
      </el-form-item>
      <el-form-item label="头像">
        <div class="img-field">
          <div v-if="avatarPreview" class="img-preview">
            <img :src="avatarPreview" alt="" />
            <el-button text type="danger" size="small" @click="emit('update', { avatar: '' })">移除</el-button>
          </div>
          <el-input
            :model-value="data.avatar || ''"
            @input="emit('update', { avatar: $event })"
            placeholder="头像图片 URL"
          />
          <label class="upload-btn">
            上传头像
            <input type="file" accept="image/*" hidden @change="onUploadAvatar" />
          </label>
        </div>
      </el-form-item>
      <el-form-item label="主题色">
        <el-radio-group :model-value="data.theme || 'blue'" @change="(v: string) => emit('update', { theme: v })">
          <el-radio-button value="blue">蓝</el-radio-button>
          <el-radio-button value="green">绿</el-radio-button>
          <el-radio-button value="purple">紫</el-radio-button>
          <el-radio-button value="dark">深</el-radio-button>
          <el-radio-button value="gold">金</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="标题字号">
        <el-input-number
          :model-value="data.title_font_size ?? 15"
          :min="10"
          :max="28"
          controls-position="right"
          @change="(v: number) => emit('update', { title_font_size: v })"
        />
      </el-form-item>
      <el-form-item label="描述字号">
        <el-input-number
          :model-value="data.desc_font_size ?? 12"
          :min="8"
          :max="20"
          controls-position="right"
          @change="(v: number) => emit('update', { desc_font_size: v })"
        />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { normalizeUploadUrl } from '@/api/system'
import { useImageUpload } from '../composables/useImageUpload'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const { uploadImage } = useImageUpload()
const avatarPreview = computed(() => normalizeUploadUrl(String(data.avatar || '')))

async function onUploadAvatar(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  ;(event.target as HTMLInputElement).value = ''
  if (!file) return
  await uploadImage(file, {
    maxSizeMB: 5,
    onSuccess: (url: string) => emit('update', { avatar: url }),
  })
}
</script>

<style scoped lang="scss">
.img-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.img-preview {
  display: flex;
  align-items: center;
  gap: 8px;

  img {
    width: 44px;
    height: 44px;
    object-fit: cover;
    border-radius: 50%;
    border: 1px solid #e6edf6;
  }
}

.upload-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  padding: 4px 12px;
  color: #1769ff;
  font-size: 12px;
  cursor: pointer;
  background: #eaf1ff;
  border-radius: 6px;
}
</style>
