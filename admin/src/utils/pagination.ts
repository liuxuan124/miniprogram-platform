export function extractPageRecords<T = unknown>(payload: unknown): { list: T[]; total: number } {
  const root = (payload as { data?: Record<string, unknown> })?.data ?? (payload as Record<string, unknown>) ?? {}
  const list = root.records ?? root.list ?? root.items ?? []
  return {
    list: Array.isArray(list) ? (list as T[]) : [],
    total: Number(root.total ?? 0),
  }
}
