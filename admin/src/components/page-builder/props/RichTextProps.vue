<template>
  <div class="rich-text-props">
    <el-tabs v-model="activeTab" class="rtp-tabs">
      <!-- ==================== 内容配置 ==================== -->
      <el-tab-pane label="内容" name="content">
        <PageRichTextEditor
          :model-value="cfg.content"
          @update:model-value="(v: string) => patch({ content: v })"
        />

        <!-- 预设扩展内容块 -->
        <div class="rtp-sec">
          <div class="rtp-sec__head"><span class="rtp-sec__title">提示卡片</span></div>
          <p class="rtp-sec__hint">插入带色条的提示块，内容可直接编辑；端上以 blockquote 内联样式渲染</p>
          <div class="rtp-callouts">
            <button
              v-for="o in CALLOUT_OPTIONS"
              :key="o.value"
              type="button"
              class="rtp-callout"
              @click="appendCallout(o.value)"
            >
              <span class="rtp-callout__icon">{{ o.icon }}</span>
              <span class="rtp-callout__body">
                <b>{{ o.label }}</b>
                <em>{{ o.desc }}</em>
              </span>
            </button>
          </div>
        </div>

        <div class="rtp-sec">
          <div class="rtp-sec__head"><span class="rtp-sec__title">安全提示</span></div>
          <ul class="rtp-tips">
            <li>从公众号 / 飞书 / Word 粘贴时会<b>自动清洗</b>写死的固定宽度与字体，避免小程序端横向撑破。</li>
            <li>图片会自动注入 <code>max-width:100%</code>，不需要手动改尺寸。</li>
            <li>表格横向可滑动、代码块自动换行，均已在端上适配。</li>
          </ul>
        </div>
      </el-tab-pane>

      <!-- ==================== 样式配置 ==================== -->
      <el-tab-pane label="样式" name="style">
        <div class="rtp-sec">
          <div class="rtp-sec__head"><span class="rtp-sec__title">全局排版规范</span></div>
          <el-form label-width="76px" size="small">
            <el-form-item label="基础字号">
              <NumSliderRow
                :model-value="cfg.base_font_size"
                :min="BASE_FONT_SIZE.min"
                :max="BASE_FONT_SIZE.max"
                :step="BASE_FONT_SIZE.step"
                @update:model-value="(v: number) => patch({ base_font_size: v })"
              />
              <FieldHint text="容器字号。内部标题与正文仍可用 H1/H2/H3 等相对层级覆盖" />
            </el-form-item>

            <el-form-item label="正文字色">
              <ColorPickerField
                :model-value="cfg.text_color"
                label=""
                default-value="#333333"
                :predefine="RICH_TEXT_PRESET_COLORS"
                @update:model-value="(v: string) => patch({ text_color: v })"
              />
            </el-form-item>

            <el-form-item label="行间距">
              <BuilderSegmented
                :model-value="cfg.line_height"
                block
                :options="LINE_HEIGHT_OPTIONS"
                @update:model-value="(v) => patch({ line_height: Number(v) })"
              />
            </el-form-item>

            <el-form-item label="段落间距">
              <NumSliderRow
                :model-value="cfg.paragraph_gap"
                :min="PARAGRAPH_GAP.min"
                :max="PARAGRAPH_GAP.max"
                :step="PARAGRAPH_GAP.step"
                @update:model-value="(v: number) => patch({ paragraph_gap: v })"
              />
            </el-form-item>
          </el-form>
        </div>

        <div class="rtp-sec">
          <div class="rtp-sec__head"><span class="rtp-sec__title">外层容器</span></div>
          <el-form label-width="76px" size="small">
            <el-form-item label="左右内边距">
              <NumSliderRow
                :model-value="cfg.padding_x"
                :min="PADDING_X.min"
                :max="PADDING_X.max"
                :step="PADDING_X.step"
                @update:model-value="(v: number) => patch({ padding_x: v })"
              />
            </el-form-item>

            <el-form-item label="上下内边距">
              <NumSliderRow
                :model-value="cfg.padding_y"
                :min="PADDING_Y.min"
                :max="PADDING_Y.max"
                :step="PADDING_Y.step"
                @update:model-value="(v: number) => patch({ padding_y: v })"
              />
            </el-form-item>

            <el-form-item label="上下外边距">
              <NumSliderRow
                :model-value="cfg.margin_y"
                :min="MARGIN_Y.min"
                :max="MARGIN_Y.max"
                :step="MARGIN_Y.step"
                @update:model-value="(v: number) => patch({ margin_y: v })"
              />
            </el-form-item>

            <el-form-item label="容器背景">
              <BuilderSegmented
                :model-value="cfg.container_bg"
                block
                :options="CONTAINER_BG_OPTIONS"
                @update:model-value="(v) => patch({ container_bg: v })"
              />
            </el-form-item>

            <el-form-item v-if="cfg.container_bg !== 'none'" label="圆角">
              <el-switch
                :model-value="cfg.container_radius"
                @change="(v: boolean) => patch({ container_radius: v })"
              />
            </el-form-item>
          </el-form>
        </div>

        <div class="rtp-sec">
          <div class="rtp-sec__head"><span class="rtp-sec__title">预览</span></div>
          <div class="rtp-preview rich-text-content" :style="previewStyle" v-html="previewHtml"></div>
          <p class="rtp-sec__hint">画布与小程序端按此容器样式渲染（继承生效，不逐个改内联样式）</p>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import PageRichTextEditor from './PageRichTextEditor.vue'
import BuilderSegmented from '../BuilderSegmented.vue'
import FieldHint from '../FieldHint.vue'
import ColorPickerField from '../ColorPickerField.vue'
import NumSliderRow from './NumSliderRow.vue'
import {
  BASE_FONT_SIZE,
  CALLOUT_OPTIONS,
  CALLOUT_PRESETS,
  CONTAINER_BG_OPTIONS,
  LINE_HEIGHT_OPTIONS,
  MARGIN_Y,
  PADDING_X,
  PADDING_Y,
  PARAGRAPH_GAP,
  RICH_TEXT_PRESET_COLORS,
  isRichTextEmpty,
  normalizeRichTextProps,
  richContainerStyle,
  type CalloutStyle,
  type RichTextProps,
} from '../richText/richTextSchema'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const activeTab = ref<'content' | 'style'>('content')

const cfg = computed<RichTextProps>(() => normalizeRichTextProps(data))

/** 预览：空内容给占位引导，不塌成 0 高 */
const previewHtml = computed(() => {
  const html = cfg.value.content
  if (isRichTextEmpty(html)) {
    return '<p style="color:#9ca3af">点击右侧「全屏排版」开始撰写，或在此处输入内容</p>'
  }
  return html
})

const previewStyle = computed(() => {
  const style = richContainerStyle(cfg.value)
  if (cfg.value.container_bg === 'none') {
    style.background = '#fafbfd'
  }
  return style
})

function patch(partial: Record<string, unknown>) {
  emit('update', { ...partial })
}

/** 追加提示卡：直接拼 HTML，端上 blockquote 内联样式生效 */
function appendCallout(style: string) {
  const preset = CALLOUT_PRESETS[style as CalloutStyle]
  if (!preset) return
  const block =
    `<blockquote style="${preset.style}">` +
    `<strong style="color:${preset.labelColor};">${preset.icon} ${preset.label}｜</strong>请输入内容` +
    `</blockquote>`
  const next = cfg.value.content ? `${cfg.value.content}${block}` : block
  patch({ content: next })
}
</script>

<style lang="scss" scoped>
.rtp-tabs :deep(.el-tabs__header) {
  margin-bottom: 10px;
}

.rtp-sec {
  margin-bottom: 16px;
}

.rtp-sec__head {
  margin-bottom: 6px;
}

.rtp-sec__title {
  font-size: 13px;
  font-weight: 600;
  color: #3f3a35;
}

.rtp-sec__hint {
  margin: 6px 0 0;
  font-size: 11px;
  color: #a89c8d;
  line-height: 1.5;
}

/* ---------- 提示卡选择 ---------- */
.rtp-callouts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.rtp-callout {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 7px 8px;
  text-align: left;
  cursor: pointer;
  background: #fff;
  border: 1px solid #e8e2d9;
  border-radius: 8px;

  &:hover {
    border-color: var(--el-color-primary, #c08e6e);
  }
}

.rtp-callout__icon {
  font-size: 14px;
}

.rtp-callout__body {
  display: flex;
  flex-direction: column;
  min-width: 0;

  b {
    font-size: 12px;
    color: #3f3a35;
  }

  em {
    font-size: 11px;
    font-style: normal;
    color: #a89c8d;
  }
}

/* ---------- 安全提示 ---------- */
.rtp-tips {
  margin: 0;
  padding-left: 16px;
  font-size: 11px;
  color: #7b8798;
  line-height: 1.7;

  code {
    padding: 0 3px;
    font-size: 10px;
    background: #f6f1e6;
    border-radius: 3px;
  }
}

/* ---------- 样式预览 ---------- */
.rtp-preview {
  padding: 10px 12px;
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.7;
  border: 1px solid #eef1f6;
  border-radius: 8px;

  :deep(p) {
    margin: 0 0 0.8em;
  }

  :deep(img) {
    max-width: 100% !important;
    height: auto !important;
  }
}
</style>
