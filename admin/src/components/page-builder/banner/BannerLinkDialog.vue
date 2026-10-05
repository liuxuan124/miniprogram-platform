<template>
  <el-dialog
    :model-value="modelValue"
    title="配置跳转链接"
    width="560px"
    append-to-body
    destroy-on-close
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
    @open="onOpen"
  >
    <el-form label-width="76px" size="small">
      <el-form-item label="目标类型">
        <BuilderSegmented
          v-model="rawTypeModel"
          block
          :options="TYPE_OPTIONS"
          aria-label="跳转目标类型"
        />
      </el-form-item>

      <el-form-item label="跳转说明">
        <div class="lk-preview">
          <span class="lk-preview__tag">{{ typeLabel }}</span>
          <span class="lk-preview__text">{{ summary || '尚未选择目标' }}</span>
        </div>
      </el-form-item>

      <!-- 内容：文章 / 专栏 / 笔记 / 动态 -->
      <template v-if="draft.link_type === 'content'">
        <el-form-item label="内容形态">
          <el-select v-model="contentTypeFilter" placeholder="全部" style="width: 100%" @change="searchContents('')">
            <el-option label="全部形态" value="" />
            <el-option label="长文" value="article" />
            <el-option label="图文笔记" value="note" />
            <el-option label="星球动态" value="moment" />
            <el-option label="视频" value="video" />
          </el-select>
        </el-form-item>
        <el-form-item label="选择内容">
          <el-select
            v-model="draft.link_url"
            filterable
            remote
            clearable
            :remote-method="searchContents"
            :loading="loading"
            placeholder="搜索标题"
            style="width: 100%"
          >
            <el-option v-for="c in contentOptions" :key="c.id" :label="c.title" :value="c.path" />
          </el-select>
        </el-form-item>
      </template>

      <!-- 商品：详情 / 秒杀 -->
      <template v-else-if="draft.link_type === 'product'">
        <el-form-item label="商品类型">
          <BuilderSegmented v-model="productKind" block :options="PRODUCT_KIND_OPTIONS" />
        </el-form-item>
        <el-form-item label="选择商品">
          <el-select
            v-model="draft.link_url"
            filterable
            remote
            clearable
            :remote-method="searchProducts"
            :loading="loading"
            placeholder="搜索商品名称"
            style="width: 100%"
          >
            <el-option v-for="p in productOptions" :key="p.id" :label="p.name" :value="p.path" />
          </el-select>
        </el-form-item>
      </template>

      <!-- 站内页面 -->
      <template v-else-if="draft.link_type === 'page'">
        <el-form-item label="选择页面">
          <el-select
            v-model="draft.link_url"
            filterable
            remote
            clearable
            :remote-method="searchPages"
            :loading="loading"
            placeholder="搜索页面名称或路径"
            style="width: 100%"
          >
            <el-option v-for="p in pageOptions" :key="p.id" :label="`${p.name} · ${p.path}`" :value="p.path" />
          </el-select>
        </el-form-item>
      </template>

      <!-- 秒杀活动（独立入口） -->
      <template v-else-if="draft.link_type === 'flashsale'">
        <el-form-item label="活动路径">
          <el-input
            v-model="draft.link_url"
            placeholder="如 /pkg-content/product-detail/product-detail?type=flashsale"
          />
        </el-form-item>
      </template>

      <!-- 外部 H5 -->
      <template v-else-if="draft.link_type === 'url'">
        <el-form-item label="链接地址">
          <el-input v-model="draft.link_url" placeholder="https://example.com/landing" />
        </el-form-item>
      </template>

      <!-- 小程序业务路径 -->
      <template v-else-if="draft.link_type === 'miniapp'">
        <el-form-item label="业务路径">
          <el-input v-model="draft.link_url" placeholder="如 /pkg-content/moment-detail/moment-detail?id=12" />
        </el-form-item>
      </template>

      <el-form-item v-else-if="draft.link_type === 'none'" label="提示">
        <span class="lk-muted">不跳转，仅作为视觉展示。</span>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button size="small" @click="onClear">清空链接</el-button>
      <el-button size="small" @click="emit('update:modelValue', false)">取消</el-button>
      <el-button size="small" type="primary" @click="onConfirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import BuilderSegmented from '../BuilderSegmented.vue'
import { getPageList } from '@/api/page'
import { getProductList } from '@/api/product'
import { getContentList } from '@/api/content'
import { contentDetailPath } from '@/utils/content-link'

/**
 * 轮播图的复合跳转选择器。
 * 为什么要从「一个生硬的下拉」升级成弹窗：
 *   原来一个 el-select 里平铺 8 种 link_type，选中后还得在旁边的输入框里手打路径，
 *   运营基本不会用。改成弹窗后：先选目标大类，再选具体对象，最后统一确认。
 */
const props = defineProps<{
  modelValue: boolean
  linkType?: string
  linkUrl?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [payload: { link_type: string; link_url: string }]
}>()

const TYPE_OPTIONS = [
  { value: 'content', label: '内容' },
  { value: 'product', label: '商品' },
  { value: 'flashsale', label: '秒杀' },
  { value: 'page', label: '页面' },
  { value: 'url', label: 'H5' },
  { value: 'miniapp', label: '小程序' },
  { value: 'none', label: '无跳转' },
]

const PRODUCT_KIND_OPTIONS = [
  { value: 'detail', label: '商品详情' },
  { value: 'flashsale', label: '秒杀活动' },
]

const draft = reactive({ link_type: 'page', link_url: '' })
const loading = ref(false)
const contentTypeFilter = ref('')
const productKind = ref<'detail' | 'flashsale'>('detail')

const pageOptions = ref<Array<{ id: number; name: string; path: string }>>([])
const productOptions = ref<Array<{ id: number; name: string; path: string }>>([])
const contentOptions = ref<Array<{ id: number; title: string; path: string }>>([])

const typeLabel = computed(() => TYPE_OPTIONS.find((o) => o.value === draft.link_type)?.label || '未设置')

/** 折叠态摘要：让运营不打开弹窗也知道跳到哪 */
const summary = computed(() => {
  const url = String(draft.link_url || '').trim()
  if (draft.link_type === 'none' || !url) return ''
  if (draft.link_type === 'content') {
    return contentOptions.value.find((c) => c.path === url)?.title || url
  }
  if (draft.link_type === 'product' || draft.link_type === 'flashsale') {
    return productOptions.value.find((p) => p.path === url)?.name || url
  }
  if (draft.link_type === 'page') {
    const hit = pageOptions.value.find((p) => p.path === url)
    return hit ? `${hit.name}（${hit.path}）` : url
  }
  return url
})

function onOpen() {
  draft.link_type = props.linkType || 'page'
  draft.link_url = props.linkUrl || ''
  // 秒杀与商品详情共用一个类型值，靠路径区分；打开时反推回来
  productKind.value = /flashsale|seckill/i.test(draft.link_url) ? 'flashsale' : 'detail'
  contentTypeFilter.value = ''
  void searchPages('')
  void searchContents('')
  void searchProducts('')
}

async function searchPages(query: string) {
  loading.value = true
  try {
    const res = await getPageList({ current: 1, size: 30, keyword: query || undefined })
    const records = (res as any)?.data?.records || (res as any)?.data?.list || []
    pageOptions.value = (Array.isArray(records) ? records : []).map((r: any) => ({
      id: Number(r.id),
      name: String(r.name || '未命名'),
      path: String(r.path || ''),
    })).filter((x: any) => !!x.path)
  } catch {
    pageOptions.value = []
  } finally {
    loading.value = false
  }
}

async function searchProducts(query: string) {
  loading.value = true
  try {
    const res = await getProductList({ current: 1, size: 30, keyword: query || undefined, status: 'on_sale' } as any)
    const records = (res as any)?.data?.records || (res as any)?.data?.list || []
    productOptions.value = (Array.isArray(records) ? records : []).map((r: any) => {
      const id = Number(r.id)
      return {
        id,
        name: String(r.name || `商品 ${id}`),
        path: productKind.value === 'flashsale'
          ? `/pkg-content/product-detail/product-detail?id=${id}&type=flashsale`
          : `/pkg-content/product-detail/product-detail?id=${id}`,
      }
    }).filter((x: any) => !!x.path)
  } catch {
    productOptions.value = []
  } finally {
    loading.value = false
  }
}

async function searchContents(query: string) {
  loading.value = true
  try {
    const res = await getContentList({
      current: 1,
      size: 30,
      keyword: query || undefined,
      status: 'published',
      contentType: contentTypeFilter.value || undefined,
    } as any)
    const records = (res as any)?.data?.records || (res as any)?.data?.list || []
    contentOptions.value = (Array.isArray(records) ? records : []).map((r: any) => {
      const id = Number(r.id)
      const type = String(r.contentType || r.content_type || 'article')
      return { id, title: String(r.title || `内容 ${id}`), path: contentDetailPath(id, type) }
    }).filter((x: any) => !!x.path)
  } catch {
    contentOptions.value = []
  } finally {
    loading.value = false
  }
}

/** 切换目标大类时清掉旧 url —— 否则「内容→商品」会带着文章的路径过去 */
function onTypeChange(next: string) {
  draft.link_type = next
  draft.link_url = ''
}

function onClear() {
  draft.link_type = 'none'
  draft.link_url = ''
  emit('confirm', { link_type: 'none', link_url: '' })
  emit('update:modelValue', false)
}

function onConfirm() {
  if (draft.link_type !== 'none' && !String(draft.link_url || '').trim()) {
    ElMessage.warning('请选择或填写跳转目标')
    return
  }
  emit('confirm', { link_type: draft.link_type, link_url: String(draft.link_url || '').trim() })
  emit('update:modelValue', false)
}

// TYPE_OPTIONS 的点击要走 onTypeChange 才能清空旧 url
const rawTypeModel = computed({
  get: () => draft.link_type,
  set: (v: string) => onTypeChange(v),
})
</script>

<style scoped lang="scss">
.lk-preview {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
  min-width: 0;
  padding: 6px 10px;
  background: var(--wb-soft, #f7f4ef);
  border-radius: 8px;
}

.lk-preview__tag {
  flex: none;
  padding: 1px 7px;
  font-size: 11px;
  color: var(--el-color-primary, #c08e6e);
  white-space: nowrap;
  background: #fff;
  border-radius: 7px;
}

.lk-preview__text {
  overflow: hidden;
  font-size: 12px;
  color: #6b5b4e;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lk-muted {
  font-size: 12px;
  color: #94a3b8;
}
</style>
