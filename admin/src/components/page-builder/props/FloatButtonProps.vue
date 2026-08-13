<template>
  <div class="float-button-props">
    <el-form label-width="80px" size="small">
      <el-form-item label="文案">
        <el-input :model-value="data.title || ''" @input="emit('update', { title: $event })" placeholder="客服" />
      </el-form-item>
      <el-form-item label="显示文字">
        <el-switch :model-value="!!data.show_text" @change="(v: boolean) => emit('update', { show_text: v })" />
      </el-form-item>

      <el-divider content-position="left" class="field-divider">图标</el-divider>
      <el-form-item label="预设图标">
        <el-radio-group :model-value="iconPreset" @change="onPresetIcon">
          <el-radio-button v-for="item in iconPresets" :key="item.key" :value="item.key">
            {{ item.emoji }} {{ item.label }}
          </el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="自定义图">
        <div class="img-field">
          <div v-if="iconPreview" class="img-preview">
            <img :src="iconPreview" alt="" />
            <el-button text type="danger" size="small" @click="emit('update', { icon_image: '' })">移除</el-button>
          </div>
          <el-input
            :model-value="data.icon_image || ''"
            @input="emit('update', { icon_image: $event })"
            placeholder="图标图片 URL（优先于预设）"
          />
          <label class="upload-btn">
            {{ uploading ? '上传中…' : '本地上传' }}
            <input type="file" accept="image/*" hidden :disabled="uploading" @change="onUploadIcon" />
          </label>
        </div>
      </el-form-item>

      <el-divider content-position="left" class="field-divider">外观</el-divider>
      <el-form-item label="按钮颜色">
        <el-color-picker
          :model-value="data.color || '#1769ff'"
          @change="(v: string | null) => emit('update', { color: v || '#1769ff' })"
        />
      </el-form-item>
      <el-form-item label="尺寸">
        <el-input-number
          :model-value="data.size ?? 48"
          :min="36"
          :max="72"
          controls-position="right"
          @change="(v: number) => emit('update', { size: v })"
        />
      </el-form-item>
      <el-form-item label="透明度">
        <el-slider
          :model-value="data.opacity ?? 100"
          :min="40"
          :max="100"
          @change="(v: number) => emit('update', { opacity: v })"
        />
      </el-form-item>

      <el-divider content-position="left" class="field-divider">位置</el-divider>
      <el-form-item label="停靠位置">
        <el-select :model-value="data.position || 'right_bottom'" style="width: 100%" @change="(v: string) => emit('update', { position: v })">
          <el-option label="右下角" value="right_bottom" />
          <el-option label="左下角" value="left_bottom" />
          <el-option label="右中" value="right_middle" />
          <el-option label="左中" value="left_middle" />
        </el-select>
      </el-form-item>
      <el-form-item label="左右边距">
        <el-input-number
          :model-value="data.offset_x ?? 16"
          :min="0"
          :max="80"
          controls-position="right"
          @change="(v: number) => emit('update', { offset_x: v })"
        />
      </el-form-item>
      <el-form-item label="上下边距">
        <el-input-number
          :model-value="data.offset_y ?? 100"
          :min="0"
          :max="400"
          controls-position="right"
          @change="(v: number) => emit('update', { offset_y: v })"
        />
      </el-form-item>
      <el-form-item label="可拖动">
        <el-switch :model-value="!!data.draggable" @change="(v: boolean) => emit('update', { draggable: v })" />
      </el-form-item>
      <el-form-item label="自动收边">
        <el-switch :model-value="data.edge_hide !== false" @change="(v: boolean) => emit('update', { edge_hide: v })" />
        <div class="field-hint">空闲约 2.5 秒后半藏进屏幕边缘，触摸后展开</div>
      </el-form-item>

      <el-divider content-position="left" class="field-divider">点击动作</el-divider>
      <el-form-item label="动作">
        <el-select :model-value="data.action_type || 'link'" style="width: 100%" @change="onActionType">
          <el-option label="跳转页面" value="link" />
          <el-option label="返回顶部" value="top" />
          <el-option label="拨打电话" value="phone" />
          <el-option label="打开客服" value="ai" />
        </el-select>
      </el-form-item>
      <el-form-item v-if="(data.action_type || 'link') === 'link'" label="页面路径">
        <el-input
          :model-value="data.link_url || ''"
          @input="emit('update', { link_url: $event })"
          placeholder="/pages/service-chat/service-chat"
        />
      </el-form-item>
      <el-form-item v-if="data.action_type === 'phone'" label="电话号码">
        <el-input
          :model-value="data.phone || ''"
          @input="emit('update', { phone: $event })"
          placeholder="400-000-0000"
        />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { normalizeUploadUrl } from '@/api/system'
import { useImageUpload } from '../composables/useImageUpload'

const iconPresets = [
  { key: 'service', label: '客服', emoji: '🎧' },
  { key: 'cart', label: '购物车', emoji: '🛒' },
  { key: 'home', label: '首页', emoji: '🏠' },
  { key: 'top', label: '回顶', emoji: '⬆️' },
  { key: 'phone', label: '电话', emoji: '📞' },
]

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()
const { uploadImage, uploading } = useImageUpload()

const iconPreset = computed(() => {
  const icon = String(data.icon || 'service')
  if (iconPresets.some((x) => x.key === icon || x.emoji === icon)) {
    const hit = iconPresets.find((x) => x.key === icon || x.emoji === icon)
    return hit?.key || 'service'
  }
  return 'service'
})

const iconPreview = computed(() => normalizeUploadUrl(String(data.icon_image || '')))

function onPresetIcon(key: string) {
  const hit = iconPresets.find((x) => x.key === key)
  emit('update', {
    icon: key,
    icon_emoji: hit?.emoji || '🎧',
    title: data.title || hit?.label || '客服',
  })
}

function onActionType(type: string) {
  const patch: Record<string, any> = { action_type: type }
  if (type === 'top') {
    patch.icon = 'top'
    patch.icon_emoji = '⬆️'
    if (!data.title) patch.title = '回顶'
  }
  if (type === 'phone') {
    patch.icon = 'phone'
    patch.icon_emoji = '📞'
    if (!data.title) patch.title = '电话'
  }
  if (type === 'ai') {
    patch.icon = 'service'
    patch.icon_emoji = '🎧'
    if (!data.title) patch.title = '客服'
  }
  emit('update', patch)
}

async function onUploadIcon(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  await uploadImage(file, {
    maxSizeMB: 2,
    onSuccess: (url: string) => emit('update', { icon_image: normalizeUploadUrl(url) }),
  })
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
  width: 36px;
  height: 36px;
  object-fit: contain;
  border: 1px solid #e3e8f0;
  border-radius: 8px;
  background: #f8fafc;
}

.upload-btn {
  display: inline-flex;
  width: fit-content;
  padding: 4px 10px;
  color: #1769ff;
  font-size: 12px;
  border: 1px dashed #93c5fd;
  border-radius: 4px;
  cursor: pointer;
}

.field-hint {
  width: 100%;
  margin-top: 4px;
  color: #9aa5b5;
  font-size: 11px;
  line-height: 1.4;
}

:deep(.el-radio-button__inner) {
  padding: 6px 8px;
}
</style>
