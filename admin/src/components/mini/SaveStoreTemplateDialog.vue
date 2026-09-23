<template>
  <el-dialog
    v-model="visible"
    title="存为整店模板"
    width="480px"
    destroy-on-close
    @closed="onClosed"
  >
    <el-form label-position="top" class="save-tpl-form">
      <el-form-item label="名称" required>
        <el-input v-model="form.name" maxlength="32" show-word-limit placeholder="模板名称" />
      </el-form-item>
      <el-form-item label="场景" required>
        <div class="scene-radios">
          <label v-for="s in sceneOptions" :key="s.key" class="scene-radio">
            <input v-model="form.scene" type="radio" :value="s.key" />
            {{ s.label }}
          </label>
        </div>
      </el-form-item>
      <el-form-item label="说明">
        <el-input v-model="form.description" type="textarea" :rows="3" maxlength="200" show-word-limit />
      </el-form-item>
      <el-form-item label="封面">
        <div class="cover-row">
          <img v-if="form.coverUrl" class="cover-thumb" :src="form.coverUrl" alt="" />
          <div v-else class="cover-thumb cover-thumb--empty">自动使用首页截图</div>
          <el-input v-model="form.coverUrl" placeholder="封面图片 URL（可选）" clearable />
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { TEMPLATE_SCENE_CHIPS, type TemplateSceneKey } from '@/constants/templateScenes'

const props = defineProps<{
  modelValue: boolean
  defaultName?: string
  defaultCoverUrl?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  submit: [payload: { templateName: string; scene: string; description?: string; coverUrl?: string }]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const sceneOptions = TEMPLATE_SCENE_CHIPS.filter((s) => s.key !== 'all')

const form = reactive({
  name: '',
  scene: 'content' as Exclude<TemplateSceneKey, 'all'>,
  description: '',
  coverUrl: '',
})

const submitting = ref(false)

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    form.name = props.defaultName || ''
    form.scene = 'content'
    form.description = ''
    form.coverUrl = props.defaultCoverUrl || ''
  },
)

function onClosed() {
  submitting.value = false
}

async function submit() {
  const templateName = form.name.trim()
  if (!templateName) return
  submitting.value = true
  emit('submit', {
    templateName,
    scene: form.scene,
    description: form.description.trim() || undefined,
    coverUrl: form.coverUrl.trim() || undefined,
  })
}

defineExpose({ setSubmitting(v: boolean) { submitting.value = v } })
</script>

<style scoped lang="scss">
.scene-radios {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
}
.scene-radio {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  cursor: pointer;
}
.cover-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
.cover-thumb {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  object-position: center top;
  border-radius: 8px;
  border: 1px solid var(--line, #e8dfd3);
  background: #f3ebe1;
  &--empty {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: var(--mute, #6b5b4e);
  }
}
</style>
