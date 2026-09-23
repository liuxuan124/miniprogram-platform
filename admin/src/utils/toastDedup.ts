import { ElMessage, type MessageHandler } from 'element-plus'

const openByKey = new Map<string, MessageHandler>()

/** 同类 Toast 只保留最新一条（如「已同步 N 条数据」） */
export function showDedupMessage(
  key: string,
  message: string,
  type: 'success' | 'warning' | 'info' | 'error' = 'success',
) {
  const prev = openByKey.get(key)
  if (prev) prev.close()
  const handler = ElMessage[type]({
    message,
    offset: 72,
    grouping: true,
    onClose: () => {
      if (openByKey.get(key) === handler) openByKey.delete(key)
    },
  })
  openByKey.set(key, handler)
}
