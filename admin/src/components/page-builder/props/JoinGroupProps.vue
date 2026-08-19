<template>
  <div class="join-group-props">
    <el-form label-width="78px" size="small">
      <el-divider content-position="left">入口卡片</el-divider>
      <el-form-item label="入口头像">
        <div class="img-field">
          <div v-if="avatarPreview" class="img-preview">
            <img :src="avatarPreview" alt="" />
            <el-button text type="danger" size="small" @click="emit('update', { avatar: '' })">移除</el-button>
          </div>
          <el-input
            :model-value="data.avatar || ''"
            placeholder="头像图片 URL"
            @input="(v: string) => emit('update', { avatar: v })"
          />
          <label class="upload-btn">
            本地上传
            <input type="file" accept="image/*" hidden @change="onUploadAvatar" />
          </label>
        </div>
      </el-form-item>
      <el-form-item label="入口标题">
        <el-input
          :model-value="data.title || ''"
          maxlength="30"
          show-word-limit
          placeholder="跨境电商交流群"
          @input="(v: string) => emit('update', { title: v })"
        />
      </el-form-item>
      <el-form-item label="标签">
        <div class="tag-list">
          <div v-for="(tag, i) in tags" :key="i" class="tag-row">
            <el-input
              :model-value="tag"
              maxlength="12"
              placeholder="标签文案"
              @input="(v: string) => updateTag(i, v)"
            />
            <el-button text type="danger" size="small" @click="removeTag(i)">删</el-button>
          </div>
          <el-button type="primary" text size="small" @click="addTag">+ 添加标签</el-button>
        </div>
      </el-form-item>
      <el-form-item label="按钮文案">
        <el-input
          :model-value="data.button_text || '加入群聊'"
          maxlength="10"
          @input="(v: string) => emit('update', { button_text: v })"
        />
      </el-form-item>
      <el-form-item label="弹层标题">
        <el-input
          :model-value="data.sheet_title || '加入群聊'"
          maxlength="16"
          @input="(v: string) => emit('update', { sheet_title: v })"
        />
      </el-form-item>
      <el-form-item label="二维码提示">
        <el-input
          :model-value="data.tip_text || '长按二维码可识别加群'"
          maxlength="40"
          @input="(v: string) => emit('update', { tip_text: v })"
        />
      </el-form-item>

      <el-divider content-position="left">群列表</el-divider>
      <div v-for="(group, i) in groups" :key="group.id || i" class="group-card">
        <div class="group-card__head">
          <span>群 {{ i + 1 }}</span>
          <el-button text type="danger" size="small" @click="removeGroup(i)">删除</el-button>
        </div>
        <el-form-item label="群名称">
          <el-input
            :model-value="group.name || ''"
            maxlength="24"
            placeholder="群名称"
            @input="(v: string) => updateGroup(i, { name: v })"
          />
        </el-form-item>
        <el-form-item label="群图标">
          <div class="img-field">
            <div v-if="normalizeUrl(group.icon)" class="img-preview img-preview--sm">
              <img :src="normalizeUrl(group.icon)" alt="" />
            </div>
            <el-input
              :model-value="group.icon || ''"
              placeholder="可选，列表左侧图标"
              @input="(v: string) => updateGroup(i, { icon: v })"
            />
            <label class="upload-btn">
              上传
              <input type="file" accept="image/*" hidden @change="(e) => onUploadGroupIcon(i, e)" />
            </label>
          </div>
        </el-form-item>
        <el-form-item label="二维码">
          <div class="img-field">
            <div v-if="normalizeUrl(group.qrcode)" class="img-preview">
              <img :src="normalizeUrl(group.qrcode)" alt="" />
              <el-button text type="danger" size="small" @click="updateGroup(i, { qrcode: '' })">移除</el-button>
            </div>
            <el-input
              :model-value="group.qrcode || ''"
              placeholder="群二维码图片 URL"
              @input="(v: string) => updateGroup(i, { qrcode: v })"
            />
            <label class="upload-btn">
              本地上传
              <input type="file" accept="image/*" hidden @change="(e) => onUploadQrcode(i, e)" />
            </label>
          </div>
        </el-form-item>
      </div>
      <el-button type="primary" text size="small" @click="addGroup">+ 添加群</el-button>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { normalizeUploadUrl } from '@/api/system'
import { useImageUpload } from '../composables/useImageUpload'

type GroupItem = { id: string; name: string; icon?: string; qrcode?: string }

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()
const { uploadImage } = useImageUpload()

const avatarPreview = computed(() => normalizeUploadUrl(String(data.avatar || '')))
const tags = computed(() => (Array.isArray(data.tags) ? data.tags.map((t: any) => String(t || '')) : []))
const groups = computed<GroupItem[]>(() => {
  const list = Array.isArray(data.groups) ? data.groups : []
  return list.map((g: any, i: number) => ({
    id: String(g.id || `g_${i + 1}`),
    name: String(g.name || ''),
    icon: String(g.icon || ''),
    qrcode: String(g.qrcode || ''),
  }))
})

function normalizeUrl(url?: string) {
  return normalizeUploadUrl(String(url || ''))
}

function uid() {
  return `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

function updateTag(index: number, value: string) {
  const next = [...tags.value]
  next[index] = value
  emit('update', { tags: next })
}

function addTag() {
  emit('update', { tags: [...tags.value, ''] })
}

function removeTag(index: number) {
  emit('update', { tags: tags.value.filter((_, i) => i !== index) })
}

function updateGroup(index: number, patch: Partial<GroupItem>) {
  const next = groups.value.map((g, i) => (i === index ? { ...g, ...patch } : g))
  emit('update', { groups: next })
}

function addGroup() {
  emit('update', {
    groups: [...groups.value, { id: uid(), name: '新群聊', icon: '', qrcode: '' }],
  })
}

function removeGroup(index: number) {
  emit('update', { groups: groups.value.filter((_, i) => i !== index) })
}

async function onUploadAvatar(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  await uploadImage(file, {
    maxSizeMB: 5,
    onSuccess: (url: string) => emit('update', { avatar: url }),
  })
}

async function onUploadGroupIcon(index: number, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  await uploadImage(file, {
    maxSizeMB: 5,
    onSuccess: (url: string) => updateGroup(index, { icon: url }),
  })
}

async function onUploadQrcode(index: number, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  await uploadImage(file, {
    maxSizeMB: 5,
    onSuccess: (url: string) => updateGroup(index, { qrcode: url }),
  })
}
</script>

<style scoped lang="scss">
.field-divider { margin: 8px 0 12px; }
.tag-list { display: flex; flex-direction: column; gap: 6px; width: 100%; }
.tag-row { display: flex; gap: 4px; align-items: center; }
.group-card {
  margin-bottom: 10px;
  padding: 8px 8px 2px;
  background: #f8fafc;
  border: 1px solid #e3e8f0;
  border-radius: 10px;
}
.group-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  color: #334155;
  font-size: 12px;
  font-weight: 600;
}
.img-field { display: flex; flex-direction: column; gap: 6px; width: 100%; }
.img-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  img { width: 56px; height: 56px; object-fit: cover; border-radius: 0; border: 1px solid #e3e8f0; }
}
.img-preview--sm img { width: 36px; height: 36px; }
.upload-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  height: 28px;
  padding: 0 10px;
  font-size: 12px;
  color: #1769ff;
  background: #fff;
  border: 1px solid #c9d8ff;
  border-radius: 6px;
  cursor: pointer;
}
.hint {
  margin-top: 4px;
  color: #909399;
  font-size: 12px;
}
</style>
