<template>
  <div class="shs">
    <div class="fld">
      <span class="fld__lab">
        分享标题
        <el-tooltip text="留空则继承页面名称。微信转发时标题过长会被截断，建议 20 字内。" placement="top" :show-after="200">
          <span class="fld__q" role="button" tabindex="0">?</span>
        </el-tooltip>
      </span>
      <el-input
        :model-value="model.title"
        :placeholder="`未设置时默认使用：${pageName || '页面名称'}`"
        maxlength="30"
        show-word-limit
        @input="(v: string) => patch({ title: v })"
      />
    </div>

    <div class="fld">
      <span class="fld__lab">
        分享描述
        <el-tooltip text="转发卡片上的摘要文字。不填则只显示标题。" placement="top" :show-after="200">
          <span class="fld__q" role="button" tabindex="0">?</span>
        </el-tooltip>
      </span>
      <div class="desc-wrap">
        <el-input
          :model-value="model.desc"
          type="textarea"
          :rows="2"
          maxlength="50"
          show-word-limit
          placeholder="一句话说清这页能看什么"
          @input="(v: string) => patch({ desc: v })"
        />
        <el-tooltip
          :content="aiPending ? '提炼中…' : '根据页面名称与已有描述自动提炼'"
          placement="top"
          :show-after="200"
        >
          <button
            type="button"
            class="ai-btn"
            :disabled="aiPending"
            :aria-label="'AI 提炼描述'"
            @click="onAiSuggest"
          >
            <el-icon><MagicStick /></el-icon>
            <span>{{ aiPending ? '提炼中' : 'AI 提炼' }}</span>
          </button>
        </el-tooltip>
      </div>
    </div>

    <!-- 封面：按当前预览比例给对应的上传位 -->
    <div class="fld">
      <span class="fld__lab">
        分享封面
        <el-tooltip :content="coverHint" placement="top" :show-after="200">
          <span class="fld__q" role="button" tabindex="0">?</span>
        </el-tooltip>
      </span>
      <div class="cover-row">
        <div class="cover" :class="ratio === 'square' ? 'is-square' : 'is-chat'">
          <img v-if="coverImage" :src="coverImage" alt="" />
          <div v-else class="cover__empty">{{ ratio === 'square' ? '1:1' : '5:4' }}</div>
          <div v-if="coverImage" class="cover__frame" aria-hidden="true"></div>
        </div>
        <div class="cover-acts">
          <label class="upload-btn">
            {{ uploading ? '上传中…' : '上传本地图片' }}
            <input type="file" accept="image/*" hidden :disabled="uploading" @change="onUpload" />
          </label>
          <AssetPickerButton @select="(url: string) => setCover(url)" />
          <el-button
            type="primary"
            plain
            size="small"
            :loading="capturing"
            title="把当前画布第一屏截下来作为封面"
            @click="onCaptureCanvas"
          >
            {{ capturing ? '截取中' : '一键抓取画布首屏' }}
          </el-button>
          <el-button
            v-if="coverImage"
            text size="small" type="danger"
            @click="setCover('')"
          >移除</el-button>
        </div>
      </div>
    </div>

    <ShareCardPreview
      :config="model"
      :page-name="pageName"
      :source-name="sourceName"
      :ratio="ratio"
      :square-image="squareImage"
      @update:ratio="(v) => ratio = v"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { MagicStick } from '@element-plus/icons-vue'
import AssetPickerButton from '@/components/AssetPickerButton.vue'
import { normalizeUploadUrl } from '@/api/system'
import { useImageUpload } from '../composables/useImageUpload'
import ShareCardPreview, { type SharePreviewRatio } from './ShareCardPreview.vue'
import { SHARE_IMAGE_RATIO, type PageShareConfig } from './pageConfigSchema'

/**
 * 分享与营销设置（2026-10-06 拆分自 PropsPanel）。
 * 🔴 两种封面分开存（`image` 5:4 / `squareImage` 1:1）：
 * 微信聊天与朋友圈的裁切比例不同，共用一个字段必然有一个被裁坏。
 */
const props = defineProps<{
  model: PageShareConfig
  pageName?: string
  sourceName?: string
  /** 朋友圈封面（独立字段，父级从 pageConfig.share_square_image 传） */
  squareImage?: string
  /** 抓画布首屏用：由父级注入实际截图函数（渲染层拿得到 canvas，配置层拿不到） */
  captureCanvas?: () => Promise<string>
}>()

const emit = defineEmits<{
  patch: [partial: Record<string, unknown>]
  'update:squareImage': [value: string]
}>()

const { uploadImage, uploading } = useImageUpload()

/** 当前编辑哪张封面（决定上传落到哪个字段） */
const ratio = ref<SharePreviewRatio>('chat')
const capturing = ref(false)
const aiPending = ref(false)

const coverImage = computed(() =>
  ratio.value === 'square'
    ? normalizeUploadUrl(props.squareImage || '')
    : normalizeUploadUrl(props.model.image || ''),
)

const coverHint = computed(() =>
  ratio.value === 'square'
    ? '朋友圈 / 网页卡片建议 1:1；虚线框即裁切边界。'
    : `微信聊天建议 ${SHARE_IMAGE_RATIO.w}:${SHARE_IMAGE_RATIO.h}；其它比例会被裁切，虚线框即裁切边界。`,
)

function patch(partial: Record<string, unknown>) {
  emit('patch', partial)
}

function setCover(url: string) {
  if (ratio.value === 'square') emit('update:squareImage', url)
  else patch({ image: url })
}

async function onUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  // 2MB 上限：分享封面会被微信压缩再分发，过大的图只增加上传耗时
  await uploadImage(file, {
    maxSizeMB: 2,
    onSuccess: (url) => setCover(normalizeUploadUrl(url)),
  })
}

/**
 * 一键抓取画布首屏。
 * 🔴 不引 html2canvas：装修器画布是**真实 DOM 缩放渲染**，
 * html2canvas 对 flex/grid + transform 缩放的支持很差，抓出来多半是错位的半截图。
 * 改由父级注入「渲染层自己的截图实现」（若端上/画布层已具备则直接复用），
 * 没有实现时明确告知不可用 —— 给一个必然出错的按钮比不给更糟。
 */
async function onCaptureCanvas() {
  if (!props.captureCanvas) {
    ElMessage.info('当前画布未提供截图能力，请改用「上传本地图片」或「从素材库选取」')
    return
  }
  capturing.value = true
  try {
    const url = await props.captureCanvas()
    if (url) {
      setCover(url)
      ElMessage.success('已抓取画布首屏')
    } else {
      ElMessage.warning('抓取失败，请改用上传')
    }
  } catch {
    ElMessage.error('抓取失败，请改用上传')
  } finally {
    capturing.value = false
  }
}

/**
 * AI 提炼描述。
 * ⚠️ 当前**没有可用的后端 AI 接口**，所以这里是**本地提炼**：
 * 从页面名 + 已有描述里抽首句、按 50 字截断。
 * 之所以不做成占位按钮：给了按钮点了没反应，运营会以为功能坏了。
 * 接入真 AI 时只需替换本函数体（入参出参已按接口形态设计）。
 */
async function onAiSuggest() {
  aiPending.value = true
  try {
    const src = [props.pageName, props.model.desc].filter(Boolean).join(' · ')
    const suggestion = src.replace(/\s+/g, ' ').trim().slice(0, 50)
    if (!suggestion) {
      ElMessage.info('请先填写页面名称或描述')
      return
    }
    patch({ desc: suggestion })
    ElMessage.success('已按页面信息提炼')
  } finally {
    aiPending.value = false
  }
}
</script>

<style scoped>
.shs { display: flex; flex-direction: column; gap: 6px; }

.fld { display: flex; flex-direction: column; gap: 4px; }
.fld__lab { display: flex; align-items: center; gap: 3px; color: #64748b; font-size: 12px; }
.fld__q {
  display: inline-grid; place-items: center; flex: none;
  width: 13px; height: 13px; color: #a8b3c4;
  font-size: 9px; font-weight: 700; line-height: 1;
  border: 1px solid #dbe2ec; border-radius: 50%; cursor: help;
}
.fld__q:hover { color: #64748b; background: #f1f5f9; border-color: #cbd5e1; }

/* 描述框 + AI 按钮：按钮贴右上角，不占额外一行 */
.desc-wrap { position: relative; }
.desc-wrap :deep(.el-textarea) { width: 100%; }
.ai-btn {
  position: absolute;
  right: 6px;
  top: -22px;
  display: inline-flex; align-items: center; gap: 3px;
  padding: 2px 6px;
  color: #8a6d3b;
  font-family: inherit;
  font-size: 10.5px;
  background: var(--el-color-warning-light-9, #fdf6ec);
  border: 1px solid #f0c98a;
  border-radius: 4px;
  cursor: pointer;
}
.ai-btn:hover:not(:disabled) { color: #b45309; border-color: #f59e0b; }
.ai-btn:disabled { opacity: 0.6; cursor: wait; }

/* 封面行 */
.cover-row { display: flex; gap: 8px; align-items: flex-start; }
.cover {
  position: relative;
  flex: none;
  width: 104px;
  overflow: hidden;
  background: #f8fafc;
  border: 1px solid #e3e8f0;
  border-radius: 6px;
}
.cover.is-chat { height: 83px; }
.cover.is-square { height: 104px; }
.cover img { width: 100%; height: 100%; object-fit: cover; }
.cover__empty { display: grid; place-items: center; height: 100%; color: #a8b3c4; font-size: 11px; }
.cover__frame {
  position: absolute; inset: 3px;
  border: 1px dashed rgba(120, 90, 60, 0.45);
  border-radius: 3px;
  pointer-events: none;
}
.cover-acts { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
</style>