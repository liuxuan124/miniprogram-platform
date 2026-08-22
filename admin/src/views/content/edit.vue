<template>
  <div class="content-edit-page" v-loading="pageLoading">
    <div class="edit-layout">
    <el-card class="editor-card" shadow="never">
      <template #header>
        <div class="card-header">
          <div class="header-title">{{ isEdit ? '编辑内容与 SEO 配置' : '发布新内容' }}</div>
          <div class="header-actions">
            <el-button @click="goBack()">取消</el-button>
            <el-button type="primary" :loading="submitLoading" @click="handleSubmit">提交执行</el-button>
          </div>
        </div>
      </template>

      <el-tabs v-model="activeTab" class="art-tabs">
        <el-tab-pane label="基础内容" name="base">
          <el-form ref="baseFormRef" :model="formData" :rules="baseRules" label-width="90px">
            <el-form-item label="标题" prop="title">
              <el-input v-model="formData.title" maxlength="128" show-word-limit placeholder="请输入标题" />
            </el-form-item>

            <el-form-item label="内容形态">
              <el-radio-group v-model="contentType">
                <el-radio-button value="article">长文</el-radio-button>
                <el-radio-button value="note">笔记</el-radio-button>
                <el-radio-button value="moment">动态</el-radio-button>
              </el-radio-group>
              <div class="field-hint">笔记偏小红书；动态偏知识星球（正文+多图+资料附件，可分享取文件）。</div>
            </el-form-item>

            <template v-if="contentType === 'note'">
              <el-form-item label="笔记图片">
                <div class="note-images">
                  <div v-for="(url, idx) in noteImages" :key="`${url}-${idx}`" class="note-images__item">
                    <img :src="normalizePreviewUrl(url)" alt="" />
                    <div class="note-images__actions">
                      <el-button text size="small" :disabled="idx === 0" @click="moveNoteImage(idx, -1)">前移</el-button>
                      <el-button text size="small" :disabled="idx >= noteImages.length - 1" @click="moveNoteImage(idx, 1)">后移</el-button>
                      <el-button text type="danger" size="small" @click="removeNoteImage(idx)">删除</el-button>
                    </div>
                  </div>
                  <label v-if="noteImages.length < 9" class="note-images__add">
                    {{ noteImageUploading ? '上传中…' : '+ 添加图片' }}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      hidden
                      :disabled="noteImageUploading"
                      @change="onUploadNoteImage"
                    />
                  </label>
                </div>
                <div class="field-hint">最多 9 张，首张自动作为封面。支持拖拽排序（使用前移/后移）。</div>
              </el-form-item>

              <el-form-item label="正文">
                <el-input
                  v-model="noteBody"
                  type="textarea"
                  :rows="8"
                  maxlength="5000"
                  show-word-limit
                  placeholder="输入笔记正文，可使用 #话题 标签"
                />
              </el-form-item>

              <el-form-item label="话题标签">
                <el-input v-model="noteTagsText" placeholder="多个标签用逗号分隔，如：选品,供应链" />
              </el-form-item>

              <el-form-item label="作者">
                <el-input v-model="formData.author" maxlength="64" placeholder="作者昵称" />
              </el-form-item>

              <el-form-item label="作者头像">
                <div class="cover-field">
                  <div v-if="authorAvatarPreview" class="cover-preview">
                    <img :src="authorAvatarPreview" alt="" class="avatar-preview" />
                    <el-button text type="danger" size="small" @click="formData.author_avatar = ''">清除</el-button>
                  </div>
                  <el-input v-model="formData.author_avatar" placeholder="头像 URL（可上传或粘贴）" />
                  <label class="upload-btn">
                    {{ avatarUploading ? '上传中…' : '本地上传' }}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      hidden
                      :disabled="avatarUploading"
                      @change="onUploadAuthorAvatar"
                    />
                  </label>
                </div>
              </el-form-item>

              <el-form-item label="展示数据">
                <div class="stats-row">
                  <el-input-number v-model="formData.like_count" :min="0" controls-position="right" />
                  <span class="stats-label">点赞</span>
                  <el-input-number v-model="formData.favorite_count" :min="0" controls-position="right" />
                  <span class="stats-label">收藏</span>
                </div>
                <div class="field-hint">仅用于卡片/详情页展示，非真实互动数据。</div>
              </el-form-item>
            </template>

            <template v-else-if="contentType === 'moment'">
              <el-form-item label="动态图片">
                <div class="note-images">
                  <div v-for="(url, idx) in noteImages" :key="`${url}-${idx}`" class="note-images__item">
                    <img :src="normalizePreviewUrl(url)" alt="" />
                    <div class="note-images__actions">
                      <el-button text size="small" :disabled="idx === 0" @click="moveNoteImage(idx, -1)">前移</el-button>
                      <el-button text size="small" :disabled="idx >= noteImages.length - 1" @click="moveNoteImage(idx, 1)">后移</el-button>
                      <el-button text type="danger" size="small" @click="removeNoteImage(idx)">删除</el-button>
                    </div>
                  </div>
                  <label v-if="noteImages.length < 9" class="note-images__add">
                    {{ noteImageUploading ? '上传中…' : '+ 添加图片' }}
                    <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" hidden :disabled="noteImageUploading" @change="onUploadNoteImage" />
                  </label>
                </div>
              </el-form-item>

              <el-form-item label="正文">
                <el-input v-model="noteBody" type="textarea" :rows="8" maxlength="5000" show-word-limit placeholder="输入动态正文" />
              </el-form-item>

              <el-form-item label="资料附件">
                <div class="attachment-list">
                  <div v-for="(item, idx) in momentAttachments" :key="item.id" class="attachment-item">
                    <span class="attachment-item__icon">{{ fileTypeIcon(item.fileType) }}</span>
                    <div class="attachment-item__meta">
                      <div class="attachment-item__name">{{ item.name }}</div>
                      <div class="attachment-item__size">{{ formatFileSize(item.size) }}</div>
                    </div>
                    <el-button text type="danger" size="small" @click="removeAttachment(idx)">删除</el-button>
                  </div>
                  <label v-if="momentAttachments.length < 5" class="upload-btn">
                    {{ attachmentUploading ? '上传中…' : '+ 上传资料文件' }}
                    <input type="file" hidden :disabled="attachmentUploading" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv,.zip,.rar" @change="onUploadAttachment" />
                  </label>
                  <el-button v-if="momentAttachments.length < 5" class="upload-btn" @click="filePickerVisible = true">从文件库选择</el-button>
                </div>
                <div class="field-hint">最多 5 个附件。推荐使用文件库以配置阅读/下载权限。</div>
              </el-form-item>

              <FilePickerDialog v-model="filePickerVisible" @select="onPickLibraryFile" />

              <el-form-item label="作者">
                <el-input v-model="formData.author" maxlength="64" placeholder="博主昵称" />
              </el-form-item>

              <el-form-item label="作者头像">
                <div class="cover-field">
                  <div v-if="authorAvatarPreview" class="cover-preview">
                    <img :src="authorAvatarPreview" alt="" class="avatar-preview" />
                    <el-button text type="danger" size="small" @click="formData.author_avatar = ''">清除</el-button>
                  </div>
                  <el-input v-model="formData.author_avatar" placeholder="头像 URL" />
                  <label class="upload-btn">
                    {{ avatarUploading ? '上传中…' : '本地上传' }}
                    <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" hidden :disabled="avatarUploading" @change="onUploadAuthorAvatar" />
                  </label>
                </div>
              </el-form-item>

              <el-form-item label="分享封面">
                <el-input v-model="formData.cover_image" placeholder="留空则使用首图；无图时使用默认封面" />
              </el-form-item>
            </template>

            <el-form-item label="内容分类" prop="category_id">
              <el-select v-model="formData.category_id" style="width: 100%" placeholder="请选择内容分类" filterable>
                <el-option
                  v-for="item in flatCategoryOptions"
                  :key="item.id"
                  :value="item.id"
                  :label="item.label"
                />
              </el-select>
              <div class="field-tip">选项与「跨境资讯」顶栏一致；请在文章管理点「分类」→ 对分类点「发布」后才会出现在这里</div>
            </el-form-item>

            <el-form-item label="发布方式">
              <el-select v-model="publishMode" style="width: 100%">
                <el-option label="立即发布" value="publish" />
                <el-option label="定时发布" value="schedule" />
                <el-option label="存为草稿" value="draft" />
              </el-select>
            </el-form-item>

            <el-form-item v-if="publishMode === 'schedule'" label="发布时间">
              <el-date-picker
                v-model="scheduleTime"
                style="width: 100%"
                type="datetime"
                placeholder="选择定时发布时间"
              />
              <div class="field-hint">当前将先存为草稿；真正到点自动发布需服务端定时任务支持。</div>
            </el-form-item>

            <template v-if="contentType === 'article'">
            <el-form-item label="封面图">
              <div class="cover-field">
                <div v-if="coverPreviewUrl" class="cover-preview">
                  <img :src="coverPreviewUrl" alt="" />
                  <el-button text type="danger" size="small" @click="clearCover">清除</el-button>
                </div>
                <el-input
                  v-model="formData.cover_image"
                  placeholder="封面图 URL（可上传或粘贴）"
                  @input="syncCoverToSeo"
                />
                <label class="upload-btn">
                  {{ coverUploading ? '上传中…' : '本地上传' }}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    hidden
                    :disabled="coverUploading"
                    @change="onUploadCover"
                  />
                </label>
              </div>
            </el-form-item>

            <div class="section-label">正文编辑（所见即所得）</div>
            <PageRichTextEditor v-model="formData.content" class="rich-editor" />
            <div class="editor-tip">编辑区显示效果即为发布后小程序/页面展示效果。</div>
            </template>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="SEO 与 分享配置" name="seo">
          <el-form :model="seoForm" label-width="90px">
            <el-form-item label="SEO 标题">
              <el-input v-model="seoForm.title" placeholder="用于搜索引擎与分享标题" />
            </el-form-item>
            <el-form-item label="SEO 描述">
              <el-input
                v-model="seoForm.description"
                type="textarea"
                :rows="4"
                placeholder="简要描述内容核心，利于搜索收录与卡片分享"
              />
            </el-form-item>
            <el-form-item label="分享封面">
              <div class="cover-field">
                <div v-if="coverPreviewUrl" class="cover-preview">
                  <img :src="coverPreviewUrl" alt="" />
                  <el-button text type="danger" size="small" @click="clearCover">清除</el-button>
                </div>
                <el-input
                  v-model="formData.cover_image"
                  placeholder="与基础内容封面图共用"
                  @input="syncCoverToSeo"
                />
                <label class="upload-btn">
                  {{ coverUploading ? '上传中…' : '本地上传' }}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    hidden
                    :disabled="coverUploading"
                    @change="onUploadCover"
                  />
                </label>
                <div class="field-hint">与「基础内容」封面图同一字段，用于微信分享卡片。</div>
              </div>
            </el-form-item>
            <div class="seo-tip">
              提示：优化 SEO 配置可提升内容在微信搜一搜及社交平台卡片点击率。
            </div>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <aside class="preview-aside">
      <div class="preview-aside__head">小程序预览</div>
      <ContentPreviewPanel :model="previewModel" />
    </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  createContent,
  getCategoryList,
  getContentDetail,
  publishContent,
  unpublishContent,
  updateContent,
} from '@/api/content'
import { normalizeUploadUrl } from '@/api/system'
import { ContentStatus } from '@/types/content'
import PageRichTextEditor from '@/components/page-builder/props/PageRichTextEditor.vue'
import ContentPreviewPanel from '@/components/content/ContentPreviewPanel.vue'
import FilePickerDialog from '@/components/files/FilePickerDialog.vue'
import { useImageUpload } from '@/components/page-builder/composables/useImageUpload'
import { getPlainTextFromHtml, type ContentPreviewModel } from '@/utils/content-preview'
import {
  type ContentAttachment,
  fileTypeIcon,
  formatFileSize,
  normalizeAttachment,
  uploadAttachmentFile,
  attachmentFromFileLibrary,
} from '@/utils/content-attachment'

interface FlatCategoryOption {
  id: number
  label: string
}

const route = useRoute()
const router = useRouter()
const { uploadImage, uploading: coverUploading } = useImageUpload()

const activeTab = ref('base')
const pageLoading = ref(false)
const submitLoading = ref(false)
const isEdit = computed(() => Boolean(route.query.id))
const baseFormRef = ref<FormInstance>()

const publishMode = ref<'publish' | 'schedule' | 'draft'>('publish')
const scheduleTime = ref('')
const contentType = ref<'article' | 'note' | 'moment'>('article')
const noteImages = ref<string[]>([])
const noteBody = ref('')
const noteTagsText = ref('')
const momentAttachments = ref<ContentAttachment[]>([])
const filePickerVisible = ref(false)
const noteImageUploading = ref(false)
const attachmentUploading = ref(false)
const avatarUploading = ref(false)

const formData = reactive({
  title: '',
  category_id: undefined as number | undefined,
  summary: '',
  content: '',
  cover_image: '',
  tag_ids: [] as number[],
  status: ContentStatus.Draft,
  author: '',
  author_avatar: '',
  like_count: 0,
  favorite_count: 0,
  sort: 0,
  is_top: false,
})

const seoForm = reactive({
  title: '',
  description: '',
  cover: '',
})

const baseRules: FormRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  category_id: [{ required: true, message: '请选择内容分类', trigger: 'change' }],
}

const categoryTree = ref<any[]>([])
const flatCategoryOptions = computed<FlatCategoryOption[]>(() => {
  const output: FlatCategoryOption[] = []
  const walk = (arr: any[], prefix = '') => {
    arr.forEach((node) => {
      if (node.status !== undefined && Number(node.status) !== 1) return
      output.push({ id: Number(node.id), label: `${prefix}${node.name}` })
      if (Array.isArray(node.children) && node.children.length > 0) {
        walk(node.children, `${prefix}└ `)
      }
    })
  }
  walk(categoryTree.value)
  return output
})

async function fetchCategories() {
  const res = await getCategoryList()
  categoryTree.value = (res as any).data || []
}

async function loadDetail(id: number) {
  pageLoading.value = true
  try {
    const res = await getContentDetail(id)
    const data = (res as any).data || {}
    formData.title = data.title || ''
    formData.category_id = Number(data.categoryId ?? data.category_id) || undefined
    formData.summary = data.summary || ''
    formData.content = data.content || ''
    formData.cover_image = data.coverImage || data.cover_image || data.shareCover || ''
    formData.author = data.author || ''
    formData.author_avatar = data.authorAvatar || data.author_avatar || ''
    formData.like_count = Number(data.likeCount ?? data.like_count ?? 0)
    formData.favorite_count = Number(data.favoriteCount ?? data.favorite_count ?? 0)
    formData.sort = Number(data.sortOrder ?? data.sort ?? 0)
    formData.status = normalizeContentStatus(data.status)
    const rawType = String(data.contentType || data.content_type || 'article')
    contentType.value = rawType === 'note' ? 'note' : rawType === 'moment' ? 'moment' : 'article'
    noteImages.value = Array.isArray(data.images) ? [...data.images] : (formData.cover_image ? [formData.cover_image] : [])
    noteBody.value = getPlainTextFromHtml(formData.content)
    momentAttachments.value = Array.isArray(data.attachments)
      ? data.attachments.map((item: Record<string, unknown>, idx: number) => normalizeAttachment(item, idx))
      : []
    const tags = Array.isArray(data.tags) ? data.tags : []
    noteTagsText.value = tags.join(', ')
    formData.tag_ids = tags.map(String)
    if (formData.status === ContentStatus.Published) publishMode.value = 'publish'
    else publishMode.value = 'draft'

    seoForm.title = data.seoTitle || data.title || ''
    seoForm.description = data.seoDescription || data.summary || ''
    syncCoverToSeo()
  } finally {
    pageLoading.value = false
  }
}

function normalizeContentStatus(statusRaw: unknown): ContentStatus {
  if (typeof statusRaw === 'number') {
    if (statusRaw === 1) return ContentStatus.Published
    if (statusRaw === 2) return ContentStatus.Unpublished
    return ContentStatus.Draft
  }
  const value = String(statusRaw || '').toLowerCase()
  if (value === ContentStatus.Published) return ContentStatus.Published
  if (value === ContentStatus.Unpublished || value === 'offline') return ContentStatus.Unpublished
  return ContentStatus.Draft
}

function goBack(refresh = false) {
  router.push({
    name: 'ContentList',
    query: refresh ? { refresh: String(Date.now()) } : undefined,
  })
}

function normalizePreviewUrl(raw: string) {
  const value = String(raw || '').trim()
  return value ? normalizeUploadUrl(value) : ''
}

const authorAvatarPreview = computed(() => normalizePreviewUrl(formData.author_avatar))

function parseNoteTags() {
  const fromText = noteTagsText.value
    .split(/[,，\s#]+/)
    .map((t) => t.trim())
    .filter(Boolean)
  const fromBody = (noteBody.value.match(/#[\u4e00-\u9fa5\w]+/g) || []).map((t) => t.replace(/^#/, ''))
  const merged = [...fromText, ...fromBody]
  return [...new Set(merged)]
}

function noteBodyToHtml(text: string) {
  return String(text || '')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${line.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`)
    .join('')
}

function moveNoteImage(index: number, delta: number) {
  const next = [...noteImages.value]
  const target = index + delta
  if (target < 0 || target >= next.length) return
  const tmp = next[index]
  next[index] = next[target]
  next[target] = tmp
  noteImages.value = next
  formData.cover_image = next[0] || ''
}

function removeNoteImage(index: number) {
  const next = noteImages.value.filter((_, i) => i !== index)
  noteImages.value = next
  formData.cover_image = next[0] || ''
}

async function onUploadNoteImage(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || noteImages.value.length >= 9) return
  noteImageUploading.value = true
  await uploadImage(file, {
    maxSizeMB: 5,
    onSuccess: (url: string) => {
      const normalized = normalizeUploadUrl(url)
      noteImages.value = [...noteImages.value, normalized]
      if (!formData.cover_image) formData.cover_image = normalized
      ElMessage.success('图片已上传')
    },
  })
  noteImageUploading.value = false
}

async function onUploadAuthorAvatar(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  avatarUploading.value = true
  await uploadImage(file, {
    maxSizeMB: 2,
    onSuccess: (url: string) => {
      formData.author_avatar = normalizeUploadUrl(url)
      ElMessage.success('头像已上传')
    },
  })
  avatarUploading.value = false
}

function removeAttachment(index: number) {
  momentAttachments.value = momentAttachments.value.filter((_, i) => i !== index)
}

function onPickLibraryFile(file: { id: number; name: string; size?: number; mimeType?: string; fileType?: string }) {
  if (momentAttachments.value.length >= 5) return
  const item = attachmentFromFileLibrary(file, momentAttachments.value.length)
  momentAttachments.value = [...momentAttachments.value, item]
  ElMessage.success('已添加文件库附件')
}

async function onUploadAttachment(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || momentAttachments.value.length >= 5) return
  attachmentUploading.value = true
  try {
    const item = await uploadAttachmentFile(file, 20)
    if (item) {
      item.sortOrder = momentAttachments.value.length
      momentAttachments.value = [...momentAttachments.value, item]
      ElMessage.success('附件已上传')
    }
  } catch (err: any) {
    ElMessage.error(err?.message || '附件上传失败')
  } finally {
    attachmentUploading.value = false
  }
}

function syncCoverToSeo() {
  seoForm.cover = formData.cover_image || ''
}

function clearCover() {
  formData.cover_image = ''
  syncCoverToSeo()
}

async function onUploadCover(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  await uploadImage(file, {
    maxSizeMB: 5,
    onSuccess: (url: string) => {
      formData.cover_image = normalizeUploadUrl(url)
      syncCoverToSeo()
      ElMessage.success('封面已上传')
    },
  })
}

const coverPreviewUrl = computed(() => {
  const raw = formData.cover_image?.trim() || ''
  return raw ? normalizeUploadUrl(raw) : ''
})

const previewModel = computed<ContentPreviewModel>(() => {
  const category = flatCategoryOptions.value.find((item) => item.id === formData.category_id)
  return {
    title: formData.title,
    contentType: contentType.value,
    contentHtml: formData.content,
    noteBody: noteBody.value,
    coverImage: formData.cover_image,
    images: noteImages.value,
    attachments: momentAttachments.value,
    attachmentCount: momentAttachments.value.length,
    author: formData.author,
    authorAvatar: formData.author_avatar,
    categoryLabel: category?.label || '',
  }
})

function ensureSummary() {
  if (formData.summary?.trim()) return
  const text = getPlainTextFromHtml(formData.content).slice(0, 120)
  if (text) formData.summary = text
}

async function handleSubmit() {
  const form = baseFormRef.value
  if (!form) return
  const valid = await form.validate().catch(() => false)
  if (!valid) {
    activeTab.value = 'base'
    return
  }

  ensureSummary()
  if (contentType.value === 'note') {
    if (!noteImages.value.length && !formData.cover_image?.trim()) {
      ElMessage.warning('请至少上传一张笔记图片')
      activeTab.value = 'base'
      return
    }
    if (!noteBody.value.trim()) {
      ElMessage.warning('请输入笔记正文')
      activeTab.value = 'base'
      return
    }
  } else if (contentType.value === 'moment') {
    if (!noteBody.value.trim() && !noteImages.value.length && !momentAttachments.value.length) {
      ElMessage.warning('请至少填写正文、图片或资料附件之一')
      activeTab.value = 'base'
      return
    }
  } else if (!getPlainTextFromHtml(formData.content)) {
    ElMessage.warning('请输入正文内容')
    activeTab.value = 'base'
    return
  }

  if (publishMode.value === 'schedule' && !scheduleTime.value) {
    ElMessage.warning('请选择定时发布时间')
    return
  }

  submitLoading.value = true
  try {
    const tags = contentType.value === 'note' ? parseNoteTags() : formData.tag_ids.map(String)
    const isShortForm = contentType.value === 'note' || contentType.value === 'moment'
    const payload = {
      title: formData.title.trim(),
      contentType: contentType.value,
      categoryId: formData.category_id,
      summary:
        formData.summary?.trim()
        || seoForm.description?.trim()
        || (isShortForm ? noteBody.value.trim().slice(0, 120) : undefined),
      content: isShortForm ? noteBodyToHtml(noteBody.value) : formData.content,
      coverImage: (
        contentType.value === 'note' || contentType.value === 'moment'
          ? (noteImages.value[0] || formData.cover_image)
          : formData.cover_image
      )?.trim() || undefined,
      images: isShortForm ? noteImages.value : undefined,
      attachments: contentType.value === 'moment'
        ? momentAttachments.value.map((item, idx) => ({ ...item, sortOrder: idx }))
        : undefined,
      tags,
      author: formData.author?.trim() || undefined,
      authorAvatar: formData.author_avatar?.trim() || undefined,
      likeCount: formData.like_count,
      favoriteCount: formData.favorite_count,
      source: contentType.value === 'note' ? '笔记' : contentType.value === 'moment' ? '动态' : undefined,
      sortOrder: formData.sort,
      seoTitle: seoForm.title?.trim() || undefined,
      seoDescription: seoForm.description?.trim() || undefined,
    } as any

    if (isEdit.value) {
      const id = Number(route.query.id)
      const wasPublished = formData.status === ContentStatus.Published
      await updateContent(id, payload)
      if (publishMode.value === 'publish' && !wasPublished) {
        await publishContent(id)
      } else if ((publishMode.value === 'draft' || publishMode.value === 'schedule') && wasPublished) {
        await unpublishContent(id)
      }
      ElMessage.success(publishMode.value === 'schedule' ? '已保存为草稿（定时发布需服务端调度支持）' : '内容已更新')
    } else {
      const created = await createContent(payload)
      const createdId = Number((created as any).data?.id ?? (created as any).id)
      if (publishMode.value === 'publish' && createdId) {
        await publishContent(createdId)
      }
      ElMessage.success(
        publishMode.value === 'schedule'
          ? '已存为草稿（定时发布需服务端调度支持）'
          : publishMode.value === 'draft'
            ? '草稿已保存'
            : '内容已创建',
      )
    }

    goBack(true)
  } catch (err: any) {
    ElMessage.error(err?.message || '提交失败')
  } finally {
    submitLoading.value = false
  }
}

onMounted(async () => {
  await fetchCategories()
  if (isEdit.value) {
    await loadDetail(Number(route.query.id))
  }
})
</script>

<style lang="scss" scoped>
.content-edit-page {
  .edit-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 380px;
    gap: 16px;
    align-items: start;
  }

  .preview-aside {
    position: sticky;
    top: 16px;
    background: #fff;
    border: 1px solid #e4e9f2;
    border-radius: 12px;
    padding: 14px 12px 16px;
  }

  .preview-aside__head {
    margin-bottom: 12px;
    font-size: 14px;
    font-weight: 700;
    color: #172033;
    text-align: center;
  }

  .editor-card {
    border-radius: 12px;
    border: 1px solid #e4e9f2;
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .header-title {
    font-size: 16px;
    font-weight: 700;
    color: #172033;
  }

  .header-actions {
    display: flex;
    gap: 8px;
  }

  .section-label {
    margin: 8px 0 10px;
    color: #607187;
    font-size: 13px;
    font-weight: 600;
  }

  .rich-editor {
    width: 100%;
  }

  .editor-tip {
    margin-top: 8px;
    color: #8a94a6;
    font-size: 12px;
  }

  .field-hint {
    margin-top: 6px;
    color: #8a94a6;
    font-size: 12px;
    line-height: 1.4;
  }

  .cover-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
  }

  .cover-preview {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .cover-preview img {
    width: 120px;
    height: 72px;
    object-fit: cover;
    border: 1px solid #e3e8f0;
    border-radius: 6px;
    background: #eef2f7;
  }

  .upload-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: fit-content;
    height: 28px;
    padding: 0 10px;
    font-size: 12px;
    background: #fff;
    border: 1px solid #e3e8f0;
    border-radius: 6px;
    cursor: pointer;
  }

  .note-images {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    width: 100%;
  }

  .note-images__item {
    width: 120px;
  }

  .note-images__item img {
    width: 120px;
    height: 120px;
    object-fit: cover;
    border: 1px solid #e3e8f0;
    border-radius: 8px;
    background: #eef2f7;
  }

  .note-images__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    margin-top: 4px;
  }

  .note-images__add {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 120px;
    height: 120px;
    color: #607187;
    font-size: 13px;
    background: #f8fafc;
    border: 1px dashed #cfd8e6;
    border-radius: 8px;
    cursor: pointer;
  }

  .avatar-preview {
    width: 48px !important;
    height: 48px !important;
    border-radius: 50%;
  }

  .stats-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .attachment-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }

  .attachment-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border: 1px solid #e3e8f0;
    border-radius: 8px;
    background: #f8faff;
  }

  .attachment-item__icon {
    font-size: 18px;
  }

  .attachment-item__meta {
    flex: 1;
    min-width: 0;
  }

  .attachment-item__name {
    font-size: 13px;
    font-weight: 600;
    color: #1f2d3d;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .attachment-item__size {
    margin-top: 2px;
    font-size: 12px;
    color: #8a94a6;
  }

  .stats-label {
    color: #607187;
    font-size: 13px;
  }

  .seo-tip {
    background: #eff5ff;
    border: 1px solid #d6e4ff;
    border-radius: 8px;
    padding: 10px 12px;
    color: #3b5bdb;
    font-size: 12px;
    line-height: 1.5;
  }
}

.field-tip {
  margin-top: 6px;
  color: #94a3b8;
  font-size: 12px;
  line-height: 1.4;
}

@media (max-width: 1200px) {
  .content-edit-page .edit-layout {
    grid-template-columns: 1fr;
  }

  .content-edit-page .preview-aside {
    position: static;
  }
}
</style>
