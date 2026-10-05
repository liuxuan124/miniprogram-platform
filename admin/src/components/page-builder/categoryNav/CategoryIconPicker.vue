<template>
  <el-dialog
    v-model="visible"
    title="选择分类图标"
    width="720px"
    destroy-on-close
    append-to-body
    class="icon-picker-dialog"
  >
    <el-tabs v-model="activeTab" class="icon-picker__tabs">
      <!-- ---------- 内置图标库 ---------- -->
      <el-tab-pane name="builtin">
        <template #label>
          <span class="icon-picker__tab">内置图标库</span>
        </template>

        <div class="icon-picker__bar">
          <el-input
            v-model="keyword"
            size="small"
            clearable
            placeholder="搜索图标名称（如「礼包」「火箭」）"
            :prefix-icon="Search"
            @input="resetPage"
          />
          <span class="icon-picker__count">{{ filteredIcons.length }} 个 / 共 {{ icons.length }} 个</span>
        </div>

        <div class="icon-picker__grid">
          <button
            v-for="ic in pagedIcons"
            :key="ic.id"
            type="button"
            class="icon-picker__cell"
            :class="{ 'is-on': modelValue === ic.src }"
            :title="ic.label"
            @click="pick(ic.src)"
          >
            <img :src="ic.src" :alt="ic.label" loading="lazy" />
            <span class="icon-picker__cell-label">{{ ic.label }}</span>
          </button>

          <div v-if="filteredIcons.length === 0" class="icon-picker__blank">
            没有匹配的图标，换个词试试
          </div>
        </div>

        <div v-if="filteredIcons.length > PAGE_SIZE" class="icon-picker__pager">
          <el-button size="small" :disabled="page <= 1" @click="page -= 1">上一页</el-button>
          <span class="icon-picker__page">{{ page }} / {{ totalPage }}</span>
          <el-button size="small" :disabled="page >= totalPage" @click="page += 1">下一页</el-button>
        </div>
      </el-tab-pane>

      <!-- ---------- 媒体库 ---------- -->
      <el-tab-pane name="asset">
        <template #label>
          <span class="icon-picker__tab">系统媒体库</span>
        </template>
        <div class="icon-picker__placeholder">
          <p>从已上传的素材库里挑一个当分类图标。</p>
          <AssetPickerDialog v-model="assetVisible" media-type="image" @select="onAssetPick" />
          <el-button type="primary" size="small" @click="assetVisible = true">打开媒体库</el-button>
        </div>
      </el-tab-pane>

      <!-- ---------- 本地上传 ---------- -->
      <el-tab-pane name="upload">
        <template #label>
          <span class="icon-picker__tab">本地上传</span>
        </template>
        <div class="icon-picker__placeholder">
          <p>上传后自动裁成方形，适合做分类图标（建议 1:1、大于 120px）。</p>
          <label class="icon-picker__upload">
            {{ uploading ? '上传中…' : '选择图片文件' }}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              style="display: none"
              :disabled="uploading"
              @change="onPickFile"
            />
          </label>
          <div v-if="uploading" class="icon-picker__bar-track">
            <div class="icon-picker__bar-fill"></div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- ---------- 底部：当前选择 + 清除 ---------- -->
    <template #footer>
      <div class="icon-picker__foot">
        <div class="icon-picker__current">
          <span class="icon-picker__current-label">当前图标</span>
          <span class="icon-picker__current-thumb">
            <img v-if="isImageIcon(modelValue)" :src="modelValue" alt="" />
            <span v-else>{{ modelValue || '—' }}</span>
          </span>
          <span class="icon-picker__current-text">{{ modelValue || '未选择（画布会显示占位图钉）' }}</span>
        </div>
        <div class="icon-picker__foot-ops">
          <el-button size="small" @click="visible = false">取消</el-button>
          <el-button v-if="modelValue" size="small" type="danger" plain @click="clear">清除图标</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import AssetPickerDialog from '@/components/AssetPickerDialog.vue'
import { useImageUpload } from '../composables/useImageUpload'
import { NAV_FLAT_ICONS } from '../navIconSet'
import { isImageIcon } from './categoryNavSchema'

/**
 * 分类图标选择器（三选一：内置 SVG 库 / 系统媒体库 / 本地上传）。
 *
 * 解决旧面板的病根：原来只有一个 el-popover 塞 4×N 个内置图标，
 * 旁边**还挂一个路径文本框让运营手打 URL** —— 手打路径是404 的主要来源
 * （写错一个字、真机就白块），运营基本不用，于是图标长期停在默认图。
 * 现在三条路都在同一个弹窗里，**全程不需要手打任何路径**。
 */
const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const visible = ref(false)
const activeTab = ref('builtin')
const keyword = ref('')
const page = ref(1)
const assetVisible = ref(false)
const uploading = ref(false)

const PAGE_SIZE = 40
const icons = NAV_FLAT_ICONS

const filteredIcons = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return icons
  return icons.filter((ic) => ic.label.toLowerCase().includes(kw) || ic.id.toLowerCase().includes(kw))
})

const totalPage = computed(() => Math.max(1, Math.ceil(filteredIcons.value.length / PAGE_SIZE)))

const pagedIcons = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return filteredIcons.value.slice(start, start + PAGE_SIZE)
})

function resetPage() {
  page.value = 1
}

function pick(src: string) {
  emit('update:modelValue', src)
  visible.value = false
}

function clear() {
  emit('update:modelValue', '')
  visible.value = false
}

function onAssetPick(url: string) {
  if (!url) return
  emit('update:modelValue', url)
  assetVisible.value = false
  visible.value = false
}

const { uploadImage } = useImageUpload()

async function onPickFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploading.value = true
  try {
    const url = await uploadImage(file, {
      maxSizeMB: 3,
      accept: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
      onSuccess: (u: string) => {
        emit('update:modelValue', u)
        visible.value = false
      },
    })
    if (!url) ElMessage.warning('上传未成功，请重试')
  } finally {
    uploading.value = false
    input.value = ''
  }
}

// 外部把 modelValue 清空时，若弹窗正开着要同步清掉「当前图标」展示
watch(() => props.modelValue, () => {
  if (!visible.value) return
})

/** 供父组件打开 */
function open() {
  visible.value = true
}

defineExpose({ open })
</script>

<style lang="scss" scoped>
.icon-picker__tabs :deep(.el-tabs__header) {
  margin-bottom: 12px;
}

.icon-picker__tab {
  font-size: 13px;
}

.icon-picker__bar {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}

.icon-picker__bar :deep(.el-input) {
  max-width: 260px;
}

.icon-picker__count {
  font-size: 11.5px;
  color: #a89c8d;
}

.icon-picker__grid {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 8px;
  max-height: 340px;
  overflow-y: auto;
  padding-right: 2px;
}

.icon-picker__cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
  align-items: center;
  padding: 7px 3px 5px;
  cursor: pointer;
  background: #faf8f5;
  border: 1px solid #eee7dd;
  border-radius: 8px;

  img {
    width: 26px;
    height: 26px;
    object-fit: contain;
  }

  &:hover {
    background: #f5efe8;
    border-color: #ded2c2;
  }

  &.is-on {
    background: #fdf6f1;
    border-color: var(--el-color-primary, #c08e6e);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--el-color-primary, #c08e6e) 18%, transparent);
  }
}

.icon-picker__cell-label {
  max-width: 100%;
  overflow: hidden;
  font-size: 10.5px;
  color: #8a7d6f;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.icon-picker__blank {
  grid-column: 1 / -1;
  padding: 28px 0;
  font-size: 12.5px;
  color: #b3a596;
  text-align: center;
}

.icon-picker__pager {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: center;
  margin-top: 12px;
}

.icon-picker__page {
  font-size: 12px;
  color: #8a7d6f;
  font-variant-numeric: tabular-nums;
}

.icon-picker__placeholder {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-start;
  min-height: 200px;
  padding: 12px 2px;

  p {
    margin: 0;
    font-size: 12.5px;
    color: #8a7d6f;
  }
}

.icon-picker__upload {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 14px;
  font-size: 12.5px;
  color: var(--el-color-primary, #c08e6e);
  cursor: pointer;
  background: #fdf6f1;
  border: 1px solid color-mix(in srgb, var(--el-color-primary, #c08e6e) 40%, #fff);
  border-radius: 7px;

  &:hover {
    background: #fbeee4;
  }
}

.icon-picker__bar-track {
  width: 220px;
  height: 3px;
  overflow: hidden;
  background: #f0e9e0;
  border-radius: 999px;
}

.icon-picker__bar-fill {
  width: 40%;
  height: 100%;
  background: var(--el-color-primary, #c08e6e);
  border-radius: 999px;
  animation: icon-picker-slide 1.1s ease-in-out infinite;
}

@keyframes icon-picker-slide {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(250%); }
}

.icon-picker__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.icon-picker__current {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.icon-picker__current-label {
  flex: none;
  font-size: 12px;
  color: #8a7d6f;
}

.icon-picker__current-thumb {
  display: grid;
  place-items: center;
  flex: none;
  width: 30px;
  height: 30px;
  overflow: hidden;
  font-size: 15px;
  background: #f1ede6;
  border: 1px solid #e8e2d9;
  border-radius: 7px;

  img {
    width: 22px;
    height: 22px;
    object-fit: contain;
  }
}

.icon-picker__current-text {
  max-width: 260px;
  overflow: hidden;
  font-size: 11.5px;
  color: #a89c8d;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.icon-picker__foot-ops {
  display: flex;
  gap: 8px;
  flex: none;
}
</style>
