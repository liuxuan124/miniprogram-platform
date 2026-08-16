import { ElMessageBox } from 'element-plus'

export async function confirmRemoveComponent(label: string): Promise<boolean> {
  try {
    await ElMessageBox.confirm(
      `确定删除「${label}」？删除后可用撤销恢复；未点保存前离开会再确认。`,
      '删除组件',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        distinguishCancelAndClose: true,
      },
    )
    return true
  } catch {
    return false
  }
}
