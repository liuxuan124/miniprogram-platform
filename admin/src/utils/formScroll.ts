/**
 * 表单校验失败时滚动到首个错误项（E3）
 */
import type { FormInstance } from 'element-plus'

export async function validateFormAndScroll(formRef: FormInstance | undefined): Promise<boolean> {
  if (!formRef) return false
  try {
    await formRef.validate()
    return true
  } catch (fields) {
    const firstField = Object.keys(fields as Record<string, unknown>)[0]
    if (firstField) {
      formRef.scrollToField(firstField)
    }
    return false
  }
}
