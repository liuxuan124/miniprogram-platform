import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getPendingChanges,
  postContentPreflight,
  publishMiniSite,
  type MiniPublishResultVO,
} from '@/api/miniSite'
import { refreshMiniPendingGlobal } from '@/composables/useMiniPending'

/**
 * 将已保存的站点/页面草稿同步到线上可读配置（不触发微信代码上传）。
 */
export function useMiniConfigSync() {
  const syncing = ref(false)

  async function syncToLive(options?: {
    pageIds?: Array<number | string>
    includeSite?: boolean
    notes?: string
    changeIds?: string[]
  }): Promise<MiniPublishResultVO | null> {
    if (syncing.value) return null
    syncing.value = true
    try {
      let changeIds = options?.changeIds?.filter(Boolean) || []
      // 调用方没点选具体改动时，才回落到「待发布列表」
      let hasPendingChange = changeIds.length > 0
      if (!changeIds.length) {
        const pending = await getPendingChanges()
        changeIds = (pending.items || [])
          .map((i) => String(i.changeId || ''))
          .filter(Boolean)
        const siteDirty = pending.siteDraftChanged ?? pending.siteDirty ?? false
        hasPendingChange = changeIds.length > 0 || siteDirty === true
      }

      // 后端「禁空发」：无改动时发布接口会静默什么都不做（siteConfigPromoted=false），
      // 预检也只回 canPublish=false 而不给 blocking。这里先自己判断，别让用户去找不存在的阻断项。
      if (!hasPendingChange && !options?.pageIds?.length) {
        await ElMessageBox.alert(
          '当前没有待发布的改动，所以没有内容可以同步到线上。\n\n'
          + '如果后台看起来和小程序不一致，通常是改动被直接写进了数据库（例如迁移脚本），'
          + '没有经过后台保存，变更检测因此认为「无改动」。\n'
          + '解决办法：在后台任意做一处真实改动并保存草稿，再点一次同步即可。',
          '没有可同步的改动',
          { type: 'info', confirmButtonText: '知道了' },
        )
        return null
      }

      const pre = changeIds.length
        ? await postContentPreflight(changeIds)
        : await postContentPreflight([])

      const blocking = pre.blocking || []
      if (blocking.length) {
        await ElMessageBox.alert(blocking.join('\n'), '无法同步到线上', { type: 'warning' })
        return null
      }
      if (pre.canPublish === false) {
        // 没有 blocking 却不让发，多半仍是「无改动」；把话说清楚，不要再报「存在阻断项」
        await ElMessageBox.alert(
          '后台判定当前配置不能发布，但没有给出具体的阻断项。\n\n'
          + '最常见的原因是没有待发布的改动。可以在后台做一处真实改动并保存草稿后重试；'
          + '若仍然如此，请查看后端预检日志。',
          '暂时无法同步',
          { type: 'warning' },
        )
        return null
      }

      const warnings = pre.warnings || []
      if (warnings.length) {
        const preview = warnings.slice(0, 10).join('\n')
        try {
          await ElMessageBox.confirm(
            `${preview}${warnings.length > 10 ? '\n…' : ''}\n\n仍要写入线上配置？`,
            '同步前提醒',
            { type: 'warning', confirmButtonText: '确认同步', cancelButtonText: '返回' },
          )
        } catch {
          return null
        }
      }

      const includeSite = options?.includeSite ?? !(options?.pageIds?.length)
      const result = await publishMiniSite({
        includeSite,
        pageIds: options?.pageIds,
        notes: options?.notes || '后台发布配置',
      })

      await refreshMiniPendingGlobal(true)
      const no = result.liveReleaseNo
      // 去重命中：同一批改动在防重复窗口内重复提交，后端幂等返回、没有重复写入
      if (result.deduplicated) {
        ElMessage.info(result.message || '刚刚已同步过同一批改动，本次无需重复提交')
        return result
      }
      // 发布接口可能返回 200 却什么都没做（禁空发）；这种情况不能报「已写入线上配置」
      const nothingDone = result.siteConfigPromoted === false
        && !(result.publishedPages || result.publishedPageCount)
      if (nothingDone) {
        ElMessage.warning(
          '本次没有任何内容被写入线上配置（后台判定无改动）。'
          + '请先在后台做一处真实改动并保存草稿，再同步。',
        )
        return result
      }
      ElMessage.success(
        no != null ? `已写入线上配置（内容版本 ${no}）` : (result.message || '已写入线上配置'),
      )
      return result
    } catch (e: unknown) {
      // 后端业务异常（如「发布过于频繁…」）在 response.data.message 里；
      // axios 原始 error.message 只会是「Request failed with status code 400」，对用户没有意义，别直接抛给用户。
      const apiMsg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      const raw = e instanceof Error ? e.message : ''
      const fallback = raw && !/^Request failed with status code/i.test(raw) ? raw : '同步失败，请稍后重试'
      ElMessage.error(apiMsg || fallback)
      return null
    } finally {
      syncing.value = false
    }
  }

  return { syncing, syncToLive }
}
