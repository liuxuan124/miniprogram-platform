<template>
  <div class="brand-header-props">
    <el-form label-width="78px" size="small">
      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="替代小程序系统顶栏：请放在页面最顶部；顶栏仅保留 Logo 与标题，不再模拟状态栏。"
        style="margin-bottom: 12px"
      />
      <el-divider content-position="left">品牌信息</el-divider>
      <el-form-item label="Logo">
        <div class="img-field">
          <div v-if="logoPreview" class="img-preview">
            <img :src="logoPreview" alt="" />
            <el-button text type="danger" size="small" @click="emitUpdate({ logo: '' })">移除</el-button>
          </div>
          <el-input
            :model-value="cfg.logo || ''"
            placeholder="Logo 图片 URL"
            @input="(v: string) => emitUpdate({ logo: v })"
          />
          <label class="upload-btn">
            本地上传
            <input type="file" accept="image/*" hidden @change="onUploadLogo" />
          </label>
        </div>
        <div class="hint">有 Logo 文字且无 Logo 图时显示；留空则不显示</div>
      </el-form-item>
      <el-form-item label="Logo 文字">
        <el-input
          :model-value="cfg.logo_text ?? ''"
          maxlength="8"
          placeholder="留空则不显示"
          clearable
          @input="(v: string) => emitUpdate({ logo_text: v })"
          @clear="emitUpdate({ logo_text: '' })"
        />
        <div class="hint">留空且不传 Logo 图时，左侧品牌区不显示</div>
      </el-form-item>
      <el-form-item label="Logo 高度">
        <el-input-number
          :model-value="num(cfg.logo_height, 28)"
          :min="20"
          :max="48"
          controls-position="right"
          @change="(v: number | undefined) => emitUpdate({ logo_height: v ?? 28 })"
          @input="(v: number | undefined) => emitUpdate({ logo_height: v ?? 28 })"
        />
        <div class="hint">单位 px</div>
      </el-form-item>
      <el-form-item label="Logo 最大宽">
        <el-input-number
          :model-value="num(cfg.logo_max_width, 88)"
          :min="48"
          :max="140"
          controls-position="right"
          @change="(v: number | undefined) => emitUpdate({ logo_max_width: v ?? 88 })"
          @input="(v: number | undefined) => emitUpdate({ logo_max_width: v ?? 88 })"
        />
        <div class="hint">单位 px</div>
      </el-form-item>
      <el-form-item label="主标题">
        <el-input
          :model-value="cfg.title || ''"
          maxlength="40"
          show-word-limit
          placeholder="墨太白 · 跨境工具与知识平台"
          @input="(v: string) => emitUpdate({ title: v })"
        />
      </el-form-item>
      <el-form-item label="副标题">
        <el-input
          :model-value="cfg.subtitle || ''"
          maxlength="30"
          placeholder="可选"
          @input="(v: string) => emitUpdate({ subtitle: v })"
        />
      </el-form-item>
      <el-form-item label="竖线分隔">
        <el-switch
          :model-value="cfg.show_divider !== false"
          @change="(v: boolean) => emitUpdate({ show_divider: v })"
        />
      </el-form-item>

      <el-divider content-position="left">边距</el-divider>
      <el-form-item label="左内边距">
        <el-input-number
          :model-value="num(cfg.bar_padding_left, 12)"
          :min="0"
          :max="48"
          controls-position="right"
          @change="(v: number | undefined) => emitUpdate({ bar_padding_left: v ?? 12 })"
          @input="(v: number | undefined) => emitUpdate({ bar_padding_left: v ?? 12 })"
        />
        <div class="hint">单位 px，内容与屏幕左缘距离</div>
      </el-form-item>
      <el-form-item label="右内边距">
        <el-input-number
          :model-value="num(cfg.bar_padding_right, 12)"
          :min="0"
          :max="48"
          controls-position="right"
          @change="(v: number | undefined) => emitUpdate({ bar_padding_right: v ?? 12 })"
          @input="(v: number | undefined) => emitUpdate({ bar_padding_right: v ?? 12 })"
        />
        <div class="hint">单位 px；小程序端会自动与胶囊按钮避让，取较大值</div>
      </el-form-item>

      <el-divider content-position="left">样式</el-divider>
      <el-form-item label="背景风格">
        <el-radio-group
          :model-value="cfg.style_type === 'gradient' ? 'gradient' : 'plain'"
          @update:model-value="(v: string) => emitUpdate({ style_type: v })"
        >
          <el-radio-button value="plain">白底</el-radio-button>
          <el-radio-button value="gradient">蓝渐变</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="cfg.style_type !== 'gradient'" label="背景色">
        <el-color-picker
          :model-value="cfg.background_color || '#ffffff'"
          @update:model-value="(v: string | null) => emitUpdate({ background_color: v || '#ffffff' })"
        />
      </el-form-item>
      <template v-else>
        <el-form-item label="渐变起">
          <el-color-picker
            :model-value="cfg.gradient_from || '#002FA7'"
            @update:model-value="(v: string | null) => emitUpdate({ gradient_from: v || '#002FA7' })"
          />
        </el-form-item>
        <el-form-item label="渐变止">
          <el-color-picker
            :model-value="cfg.gradient_to || '#1A4BBF'"
            @update:model-value="(v: string | null) => emitUpdate({ gradient_to: v || '#1A4BBF' })"
          />
        </el-form-item>
      </template>
      <el-form-item label="标题颜色">
        <el-color-picker
          :model-value="titleColor"
          @update:model-value="onTitleColor"
        />
      </el-form-item>
      <el-form-item label="主标题字号">
        <el-input-number
          :model-value="num(cfg.title_font_size, 15)"
          :min="12"
          :max="22"
          controls-position="right"
          @change="(v: number | undefined) => emitUpdate({ title_font_size: v ?? 15 })"
          @input="(v: number | undefined) => emitUpdate({ title_font_size: v ?? 15 })"
        />
      </el-form-item>
      <el-form-item label="Logo字色">
        <el-color-picker
          :model-value="cfg.logo_text_color || (cfg.style_type === 'gradient' ? '#ffffff' : '#002FA7')"
          @update:model-value="(v: string | null) => emitUpdate({ logo_text_color: v || '#002FA7' })"
        />
      </el-form-item>
      <el-form-item v-if="cfg.subtitle" label="副标题字号">
        <el-input-number
          :model-value="num(cfg.subtitle_font_size, 11)"
          :min="10"
          :max="16"
          controls-position="right"
          @change="(v: number | undefined) => emitUpdate({ subtitle_font_size: v ?? 11 })"
          @input="(v: number | undefined) => emitUpdate({ subtitle_font_size: v ?? 11 })"
        />
      </el-form-item>
      <el-form-item v-if="cfg.subtitle" label="副标题颜色">
        <el-color-picker
          :model-value="subtitleColor"
          @update:model-value="onSubtitleColor"
        />
      </el-form-item>
      <el-form-item v-if="cfg.show_divider !== false" label="分隔线色">
        <el-color-picker
          :model-value="cfg.divider_color || '#d0d8e8'"
          @update:model-value="(v: string | null) => emitUpdate({ divider_color: v || '#d0d8e8' })"
        />
      </el-form-item>
      <el-form-item label="滚动吸顶">
        <el-switch
          :model-value="cfg.fixed_top !== false"
          @change="(v: boolean) => emitUpdate({ fixed_top: v })"
        />
        <div class="hint">开启后页面下滑时顶栏固定在顶部</div>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { normalizeUploadUrl } from '@/api/system'
import { useImageUpload } from '../composables/useImageUpload'

const panel = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()
const { uploadImage } = useImageUpload()

const cfg = computed(() => panel.props || {})

const logoPreview = computed(() => normalizeUploadUrl(String(cfg.value.logo || '').trim()) || '')

const titleColor = computed(() => {
  if (cfg.value.style_type === 'gradient') return cfg.value.title_color_light || '#ffffff'
  return cfg.value.title_color || '#172033'
})

const subtitleColor = computed(() => {
  if (cfg.value.style_type === 'gradient') return cfg.value.subtitle_color_light || 'rgba(255,255,255,0.82)'
  return cfg.value.subtitle_color || '#7b8798'
})

function num(v: unknown, fallback: number) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function emitUpdate(partial: Record<string, any>) {
  emit('update', partial)
}

function onTitleColor(v: string | null) {
  if (cfg.value.style_type === 'gradient') {
    emitUpdate({ title_color_light: v || '#ffffff' })
  } else {
    emitUpdate({ title_color: v || '#172033' })
  }
}

function onSubtitleColor(v: string | null) {
  if (cfg.value.style_type === 'gradient') {
    emitUpdate({ subtitle_color_light: v || 'rgba(255,255,255,0.82)' })
  } else {
    emitUpdate({ subtitle_color: v || '#7b8798' })
  }
}

async function onUploadLogo(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const url = await uploadImage(file, {
    onSuccess: (u) => emitUpdate({ logo: u }),
  })
  if (url) emitUpdate({ logo: url })
  ;(e.target as HTMLInputElement).value = ''
}
</script>

<style scoped lang="scss">
.hint {
  margin-top: 4px;
  font-size: 12px;
  color: #94a3b8;
}

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
    max-height: 48px;
    max-width: 120px;
    object-fit: contain;
    border: 1px solid #e3e8f0;
    border-radius: 6px;
    padding: 4px;
    background: #fff;
  }
}

.upload-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  font-size: 12px;
  color: #1769ff;
  border: 1px dashed #c9d8ff;
  border-radius: 6px;
  cursor: pointer;
  width: fit-content;
}
</style>
