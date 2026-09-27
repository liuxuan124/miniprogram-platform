/** 与 miniapp/data/warm-planet.js、dsl-planet-* 保持同一展示契约。 */

export const PLANET_DEFAULT_SEGS = [
  { key: 'all', label: '全部' },
  { key: 'official', label: '官方更新' },
  { key: 'essence', label: '精华 ⭐️' },
  { key: 'ask', label: '读者提问' },
  { key: 'checkin', label: '打卡' },
  { key: 'resources', label: '资料库 128' },
]

export const PLANET_DEFAULT_KPIS = [
  { value: '3,241', label: '球友' },
  { value: '1.2万', label: '沉淀内容' },
  { value: '27', label: '今日新增' },
]

const DEFAULT_AVATARS: Record<string, string> = {
  墨白: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&q=80',
  十一: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&q=80',
  小满: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&q=80',
  阿柚: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&q=80',
}

export const PLANET_DEFAULT_FEED = [
  {
    uid: 'demo-p1', id: 'demo-p1', isDemo: true, top: true, hot: true,
    author: '墨白', authorInitial: '墨', tagGold: '置顶', tag: '星主', avatar: DEFAULT_AVATARS.墨白,
    time: '2 小时前 · 官方发布',
    content: '【9 月共读】本月我们读《认知盈余》。读完在评论区交一份 300 字笔记，我会逐条点评，优秀的直接进精华区 📌',
    file: { name: '9月共读·领读提纲.pdf', meta: '2.4 MB · 812 人看过 · 星球会员可看' },
    topics: '#共读计划 #认知盈余', images: [], likes: '486', comments: '142', type: 'official',
  },
  {
    uid: 'demo-p2', id: 'demo-p2', isDemo: true, hot: true,
    author: '十一', authorInitial: '十', tag: '读者提问', avatar: DEFAULT_AVATARS.十一,
    time: '4 小时前 · 杭州', content: '知识付费定价 99 和 199 差别有多大？我的专栏内容体量大概 20 讲，纠结一周了。',
    answer: '差别不在转化率，在你后面还想不想卖第二个产品。99 是引流位，199 才是利润位——先想清楚它在你产品矩阵里站哪个位置…',
    images: [], likes: '231', comments: '86', type: 'ask',
  },
  {
    uid: 'demo-p3', id: 'demo-p3', isDemo: true, hot: true,
    author: '小满', authorInitial: '小', tagGold: '精华', tag: '特约作者', avatar: DEFAULT_AVATARS.小满,
    time: '昨天 21:40', content: '我用 3 个月把公众号做到 5000 付费，把踩过的坑整理成了 9 张图。核心就一句：别追热点，追人群。',
    images: [], likes: '1.1k', comments: '203', type: 'essence',
  },
  {
    uid: 'demo-p4', id: 'demo-p4', isDemo: true,
    author: '阿柚', authorInitial: '阿', tag: '读者打卡 Day 42', avatar: DEFAULT_AVATARS.阿柚,
    time: '昨天 08:12', content: '晨写第 42 天。今天写了 1200 字关于小书店选品的复盘，发现自己开始能一口气写完不卡壳了。',
    images: [], likes: '96', comments: '18', type: 'checkin',
  },
]

function stripTags(value: unknown) {
  return String(value || '').replace(/<[^>]+>/g, '')
}

function formatFileSize(bytes: unknown) {
  const n = Number(bytes)
  if (!Number.isFinite(n) || n <= 0) return ''
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  if (n >= 1024) return `${Math.round(n / 1024)} KB`
  return `${n} B`
}

export function mapPlanetFeedItem(item: Record<string, any>, index = 0) {
  const tags = Array.isArray(item.tags) ? item.tags.map(String) : []
  const tagText = tags.join(' ')
  const top = !!(item.isPinned || item.pinned || item.top)
  const author = item.author || '球友'
  let content = stripTags(item.content || item.summary || item.title)
  let answer = item.answer || ''
  const parts = content.split(/\n---ANSWER---\n/)
  if (parts.length > 1) {
    content = parts[0].trim()
    if (!answer) answer = parts[1].trim()
  }
  const attachments = Array.isArray(item.attachments) ? item.attachments : []
  const firstAttachment = attachments[0] || null
  const file = item.file || (firstAttachment ? {
    name: firstAttachment.name || '附件.pdf',
    meta: [
      formatFileSize(firstAttachment.size),
      item.viewCount ? `${item.viewCount} 人看过` : '',
      '星球会员可看',
    ].filter(Boolean).join(' · '),
    fileId: firstAttachment.fileId || '',
  } : null)
  const id = item.id || item.uid || ''
  return {
    uid: String(item.uid || id || `planet-${index}`),
    id,
    isDemo: !!item.isDemo || !item.id,
    top,
    hot: item.hot != null ? !!item.hot : (/热议|热/.test(tagText) || Number(item.likeCount) > 200),
    author,
    authorInitial: item.authorInitial || String(author).slice(0, 1),
    tagGold: item.tagGold || (top ? '置顶' : (/精华/.test(tagText) ? '精华' : '')),
    tag: item.tag || tags.find((tag) => /星主|提问|打卡|官方|特约/.test(tag)) || '',
    avatar: item.authorAvatar || item.avatar || DEFAULT_AVATARS[author] || '',
    time: item.time || String(item.publishedAt || item.createTime || '').replace('T', ' ').slice(0, 16),
    content,
    answer,
    topics: item.topics || tags
      .filter((tag) => !/置顶|星主|精华|提问|官方|打卡|特约/.test(tag))
      .map((tag) => tag.startsWith('#') ? tag : `#${tag}`)
      .join(' '),
    images: Array.isArray(item.images) ? item.images.filter(Boolean) : [],
    likes: item.likeCount != null ? String(item.likeCount) : String(item.likes || '0'),
    comments: item.commentCount != null ? String(item.commentCount) : String(item.comments || '0'),
    liked: !!item.liked,
    favorited: !!item.favorited,
    file,
    type: item.type || '',
  }
}
