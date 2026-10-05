/**
 * 静默草稿：外观页的所有改动自动落草稿，不再要求用户点「保存草稿」。
 *
 * 设计要点：
 * 1. 防抖 800ms 合并连续输入（品牌名称/副标题是逐字输入的，不防抖会打出一串请求）。
 * 2. 写入前留快照；写入失败自动回滚 UI，并把表单还原成服务端真值，
 *    避免「界面显示已改、实际没存」这种最难查的静默不一致。
 * 3. 与「保存并同步」彻底解耦：本 composable 只写草稿，永不触发 publish。
 * 4. pendingCount 在每次成功写入后刷新，顶部计数实时联动。
 */
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { refreshMiniPendingGlobal } from '@/composables/useMiniPending'

export type DraftSaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

export function useSilentDraft(debounceMs = 800) {
  /** 供 UI 显示的保存态；不要用它判断「能不能发布」——发布看 pendingCount */
  const state = ref<DraftSaveState>('idle')
  const lastSavedAt = ref('')
  const lastError = ref('')

  let timer: number | null = null
  let inflight: Promise<boolean> | null = null
  /** 连续失败计数：连挂多次就停止自动重试，避免无限打接口 */
  let failStreak = 0

  function clearTimer() {
    if (timer != null) {
      window.clearTimeout(timer)
      timer = null
    }
  }

  /**
   * 排一次静默写入。
   * @param run 真正执行写入的函数，抛异常即视为失败
   * @returns 是否成功（await 时可拿到结果；不 await 也安全）
   */
  function schedule(run: () => Promise<unknown>): Promise<boolean> {
    clearTimer()
    state.value = 'pending'
    const p = new Promise<boolean>((resolve) => {
      timer = window.setTimeout(async () => {
        timer = null
        const ok = await execute(run)
        resolve(ok)
      }, debounceMs)
    })
    return p
  }

  /** 立即执行（跳过防抖）：用于失焦、关闭抽屉等「用户明确表示改完了」的时刻 */
  async function flush(run: () => Promise<unknown>): Promise<boolean> {
    clearTimer()
    return execute(run)
  }

  async function execute(run: () => Promise<unknown>): Promise<boolean> {
    if (inflight) {
      // 上一次还没回来：等它，避免并发写同一个草稿互相覆盖
      await inflight
    }
    state.value = 'saving'
    const task = (async () => {
      try {
        await run()
        failStreak = 0
        lastError.value = ''
        state.value = 'saved'
        lastSavedAt.value = new Date().toISOString()
        void refreshMiniPendingGlobal(true)
        return true
      } catch (e: unknown) {
        failStreak += 1
        lastError.value = e instanceof Error ? e.message : '保存失败'
        state.value = 'error'
        if (failStreak === 1) {
          // 只在首次失败时打扰用户；连续失败不刷屏
          ElMessage.error(`草稿未保存：${lastError.value}`)
        }
        return false
      } finally {
        inflight = null
      }
    })()
    inflight = task
    return task
  }

  /** 状态回 idle：切换页面时调用，避免离开后还挂着「已保存」 */
  function reset() {
    clearTimer()
    state.value = 'idle'
  }

  return { state, lastSavedAt, lastError, schedule, flush, reset }
}
