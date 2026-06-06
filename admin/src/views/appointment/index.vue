<template>
  <div class="booking-page">
    <div class="page-header">
      <div class="page-title">预约管理</div>
      <div class="page-desc">服务项目、时间段配置、预约记录管理。</div>
    </div>

    <div class="top-grid">
      <el-card class="calendar-card" shadow="never">
        <div class="month-head">
          <el-button size="small" @click="changeMonth(-1)">←</el-button>
          <span>{{ displayYear }}年{{ displayMonth + 1 }}月</span>
          <el-button size="small" @click="changeMonth(1)">→</el-button>
        </div>
        <div class="calendar-grid">
          <div v-for="w in weekLabels" :key="w" class="week-label">{{ w }}</div>
          <div
            v-for="cell in calendarCells"
            :key="cell.key"
            class="day-cell"
            :class="{ today: cell.isToday, other: cell.isOtherMonth, hasdot: cell.hasSlot, selected: isSelectedDate(cell.date) }"
            @click="selectDate(cell)"
          >
            {{ cell.day }}
            <span class="dot" v-if="cell.hasSlot" />
          </div>
        </div>
        <div class="calendar-legend">
          <span>🔵 今日</span>
          <span>● 有预约</span>
        </div>
      </el-card>

      <el-card class="config-card" shadow="never">
        <div class="section-head">
          <h3>时间段配置</h3>
          <el-button size="small" type="primary" @click="openSlotConfigDialog">配置</el-button>
        </div>
        <div class="muted mb8">今日可预约时间段</div>
        <div class="times-grid">
          <button
            v-for="slot in daySlots"
            :key="slot.id"
            type="button"
            class="time-chip"
            :class="{ full: slot.isFull, selected: selectedSlotId === slot.id }"
            @click="pickSlot(slot)"
          >
            {{ slot.time }}
            <small>{{ slot.isFull ? '已满' : '可约' }}</small>
          </button>
          <div v-if="daySlots.length === 0" class="empty-text">暂无时段</div>
        </div>

        <div class="section-head mt16">
          <h3>服务项目</h3>
          <el-button size="small" type="primary" @click="openServiceDialog(null)">添加</el-button>
        </div>
        <div class="service-list">
          <div v-for="svc in services" :key="svc.id" class="service-row">
            <div class="service-main">
              <b>{{ svc.name }}（{{ svc.duration }}分钟）</b>
              <span class="muted">{{ svc.price == null ? '免费' : `¥${svc.price}` }}</span>
            </div>
            <el-button size="small" @click="openServiceDialog(svc)">编辑</el-button>
          </div>
          <div v-if="services.length === 0" class="empty-text">暂无服务项目</div>
        </div>
      </el-card>
    </div>

    <el-card class="records-card" shadow="never">
      <div class="section-head">
        <h3>预约记录</h3>
      </div>
      <el-table :data="bookingRows" stripe v-loading="bookingLoading">
        <el-table-column label="服务项目" min-width="180" prop="serviceName" />
        <el-table-column label="预约用户" width="150">
          <template #default="{ row }">
            <div>{{ row.userName }}</div>
            <div class="muted">{{ row.userPhone }}</div>
          </template>
        </el-table-column>
        <el-table-column label="日期" width="130" prop="date" />
        <el-table-column label="时间段" width="120" prop="time" />
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160">
          <template #default="{ row }">
            <el-button link type="success" size="small" @click="confirmBooking(row)" v-if="row.status === 'pending'">确认</el-button>
            <el-button link size="small" @click="contactUser(row)">联系</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="slotConfigVisible" title="时间段配置" width="520px" destroy-on-close>
      <el-form ref="slotCfgFormRef" :model="slotCfgForm" :rules="slotCfgRules" label-width="95px">
        <el-form-item label="预约服务" prop="serviceId">
          <el-select v-model="slotCfgForm.serviceId" style="width: 100%" placeholder="请选择服务">
            <el-option v-for="svc in services" :key="svc.id" :value="svc.id" :label="svc.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="开放日期">
          <el-select v-model="slotCfgForm.openMode" style="width: 100%">
            <el-option label="每天" value="everyday" />
            <el-option label="工作日" value="workday" />
            <el-option label="周末" value="weekend" />
          </el-select>
        </el-form-item>
        <el-form-item label="时段时长">
          <el-select v-model="slotCfgForm.duration" style="width: 100%">
            <el-option label="60分钟" :value="60" />
            <el-option label="30分钟" :value="30" />
            <el-option label="90分钟" :value="90" />
            <el-option label="120分钟" :value="120" />
          </el-select>
        </el-form-item>
        <el-form-item label="开始时间" prop="startTime">
          <el-time-picker v-model="slotCfgForm.startTime" value-format="HH:mm" format="HH:mm" style="width: 100%" />
        </el-form-item>
        <el-form-item label="结束时间" prop="endTime">
          <el-time-picker v-model="slotCfgForm.endTime" value-format="HH:mm" format="HH:mm" style="width: 100%" />
        </el-form-item>
        <el-form-item label="每段名额" prop="capacity">
          <el-input-number v-model="slotCfgForm.capacity" :min="1" :max="99" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="slotConfigVisible = false">取消</el-button>
        <el-button type="primary" :loading="slotSaving" @click="saveSlotConfig">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="serviceDialogVisible" :title="serviceForm.id ? '编辑服务项目' : '添加服务项目'" width="520px" destroy-on-close>
      <el-form ref="serviceFormRef" :model="serviceForm" :rules="serviceRules" label-width="95px">
        <el-form-item label="服务名称" prop="name">
          <el-input v-model="serviceForm.name" />
        </el-form-item>
        <el-form-item label="时长(分钟)" prop="duration">
          <el-input-number v-model="serviceForm.duration" :min="1" :max="480" style="width: 100%" />
        </el-form-item>
        <el-form-item label="价格">
          <el-input-number v-model="serviceForm.price" :min="0" :precision="2" :step="10" style="width: 100%" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="serviceForm.description" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="serviceDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="serviceSaving" @click="saveService">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  getAppointmentServiceList,
  createAppointmentService,
  updateAppointmentService,
  getAppointmentSlotList,
  createAppointmentSlot,
  getAppointmentList,
  confirmAppointment,
} from '@/api/appointment'
import { AppointmentServiceStatus } from '@/types/appointment'

interface ServiceItem {
  id: number
  name: string
  duration: number
  price?: number
  description?: string
}

interface DaySlot {
  id: number
  time: string
  isFull: boolean
}

interface BookingRow {
  id: number
  serviceName: string
  userName: string
  userPhone: string
  date: string
  time: string
  status: string
}

const today = new Date()
const displayYear = ref(today.getFullYear())
const displayMonth = ref(today.getMonth())
const selectedDate = ref(formatDate(today))
const selectedSlotId = ref<number | null>(null)
const weekLabels = ['日', '一', '二', '三', '四', '五', '六']

const services = ref<ServiceItem[]>([])
const slots = ref<any[]>([])
const daySlots = ref<DaySlot[]>([])

const bookingLoading = ref(false)
const bookingRows = ref<BookingRow[]>([])

function formatDate(d: Date) {
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isSelectedDate(val: string) {
  return selectedDate.value === val
}

function changeMonth(delta: number) {
  let y = displayYear.value
  let m = displayMonth.value + delta
  if (m < 0) {
    y -= 1
    m = 11
  } else if (m > 11) {
    y += 1
    m = 0
  }
  displayYear.value = y
  displayMonth.value = m
}

const calendarCells = computed(() => {
  const firstDay = new Date(displayYear.value, displayMonth.value, 1)
  const offset = firstDay.getDay()
  const base = new Date(displayYear.value, displayMonth.value, 1 - offset)
  const cells: Array<{ key: string; day: number; date: string; isToday: boolean; isOtherMonth: boolean; hasSlot: boolean }> = []
  const slotDateSet = new Set(slots.value.map((s) => s.date))

  for (let i = 0; i < 42; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    const date = formatDate(d)
    cells.push({
      key: `${date}-${i}`,
      day: d.getDate(),
      date,
      isToday: date === formatDate(today),
      isOtherMonth: d.getMonth() !== displayMonth.value,
      hasSlot: slotDateSet.has(date),
    })
  }
  return cells
})

function selectDate(cell: { date: string; isOtherMonth: boolean }) {
  selectedDate.value = cell.date
  if (cell.isOtherMonth) {
    const d = new Date(cell.date)
    displayYear.value = d.getFullYear()
    displayMonth.value = d.getMonth()
  }
  buildDaySlots()
  loadBookings()
}

function pickSlot(slot: DaySlot) {
  if (slot.isFull) return
  selectedSlotId.value = slot.id
}

function normalizeService(raw: any): ServiceItem {
  return {
    id: Number(raw.id),
    name: raw.name || '未命名服务',
    duration: Number(raw.duration || 60),
    price: raw.price,
    description: raw.description,
  }
}

function normalizeBooking(raw: any): BookingRow {
  return {
    id: Number(raw.id),
    serviceName: raw.service_name || raw.serviceName || '-',
    userName: raw.user_name || raw.userName || '-',
    userPhone: raw.user_phone || raw.userPhone || '-',
    date: raw.slot_date || raw.slotDate || '-',
    time: `${raw.slot_start_time || raw.slotStartTime || '--'} - ${raw.slot_end_time || raw.slotEndTime || '--'}`,
    status: raw.status || 'pending',
  }
}

async function loadServices() {
  const res = await getAppointmentServiceList({ page: 1, page_size: 100 })
  const data = (res as any).data || {}
  const list = data.list || data.records || []
  services.value = Array.isArray(list) ? list.map((x: any) => normalizeService(x)) : []
  if (!slotCfgForm.serviceId && services.value.length > 0) {
    slotCfgForm.serviceId = services.value[0].id
  }
}

async function loadSlots() {
  const res = await getAppointmentSlotList({ page: 1, page_size: 500 })
  const data = (res as any).data || {}
  slots.value = data.list || data.records || []
  buildDaySlots()
}

function buildDaySlots() {
  const rows = slots.value
    .filter((s) => String(s.date) === selectedDate.value)
    .sort((a, b) => String(a.start_time ?? a.startTime).localeCompare(String(b.start_time ?? b.startTime)))
  daySlots.value = rows.map((s) => ({
    id: Number(s.id),
    time: `${s.start_time ?? s.startTime}`,
    isFull:
      Number(s.booked_count ?? s.bookedCount ?? 0) >= Number(s.capacity ?? s.maxCapacity ?? 0) ||
      Number(s.status ?? 0) === 0,
  }))
  if (!daySlots.value.some((x) => x.id === selectedSlotId.value)) {
    selectedSlotId.value = daySlots.value.find((x) => !x.isFull)?.id ?? null
  }
}

async function loadBookings() {
  bookingLoading.value = true
  try {
    const res = await getAppointmentList({
      page: 1,
      page_size: 100,
      start_date: selectedDate.value,
      end_date: selectedDate.value,
    })
    const data = (res as any).data || {}
    const list = data.list || data.records || []
    bookingRows.value = Array.isArray(list) ? list.map((x: any) => normalizeBooking(x)) : []
  } finally {
    bookingLoading.value = false
  }
}

function statusLabel(status: string) {
  if (status === 'confirmed') return '已确认'
  if (status === 'cancelled') return '已取消'
  if (status === 'completed') return '已完成'
  return '待确认'
}

function statusTagType(status: string): 'success' | 'danger' | 'info' | 'warning' {
  if (status === 'confirmed') return 'success'
  if (status === 'cancelled') return 'danger'
  if (status === 'completed') return 'info'
  return 'warning'
}

async function confirmBooking(row: BookingRow) {
  await confirmAppointment(row.id)
  ElMessage.success('已确认')
  loadBookings()
}

function contactUser(_row: BookingRow) {
  ElMessage.success('已打开联系入口')
}

const slotConfigVisible = ref(false)
const slotSaving = ref(false)
const slotCfgFormRef = ref<FormInstance>()
const slotCfgForm = reactive({
  serviceId: undefined as number | undefined,
  openMode: 'everyday',
  duration: 60,
  startTime: '09:00',
  endTime: '18:00',
  capacity: 1,
})

const slotCfgRules: FormRules = {
  serviceId: [{ required: true, message: '请选择服务', trigger: 'change' }],
  startTime: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  endTime: [{ required: true, message: '请选择结束时间', trigger: 'change' }],
  capacity: [{ required: true, message: '请输入每段名额', trigger: 'blur' }],
}

function openSlotConfigDialog() {
  slotConfigVisible.value = true
}

function iterateDates(from: Date, days: number): Date[] {
  const arr: Date[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(from)
    d.setDate(from.getDate() + i)
    arr.push(d)
  }
  return arr
}

function matchOpenMode(date: Date, mode: string): boolean {
  const w = date.getDay()
  if (mode === 'workday') return w >= 1 && w <= 5
  if (mode === 'weekend') return w === 0 || w === 6
  return true
}

async function saveSlotConfig() {
  const valid = await slotCfgFormRef.value?.validate().catch(() => false)
  if (!valid || !slotCfgForm.serviceId) return

  slotSaving.value = true
  try {
    // 原型是“配置”动作，这里按未来7天批量生成一组时段
    const base = new Date(selectedDate.value)
    const dates = iterateDates(base, 7).filter((d) => matchOpenMode(d, slotCfgForm.openMode))
    for (const d of dates) {
      await createAppointmentSlot({
        service_id: slotCfgForm.serviceId,
        date: formatDate(d),
        start_time: slotCfgForm.startTime,
        end_time: slotCfgForm.endTime,
        capacity: slotCfgForm.capacity,
      })
    }
    ElMessage.success('配置已保存')
    slotConfigVisible.value = false
    await loadSlots()
  } finally {
    slotSaving.value = false
  }
}

const serviceDialogVisible = ref(false)
const serviceSaving = ref(false)
const serviceFormRef = ref<FormInstance>()
const serviceForm = reactive({
  id: null as number | null,
  name: '',
  duration: 60,
  price: 0,
  description: '',
})

const serviceRules: FormRules = {
  name: [{ required: true, message: '请输入服务名称', trigger: 'blur' }],
  duration: [{ required: true, message: '请输入时长', trigger: 'blur' }],
}

function openServiceDialog(service: ServiceItem | null) {
  if (service) {
    serviceForm.id = service.id
    serviceForm.name = service.name
    serviceForm.duration = service.duration
    serviceForm.price = Number(service.price || 0)
    serviceForm.description = service.description || ''
  } else {
    serviceForm.id = null
    serviceForm.name = ''
    serviceForm.duration = 60
    serviceForm.price = 0
    serviceForm.description = ''
  }
  serviceDialogVisible.value = true
}

async function saveService() {
  const valid = await serviceFormRef.value?.validate().catch(() => false)
  if (!valid) return
  serviceSaving.value = true
  try {
    const payload = {
      name: serviceForm.name,
      duration: serviceForm.duration,
      price: serviceForm.price || undefined,
      description: serviceForm.description || undefined,
      status: AppointmentServiceStatus.Active,
    }
    if (serviceForm.id) {
      await updateAppointmentService(serviceForm.id, payload)
    } else {
      await createAppointmentService(payload)
    }
    ElMessage.success('保存成功')
    serviceDialogVisible.value = false
    await loadServices()
  } finally {
    serviceSaving.value = false
  }
}

onMounted(async () => {
  await loadServices()
  await loadSlots()
  await loadBookings()
})
</script>

<style scoped lang="scss">
.booking-page {
  .page-header {
    margin-bottom: 16px;
  }

  .page-title {
    font-size: 22px;
    font-weight: 800;
    color: #0d1b2e;
    line-height: 1.2;
  }

  .page-desc {
    margin-top: 6px;
    color: #6b7b93;
    font-size: 13px;
  }

  .top-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 16px;
  }

  .calendar-card,
  .config-card,
  .records-card {
    border-radius: 12px;
    border: 1px solid #e4e9f2;
  }

  .month-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    font-size: 14px;
    font-weight: 700;
  }

  .calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 6px;
  }

  .week-label {
    font-size: 12px;
    color: #6b7b93;
    text-align: center;
  }

  .day-cell {
    border: 1px solid #e4e9f2;
    border-radius: 10px;
    min-height: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    cursor: pointer;
    font-size: 13px;
    color: #1f2d3d;
    background: #fff;
  }

  .day-cell.other {
    color: #a3afc2;
    background: #f7f9fc;
  }

  .day-cell.today {
    border-color: #1769ff;
    box-shadow: inset 0 0 0 1px #1769ff;
  }

  .day-cell.selected {
    background: #eef4ff;
    border-color: #1769ff;
    color: #1769ff;
    font-weight: 700;
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #1769ff;
    position: absolute;
    right: 6px;
    bottom: 5px;
  }

  .calendar-legend {
    margin-top: 10px;
    font-size: 11px;
    color: #6b7b93;
    display: flex;
    gap: 12px;
  }

  .section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .section-head h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: #1f2d3d;
  }

  .times-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .time-chip {
    border: 1px solid #d5deea;
    border-radius: 10px;
    background: #fff;
    padding: 10px 6px;
    text-align: center;
    cursor: pointer;
    color: #1f2d3d;
    font-size: 13px;
  }

  .time-chip small {
    display: block;
    margin-top: 4px;
    color: #6b7b93;
    font-size: 11px;
  }

  .time-chip.full {
    background: #f6f7fa;
    color: #a3afc2;
    cursor: not-allowed;
  }

  .time-chip.selected {
    border-color: #1769ff;
    color: #1769ff;
    background: #eef4ff;
  }

  .service-list {
    border-top: 1px solid #e4e9f2;
    margin-top: 4px;
  }

  .service-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid #e4e9f2;
  }

  .service-main {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .service-main b {
    font-size: 13px;
    color: #1f2d3d;
  }

  .muted {
    color: #6b7b93;
    font-size: 12px;
  }

  .mb8 {
    margin-bottom: 8px;
  }

  .mt16 {
    margin-top: 16px;
  }

  .empty-text {
    grid-column: 1 / -1;
    text-align: center;
    color: #9aa9be;
    font-size: 12px;
    padding: 8px 0;
  }
}
</style>
