<template>
  <div class="im-side">
    <el-tabs v-model="tab" class="im-side__tabs" stretch>
      <!-- ============ 客户档案 ============ -->
      <el-tab-pane label="客户档案" name="profile">
        <div v-loading="loading" class="im-side__body">
          <template v-if="customer">
            <div class="profile-head">
              <img v-if="customer.avatar" class="profile-head__avatar" :src="resolveUrl(customer.avatar)" :alt="customer.nickname" />
              <div v-else class="profile-head__avatar profile-head__avatar--empty">
                {{ (customer.nickname || '?').charAt(0) }}
              </div>
              <div class="profile-head__info">
                <div class="profile-head__name">
                  {{ customer.nickname || '游客' }}
                  <span v-if="customer.memberLabel" class="profile-head__member">{{ customer.memberLabel }}</span>
                </div>
                <div class="profile-head__phone">{{ customer.phone || '未留手机号' }}</div>
              </div>
            </div>

            <el-descriptions :column="2" size="small" border class="profile-stats">
              <el-descriptions-item label="注册时长">
                {{ customer.registerDays != null ? `${customer.registerDays} 天` : '—' }}
              </el-descriptions-item>
              <el-descriptions-item label="累计消费">
                ¥{{ customer.totalPaid ?? '0' }}
              </el-descriptions-item>
              <el-descriptions-item label="客单价">
                ¥{{ customer.avgPaid ?? '0' }}
              </el-descriptions-item>
              <el-descriptions-item label="订单数">
                {{ customer.orderCount ?? 0 }}
              </el-descriptions-item>
            </el-descriptions>

            <div class="profile-block">
              <div class="profile-block__title">会员有效期</div>
              <div class="profile-block__text">
                {{ customer.memberExpireAt ? formatTime(customer.memberExpireAt) : '未开通会员' }}
              </div>
            </div>

            <div class="profile-block">
              <div class="profile-block__title">最近下单</div>
              <div class="profile-block__text">
                {{ customer.lastOrderAt ? formatTime(customer.lastOrderAt) : '暂无订单' }}
              </div>
            </div>
          </template>
          <el-empty v-else-if="!loading" description="游客会话暂无档案" :image-size="60" />
        </div>
      </el-tab-pane>

      <!-- ============ 关联订单 ============ -->
      <el-tab-pane label="关联订单" name="orders">
        <div v-loading="loading" class="im-side__body">
          <el-empty v-if="!orders.length && !loading" description="暂无订单" :image-size="60" />
          <div
            v-for="o in orders"
            :key="o.id"
            class="order-item"
          >
            <div class="order-item__head">
              <span class="order-item__no">{{ o.orderNo }}</span>
              <el-tag size="small" effect="plain" :type="statusTagType(o.status)">
                {{ o.statusLabel }}
              </el-tag>
            </div>
            <div class="order-item__goods">
              {{ o.productNames?.join('、') || '订单商品' }}
            </div>
            <div class="order-item__meta">
              <span>¥{{ o.payAmount }}</span>
              <span v-if="o.logisticsNo">{{ o.logisticsCompany }} {{ o.logisticsNo }}</span>
            </div>
            <div class="order-item__ops">
              <el-button
                size="small"
                text
                type="primary"
                :disabled="o.status !== 'shipped'"
                @click="$emit('push-logistics', o.id)"
              >
                推送此单物流
              </el-button>
              <el-button size="small" text @click="$emit('goto-order', o.id)">订单详情</el-button>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- ============ 快捷话术 ============ -->
      <el-tab-pane label="快捷话术" name="canned">
        <div class="im-side__body">
          <div class="canned-toolbar">
            <el-input
              v-model="cannedKeyword"
              placeholder="搜索话术"
              clearable
              size="small"
              @input="loadCanned"
            />
            <el-button size="small" text type="primary" @click="openCannedEditor">
              + 新建
            </el-button>
          </div>

          <el-select v-model="cannedGroup" size="small" class="canned-group" @change="loadCanned">
            <el-option label="全部" value="" />
            <el-option label="欢迎语" value="welcome" />
            <el-option label="发货时效" value="shipping" />
            <el-option label="售后政策" value="after_sale" />
            <el-option label="常用语" value="other" />
          </el-select>

          <el-empty v-if="!canned.length" description="暂无话术" :image-size="50" />

          <div
            v-for="c in canned"
            :key="c.id"
            class="canned-item"
            @click="$emit('insert-canned', c.content)"
          >
            <div class="canned-item__head">
              <span class="canned-item__title">{{ c.title }}</span>
              <el-tag size="small" effect="plain">{{ c.groupLabel }}</el-tag>
              <span v-if="c.builtin" class="canned-item__builtin">内置</span>
            </div>
            <div class="canned-item__content">{{ c.content }}</div>
            <div class="canned-item__ops" @click.stop>
              <el-button size="small" text @click="openCannedEditor(c)">编辑</el-button>
              <el-button size="small" text type="danger" @click="removeCanned(c)">
                {{ c.builtin ? '停用' : '删除' }}
              </el-button>
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 话术编辑弹窗 -->
    <el-dialog
      v-model="cannedDialogVisible"
      :title="editingCanned?.id ? '编辑话术' : '新建话术'"
      width="480px"
      append-to-body
    >
      <el-form label-width="72px" label-position="left">
        <el-form-item label="分组">
          <el-select v-model="cannedForm.groupCode" style="width: 100%">
            <el-option label="欢迎语" value="welcome" />
            <el-option label="发货时效" value="shipping" />
            <el-option label="售后政策" value="after_sale" />
            <el-option label="常用语" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="标题" required>
          <el-input v-model="cannedForm.title" maxlength="40" show-word-limit />
        </el-form-item>
        <el-form-item label="内容" required>
          <el-input v-model="cannedForm.content" type="textarea" :rows="5" maxlength="1000" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="cannedDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="cannedSaving" @click="saveCanned">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  createCannedReply,
  deleteCannedReply,
  listCannedReplies,
  updateCannedReply,
  type ImCannedReply,
  type ImCustomer,
  type ImUserOrder,
} from '@/api/imWorkbench'
import { resolveMediaUrl } from '@/utils/media-url'

const props = defineProps<{
  conversationId: number | null
  customer: ImCustomer | null
  orders: ImUserOrder[]
  loading: boolean
}>()

defineEmits<{
  (e: 'insert-canned', content: string): void
  (e: 'push-logistics', orderId: number): void
  (e: 'goto-order', orderId: number): void
}>()

const tab = ref('profile')

// ---------- 话术库 ----------
const canned = ref<ImCannedReply[]>([])
const cannedKeyword = ref('')
const cannedGroup = ref('')
const cannedDialogVisible = ref(false)
const cannedSaving = ref(false)
const editingCanned = ref<ImCannedReply | null>(null)
const cannedForm = reactive({ groupCode: 'other', title: '', content: '' })

async function loadCanned() {
  try {
    const res: any = await listCannedReplies({
      ...(cannedGroup.value ? { group: cannedGroup.value } : {}),
      ...(cannedKeyword.value ? { keyword: cannedKeyword.value } : {}),
    })
    const d = res?.data ?? res
    canned.value = Array.isArray(d) ? d : d?.records || []
  } catch (e: any) {
    canned.value = []
  }
}

function openCannedEditor(item?: ImCannedReply) {
  editingCanned.value = item || null
  cannedForm.groupCode = item?.groupCode || 'other'
  cannedForm.title = item?.title || ''
  cannedForm.content = item?.content || ''
  cannedDialogVisible.value = true
}

async function saveCanned() {
  if (!cannedForm.title.trim() || !cannedForm.content.trim()) {
    ElMessage.warning('标题与内容必填')
    return
  }
  cannedSaving.value = true
  try {
    if (editingCanned.value?.id) {
      await updateCannedReply(editingCanned.value.id, { ...cannedForm })
    } else {
      await createCannedReply({ ...cannedForm })
    }
    ElMessage.success('已保存')
    cannedDialogVisible.value = false
    loadCanned()
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    cannedSaving.value = false
  }
}

async function removeCanned(item: ImCannedReply) {
  try {
    await ElMessageBox.confirm(
      item.builtin ? '内置话术将被停用（不会物理删除），确定吗？' : `确定删除话术「${item.title}」？`,
      '确认',
      { type: 'warning' },
    )
  } catch {
    return
  }
  try {
    await deleteCannedReply(item.id)
    ElMessage.success('已处理')
    loadCanned()
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  }
}

function statusTagType(status: string) {
  if (status === 'pending_payment') return 'info'
  if (status === 'paid') return 'warning'
  if (status === 'shipped') return 'primary'
  if (status === 'completed') return 'success'
  return 'info'
}

function formatTime(s: string) {
  return String(s).replace('T', ' ').slice(0, 16)
}

function resolveUrl(url?: string) {
  return url ? resolveMediaUrl(url) : ''
}

// 切会话时话术库不用重载（与买家无关），只在首次加载
onMounted(() => {
  loadCanned()
})

watch(
  () => props.conversationId,
  () => {
    tab.value = 'profile'
  },
)
</script>

<style lang="scss" scoped>
.im-side {
  height: 100%;
  min-height: 0;
  border-left: 1px solid var(--el-border-color-lighter);
  display: flex;
  flex-direction: column;
}

.im-side__tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.im-side__tabs :deep(.el-tabs__content) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.im-side__tabs :deep(.el-tab-pane) {
  height: 100%;
}

.im-side__body {
  height: 100%;
  overflow-y: auto;
  padding: 10px 12px 20px;
}

.profile-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.profile-head__avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.profile-head__avatar--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-fill-color);
  color: var(--el-text-color-secondary);
  font-size: 16px;
}

.profile-head__info {
  min-width: 0;
}

.profile-head__name {
  font-size: 14px;
  color: var(--el-text-color-primary);
  display: flex;
  align-items: center;
  gap: 5px;
}

.profile-head__member {
  font-size: 10px;
  color: #b45309;
  background: #fef3c7;
  padding: 0 4px;
  border-radius: 3px;
}

.profile-head__phone {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 2px;
}

.profile-stats {
  margin-bottom: 12px;
}

.profile-block {
  padding: 8px 0;
  border-top: 1px solid var(--el-border-color-lighter);
}

.profile-block__title {
  font-size: 12px;
  color: var(--el-text-color-tertiary);
}

.profile-block__text {
  font-size: 13px;
  color: var(--el-text-color-primary);
  margin-top: 2px;
}

.order-item {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 7px;
  padding: 8px 10px;
  margin-bottom: 8px;
}

.order-item__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.order-item__no {
  font-size: 12px;
  font-family: var(--el-font-family-monospace, monospace);
  color: var(--el-text-color-regular);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-item__goods {
  font-size: 13px;
  color: var(--el-text-color-primary);
  margin-top: 3px;
  line-height: 1.4;
}

.order-item__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  margin-top: 3px;
}

.order-item__ops {
  margin-top: 4px;
  border-top: 1px solid var(--el-border-color-extra-light);
  padding-top: 2px;
}

.canned-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
}

.canned-toolbar :deep(.el-input) {
  flex: 1;
  min-width: 0;
}

.canned-group {
  width: 100%;
  margin-bottom: 8px;
}

.canned-item {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 7px;
  padding: 7px 9px;
  margin-bottom: 6px;
  cursor: pointer;
}

.canned-item:hover {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.canned-item__head {
  display: flex;
  align-items: center;
  gap: 5px;
}

.canned-item__title {
  font-size: 12px;
  color: var(--el-text-color-primary);
  font-weight: 500;
}

.canned-item__builtin {
  font-size: 10px;
  color: var(--el-text-color-placeholder);
}

.canned-item__content {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
  margin-top: 3px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.canned-item__ops {
  display: none;
  margin-top: 3px;
  border-top: 1px solid var(--el-border-color-extra-light);
  padding-top: 2px;
}

.canned-item:hover .canned-item__ops {
  display: flex;
}
</style>
