/**
 * 全局类型定义
 */

/** 通用 API 响应结构 */
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

/** 分页请求参数 */
export interface PageParams {
  page: number
  pageSize: number
}

/** 分页响应数据 */
export interface PageResult<T = any> {
  list?: T[]
  records?: T[]
  items?: T[]
  total: number
  page?: number
  pageSize?: number
  current?: number
  size?: number
}

/** 后端分页响应别名，兼容 list/items/records 字段命名 */
export interface PaginatedResponse<T = any> extends PageResult<T> {
  items?: T[]
  records?: T[]
  current?: number
  size?: number
}

/** 登录请求参数 */
export interface LoginParams {
  username: string
  password: string
}

/** 登录响应数据 */
export interface LoginResult {
  accessToken?: string
  token?: string
  refreshToken: string
  expiresIn: number
}

/** 用户信息 */
export interface UserInfo {
  id: number
  username: string
  nickname: string
  avatar: string
  roles: string[]
  permissions: string[]
  realName?: string
  avatarUrl?: string
  roleCode?: string
  roleName?: string
}

/** 菜单项 */
export interface MenuItem {
  path: string
  name: string
  component?: string
  redirect?: string
  meta: RouteMeta
  children?: MenuItem[]
}

/** 路由元信息 */
export interface RouteMeta {
  title: string
  icon?: string
  hidden?: boolean
  alwaysShow?: boolean
  activeMenu?: string
  roles?: string[]
  permissions?: string[]
  affix?: boolean
  breadcrumb?: boolean
  cache?: boolean
}
