/**
 * 预约管理相关 API
 * 严格遵循接口契约
 */
import { get, post, put, del } from './request'
import type {
  AppointmentService,
  CreateAppointmentServiceParams,
  UpdateAppointmentServiceParams,
  AppointmentServiceListParams,
  AppointmentSlot,
  CreateAppointmentSlotParams,
  BatchCreateSlotParams,
  UpdateAppointmentSlotParams,
  AppointmentSlotListParams,
  AppointmentRecord,
  AppointmentListParams,
} from '@/types/appointment'
import type { PageResult } from '@/types/global'

const BASE_URL = '/api/v1/admin'

// ==================== 预约服务 ====================

/** 获取预约服务列表 */
export function getAppointmentServiceList(params?: AppointmentServiceListParams) {
  const query = params
    ? {
        current: params.page,
        size: params.page_size,
        keyword: params.keyword,
        status: params.status,
      }
    : undefined
  return get<PageResult<AppointmentService>>(`${BASE_URL}/appointment-services`, query as Record<string, unknown>)
}

/** 创建预约服务 */
export function createAppointmentService(data: CreateAppointmentServiceParams) {
  return post<AppointmentService>(`${BASE_URL}/appointment-services`, data as unknown as Record<string, unknown>)
}

/** 获取预约服务详情 */
export function getAppointmentServiceDetail(id: number) {
  return get<AppointmentService>(`${BASE_URL}/appointment-services/${id}`)
}

/** 更新预约服务 */
export function updateAppointmentService(id: number, data: UpdateAppointmentServiceParams) {
  return put<AppointmentService>(`${BASE_URL}/appointment-services/${id}`, data as unknown as Record<string, unknown>)
}

/** 删除预约服务 */
export function deleteAppointmentService(id: number) {
  return del<void>(`${BASE_URL}/appointment-services/${id}`)
}

// ==================== 预约时段 ====================

/** 获取预约时段列表 */
export function getAppointmentSlotList(params?: AppointmentSlotListParams) {
  const query = params
    ? {
        current: params.page,
        size: params.page_size,
        serviceId: params.service_id,
        date: params.date,
        status: params.status,
      }
    : undefined
  return get<PageResult<AppointmentSlot>>(`${BASE_URL}/appointment-slots`, query as Record<string, unknown>)
}

/** 创建预约时段 */
export function createAppointmentSlot(data: CreateAppointmentSlotParams) {
  const payload = {
    serviceId: data.service_id,
    date: data.date,
    startTime: data.start_time,
    endTime: data.end_time,
    maxCapacity: data.capacity,
    status: 1,
  }
  return post<AppointmentSlot>(`${BASE_URL}/appointment-slots`, payload as unknown as Record<string, unknown>)
}

/** 批量创建预约时段 */
export function batchCreateAppointmentSlots(data: BatchCreateSlotParams) {
  const [startDate, endDate] = data.date_range || []
  const start = new Date(startDate)
  const end = new Date(endDate)
  const tasks: Promise<any>[] = []
  if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const yyyy = d.getFullYear()
      const mm = `${d.getMonth() + 1}`.padStart(2, '0')
      const dd = `${d.getDate()}`.padStart(2, '0')
      tasks.push(
        createAppointmentSlot({
          service_id: data.service_id,
          date: `${yyyy}-${mm}-${dd}`,
          start_time: data.start_time,
          end_time: data.end_time,
          capacity: data.capacity,
        })
      )
    }
  }
  return Promise.all(tasks) as unknown as Promise<any>
}

/** 更新预约时段 */
export function updateAppointmentSlot(id: number, data: UpdateAppointmentSlotParams) {
  const payload: Record<string, unknown> = {
    serviceId: data.service_id,
    date: data.date,
    startTime: data.start_time,
    endTime: data.end_time,
  }
  if (data.capacity !== undefined) payload.maxCapacity = data.capacity
  if (data.status !== undefined) payload.status = data.status
  return put<AppointmentSlot>(`${BASE_URL}/appointment-slots/${id}`, payload as unknown as Record<string, unknown>)
}

// ==================== 预约记录 ====================

/** 获取预约记录列表 */
export function getAppointmentList(params?: AppointmentListParams) {
  const query = params
    ? {
        current: params.page,
        size: params.page_size,
        status: params.status,
        serviceId: params.service_id,
        contactName: params.keyword,
        appointmentDate: params.start_date,
      }
    : undefined
  return get<PageResult<AppointmentRecord>>(`${BASE_URL}/appointments`, query as Record<string, unknown>)
}

/** 确认预约 */
export function confirmAppointment(id: number) {
  return put<AppointmentRecord>(`${BASE_URL}/appointments/${id}/confirm`)
}

/** 取消预约 */
export function cancelAppointment(id: number) {
  return put<AppointmentRecord>(`${BASE_URL}/appointments/${id}/cancel`)
}
