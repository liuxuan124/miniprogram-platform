<template>
  <div class="order-detail-page">
    <el-card v-loading="pageLoading">
      <template #header>
        <div class="card-header">
          <span>订单详情</span>
          <div>
            <el-button type="warning" @click="goRefund">退款审核</el-button>
            <el-button @click="goBack">返回列表</el-button>
          </div>
        </div>
      </template>

      <template v-if="order">
        <!-- 订单基本信息 -->
        <el-descriptions title="订单信息" :column="3" border>
          <el-descriptions-item label="订单号">{{ order.order_no }}</el-descriptions-item>
          <el-descriptions-item label="订单状态">
            <el-tag
              :type="(OrderStatusTagType[order.status as OrderStatus] as any) || 'info'"
              size="small"
            >
              {{ OrderStatusLabels[order.status as OrderStatus] || order.status }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="下单时间">{{ order.created_at }}</el-descriptions-item>
          <el-descriptions-item label="用户">{{ order.user_nickname || '-' }}</el-descriptions-item>
          <el-descriptions-item label="支付方式">{{ order.payment_method || '-' }}</el-descriptions-item>
          <el-descriptions-item label="支付时间">{{ order.payment_time || '-' }}</el-descriptions-item>
          <el-descriptions-item label="物流公司">{{ order.shipping_company || '-' }}</el-descriptions-item>
          <el-descriptions-item label="物流单号">{{ order.shipping_no || '-' }}</el-descriptions-item>
          <el-descriptions-item label="发货时间">{{ order.shipping_time || '-' }}</el-descriptions-item>
          <el-descriptions-item label="完成时间">{{ order.confirm_time || '-' }}</el-descriptions-item>
          <el-descriptions-item label="关闭时间">{{ order.close_time || '-' }}</el-descriptions-item>
          <el-descriptions-item label="备注">{{ order.remark || '-' }}</el-descriptions-item>
        </el-descriptions>

        <!-- 金额信息 -->
        <el-descriptions title="金额信息" :column="3" border style="margin-top: 24px">
          <el-descriptions-item label="商品总额">¥{{ order.total_amount }}</el-descriptions-item>
          <el-descriptions-item label="运费">¥{{ order.freight_amount }}</el-descriptions-item>
          <el-descriptions-item label="优惠金额">¥{{ order.discount_amount }}</el-descriptions-item>
          <el-descriptions-item label="实付金额">
            <span style="color: #f56c6c; font-weight: 600; font-size: 16px">¥{{ order.pay_amount }}</span>
          </el-descriptions-item>
        </el-descriptions>

        <!-- 商品列表 -->
        <div style="margin-top: 24px">
          <h4 style="margin-bottom: 12px">商品列表</h4>
          <el-table :data="order.items" border>
            <el-table-column label="商品" min-width="240">
              <template #default="{ row }">
                <div style="display: flex; align-items: center; gap: 8px">
                  <el-image
                    v-if="row.sku_image"
                    :src="row.sku_image"
                    fit="cover"
                    style="width: 50px; height: 50px; border-radius: 4px; flex-shrink: 0"
                  />
                  <div>
                    <div>{{ row.product_name }}</div>
                    <div v-if="row.sku_specs" style="font-size: 12px; color: #909399">{{ row.sku_specs }}</div>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="price" label="单价" width="120" align="center">
              <template #default="{ row }">¥{{ row.price }}</template>
            </el-table-column>
            <el-table-column prop="quantity" label="数量" width="80" align="center" />
            <el-table-column prop="subtotal" label="小计" width="120" align="center">
              <template #default="{ row }">¥{{ row.subtotal }}</template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 操作区 -->
        <div style="margin-top: 24px; display: flex; gap: 12px">
          <el-button
            v-if="order.status === OrderStatus.Paid"
            type="primary"
            @click="shipDialogVisible = true"
          >发货</el-button>
          <el-button
            v-if="order.status === OrderStatus.Refunding"
            type="success"
            @click="handleRefundApprove(true)"
          >同意退款</el-button>
          <el-button
            v-if="order.status === OrderStatus.Refunding"
            type="danger"
            @click="handleRefundApprove(false)"
          >拒绝退款</el-button>
        </div>
      </template>
    </el-card>

    <!-- 发货对话框 -->
    <el-dialog v-model="shipDialogVisible" title="订单发货" width="480px" destroy-on-close>
      <el-form ref="shipFormRef" :model="shipForm" :rules="shipRules" label-width="100px">
        <el-form-item label="物流公司" prop="shipping_company">
          <el-select v-model="shipForm.shipping_company" placeholder="请选择物流公司" style="width: 100%">
            <el-option label="顺丰速运" value="顺丰速运" />
            <el-option label="中通快递" value="中通快递" />
            <el-option label="圆通速递" value="圆通速递" />
            <el-option label="韵达快递" value="韵达快递" />
            <el-option label="申通快递" value="申通快递" />
            <el-option label="京东物流" value="京东物流" />
            <el-option label="EMS" value="EMS" />
          </el-select>
        </el-form-item>
        <el-form-item label="物流单号" prop="shipping_no">
          <el-input v-model="shipForm.shipping_no" placeholder="请输入物流单号" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="shipDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="shipSubmitting" @click="submitShip">确认发货</el-button>
      </template>
    </el-dialog>

    <!-- 拒绝退款原因对话框 -->
    <el-dialog v-model="rejectDialogVisible" title="拒绝退款" width="480px" destroy-on-close>
      <el-form :model="rejectForm" label-width="100px">
        <el-form-item label="拒绝原因">
          <el-input
            v-model="rejectForm.reason"
            type="textarea"
            :rows="3"
            placeholder="请输入拒绝原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="refundSubmitting" @click="submitReject">确认拒绝</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { getOrder, shipOrder, refundApprove } from '@/api/order'
import type { OrderRecord, ShipParams } from '@/types/order'
import { OrderStatus, OrderStatusLabels, OrderStatusTagType } from '@/types/order'

const route = useRoute()
const router = useRouter()
const pageLoading = ref(false)
const order = ref<OrderRecord | null>(null)

const orderId = computed(() => Number(route.params.id) || 0)

// 发货
const shipDialogVisible = ref(false)
const shipSubmitting = ref(false)
const shipFormRef = ref<FormInstance>()
const shipForm = reactive<ShipParams>({
  shipping_company: '',
  shipping_no: '',
})
const shipRules: FormRules = {
  shipping_company: [{ required: true, message: '请选择物流公司', trigger: 'change' }],
  shipping_no: [{ required: true, message: '请输入物流单号', trigger: 'blur' }],
}

// 拒绝退款
const rejectDialogVisible = ref(false)
const refundSubmitting = ref(false)
const rejectForm = reactive({ reason: '' })

/** 加载订单详情 */
async function fetchOrder() {
  if (!orderId.value) return
  pageLoading.value = true
  try {
    const res = await getOrder(orderId.value)
    order.value = res.data
  } catch {
    ElMessage.error('获取订单详情失败')
  } finally {
    pageLoading.value = false
  }
}

/** 提交发货 */
async function submitShip() {
  const valid = await shipFormRef.value?.validate().catch(() => false)
  if (!valid) return
  shipSubmitting.value = true
  try {
    await shipOrder(orderId.value, { ...shipForm })
    ElMessage.success('发货成功')
    shipDialogVisible.value = false
    fetchOrder()
  } catch {
    ElMessage.error('发货失败')
  } finally {
    shipSubmitting.value = false
  }
}

/** 退款审批 */
async function handleRefundApprove(approved: boolean) {
  if (approved) {
    await ElMessageBox.confirm('确定同意退款？退款金额将原路返回', '退款审批')
    refundSubmitting.value = true
    try {
      await refundApprove(orderId.value, { approved: true })
      ElMessage.success('已同意退款')
      fetchOrder()
    } catch {
      ElMessage.error('操作失败')
    } finally {
      refundSubmitting.value = false
    }
  } else {
    rejectForm.reason = ''
    rejectDialogVisible.value = true
  }
}

/** 提交拒绝退款 */
async function submitReject() {
  refundSubmitting.value = true
  try {
    await refundApprove(orderId.value, { approved: false, reason: rejectForm.reason })
    ElMessage.success('已拒绝退款')
    rejectDialogVisible.value = false
    fetchOrder()
  } catch {
    ElMessage.error('操作失败')
  } finally {
    refundSubmitting.value = false
  }
}

/** 跳转退款审核 */
function goRefund() {
  router.push({ name: 'OrderRefund' })
}

/** 返回 */
function goBack() {
  router.push({ name: 'OrderList' })
}

onMounted(() => {
  fetchOrder()
})
</script>

<style scoped>
.order-detail-page {
  padding: 20px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
