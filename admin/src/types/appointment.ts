/**
 * 预约管理相关类型定义
 */

/** 预约服务状态 */
export enum AppointmentServiceStatus {
  Active = 1,
  Inactive = 0,
}

/** 预约服务状态标签 */
export const AppointmentServiceStatusLabels: Record<AppointmentServiceStatus, string> = {
  [AppointmentServiceStatus.Active]: '已启用',
  [AppointmentServiceStatus.Inactive]: '已停用',
}

/** 预约服务状态标签类型 */
export const AppointmentServiceStatusTagType: Record<AppointmentServiceStatus, string> = {
  [AppointmentServiceStatus.Active]: 'success',
  [AppointmentServiceStatus.Inactive]: 'danger',
}

/** 预约服务 */
export interface AppointmentService {
  id: number
  name: string
  description?: string
  duration: number
  price?: number
  status: AppointmentServiceStatus
  slot_count: number
  created_at: string
  updated_at: string
}

/** 创建预约服务参数 */
export interface CreateAppointmentServiceParams {
  name: string
  description?: string
  duration: number
  price?: number
  status?: AppointmentServiceStatus
}

/** 更新预约服务参数 */
export interface UpdateAppointmentServiceParams {
  name?: string
  description?: string
  duration?: number
  price?: number
  status?: AppointmentServiceStatus
}

/** 预约服务列表查询参数 */
export interface AppointmentServiceListParams {
  page?: number
  page_size?: number
  keyword?: string
  status?: string | number
}

/** 预约时段状态 */
export enum AppointmentSlotStatus {
  Available = 1,
  Disabled = 0,
}

/** 预约时段状态标签 */
export const AppointmentSlotStatusLabels: Record<AppointmentSlotStatus, string> = {
  [AppointmentSlotStatus.Available]: '可预约',
  [AppointmentSlotStatus.Disabled]: '已禁用',
}

/** 预约时段状态标签类型 */
export const AppointmentSlotStatusTagType: Record<AppointmentSlotStatus, string> = {
  [AppointmentSlotStatus.Available]: 'success',
  [AppointmentSlotStatus.Disabled]: 'info',
}

/** 预约时段 */
export interface AppointmentSlot {
  id: number
  service_id: number
  service_name?: string
  date: string
  start_time: string
  end_time: string
  capacity: number
  booked_count: number
  status: AppointmentSlotStatus
  created_at: string
  updated_at: string
}

/** 创建预约时段参数 */
export interface CreateAppointmentSlotParams {
  service_id: number
  date: string
  start_time: string
  end_time: string
  capacity: number
}

/** 批量创建预约时段参数 */
export interface BatchCreateSlotParams {
  service_id: number
  date_range: string[]
  start_time: string
  end_time: string
  capacity: number
}

/** 更新预约时段参数 */
export interface UpdateAppointmentSlotParams {
  service_id?: number
  date?: string
  start_time?: string
  end_time?: string
  capacity?: number
  status?: AppointmentSlotStatus
}

/** 预约时段列表查询参数 */
export interface AppointmentSlotListParams {
  page?: number
  page_size?: number
  service_id?: number
  date?: string
  start_date?: string
  end_date?: string
  status?: string | number
}

/** 预约记录状态 */
export enum AppointmentStatus {
  Pending = 'pending',
  Confirmed = 'confirmed',
  Cancelled = 'cancelled',
  Completed = 'completed',
}

/** 预约记录状态标签 */
export const AppointmentStatusLabels: Record<AppointmentStatus, string> = {
  [AppointmentStatus.Pending]: '待确认',
  [AppointmentStatus.Confirmed]: '已确认',
  [AppointmentStatus.Cancelled]: '已取消',
  [AppointmentStatus.Completed]: '已完成',
}

/** 预约记录状态标签类型 */
export const AppointmentStatusTagType: Record<AppointmentStatus, string> = {
  [AppointmentStatus.Pending]: 'warning',
  [AppointmentStatus.Confirmed]: 'success',
  [AppointmentStatus.Cancelled]: 'danger',
  [AppointmentStatus.Completed]: 'info',
}

/** 预约记录 */
export interface AppointmentRecord {
  id: number
  service_id: number
  service_name?: string
  slot_id: number
  slot_date: string
  slot_start_time: string
  slot_end_time: string
  user_name: string
  user_phone: string
  remark?: string
  status: AppointmentStatus
  created_at: string
  updated_at: string
}

/** 预约记录列表查询参数 */
export interface AppointmentListParams {
  page?: number
  page_size?: number
  keyword?: string
  service_id?: number
  status?: string
  start_date?: string
  end_date?: string
}
