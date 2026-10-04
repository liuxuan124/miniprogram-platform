<template>
  <el-dialog
    :model-value="modelValue"
    title="另存为我的区块"
    width="480px"
    :close-on-click-modal="false"
    @update:model-value="(v: boolean) => !v && close()"
  >
    <el-form label-width="72px" label-position="left">
      <el-form-item label="区块名称" required>
        <el-input
          v-model="name"
          maxlength="20"
          show-word-limit
          placeholder="给这个组合起个名字，如「出海信任背书区」"
          @input="onNameInput"
        />
      </el-form-item>

      <el-form-item label="归属分类">
        <el-select v-model="category" style="width: 100%">
          <el-option
            v-for="c in BLOCK_CATEGORIES"
            :key="c.value"
            :label="c.label"
            :value="c.value"
          >
            <span>{{ c.label }}</span>
            <span class="opt-hint">{{ c.hint }}</span>
          </el-option>
        </el-select>
      </el-form-item>

      <el-form-item label="区块描述">
        <el-input
          v-model="description"
          maxlength="40"
          show-word-limit
          placeholder="选填：说明这个区块的用途，方便其他同事复用"
        />
      </el-form-item>

      <el-form-item label="封面">
        <div class="cover-row">
          <div class="cover-preview">
            <img v-if="thumbnail" :src="thumbnail" alt="区块封面" />
            <div v-else class="cover-empty">封面生成中…</div>
          </div>
          <div class="cover-ops">
            <el-button size="small" :disabled="!name.trim()" @click="regenerate">重新生成</el-button>
            <el-button size="small" @click="pickImage">替换图片</el-button>
            <p class="cover-tip">
              自动按组件结构生成骨架封面；点「替换图片」可粘贴图片地址。
            </p>
          </div>
        </div>
      </el-form-item>

      <el-form-item label="包含组件">
        <span class="node-count">{{ nodeCount }} 个组件 · 拖入画布后可继续逐个编辑</span>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :disabled="!canSave" @click="submit">保存区块</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { ComponentInstance } from '@/types/page'
import {
  BLOCK_CATEGORIES,
  countInstanceNodes,
  type BlockCategory,
} from './blockTemplates'
import { renderBlockCover } from './blockCover'

const props = defineProps<{
  modelValue: boolean
  /** 被保存的组件树（容器 + 其所有子组件） */
  nodes: ComponentInstance[]
  /** 默认名称（取容器类型标签） */
  defaultName?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [payload: { name: string; category: BlockCategory; description?: string; thumbnail: string; nodes: ComponentInstance[] }]
}>()

const name = ref('')
const category = ref<BlockCategory>('custom')
const description = ref('')
const thumbnail = ref('')

const nodeCount = computed(() => countInstanceNodes(props.nodes))
const canSave = computed(() => name.value.trim().length > 0 && props.nodes.length > 0)

/** 名称用于封面标题，改名后自动重算封面 */
function regenerate() {
  thumbnail.value = renderBlockCover(props.nodes, { title: name.value.trim() })
}

function onNameInput() {
  if (name.value.trim()) regenerate()
}

function pickImage() {
  const url = window.prompt('粘贴图片地址（https://…）', thumbnail.value.startsWith('http') ? thumbnail.value : '')
  if (url === null) return
  const trimmed = url.trim()
  if (!trimmed) return
  if (!/^https?:\/\//i.test(trimmed)) {
    ElMessage.warning('请填写 http(s) 开头的图片地址')
    return
  }
  thumbnail.value = trimmed
}

function close() {
  emit('update:modelValue', false)
}

function submit() {
  if (!canSave.value) return
  if (!thumbnail.value) regenerate()
  emit('save', {
    name: name.value.trim(),
    category: category.value,
    description: description.value.trim() || undefined,
    thumbnail: thumbnail.value,
    nodes: JSON.parse(JSON.stringify(props.nodes)) as ComponentInstance[],
  })
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    name.value = props.defaultName || ''
    category.value = 'custom'
    description.value = ''
    thumbnail.value = ''
    regenerate()
  },
  { immediate: true },
)
</script>

<style scoped>
.cover-row {
  display: flex;
  gap: 12px;
  width: 100%;
}

.cover-preview {
  flex-shrink: 0;
  width: 132px;
  height: 88px;
  overflow: hidden;
  background: #fbf8f4;
  border: 1px solid var(--wb-line, #e8e0d6);
  border-radius: 8px;
}

.cover-preview img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #b3a595;
  font-size: 12px;
}

.cover-ops {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
}

.cover-tip {
  margin: 0;
  color: #9b8b7c;
  font-size: 11px;
  line-height: 1.5;
}

.node-count {
  color: #7a6a5c;
  font-size: 12px;
}

.opt-hint {
  float: right;
  margin-left: 16px;
  color: #a99c8e;
  font-size: 12px;
}
</style>
