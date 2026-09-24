export type QaListItem = {
  id: number | string
  question: string
  answerPreview: string
  tags: string[]
  spectatorCount: number
  payStatusLabel: string
  visibility: string
  link_url: string
}

const STATUS_LABELS: Record<string, string> = {
  pending_pay: '待支付',
  pending_answer: '待回答',
  answered: '已解答',
  timeout_refund: '已退款',
}

export function mapQaRecord(raw: Record<string, unknown>, index = 0): QaListItem {
  const id = raw.id ?? index + 1
  const status = String(raw.status || 'answered')
  const visibility = String(raw.visibility || 'public')
  const q = String(raw.title || raw.body || '用户提问').trim()
  const answer = String(raw.answerBody || raw.answer_body || '').trim()
  return {
    id: id as number | string,
    question: q.length > 80 ? `${q.slice(0, 80)}…` : q,
    answerPreview: answer ? (answer.length > 120 ? `${answer.slice(0, 120)}…` : answer) : '等待星主回答…',
    tags: visibility === 'private' ? ['私密'] : ['公开'],
    spectatorCount: Number(raw.spectatorCount ?? raw.spectator_count ?? 0) || 0,
    payStatusLabel: STATUS_LABELS[status] || status,
    visibility,
    link_url: `/pages/question-detail/question-detail?id=${id}`,
  }
}

export function demoQaItems(limit = 5): QaListItem[] {
  const rows = [
    { id: 1, body: '独立站收款被风控，如何申诉？', status: 'answered', answerBody: '先整理物流与客诉记录…', spectatorCount: 42 },
    { id: 2, body: 'TikTok 小店入驻资质清单？', status: 'pending_answer', visibility: 'public', spectatorCount: 18 },
    { id: 3, body: '星球会员能否看历史资料？', status: 'answered', answerBody: '可以，在资料库筛选星球专享。', spectatorCount: 7 },
  ]
  return rows.slice(0, limit).map((r, i) => mapQaRecord(r as Record<string, unknown>, i))
}
