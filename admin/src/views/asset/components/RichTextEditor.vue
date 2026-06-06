<template>
  <el-dialog
    v-model="visibleProxy"
    :title="isEdit ? '编辑图文素材' : '新建图文素材'"
    width="min(90vw, 800px)"
    :close-on-click-modal="false"
    destroy-on-close
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px" size="default">
      <el-form-item label="标题" prop="name">
        <el-input v-model="form.name" placeholder="请输入图文标题" maxlength="60" show-word-limit />
      </el-form-item>
      <el-form-item label="作者">
        <el-input v-model="form.author" placeholder="请输入作者名称" maxlength="20" />
      </el-form-item>
      <el-form-item label="封面图">
        <div class="cover-upload">
          <div v-if="coverPreviewUrl" class="cover-preview">
            <img :src="coverPreviewUrl" alt="封面预览" />
            <el-button class="cover-remove" type="danger" circle size="small" :icon="Close" @click="removeCover" />
          </div>
          <el-upload
            v-else
            :show-file-list="false"
            :before-upload="beforeCoverUpload"
            :http-request="handleCoverUpload"
            accept="image/*"
          >
            <div class="cover-placeholder">
              <el-icon :size="28"><Plus /></el-icon>
              <span>上传封面图</span>
            </div>
          </el-upload>
        </div>
      </el-form-item>
      <el-form-item label="摘要">
        <el-input
          v-model="form.summary"
          type="textarea"
          :rows="3"
          placeholder="请输入图文摘要（选填）"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>
      <el-form-item label="图文内容" prop="content">
        <div class="richtext-editor">
          <div class="editor-toolbar">
            <button
              v-for="cmd in toolbarCommands"
              :key="cmd.command"
              class="toolbar-btn"
              :class="{ active: activeCommand === cmd.command }"
              :title="cmd.label"
              @click="execCommand(cmd.command, cmd.value)"
            >
              {{ cmd.icon }}
            </button>
          </div>
          <div
            ref="editorRef"
            class="editor-body"
            contenteditable="true"
            @input="onEditorInput"
            @paste="onEditorPaste"
          ></div>
        </div>
      </el-form-item>
      <el-form-item label="所属分组">
        <el-select v-model="form.groupId" placeholder="选择分组（可选）" clearable style="width: 100%">
          <el-option v-for="g in groups" :key="g.id" :label="g.name" :value="g.id" />
        </el-select>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visibleProxy = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSubmit">
        {{ isEdit ? '保存' : '创建' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, nextTick, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { Close, Plus } from '@element-plus/icons-vue'
import { createMaterial, updateMaterial } from '@/api/asset'
import { uploadFile } from '@/api/system'
import { MaterialType, type MaterialGroup, type MaterialRecord } from '@/types/asset'

const props = defineProps<{
  visible: boolean
  editRecord: MaterialRecord | null
  groups: MaterialGroup[]
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  saved: []
}>()

const visibleProxy = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
})

const isEdit = computed(() => !!props.editRecord)

const formRef = ref<FormInstance>()
const editorRef = ref<HTMLDivElement>()
const saving = ref(false)
const activeCommand = ref('')

const form = ref({
  name: '',
  author: '',
  summary: '',
  content: '',
  groupId: null as number | null,
})

const coverFile = ref<File | null>(null)
const coverPreviewUrl = ref('')
const uploadedCoverUrl = ref('')

const rules: FormRules = {
  name: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入图文内容', trigger: 'blur' }],
}

const toolbarCommands = [
  { command: 'bold', icon: 'B', label: '加粗' },
  { command: 'italic', icon: 'I', label: '斜体' },
  { command: 'underline', icon: 'U', label: '下划线' },
  { command: 'separator', label: '' },
  { command: 'formatBlock', value: 'h2', icon: 'H2', label: '标题' },
  { command: 'formatBlock', value: 'h3', icon: 'H3', label: '副标题' },
  { command: 'formatBlock', value: 'p', icon: 'P', label: '正文' },
  { command: 'separator', label: '' },
  { command: 'insertUnorderedList', icon: '☰', label: '无序列表' },
  { command: 'insertOrderedList', icon: '1.', label: '有序列表' },
  { command: 'separator', label: '' },
  { command: 'justifyLeft', icon: '≡', label: '左对齐' },
  { command: 'justifyCenter', icon: '≡', label: '居中' },
  { command: 'justifyRight', icon: '≡', label: '右对齐' },
]

watch(
  () => props.visible,
  (val) => {
    if (val) {
      if (props.editRecord) {
        form.value.name = props.editRecord.name || ''
        form.value.author = props.editRecord.richTextContent?.author || ''
        form.value.summary = props.editRecord.richTextContent?.summary || ''
        form.value.content = props.editRecord.richTextContent?.html || props.editRecord.richTextContent?.text || ''
        form.value.groupId = props.editRecord.groupId ?? null
        uploadedCoverUrl.value = props.editRecord.richTextContent?.coverUrl || ''
        coverPreviewUrl.value = uploadedCoverUrl.value ? resolveUrl(uploadedCoverUrl.value) : ''
        nextTick(() => {
          if (editorRef.value) {
            editorRef.value.innerHTML = form.value.content
          }
        })
      } else {
        resetForm()
        nextTick(() => {
          if (editorRef.value) editorRef.value.innerHTML = ''
        })
      }
    }
  },
)

function resetForm() {
  form.value = { name: '', author: '', summary: '', content: '', groupId: null }
  coverFile.value = null
  coverPreviewUrl.value = ''
  uploadedCoverUrl.value = ''
}

function resolveUrl(url: string) {
  if (!url) return ''
  if (/^(https?:\/\/|data:)/i.test(url)) return url
  if (url.startsWith('/')) return `${window.location.origin}${url}`
  return `${window.location.origin}/${url}`
}

function execCommand(command: string, value?: string) {
  document.execCommand(command, false, value)
  editorRef.value?.focus()
  updateActiveCommand()
}

function onEditorInput() {
  if (editorRef.value) {
    form.value.content = editorRef.value.innerHTML
  }
  updateActiveCommand()
}

function onEditorPaste(e: ClipboardEvent) {
  e.preventDefault()
  const text = e.clipboardData?.getData('text/plain') || ''
  document.execCommand('insertText', false, text)
}

function updateActiveCommand() {
  const commands = ['bold', 'italic', 'underline', 'justifyLeft', 'justifyCenter', 'justifyRight']
  for (const cmd of commands) {
    if (document.queryCommandState(cmd)) {
      activeCommand.value = cmd
      return
    }
  }
  activeCommand.value = ''
}

function beforeCoverUpload(file: File) {
  if (!file.type.startsWith('image/')) {
    ElMessage.error('封面图仅支持图片格式')
    return false
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('封面图不能超过 5MB')
    return false
  }
  return true
}

async function handleCoverUpload(options: any) {
  try {
    const res: any = await uploadFile(options.file)
    const url = res.data?.url || ''
    if (!url) throw new Error('上传失败')
    uploadedCoverUrl.value = url
    coverPreviewUrl.value = resolveUrl(url)
    ElMessage.success('封面上传成功')
    options.onSuccess?.(res)
  } catch {
    options.onError?.(new Error('上传失败'))
  }
}

function removeCover() {
  coverFile.value = null
  coverPreviewUrl.value = ''
  uploadedCoverUrl.value = ''
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    const richTextContent = {
      html: form.value.content,
      text: editorRef.value?.innerText || '',
      coverUrl: uploadedCoverUrl.value || undefined,
      summary: form.value.summary || undefined,
      author: form.value.author || undefined,
    }

    if (isEdit.value && props.editRecord) {
      await updateMaterial(props.editRecord.id, {
        name: form.value.name.trim(),
        groupId: form.value.groupId,
        richTextContent,
      })
      ElMessage.success('图文素材已更新')
    } else {
      await createMaterial({
        name: form.value.name.trim(),
        type: MaterialType.RichText,
        url: uploadedCoverUrl.value || '',
        thumbUrl: uploadedCoverUrl.value || undefined,
        groupId: form.value.groupId,
        richTextContent,
        description: form.value.summary || undefined,
      })
      ElMessage.success('图文素材已创建')
    }

    visibleProxy.value = false
    emit('saved')
  } catch {
    /* ignore */
  } finally {
    saving.value = false
  }
}
</script>

<style lang="scss" scoped>
.cover-upload {
  width: 100%;
}

.cover-preview {
  position: relative;
  width: 200px;
  border-radius: 8px;
  overflow: hidden;

  img {
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
    display: block;
  }
}

.cover-remove {
  position: absolute;
  top: 4px;
  right: 4px;
}

.cover-placeholder {
  width: 200px;
  aspect-ratio: 16 / 9;
  border: 2px dashed #d9dde3;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  color: #999;
  font-size: 13px;
  transition: border-color 0.2s;

  &:hover {
    border-color: #2469f0;
    color: #2469f0;
  }
}

.richtext-editor {
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  overflow: hidden;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 8px 12px;
  border-bottom: 1px solid #edf0f5;
  background: #f8f9fb;
  flex-wrap: wrap;
}

.toolbar-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: #555;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: #e8ecf1;
  }

  &.active {
    background: #e6f0ff;
    color: #2469f0;
  }
}

.editor-body {
  min-height: 240px;
  max-height: 400px;
  overflow-y: auto;
  padding: 16px;
  outline: none;
  font-size: 14px;
  line-height: 1.8;
  color: #333;

  &:empty::before {
    content: '请输入图文内容...';
    color: #c0c4cc;
  }

  :deep(h2) {
    font-size: 20px;
    font-weight: 700;
    margin: 16px 0 8px;
    color: #111;
  }

  :deep(h3) {
    font-size: 16px;
    font-weight: 600;
    margin: 12px 0 6px;
    color: #222;
  }

  :deep(ul),
  :deep(ol) {
    padding-left: 24px;
    margin: 8px 0;
  }

  :deep(li) {
    margin: 4px 0;
  }
}
</style>
