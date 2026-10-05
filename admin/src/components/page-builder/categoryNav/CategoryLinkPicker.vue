<template>
  <el-dialog
    v-model="visible"
    title="选择跳转目标"
    width="760px"
    destroy-on-close
    append-to-body
  >
    <div class="clp">
      <!-- 左侧：四类目标 -->
      <div class="clp__side">
        <button
          v-for="t in TARGETS"
          :key="t.value"
          type="button"
          class="clp__side-item"
          :class="{ 'is-on': active === t.value }"
          @click="active = t.value"
        >
          <span class="clp__side-label">{{ t.label }}</span>
          <span class="clp__side-desc">{{ t.desc }}</span>
        </button>
      </div>

      <!-- 右侧：按类型给不同选择器 -->
      <div class="clp__main">
        <!-- 商品分类：树 -->
        <template v-if="active === 'category'">
          <div class="clp__toolbar">
            <el-input
              v-model="catKeyword"
              size="small"
              clearable
              placeholder="搜索分类名称"
              :prefix-icon="Search"
            />
            <el-button size="small" :loading="catLoading" @click="loadCategories">刷新</el-button>
          </div>

          <div v-loading="catLoading" class="clp__tree-wrap">
            <el-tree
              v-if="catTree.length"
              :data="catTree"
              :props="{ label: 'name', children: 'children' }"
              node-key="id"
              :filter-node-method="filterCat"
              default-expand-all
              highlight-current
              class="clp__tree"
              @node-click="onPickCategory"
            />
            <div v-else-if="!catLoading" class="clp__blank">
              还没有商品分类。先到「商品管理 › 分类」建好再来选。
            </div>
          </div>
        </template>

        <!-- 商品 / 专栏：远程搜索 -->
        <template v-else-if="active === 'product'">
          <div class="clp__toolbar">
            <el-select
              v-model="productType"
              size="small"
              style="width: 128px"
              @change="loadProducts"
            >
              <el-option label="全部商品" value="" />
              <el-option label="付费专栏" value="column" />
              <el-option label="实体商品" value="physical" />
              <el-option label="虚拟商品" value="digital" />
            </el-select>
            <el-input
              v-model="productKeyword"
              size="small"
              clearable
              placeholder="搜索商品 / 专栏名称"
              :prefix-icon="Search"
              @keyup.enter="loadProducts"
            />
            <el-button size="small" :loading="productLoading" @click="loadProducts">搜索</el-button>
          </div>

          <div v-loading="productLoading" class="clp__list-wrap">
            <button
              v-for="p in products"
              :key="p.id"
              type="button"
              class="clp__row"
              :class="{ 'is-on': p.path === draftUrl }"
              @click="draftUrl = p.path; draftType = 'product'"
            >
              <img v-if="p.icon" :src="p.icon" alt="" class="clp__row-icon" />
              <span v-else class="clp__row-icon clp__row-icon--ph">📦</span>
              <span class="clp__row-main">
                <span class="clp__row-title">{{ p.name }}</span>
                <span class="clp__row-sub">{{ p.path }}</span>
              </span>
            </button>
            <div v-if="!products.length && !productLoading" class="clp__blank">没有匹配的商品</div>
          </div>
        </template>

        <!-- 页面 / 营销活动 -->
        <template v-else-if="active === 'page'">
          <div class="clp__toolbar">
            <el-input
              v-model="pageKeyword"
              size="small"
              clearable
              placeholder="搜索页面名称或路径"
              :prefix-icon="Search"
              @keyup.enter="loadPages"
            />
            <el-button size="small" :loading="pageLoading" @click="loadPages">搜索</el-button>
          </div>

          <div v-loading="pageLoading" class="clp__list-wrap">
            <button
              v-for="p in pages"
              :key="p.id"
              type="button"
              class="clp__row"
              :class="{ 'is-on': p.path === draftUrl }"
              @click="draftUrl = p.path; draftType = 'page'"
            >
              <span class="clp__row-icon clp__row-icon--ph">📄</span>
              <span class="clp__row-main">
                <span class="clp__row-title">{{ p.name }}</span>
                <span class="clp__row-sub">{{ p.path }}</span>
              </span>
            </button>
            <div v-if="!pages.length && !pageLoading" class="clp__blank">没有匹配的页面</div>
          </div>
        </template>

        <!-- 自定义外部链接 -->
        <template v-else>
          <div class="clp__hint">
            粘贴小程序可识别的路径或 H5 链接。⚠️ 写错会导致点击无反应或跳空白页，
            建议优先用左边三类现成目标。
          </div>
          <el-input
            v-model="draftUrl"
            placeholder="如 /pkg-content/product-list/product-list 或 https://…"
            clearable
          />
          <div class="clp__quick">
            <span class="clp__quick-label">常用：</span>
            <button
              v-for="q in QUICK_LINKS"
              :key="q"
              type="button"
              class="clp__quick-item"
              @click="draftUrl = q"
            >
              {{ q }}
            </button>
          </div>
        </template>
      </div>
    </div>

    <template #footer>
      <div class="clp__foot">
        <div class="clp__foot-current">
          <span class="clp__foot-label">已选</span>
          <span class="clp__foot-text">{{ draftUrl || '尚未选择' }}</span>
        </div>
        <div class="clp__foot-ops">
          <el-button size="small" @click="visible = false">取消</el-button>
          <el-button
            v-if="modelValue"
            size="small"
            type="danger"
            plain
            @click="onConfirm('')"
          >
            清除跳转
          </el-button>
          <el-button size="small" type="primary" @click="onConfirm(draftUrl)">确定</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getCategoryList, getProductList } from '@/api/product'
import { getPageList } from '@/api/page'
import type { ElTree } from 'element-plus'

/**
 * 分类项链接选择器（树状/列表选择，**全程不手打路径**）。
 *
 * 旧面板的链接是裸 el-input，运营要自己拼 `/pkg-content/product-detail/product-detail?id=12`，
 * 这类路径**手打错一个字符真机就跳空白**，而面板没有任何校验 —— 属典型「配了但不生效」。
 * 这里改成四类现成目标：
 *   商品分类（树）／商品·专栏（搜索）／页面·活动（搜索）／自定义外部链接
 * 弹窗只产出**已校验存在的路径**，点确定即写回。
 */
const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const visible = ref(false)
// ⚠️ 显式标注联合类型：只写 `ref('category')` 时 TS 会把类型窄化成单个字面量，
//    后面 `active.value = 'product'` 直接报TS2367（无重叠）。
type LinkTarget = 'category' | 'product' | 'page' | 'url'
const active = ref<LinkTarget>('category')

const TARGETS = [
  { value: 'category' as const, label: '商品分类', desc: '直接选类目' },
  { value: 'product' as const, label: '商品/专栏', desc: '选具体商品' },
  { value: 'page' as const, label: '页面/活动', desc: '选已建页面' },
  { value: 'url' as const, label: '外部链接', desc: '手填路径或 H5' },
]

const QUICK_LINKS = [
  '/pages/index/index',
  '/pages/shop/shop',
  '/pages/discover/discover',
  '/pkg-content/product-list/product-list',
  '/pkg-extra/activity-list/activity-list',
]

const draftUrl = ref('')
const draftType = ref('page')

/* ---------------- 商品分类树 ---------------- */
const catTree = ref<any[]>([])
const catKeyword = ref('')
const catLoading = ref(false)

/** 商品分类在端上的落地页：带 category 参数跳分类页 */
function categoryPath(id: number): string {
  return `/pkg-content/product-list/product-list?categoryId=${id}`
}

async function loadCategories() {
  catLoading.value = true
  try {
    const res: any = await getCategoryList()
    const data = res?.data
    const list = Array.isArray(data) ? data : (data?.records || data?.list || [])
    catTree.value = (Array.isArray(list) ? list : []).map((c: any) => ({
      ...c,
      children: Array.isArray(c.children) ? c.children : undefined,
    }))
  } catch {
    catTree.value = []
  } finally {
    catLoading.value = false
  }
}

function filterCat(value: string, data: any) {
  if (!value) return true
  return String(data?.name || '').toLowerCase().includes(value.toLowerCase())
}

watch(catKeyword, (v) => {
  // el-tree 的 filter 需要拿到实例；组件已 v-if 挂载，直接用 ref 调用
  treeRef.value?.filter(v)
})

const treeRef = ref<InstanceType<typeof ElTree> | null>(null)

function onPickCategory(node: any) {
  const id = Number(node?.id)
  if (!Number.isFinite(id)) return
  draftUrl.value = categoryPath(id)
  draftType.value = 'page'
}

/* ---------------- 商品 / 专栏 ---------------- */
const products = ref<Array<{ id: number; name: string; path: string; icon: string }>>([])
const productKeyword = ref('')
const productType = ref('')
const productLoading = ref(false)

async function loadProducts() {
  productLoading.value = true
  try {
    const res: any = await getProductList({
      current: 1,
      size: 30,
      keyword: productKeyword.value || undefined,
      status: 'on_sale',
      ...(productType.value ? { productType: productType.value } : {}),
    } as any)
    const data = res?.data
    const records = data?.records || data?.list || (Array.isArray(data) ? data : [])
    products.value = (Array.isArray(records) ? records : []).map((r: any) => {
      const id = Number(r.id)
      return {
        id,
        name: String(r.name || `商品 ${id}`),
        path: `/pkg-content/product-detail/product-detail?id=${id}`,
        icon: String(r.cover || r.icon || r.image || ''),
      }
    })
  } catch {
    products.value = []
  } finally {
    productLoading.value = false
  }
}

/* ---------------- 页面 ---------------- */
const pages = ref<Array<{ id: number; name: string; path: string }>>([])
const pageKeyword = ref('')
const pageLoading = ref(false)

async function loadPages() {
  pageLoading.value = true
  try {
    const res: any = await getPageList({ current: 1, size: 30, keyword: pageKeyword.value || undefined })
    const data = res?.data
    const records = data?.records || data?.list || (Array.isArray(data) ? data : [])
    pages.value = (Array.isArray(records) ? records : []).map((r: any) => ({
      id: Number(r.id),
      name: String(r.name || '未命名页面'),
      path: String(r.path || ''),
    })).filter((x: any) => !!x.path)
  } catch {
    pages.value = []
  } finally {
    pageLoading.value = false
  }
}

/* ---------------- 打开 / 确认 ---------------- */

function open() {
  draftUrl.value = props.modelValue || ''
  visible.value = true
  // 按当前已选路径猜初始 tab，减少一次点击。
  // ⚠️ 用显式分支而不是三元表达式：三元的结果会被 TS 控制流窄化成
  //    三个字面量的联合，后面的 `=== 'product'` 直接报 TS2367。
  const path = draftUrl.value
  let target: LinkTarget = 'page'
  if (path.includes('categoryId=')) target = 'category'
  else if (path.startsWith('http')) target = 'url'
  else if (path.includes('product-detail')) target = 'product'
  active.value = target

  if (target === 'category') void loadCategories()
  if (target === 'page') void loadPages()
  if (target === 'product') void loadProducts()
}

defineExpose({ open })

function onConfirm(url: string) {
  emit('update:modelValue', url || '')
  visible.value = false
  if (!url) ElMessage.info('已清除跳转，分类项将不可点击')
}
</script>

<style lang="scss" scoped>
.clp {
  display: flex;
  gap: 14px;
  min-height: 380px;
}

.clp__side {
  display: flex;
  flex: none;
  flex-direction: column;
  gap: 6px;
  width: 148px;
}

.clp__side-item {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 8px 10px;
  text-align: left;
  cursor: pointer;
  background: #faf8f5;
  border: 1px solid #eee7dd;
  border-radius: 8px;

  &:hover {
    background: #f5efe8;
  }

  &.is-on {
    background: #fdf6f1;
    border-color: var(--el-color-primary, #c08e6e);
  }
}

.clp__side-label {
  font-size: 12.5px;
  font-weight: 600;
  color: #3f3a35;
}

.clp__side-desc {
  font-size: 11px;
  color: #a89c8d;
}

.clp__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.clp__toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
}

.clp__tree-wrap,
.clp__list-wrap {
  flex: 1;
  min-height: 300px;
  max-height: 380px;
  overflow-y: auto;
  padding: 6px 4px;
  background: #fcfbf9;
  border: 1px solid #eee7dd;
  border-radius: 8px;
}

.clp__tree {
  background: transparent;
}

.clp__row {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
  padding: 7px 8px;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 7px;

  &:hover {
    background: #f5efe8;
  }

  &.is-on {
    background: #fdf6f1;
    border-color: var(--el-color-primary, #c08e6e);
  }
}

.clp__row-icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 28px;
  height: 28px;
  overflow: hidden;
  object-fit: contain;
  background: #f1ede6;
  border-radius: 6px;
}

.clp__row-icon--ph {
  font-size: 14px;
}

.clp__row-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.clp__row-title {
  overflow: hidden;
  font-size: 12.5px;
  color: #3f3a35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.clp__row-sub {
  overflow: hidden;
  font-size: 11px;
  color: #a89c8d;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.clp__blank {
  padding: 30px 10px;
  font-size: 12.5px;
  color: #b3a596;
  text-align: center;
}

.clp__hint {
  margin-bottom: 10px;
  font-size: 12px;
  line-height: 1.6;
  color: #8a7d6f;
}

.clp__quick {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-top: 12px;
}

.clp__quick-label {
  font-size: 11.5px;
  color: #a89c8d;
}

.clp__quick-item {
  padding: 3px 8px;
  overflow: hidden;
  font-size: 11px;
  color: #6b5b4e;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  background: #f7f3ec;
  border: 1px solid #e8e2d9;
  border-radius: 5px;

  &:hover {
    color: var(--el-color-primary, #c08e6e);
    border-color: var(--el-color-primary, #c08e6e);
  }
}

.clp__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.clp__foot-current {
  display: flex;
  gap: 6px;
  align-items: center;
  min-width: 0;
}

.clp__foot-label {
  flex: none;
  font-size: 12px;
  color: #8a7d6f;
}

.clp__foot-text {
  max-width: 380px;
  overflow: hidden;
  font-size: 11.5px;
  color: #a89c8d;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.clp__foot-ops {
  display: flex;
  gap: 8px;
  flex: none;
}
</style>
