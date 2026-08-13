<template>
  <div class="member-card-props">
    <el-form label-width="80px" size="small">
      <el-form-item label="标题">
        <el-input :model-value="data.title" @input="emit('update', { title: $event })" placeholder="会员卡标题" />
      </el-form-item>
      <el-form-item label="副标题">
        <el-input :model-value="data.subtitle || ''" @input="emit('update', { subtitle: $event })" placeholder="点击查看权益" />
      </el-form-item>

      <el-divider content-position="left" class="field-divider">字号</el-divider>
      <el-form-item label="标题字号">
        <el-input-number
          :model-value="data.title_font_size ?? 15"
          :min="10"
          :max="32"
          controls-position="right"
          @change="(v: number) => emit('update', { title_font_size: v })"
        />
      </el-form-item>
      <el-form-item label="副标题字号">
        <el-input-number
          :model-value="data.subtitle_font_size ?? 11"
          :min="8"
          :max="24"
          controls-position="right"
          @change="(v: number) => emit('update', { subtitle_font_size: v })"
        />
      </el-form-item>
      <el-form-item label="权益字号">
        <el-input-number
          :model-value="data.benefit_font_size ?? 10"
          :min="8"
          :max="20"
          controls-position="right"
          @change="(v: number) => emit('update', { benefit_font_size: v })"
        />
      </el-form-item>
      <el-form-item label="数值字号">
        <el-input-number
          :model-value="data.stat_value_font_size ?? 16"
          :min="10"
          :max="32"
          controls-position="right"
          @change="(v: number) => emit('update', { stat_value_font_size: v })"
        />
      </el-form-item>
      <el-form-item label="标签字号">
        <el-input-number
          :model-value="data.stat_label_font_size ?? 10"
          :min="8"
          :max="20"
          controls-position="right"
          @change="(v: number) => emit('update', { stat_label_font_size: v })"
        />
      </el-form-item>
      <el-form-item label="升级字号">
        <el-input-number
          :model-value="data.upgrade_font_size ?? 11"
          :min="8"
          :max="20"
          controls-position="right"
          @change="(v: number) => emit('update', { upgrade_font_size: v })"
        />
      </el-form-item>

      <el-divider content-position="left" class="field-divider">背景</el-divider>
      <el-form-item label="背景类型">
        <el-radio-group :model-value="bgMode" @change="(v: string) => emit('update', { bg_mode: v })">
          <el-radio-button value="gradient">主题渐变</el-radio-button>
          <el-radio-button value="image">自定义图</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="bgMode === 'gradient'" label="主题色">
        <el-radio-group :model-value="data.theme || 'blue'" @change="(v: string) => emit('update', { theme: v })">
          <el-radio-button value="blue">蓝</el-radio-button>
          <el-radio-button value="purple">紫</el-radio-button>
          <el-radio-button value="dark">深</el-radio-button>
          <el-radio-button value="gold">金</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-else label="背景图">
        <div class="img-field">
          <div v-if="bgPreview" class="img-preview">
            <img :src="bgPreview" alt="" />
            <el-button text type="danger" size="small" @click="emit('update', { background_image: '' })">移除</el-button>
          </div>
          <el-input
            :model-value="data.background_image || ''"
            @input="emit('update', { background_image: $event })"
            placeholder="图片 URL"
          />
          <label class="upload-btn">
            {{ uploading ? '上传中…' : '本地上传' }}
            <input type="file" accept="image/*" hidden :disabled="uploading" @change="onUploadBg" />
          </label>
        </div>
      </el-form-item>

      <el-divider content-position="left" class="field-divider">展示信息</el-divider>
      <el-form-item label="显示等级">
        <el-switch :model-value="data.show_level !== false" @change="(v: boolean) => emit('update', { show_level: v })" />
      </el-form-item>
      <el-form-item label="显示积分">
        <el-switch :model-value="data.show_points !== false" @change="(v: boolean) => emit('update', { show_points: v })" />
      </el-form-item>
      <el-form-item label="显示余额">
        <el-switch :model-value="data.show_balance !== false" @change="(v: boolean) => emit('update', { show_balance: v })" />
      </el-form-item>
      <el-form-item label="显示优惠券">
        <el-switch :model-value="data.show_coupons !== false" @change="(v: boolean) => emit('update', { show_coupons: v })" />
      </el-form-item>

      <el-divider content-position="left" class="field-divider">权益标签</el-divider>
      <div v-for="(tag, i) in benefits" :key="i" class="benefit-row">
        <el-input :model-value="tag" @input="onUpdateBenefit(i, $event)" placeholder="权益文案" />
        <el-button type="danger" text size="small" @click="onRemoveBenefit(i)">删除</el-button>
      </div>
      <el-button type="primary" text size="small" @click="onAddBenefit">+ 添加权益</el-button>

      <el-divider content-position="left" class="field-divider">升级会员</el-divider>
      <el-form-item label="显示升级">
        <el-switch :model-value="data.show_upgrade !== false" @change="(v: boolean) => emit('update', { show_upgrade: v })" />
      </el-form-item>
      <template v-if="data.show_upgrade !== false">
        <el-form-item label="升级文案">
          <el-input :model-value="data.upgrade_text || '升级会员'" @input="emit('update', { upgrade_text: $event })" />
        </el-form-item>
        <el-form-item label="升级链接">
          <el-input
            :model-value="data.upgrade_link || ''"
            @input="emit('update', { upgrade_link: $event })"
            placeholder="/pages/member-center/member-center"
          />
        </el-form-item>
      </template>
      <el-form-item label="整卡链接">
        <el-input
          :model-value="data.link_url || ''"
          @input="emit('update', { link_url: $event })"
          placeholder="点击卡片空白区跳转，默认会员中心"
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

const { uploadImage, uploading } = useImageUpload()

const bgMode = computed(() => {
  if (data.bg_mode === 'image' || data.bg_mode === 'gradient') return data.bg_mode
  return data.background_image ? 'image' : 'gradient'
})

const bgPreview = computed(() => normalizeUploadUrl(String(data.background_image || '')))

const benefits = computed(() => {
  const raw = data.benefits
  return Array.isArray(raw) ? raw.map((x: any) => String(x || '')) : []
})

async function onUploadBg(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  await uploadImage(file, {
    maxSizeMB: 5,
    onSuccess: (url: string) => emit('update', {
      background_image: normalizeUploadUrl(url),
      bg_mode: 'image',
    }),
  })
}

function onAddBenefit() {
  emit('update', { benefits: [...benefits.value, ''] })
}

function onRemoveBenefit(index: number) {
  emit('update', { benefits: benefits.value.filter((_, i) => i !== index) })
}

function onUpdateBenefit(index: number, value: string) {
  const next = benefits.value.slice()
  next[index] = value
  emit('update', { benefits: next })
}
</script>

<style scoped>
.field-divider {
  margin: 10px 0 6px;
  font-size: 12px;
  color: #8a94a6;
}

.img-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.img-preview {
  display: flex;
  align-items: center;
  gap: 8px;
}

.img-preview img {
  width: 72px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #e3e8f0;
}

.upload-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  padding: 4px 10px;
  color: #1769ff;
  font-size: 12px;
  border: 1px dashed #93c5fd;
  border-radius: 4px;
  cursor: pointer;
}

.benefit-row {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
}
</style>
