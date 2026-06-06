<template>
  <div class="content-edit-page" v-loading="pageLoading">
    <el-card class="editor-card" shadow="never">
      <template #header>
        <div class="card-header">
          <div class="header-title">{{ isEdit ? '编辑内容与 SEO 配置' : '发布新内容' }}</div>
          <div class="header-actions">
            <el-button @click="goBack">取消</el-button>
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

            <el-form-item label="内容分类" prop="category_id">
              <el-select v-model="formData.category_id" style="width: 100%" placeholder="请选择内容分类">
                <el-option
                  v-for="item in flatCategoryOptions"
                  :key="item.id"
                  :value="item.id"
                  :label="item.label"
                />
              </el-select>
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
            </el-form-item>

            <div class="section-label">正文编辑 (支持表格与代码块)</div>
            <div class="editor-shell">
              <div class="editor-toolbar">
                <button type="button" class="editor-btn" @click="execCommand('bold')">B</button>
                <button type="button" class="editor-btn" @click="execCommand('italic')">I</button>
                <button type="button" class="editor-btn" @click="execCommand('underline')">U</button>
                <button type="button" class="editor-btn" @click="execCommand('formatBlock', '<h1>')">H1</button>
                <button type="button" class="editor-btn" @click="execCommand('formatBlock', '<h2>')">H2</button>
                <button type="button" class="editor-btn" @click="insertQuote">引用</button>
                <button type="button" class="editor-btn" @click="openLinkDialog">链接</button>
                <button type="button" class="editor-btn" @click="insertSimpleTable">表格</button>
                <button type="button" class="editor-btn" @click="insertCodeBlock">代码块</button>
                <button type="button" class="editor-btn" @click="openImageDialog">图片</button>
                <button type="button" class="editor-btn" @click="insertVideoStub">视频</button>
                <button type="button" class="editor-btn" @click="execCommand('insertUnorderedList')">列表</button>
              </div>
              <div
                ref="editorRef"
                class="editor-content"
                contenteditable="true"
                @input="syncEditorToForm"
                @blur="syncEditorToForm"
              />
            </div>
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
              <el-input v-model="seoForm.cover" placeholder="请输入封面图 URL" />
            </el-form-item>
            <div class="seo-tip">
              提示：优化 SEO 配置可提升内容在微信搜一搜及社交平台卡片点击率。
            </div>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-dialog v-model="linkDialogVisible" title="插入链接" width="420px" destroy-on-close>
      <el-form label-width="70px">
        <el-form-item label="文字">
          <el-input v-model="linkText" placeholder="显示文字" />
        </el-form-item>
        <el-form-item label="链接地址">
          <el-input v-model="linkUrl" placeholder="https://" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="linkDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmInsertLink">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="imageDialogVisible" title="插入图片" width="420px" destroy-on-close>
      <el-form label-width="70px">
        <el-form-item label="图片地址">
          <el-input v-model="imageUrl" placeholder="https://..." />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="imageAlt" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="imageDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmInsertImage">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  createContent,
  getCategoryList,
  getContentDetail,
  publishContent,
  updateContent,
} from '@/api/content'
import { ContentStatus } from '@/types/content'

interface FlatCategoryOption {
  id: number
  label: string
}

const route = useRoute()
const router = useRouter()

const activeTab = ref('base')
const pageLoading = ref(false)
const submitLoading = ref(false)
const isEdit = computed(() => Boolean(route.query.id))
const baseFormRef = ref<FormInstance>()
const editorRef = ref<HTMLDivElement>()

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
    formData.cover_image = data.coverImage || data.cover_image || ''
    formData.author = data.author || ''
    formData.sort = Number(data.sortOrder ?? data.sort ?? 0)
    formData.status = normalizeContentStatus(data.status)

    seoForm.title = data.seoTitle || data.title || ''
    seoForm.description = data.seoDescription || data.summary || ''
    seoForm.cover = data.shareCover || formData.cover_image || ''

    await nextTick()
    if (editorRef.value) editorRef.value.innerHTML = formData.content || ''
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

function syncEditorToForm() {
  if (!editorRef.value) return
  formData.content = editorRef.value.innerHTML
  if (!formData.summary) {
    const txt = (editorRef.value.innerText || '').trim().slice(0, 120)
    formData.summary = txt
  }
}

function getEditorPlainText() {
  return (editorRef.value?.innerText || '').trim()
}

function execCommand(command: string, value?: string) {
  editorRef.value?.focus()
  document.execCommand(command, false, value || undefined)
  syncEditorToForm()
}

function insertHtml(html: string) {
  editorRef.value?.focus()
  document.execCommand('insertHTML', false, html)
  syncEditorToForm()
}

function insertQuote() {
  insertHtml('<blockquote style="border-left:3px solid #1769ff;padding:6px 10px;color:#5c6b82;margin:8px 0;">引用内容</blockquote>')
}

function insertSimpleTable() {
  insertHtml('<table border="1" style="border-collapse:collapse;width:100%;"><tr><th>列1</th><th>列2</th></tr><tr><td>内容</td><td>内容</td></tr></table>')
}

function insertCodeBlock() {
  insertHtml('<pre style="background:#0f172a;color:#e2e8f0;padding:10px;border-radius:8px;overflow:auto;"><code>代码块内容</code></pre>')
}

function insertVideoStub() {
  insertHtml('<div style="padding:12px;border:1px dashed #93a4c0;border-radius:8px;color:#6b7b93;">[视频占位] 请在发布后替换为真实视频地址</div>')
}

const linkDialogVisible = ref(false)
const linkText = ref('')
const linkUrl = ref('')

function openLinkDialog() {
  linkText.value = ''
  linkUrl.value = ''
  linkDialogVisible.value = true
}

function confirmInsertLink() {
  if (!linkUrl.value.trim()) {
    ElMessage.warning('请输入链接地址')
    return
  }
  const text = linkText.value.trim() || linkUrl.value.trim()
  insertHtml(`<a href="${linkUrl.value.trim()}" target="_blank">${text}</a>`)
  linkDialogVisible.value = false
}

const imageDialogVisible = ref(false)
const imageUrl = ref('')
const imageAlt = ref('')

function openImageDialog() {
  imageUrl.value = ''
  imageAlt.value = ''
  imageDialogVisible.value = true
}

function confirmInsertImage() {
  if (!imageUrl.value.trim()) {
    ElMessage.warning('请输入图片地址')
    return
  }
  insertHtml(
    `<img src="${imageUrl.value.trim()}" alt="${imageAlt.value.trim()}" style="max-width:100%;height:auto;border-radius:8px;" />`
  )
  imageDialogVisible.value = false
}

async function handleSubmit() {
  const form = baseFormRef.value
  if (!form) return
  const valid = await form.validate().catch(() => false)
  if (!valid) {
    activeTab.value = 'base'
    return
  }

  syncEditorToForm()
  if (!getEditorPlainText()) {
    ElMessage.warning('请输入正文内容')
    activeTab.value = 'base'
    return
  }

  submitLoading.value = true
  try {
    const payload = {
      title: formData.title.trim(),
      categoryId: formData.category_id,
      summary: formData.summary?.trim() || undefined,
      content: formData.content,
      coverImage: seoForm.cover?.trim() || formData.cover_image?.trim() || undefined,
      tags: formData.tag_ids.map(String),
      author: formData.author?.trim() || undefined,
      sortOrder: formData.sort,
      // 前端保留这几个字段，后端如未支持会忽略
      seoTitle: seoForm.title?.trim() || undefined,
      seoDescription: seoForm.description?.trim() || undefined,
      publishMode: publishMode.value,
      scheduleTime: publishMode.value === 'schedule' ? scheduleTime.value : undefined,
    } as any

    if (isEdit.value) {
      const id = Number(route.query.id)
      const wasPublished = formData.status === ContentStatus.Published
      await updateContent(id, payload)
      if (publishMode.value === 'publish' && !wasPublished) {
        await publishContent(id)
      }
      ElMessage.success('内容已更新')
    } else {
      const created = await createContent(payload)
      if (publishMode.value === 'publish') {
        const createdId = Number((created as any).data?.id ?? (created as any).id)
        if (createdId) await publishContent(createdId)
      }
      ElMessage.success('内容已创建')
    }

    if (publishMode.value === 'schedule') {
      ElMessage.info('已记录定时发布时间，后端调度生效请确认服务器任务配置')
    }
    goBack(true)
  } finally {
    submitLoading.value = false
  }
}

onMounted(async () => {
  await fetchCategories()
  if (isEdit.value) {
    await loadDetail(Number(route.query.id))
  } else {
    await nextTick()
    if (editorRef.value) {
      editorRef.value.innerHTML = ''
      formData.content = ''
    }
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
    font-size: 18px;
    font-weight: 800;
    color: #0d1b2e;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .art-tabs {
    :deep(.el-tabs__item.is-active) {
      color: #1769ff;
      font-weight: 700;
    }
  }

  .section-label {
    margin-bottom: 6px;
    color: #6b7b93;
    font-size: 12px;
    font-weight: 700;
  }

  .editor-shell {
    border: 1px solid #d5deea;
    border-radius: 10px;
    overflow: hidden;
  }

  .editor-toolbar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    padding: 8px;
    background: #f8faff;
    border-bottom: 1px solid #d5deea;
  }

  .editor-btn {
    border: 1px solid #d5deea;
    background: #fff;
    border-radius: 6px;
    height: 28px;
    line-height: 26px;
    padding: 0 10px;
    font-size: 12px;
    color: #34445c;
    cursor: pointer;
  }

  .editor-btn:hover {
    border-color: #1769ff;
    color: #1769ff;
  }

  .editor-content {
    min-height: 300px;
    padding: 12px;
    outline: none;
    line-height: 1.8;
    font-size: 14px;
  }

  .editor-content:empty::before {
    content: '在此输入内容...';
    color: #a8b1c2;
    pointer-events: none;
  }

  .seo-tip {
    background: #eff5ff;
    color: #1769ff;
    font-size: 12px;
    border-radius: 10px;
    padding: 10px 12px;
  }
}
</style>
