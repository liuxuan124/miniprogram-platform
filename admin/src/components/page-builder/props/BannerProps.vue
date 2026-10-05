<template>
  <div class="bnr-props">
    <el-tabs v-model="activeTab" class="bnr-props__tabs">
      <!-- ==================== 内容配置 ==================== -->
      <el-tab-pane label="内容" name="content">
        <div class="bnr-sec">
          <div class="bnr-sec__head">
            <span class="bnr-sec__title">轮播图片</span>
            <span class="bnr-sec__count">{{ images.length }} 张 / {{ visibleCount }} 张展示</span>
          </div>

          <!-- 空态 -->
          <div v-if="images.length === 0" class="bnr-blank">
            <p class="bnr-blank__title">还没有轮播图片</p>
            <p class="bnr-blank__hint">添加 3–5 张效果最佳；每张可单独配标题与跳转</p>
            <el-button type="primary" size="small" @click="addImage">+ 添加图片</el-button>
          </div>

          <!-- 拖拽排序列表 -->
          <draggable
            v-else
            v-model="listProxy"
            item-key="id"
            handle=".bnr-card__grip"
            :animation="160"
            ghost-class="bnr-card--ghost"
            drag-class="bnr-card--dragging"
            class="bnr-list"
          >
            <template #item="{ element, index }">
              <div class="bnr-card" :class="{ 'is-off': element.visible === false }">
                <!-- 折叠态：缩略图 + 标题 + 跳转简述 + 显隐/复制/删除 -->
                <div class="bnr-card__bar">
                  <span class="bnr-card__grip" title="拖拽调整顺序" aria-label="拖拽排序">
                    <el-icon><Rank /></el-icon>
                  </span>

                  <div class="bnr-card__thumb">
                    <img v-if="element.image && !brokenMap[element.id]" :src="element.image" alt="" @error="onThumbError(element.id)" />
                    <span v-else class="bnr-card__thumb-ph">{{ index + 1 }}</span>
                  </div>

                  <button type="button" class="bnr-card__main" @click="toggleExpand(index)">
                    <span class="bnr-card__name">{{ element.title || `图片${index + 1}` }}</span>
                    <span class="bnr-card__link">{{ linkSummary(element) }}</span>
                  </button>

                  <el-switch
                    :model-value="element.visible !== false"
                    size="small"
                    title="显示 / 隐藏该图"
                    @change="(v) => patchItem(index, { visible: !!v })"
                  />
                  <button type="button" class="bnr-card__ico" title="复制" @click="copyItem(index)">
                    <el-icon><CopyDocument /></el-icon>
                  </button>
                  <button type="button" class="bnr-card__ico bnr-card__ico--danger" title="删除" @click="removeItem(index)">
                    <el-icon><Delete /></el-icon>
                  </button>
                  <button type="button" class="bnr-card__ico" :title="expanded === index ? '收起' : '展开'" @click="toggleExpand(index)">
                    <el-icon><ArrowUp v-if="expanded === index" /><ArrowDown v-else /></el-icon>
                  </button>
                </div>

                <!-- 展开态：完整配置 -->
                <div v-if="expanded === index" class="bnr-card__body">
                  <div class="bnr-field">
                    <label class="bnr-label">图片</label>
                    <div class="bnr-uploader">
                      <div class="bnr-uploader__preview">
                        <img v-if="element.image && !brokenMap[element.id]" :src="element.image" alt="" @error="onThumbError(element.id)" />
                        <span v-else class="bnr-uploader__ph"><el-icon><Picture /></el-icon></span>
                      </div>
                      <div class="bnr-uploader__ops">
                        <el-input
                          :model-value="element.image"
                          size="small"
                          placeholder="图片 URL / 直接粘贴截图"
                          @update:model-value="(v: string) => patchItem(index, { image: v })"
                          @paste="onPaste($event, index)"
                        />
                        <div class="bnr-uploader__btns">
                          <label class="bnr-btn">
                            {{ uploadingIndex === index ? '上传中…' : '本地上传' }}
                            <input type="file" accept="image/*" style="display: none" @change="onUpload($event, index)" />
                          </label>
                          <el-button size="small" @click="openAssetPicker(index)">素材库</el-button>
                          <el-button v-if="element.image" size="small" text @click="patchItem(index, { image: '' })">清空</el-button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="bnr-field">
                    <label class="bnr-label">标题</label>
                    <el-input
                      :model-value="element.title"
                      size="small"
                      placeholder="主标题（最多 2 行显示）"
                      @update:model-value="(v: string) => patchItem(index, { title: v })"
                    />
                  </div>

                  <div class="bnr-field">
                    <label class="bnr-label">副标题</label>
                    <el-input
                      :model-value="element.subtitle"
                      size="small"
                      placeholder="副标题 / 说明文案（可选）"
                      @update:model-value="(v: string) => patchItem(index, { subtitle: v })"
                    />
                  </div>

                  <div class="bnr-field">
                    <label class="bnr-label">气泡文案</label>
                    <el-input
                      :model-value="element.action_label"
                      size="small"
                      placeholder="如 查看详情（留空跟随全局）"
                      @update:model-value="(v: string) => patchItem(index, { action_label: v })"
                    />
                  </div>

                  <div class="bnr-field">
                    <label class="bnr-label">跳转</label>
                    <button type="button" class="bnr-link" @click="openLinkDialog(index)">
                      <span class="bnr-link__tag">{{ linkTypeLabel(element.link_type) }}</span>
                      <span class="bnr-link__text">{{ linkSummary(element) }}</span>
                      <span class="bnr-link__act">配置</span>
                    </button>
                  </div>
                </div>
              </div>
            </template>
          </draggable>

          <el-button v-if="images.length > 0" type="primary" text size="small" class="bnr-add" @click="addImage">
            + 添加图片
          </el-button>
        </div>

        <el-divider content-position="left">播放逻辑</el-divider>
        <el-form label-width="76px" size="small">
          <el-form-item label="自动播放">
            <el-switch :model-value="cfg.autoplay" @change="patch({ autoplay: $event as boolean })" />
            <FieldHint text="开启后按下方间隔时间自动轮播；编辑态画布内会自动暂停，避免看配置时图片一直动" />
          </el-form-item>

          <el-form-item label="间隔时间">
            <div class="bnr-interval">
              <el-slider
                class="bnr-interval__bar"
                :model-value="cfg.interval"
                :min="INTERVAL.min"
                :max="INTERVAL.max"
                :step="INTERVAL.step"
                :show-tooltip="false"
                @update:model-value="(v: number | number[]) => patch({ interval: Number(v) })"
              />
              <el-input-number
                class="bnr-interval__num"
                :model-value="cfg.interval"
                :min="INTERVAL.min"
                :max="INTERVAL.max"
                :step="INTERVAL.step"
                :controls="false"
                size="small"
                @change="(v: number | undefined) => patch({ interval: Number(v) })"
              />
              <span class="bnr-interval__unit">ms</span>
            </div>
          </el-form-item>

          <el-form-item label="循环播放">
            <el-switch :model-value="cfg.loop" @change="patch({ loop: $event as boolean })" />
          </el-form-item>

          <el-form-item label="允许滑动">
            <el-switch :model-value="cfg.allow_touch" @change="patch({ allow_touch: $event as boolean })" />
          </el-form-item>

          <el-form-item label="裂图占位">
            <el-input
              :model-value="cfg.image_error_placeholder"
              size="small"
              placeholder="图片加载失败时的占位图 URL（可选）"
              @update:model-value="(v: string) => patch({ image_error_placeholder: v })"
            />
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- ==================== 样式配置 ==================== -->
      <el-tab-pane label="样式" name="style">
        <div class="bnr-sec">
          <div class="bnr-sec__head"><span class="bnr-sec__title">容器与布局</span></div>
          <el-form label-width="76px" size="small">
            <el-form-item label="预设形态">
              <div class="bnr-modes">
                <button
                  v-for="opt in LAYOUT_OPTIONS"
                  :key="opt.value"
                  type="button"
                  class="bnr-mode-card"
                  :class="{ 'is-on': cfg.layout_mode === opt.value }"
                  @click="patch({ layout_mode: opt.value })"
                >
                  <span class="bnr-mode-card__label">{{ opt.label }}</span>
                  <span class="bnr-mode-card__desc">{{ opt.desc }}</span>
                </button>
              </div>
            </el-form-item>

            <el-form-item v-if="cfg.layout_mode === 'card'" label="页面边距">
              <NumSliderRow
                :model-value="cfg.page_padding"
                :min="PADDING.min"
                :max="PADDING.max"
                :step="PADDING.step"
                @update:model-value="(v: number) => patch({ page_padding: v })"
              />
            </el-form-item>

            <el-form-item v-if="cfg.layout_mode === 'peek'" label="露边宽度">
              <NumSliderRow
                :model-value="cfg.peek_gutter"
                :min="GUTTER.min"
                :max="GUTTER.max"
                :step="GUTTER.step"
                @update:model-value="(v: number) => patch({ peek_gutter: v })"
              />
              <FieldHint text="两侧露出上一张/下一张的边缘宽度，越大景深越强" />
            </el-form-item>

            <el-form-item label="宽高比">
              <BuilderSegmented
                :model-value="cfg.aspect"
                block
                :options="ASPECT_OPTIONS"
                @update:model-value="(v) => patch({ aspect: v as BannerAspectKey })"
              />
            </el-form-item>

            <el-form-item v-if="cfg.aspect === 'custom'" label="自定义高">
              <NumSliderRow
                :model-value="cfg.custom_height"
                :min="HEIGHT.min"
                :max="HEIGHT.max"
                :step="HEIGHT.step"
                @update:model-value="(v: number) => patch({ custom_height: v })"
              />
            </el-form-item>

            <!-- 图片填充模式：cover 等比铺满不留黑边（推荐）/ contain 等比完整留白 -->
            <el-form-item label="图片填充">
              <GridSegmented
                :model-value="cfg.object_fit"
                :options="OBJECT_FIT_OPTIONS"
                aria-label="图片填充模式"
                @update:model-value="(v) => patch({ object_fit: v as BannerObjectFit })"
              />
              <FieldHint :text="cfg.object_fit === 'cover' ? '等比铺满容器，不留黑边' : '完整显示整图，上下可能留白'" />
            </el-form-item>

            <el-form-item label="圆角">
              <BuilderSegmented
                :model-value="cfg.radius_preset"
                block
                :options="RADIUS_OPTIONS"
                @update:model-value="(v) => patch({ radius_preset: Number(v) as BannerRadiusKey })"
              />
            </el-form-item>

            <el-form-item v-if="cfg.radius_preset === 0" label="自定义圆角">
              <NumSliderRow
                :model-value="cfg.radius_custom"
                :min="0"
                :max="40"
                :step="1"
                @update:model-value="(v: number) => patch({ radius_custom: v })"
              />
            </el-form-item>

            <el-form-item label="投影效果">
              <BuilderSegmented
                :model-value="cfg.shadow"
                block
                :options="SHADOW_OPTIONS"
                @update:model-value="(v) => patch({ shadow: v as BannerShadowKey })"
              />
            </el-form-item>
          </el-form>
        </div>

        <div class="bnr-sec">
          <div class="bnr-sec__head"><span class="bnr-sec__title">指示器</span></div>
          <el-form label-width="76px" size="small">
            <el-form-item label="形态">
              <BuilderSegmented
                :model-value="cfg.indicator_type"
                block
                :options="INDICATOR_OPTIONS"
                @update:model-value="(v) => patch({ indicator_type: v as BannerIndicatorType })"
              />
            </el-form-item>

            <template v-if="cfg.indicator_type !== 'none'">
              <el-form-item label="位置">
                <BuilderSegmented
                  :model-value="cfg.indicator_pos"
                  block
                  :options="INDICATOR_POS_OPTIONS"
                  @update:model-value="(v) => patch({ indicator_pos: v as BannerIndicatorPos })"
                />
              </el-form-item>

              <el-form-item label="激活颜色">
                <ColorPickerField
                  :model-value="cfg.indicator_active_color"
                  label=""
                  default-value="#ffffff"
                  @update:model-value="(v: string) => patch({ indicator_active_color: v })"
                />
              </el-form-item>

              <el-form-item label="未激活色">
                <ColorPickerField
                  :model-value="cfg.indicator_inactive_color"
                  label=""
                  default-value="#ffffff"
                  @update:model-value="(v: string) => patch({ indicator_inactive_color: v })"
                />
              </el-form-item>

              <el-form-item label="未激活透明">
                <NumSliderRow
                  :model-value="cfg.indicator_inactive_opacity"
                  :min="0"
                  :max="1"
                  :step="0.05"
                  :fallback="0.45"
                  @update:model-value="(v: number) => patch({ indicator_inactive_opacity: v })"
                />
              </el-form-item>
            </template>
          </el-form>
        </div>

        <div class="bnr-sec">
          <div class="bnr-sec__head"><span class="bnr-sec__title">文本遮罩与蒙层</span></div>
          <el-form label-width="76px" size="small">
            <el-form-item label="底部蒙层">
              <el-switch :model-value="cfg.overlay" @change="patch({ overlay: $event as boolean })" />
              <FieldHint text="浅色图片上白字会看不清，开启底部渐变暗蒙层可保证可读性" />
            </el-form-item>

            <el-form-item v-if="cfg.overlay" label="蒙层浓度">
              <NumSliderRow
                :model-value="cfg.overlay_opacity"
                :min="0"
                :max="1"
                :step="0.05"
                :fallback="0.45"
                @update:model-value="(v: number) => patch({ overlay_opacity: v })"
              />
            </el-form-item>

            <el-form-item label="标题字号">
              <NumSliderRow
                :model-value="cfg.title_size"
                :min="10"
                :max="28"
                :step="1"
                @update:model-value="(v: number) => patch({ title_size: v })"
              />
            </el-form-item>

            <el-form-item label="标题对齐">
              <BuilderSegmented
                :model-value="cfg.title_align"
                block
                :options="TEXT_ALIGN_OPTIONS"
                @update:model-value="(v) => patch({ title_align: v as BannerTextAlign })"
              />
            </el-form-item>

            <el-form-item label="标题颜色">
              <ColorPickerField
                :model-value="cfg.title_color"
                label=""
                default-value="#ffffff"
                @update:model-value="(v: string) => patch({ title_color: v })"
              />
            </el-form-item>

            <el-form-item label="描述字号">
              <NumSliderRow
                :model-value="cfg.desc_size"
                :min="9"
                :max="20"
                :step="1"
                @update:model-value="(v: number) => patch({ desc_size: v })"
              />
            </el-form-item>

            <el-form-item label="描述颜色">
              <ColorPickerField
                :model-value="cfg.desc_color"
                label=""
                @update:model-value="(v: string) => patch({ desc_color: v })"
              />
            </el-form-item>

            <el-form-item label="全局气泡">
              <el-input
                :model-value="cfg.action_label"
                size="small"
                placeholder="如 查看详情（留空不显示）"
                @update:model-value="(v: string) => patch({ action_label: v })"
              />
            </el-form-item>
          </el-form>
        </div>
      </el-tab-pane>
    </el-tabs>

    <AssetPickerDialog v-model="assetPickerVisible" @select="onPickAsset" />
    <BannerLinkDialog
      v-model="linkDialogVisible"
      :link-type="linkDraft.link_type"
      :link-url="linkDraft.link_url"
      @confirm="onLinkConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import draggable from 'vuedraggable'
import { Delete, CopyDocument, Rank, ArrowUp, ArrowDown, Picture } from '@element-plus/icons-vue'
import BuilderSegmented from '../BuilderSegmented.vue'
import GridSegmented from '../GridSegmented.vue'
import FieldHint from '../FieldHint.vue'
import ColorPickerField from '../ColorPickerField.vue'
import NumSliderRow from './NumSliderRow.vue'
import BannerLinkDialog from '../banner/BannerLinkDialog.vue'
import AssetPickerDialog from '@/components/AssetPickerDialog.vue'
import { useImageUpload } from '../composables/useImageUpload'
import {
  BANNER_ASPECT_OPTIONS,
  BANNER_OBJECT_FIT_OPTIONS,
  BANNER_CUSTOM_HEIGHT,
  BANNER_INDICATOR_OPTIONS,
  BANNER_INDICATOR_POS_OPTIONS,
  BANNER_INTERVAL,
  BANNER_LAYOUT_OPTIONS,
  BANNER_PEEK_GUTTER,
  BANNER_PAGE_PADDING,
  BANNER_RADIUS_OPTIONS,
  BANNER_SHADOW_OPTIONS,
  bannerItemId,
  normalizeBannerProps,
  type BannerAspectKey,
  type BannerObjectFit,
  type BannerImageItem,
  type BannerIndicatorPos,
  type BannerIndicatorType,
  type BannerLayoutMode,
  type BannerProps,
  type BannerRadiusKey,
  type BannerShadowKey,
  type BannerTextAlign,
} from '../banner/bannerSchema'

const props = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const INTERVAL = BANNER_INTERVAL
const PADDING = BANNER_PAGE_PADDING
const GUTTER = BANNER_PEEK_GUTTER
const HEIGHT = BANNER_CUSTOM_HEIGHT
const LAYOUT_OPTIONS = BANNER_LAYOUT_OPTIONS
const ASPECT_OPTIONS = BANNER_ASPECT_OPTIONS
const OBJECT_FIT_OPTIONS = BANNER_OBJECT_FIT_OPTIONS
const RADIUS_OPTIONS = BANNER_RADIUS_OPTIONS
const SHADOW_OPTIONS = BANNER_SHADOW_OPTIONS
const INDICATOR_OPTIONS = BANNER_INDICATOR_OPTIONS
const INDICATOR_POS_OPTIONS = BANNER_INDICATOR_POS_OPTIONS
const TEXT_ALIGN_OPTIONS = [
  { value: 'left', label: '左对齐' },
  { value: 'center', label: '居中' },
]

const activeTab = ref<'content' | 'style'>('content')
const expanded = ref(-1)
const brokenMap = ref<Record<string, boolean>>({})
const uploadingIndex = ref(-1)
const assetPickerVisible = ref(false)
const assetPickerIndex = ref(-1)
const linkDialogVisible = ref(false)
const linkIndex = ref(-1)
const linkDraft = ref<{ link_type: string; link_url: string }>({ link_type: 'none', link_url: '' })

const { uploadImage } = useImageUpload()

/** 归一化后的配置：面板展示与写入都以它为准（interval 等非法值在此已被夹紧） */
const cfg = computed<BannerProps>(() => normalizeBannerProps(props.props))
const images = computed<BannerImageItem[]>(() => cfg.value.images)
const visibleCount = computed(() => images.value.filter((i) => i.visible !== false).length)

/**
 * vuedraggable 需要可写数组。这里用 computed 的 getter/setter：
 * setter 收到的是**新数组**（拖拽后重排的完整列表），直接整体回写即可，
 * 不需要逐项 diff，也不会出现「拖到一半就丢配置」。
 */
const listProxy = computed<BannerImageItem[]>({
  get: () => images.value,
  set: (next) => emit('update', { images: next }),
})

/* ---------------- 整体 patch ---------------- */
function patch(partial: Record<string, unknown>) {
  emit('update', { ...partial })
}

/* ---------------- 单项 patch ---------------- */
function patchItem(index: number, partial: Partial<BannerImageItem>) {
  const next = images.value.map((item, i) => (i === index ? { ...item, ...partial } : item))
  patch({ images: next })
}

function addImage() {
  const next: BannerImageItem[] = [
    ...images.value,
    {
      id: bannerItemId(),
      image: '',
      title: `轮播图${images.value.length + 1}`,
      subtitle: '',
      link_type: 'none',
      link_url: '',
      visible: true,
      action_label: '',
    },
  ]
  patch({ images: next })
  expanded.value = images.value.length
}

function removeItem(index: number) {
  patch({ images: images.value.filter((_, i) => i !== index) })
  if (expanded.value === index) expanded.value = -1
  else if (expanded.value > index) expanded.value -= 1
}

function copyItem(index: number) {
  const src = images.value[index]
  const clone: BannerImageItem = { ...src, id: bannerItemId() }
  const next = [...images.value]
  next.splice(index + 1, 0, clone)
  patch({ images: next })
  expanded.value = index + 1
}

function toggleExpand(index: number) {
  expanded.value = expanded.value === index ? -1 : index
}

/* ---------------- 跳转摘要 ---------------- */
const LINK_TYPE_TEXT: Record<string, string> = {
  none: '无跳转',
  content: '内容',
  product: '商品',
  flashsale: '秒杀',
  page: '页面',
  url: 'H5',
  webview: '网页',
  miniapp: '小程序',
  phone: '电话',
}

function linkTypeLabel(type?: string) {
  return LINK_TYPE_TEXT[type || 'none'] || '未配置'
}

function linkSummary(item: BannerImageItem) {
  const url = String(item.link_url || '').trim()
  const type = item.link_type || 'none'
  if (!url || type === 'none') return '不跳转'
  // 只展示末段，避免长路径把整行撑爆
  const tail = url.split('?')[0].split('/').filter(Boolean).pop() || url
  const query = url.includes('?') ? '?…' : ''
  return tail + query
}

/* ---------------- 跳转弹窗 ---------------- */
function openLinkDialog(index: number) {
  linkIndex.value = index
  const item = images.value[index]
  linkDraft.value = { link_type: item?.link_type || 'none', link_url: item?.link_url || '' }
  linkDialogVisible.value = true
}

function onLinkConfirm(payload: { link_type: string; link_url: string }) {
  if (linkIndex.value < 0) return
  patchItem(linkIndex.value, { link_type: payload.link_type, link_url: payload.link_url })
}

/* ---------------- 上传 / 素材库 ---------------- */
function openAssetPicker(index: number) {
  assetPickerIndex.value = index
  assetPickerVisible.value = true
}

function onPickAsset(url: string) {
  const index = assetPickerIndex.value
  if (!url || index < 0) return
  patchItem(index, { image: url })
}

async function uploadToIndex(file: File, index: number) {
  uploadingIndex.value = index
  try {
    await uploadImage(file, {
      maxSizeMB: 5,
      onSuccess: (url: string) => patchItem(index, { image: url }),
    })
  } finally {
    uploadingIndex.value = -1
  }
}

async function onUpload(event: Event, index: number) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  await uploadToIndex(file, index)
  input.value = ''
}

/** 支持直接粘贴剪贴板截图 */
async function onPaste(event: ClipboardEvent, index: number) {
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

function onThumbError(id?: string) {
  if (!id || brokenMap.value[id]) return
  brokenMap.value = { ...brokenMap.value, [id]: true }
}
</script>

<style lang="scss" scoped>
.bnr-props__tabs :deep(.el-tabs__header) {
  margin-bottom: 10px;
}

.bnr-sec {
  margin-bottom: 14px;
}

.bnr-sec__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 8px;
}

.bnr-sec__title {
  font-size: 13px;
  font-weight: 600;
  color: #3f3a35;
}

.bnr-sec__count {
  font-size: 11px;
  color: #a89c8d;
}

/* ---------- 空态 ---------- */
.bnr-blank {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 18px 12px;
  text-align: center;
  background: #faf8f5;
  border: 1px dashed #ddd5c9;
  border-radius: 10px;
}

.bnr-blank__title {
  margin: 0;
  font-size: 13px;
  color: #5c5249;
}

.bnr-blank__hint {
  margin: 3px 0 10px;
  font-size: 11px;
  color: #a89c8d;
}

/* ---------- 卡片列表 ---------- */
.bnr-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bnr-card {
  background: #fff;
  border: 1px solid #e8e2d9;
  border-radius: 9px;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.bnr-card:hover {
  border-color: #d8cfc2;
  box-shadow: 0 1px 3px rgba(42, 31, 23, 0.06);
}

.bnr-card.is-off {
  opacity: 0.58;
}

.bnr-card--ghost {
  opacity: 0.45;
  background: #f3ede4;
}

.bnr-card--dragging {
  box-shadow: 0 6px 18px rgba(42, 31, 23, 0.18);
}

.bnr-card__bar {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 7px 8px;
}

.bnr-card__grip {
  display: grid;
  place-items: center;
  width: 16px;
  height: 24px;
  color: #b3a596;
  cursor: grab;
  background: transparent;
  border: 0;

  &:active {
    cursor: grabbing;
  }
}

.bnr-card__thumb {
  display: grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  overflow: hidden;
  background: #f1ede6;
  border-radius: 7px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.bnr-card__thumb-ph {
  font-size: 13px;
  font-weight: 700;
  color: #b3a596;
}

.bnr-card__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  padding: 0;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.bnr-card__name {
  overflow: hidden;
  font-size: 12px;
  color: #3f3a35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bnr-card__link {
  overflow: hidden;
  font-size: 11px;
  color: #a89c8d;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bnr-card__ico {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  color: #8a7d6f;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 5px;

  &:hover {
    color: var(--el-color-primary, #c08e6e);
    background: #f6f2ec;
  }
}

.bnr-card__ico--danger:hover {
  color: #c0392b;
  background: #fdeeec;
}

/* ---------- 展开区 ---------- */
.bnr-card__body {
  padding: 4px 10px 12px;
  border-top: 1px dashed #efe9e0;
}

.bnr-field {
  margin-top: 10px;
}

.bnr-label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  color: #6b5b4e;
}

/* ---------- 上传器 ---------- */
.bnr-uploader {
  display: flex;
  gap: 8px;
}

.bnr-uploader__preview {
  display: grid;
  place-items: center;
  flex: none;
  width: 56px;
  height: 56px;
  overflow: hidden;
  background: #f1ede6;
  border: 1px solid #e8e2d9;
  border-radius: 8px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.bnr-uploader__ph {
  color: #b3a596;
}

.bnr-uploader__ops {
  flex: 1;
  min-width: 0;
}

.bnr-uploader__btns {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-top: 6px;
}

.bnr-btn {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  font-size: 12px;
  color: #606b75;
  cursor: pointer;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 6px;

  &:hover {
    color: var(--el-color-primary, #c08e6e);
    border-color: var(--el-color-primary, #c08e6e);
  }
}

/* ---------- 跳转触发器 ---------- */
.bnr-link {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
  padding: 6px 8px;
  text-align: left;
  cursor: pointer;
  background: #faf8f5;
  border: 1px solid #e8e2d9;
  border-radius: 7px;
}

.bnr-link:hover {
  border-color: var(--el-color-primary, #c08e6e);
}

.bnr-link__tag {
  flex: none;
  padding: 1px 7px;
  font-size: 11px;
  color: var(--el-color-primary, #c08e6e);
  background: #fff;
  border-radius: 6px;
}

.bnr-link__text {
  flex: 1;
  overflow: hidden;
  font-size: 12px;
  color: #6b5b4e;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bnr-link__act {
  flex: none;
  font-size: 11px;
  color: #a89c8d;
}

/* ---------- 间隔时间 ---------- */
.bnr-interval {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
}

.bnr-interval__bar {
  flex: 1;
  min-width: 0;
  padding-right: 4px;
}

.bnr-interval__num {
  width: 62px;
  flex: none;
}

.bnr-interval__unit {
  flex: none;
  font-size: 11px;
  color: #94a3b8;
}

:deep(.bnr-interval__num .el-input__inner) {
  padding-right: 4px;
  padding-left: 8px;
  text-align: right;
}

/* ---------- 形态卡片 ---------- */
.bnr-modes {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.bnr-mode-card {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  text-align: left;
  cursor: pointer;
  background: #fff;
  border: 1px solid #e8e2d9;
  border-radius: 8px;

  &:hover {
    border-color: #d8cfc2;
  }

  &.is-on {
    background: #fdf6f1;
    border-color: var(--el-color-primary, #c08e6e);
  }
}

.bnr-mode-card__label {
  font-size: 12px;
  font-weight: 600;
  color: #3f3a35;
}

.bnr-mode-card__desc {
  font-size: 11px;
  color: #a89c8d;
}

.bnr-add {
  margin-top: 6px;
}
</style>
