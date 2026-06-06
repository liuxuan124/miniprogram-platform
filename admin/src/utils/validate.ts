/** 通用校验工具 */

/** 校验是否为合法手机号 */
export function isPhone(value: string): boolean {
  return /^1[3-9]\d{9}$/.test(value)
}

/** 校验是否为合法邮箱 */
export function isEmail(value: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)
}

/** 校验是否为合法 URL */
export function isUrl(value: string): boolean {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

/** 校验密码强度（至少8位，含字母和数字） */
export function isStrongPassword(value: string): boolean {
  return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/.test(value)
}

/** 校验是否为空值（null / undefined / 空字符串 / 空数组 / 空对象） */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true
  if (Array.isArray(value) && value.length === 0) return true
  if (typeof value === 'object' && Object.keys(value).length === 0) return true
  return false
}
