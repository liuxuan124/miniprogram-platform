<template>
  <div class="content-edit-page" v-loading="pageLoading">
    <el-card class="editor-card" shadow="never">
      <template #header>
        <div class="card-header">
          <div class="header-title">{{ isEdit ? '编辑内容与 SEO 配置' : '发布新内容' }}</div>
          <div class="header-actions">
            <el-button @click="goBack()">取消</el-button>
            <el-button @click="openPreview">预览</el-button>
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

            <div class="section-label">正文编辑（所见即所得）</div>
            <PageRichTextEditor v-model="formData.content" class="rich-editor" />
            <div class="editor-tip">编辑区显示效果即为发布后小程序/页面展示效果。</div>
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

    <el-dialog
      v-model="previewVisible"
      title="发布预览"
      width="420px"
      append-to-body
      destroy-on-close
      class="content-preview-dialog"
      align-center
    >
      <div class="preview-shell">
        <div class="phone-frame">
          <div class="phone-notch" />
          <div class="phone-screen">
            <div class="pv-cover" :style="previewCoverStyle">
              <img v-if="previewCover" :src="previewCover" alt="" class="pv-cover-img" />
              <span v-else class="pv-cover-glyph">文</span>
            </div>
            <div class="pv-body">
              <div class="pv-chips">
                <span class="pv-fmt">长文</span>
                <span v-if="previewCategoryLabel" class="pv-topic">{{ previewCategoryLabel }}</span>
              </div>
              <h1 class="pv-title">{{ formData.title.trim() || '未填写标题' }}</h1>
              <div class="pv-meta">
                <div class="pv-av">{{ previewAuthorInitial }}</div>
                <div class="pv-meta-txt">
                  <div class="pv-nm">{{ formData.author.trim() || '作者' }}</div>
                  <div class="pv-dt">{{ previewDateLabel }} · 预计阅读</div>
                </div>
                <span class="pv-follow">+ 关注</span>
              </div>
              <div v-if="getPlainTextFromHtml(formData.content)" class="pv-content" v-html="formData.content" />
              <div v-else class="pv-empty">暂无正文，请先在编辑区填写内容</div>
            </div>
          </div>
        </div>
        <p class="preview-hint">模拟小程序文章详情页，样式供参考，实际以端上为准。</p>
      </div>
    </el-dialog>
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
import { useImageUpload } from '@/components/page-builder/composables/useImageUpload'

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
const previewVisible = ref(false)
const isEdit = computed(() => Boolean(route.query.id))
const baseFormRef = ref<FormInstance>()

const publishMode = ref<'publish' | 'schedule' | 'draft'>('publish')
const scheduleTime = ref('')

const formData = reactive({
  title: '',
  category_id: undefined as number | undefined,
  summary: '',
  content: '',
  cover_image: '',
  tag_ids: [] as number[],
  status: ContentStatus.Draft,
  author: '',
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
    formData.sort = Number(data.sortOrder ?? data.sort ?? 0)
    formData.status = normalizeContentStatus(data.status)
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

function getPlainTextFromHtml(html: string) {
  const div = document.createElement('div')
  div.innerHTML = html || ''
  return (div.innerText || '').trim()
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

const previewCover = computed(() => coverPreviewUrl.value)

const previewCoverStyle = computed(() => {
  if (previewCover.value) return {}
  return { background: 'linear-gradient(140deg, #5c7cff, #2f5bff)' }
})

const previewCategoryLabel = computed(() => {
  const hit = flatCategoryOptions.value.find((item) => item.id === formData.category_id)
  return hit?.label?.replace(/^└\s*/, '') || ''
})

const previewAuthorInitial = computed(() => {
  const name = formData.author.trim() || '作者'
  return name.slice(0, 1)
})

const previewDateLabel = computed(() => {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${m}-${day}`
})

function openPreview() {
  previewVisible.value = true
}

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
  if (!getPlainTextFromHtml(formData.content)) {
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
    const payload = {
      title: formData.title.trim(),
      categoryId: formData.category_id,
      summary: formData.summary?.trim() || seoForm.description?.trim() || undefined,
      content: formData.content,
      coverImage: formData.cover_image?.trim() || undefined,
      tags: formData.tag_ids.map(String),
      author: formData.author?.trim() || undefined,
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

.preview-shell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.phone-frame {
  width: 340px;
  border-radius: 28px;
  border: 3px solid #1a1f2e;
  background: #0f1219;
  padding: 10px 8px 14px;
  box-shadow: 0 16px 40px rgba(23, 32, 51, 0.22);
}

.phone-notch {
  width: 96px;
  height: 8px;
  margin: 0 auto 8px;
  border-radius: 999px;
  background: #2a3144;
}

.phone-screen {
  height: 620px;
  overflow: auto;
  border-radius: 18px;
  background: #f5f6f9;
}

.pv-cover {
  height: 168px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.pv-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pv-cover-glyph {
  font-size: 42px;
  color: rgba(255, 255, 255, 0.92);
  font-weight: 700;
}

.pv-body {
  margin-top: -18px;
  position: relative;
  z-index: 1;
  background: #fff;
  border-radius: 20px 20px 0 0;
  padding: 18px 16px 28px;
  min-height: calc(100% - 150px);
}

.pv-chips {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.pv-fmt {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: #e7f5ea;
  color: #2f9350;
}

.pv-topic {
  font-size: 11px;
  color: #727a8c;
  background: #f5f6f9;
  padding: 2px 8px;
  border-radius: 999px;
}

.pv-title {
  margin: 0 0 14px;
  font-size: 20px;
  line-height: 1.4;
  font-weight: 700;
  color: #0f1219;
  letter-spacing: -0.02em;
}

.pv-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 14px;
  margin-bottom: 14px;
  border-bottom: 1px solid #edeff4;
}

.pv-av {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(140deg, #5c7cff, #2f5bff);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.pv-meta-txt {
  flex: 1;
  min-width: 0;
}

.pv-nm {
  font-size: 13px;
  font-weight: 600;
  color: #0f1219;
}

.pv-dt {
  margin-top: 2px;
  font-size: 11px;
  color: #a5abb9;
}

.pv-follow {
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  background: #2f5bff;
  padding: 6px 12px;
  border-radius: 999px;
}

.pv-content {
  font-size: 14px;
  line-height: 1.9;
  color: #39404f;
  word-break: break-word;

  :deep(img) {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
  }

  :deep(p) {
    margin: 0 0 12px;
  }

  :deep(h1),
  :deep(h2),
  :deep(h3) {
    margin: 12px 0 8px;
    line-height: 1.35;
    color: #0f1219;
  }

  :deep(ul),
  :deep(ol) {
    padding-left: 1.6em;
    margin: 0 0 12px;
    list-style-position: outside;
  }

  :deep(ul) {
    list-style-type: disc;
  }

  :deep(ol) {
    list-style-type: decimal;
  }

  :deep(li) {
    display: list-item;
    margin: 0.15em 0;
  }

  :deep(a) {
    color: #2f5bff;
  }
}

.pv-empty {
  padding: 28px 8px;
  text-align: center;
  color: #a5abb9;
  font-size: 13px;
}

.field-tip {
  margin-top: 6px;
  color: #94a3b8;
  font-size: 12px;
  line-height: 1.4;
}

.preview-hint {
  margin: 0;
  font-size: 12px;
  color: #8a94a6;
  text-align: center;
}
</style>
