/**
 * Warm prototype seed bodies — real HTML (not summary/title/pill stubs).
 * Shared by sync-warm-prototype-to-db.js and sync-warm-prototype-to-prod.sql.js
 */
const path = require('path')
const root = path.join(__dirname, '../..')
const warmDemo = require(path.join(root, 'miniapp/data/warm-demo.js'))

function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function p(text) {
  return `<p>${escHtml(text)}</p>`
}

function parasToHtml(paras) {
  return (paras || []).map((x) => p(x)).join('')
}

const DEMO_ARTICLE = warmDemo.DEMO_ARTICLE || {}
const DEMO_NOTE = warmDemo.DEMO_NOTE || {}

/** Desk / warm-note-d1 / home f2 */
function deskNoteHtml() {
  return DEMO_NOTE.html || parasToHtml(DEMO_NOTE.paras)
}

function featureArticleHtml() {
  const lead = DEMO_ARTICLE.lead || ''
  const body = DEMO_ARTICLE.html || ''
  return `<p class="lead">${escHtml(lead)}</p>${body}`
}

const NOTE_BODIES = {
  d1: deskNoteHtml,
  desk: deskNoteHtml,
  d2: () => [
    p('这周试着把三餐都在家里解决。不是为了省钱，是为了把「决策」从外卖软件里拿回来。'),
    p('周一到周五固定：早燕麦、午剩菜翻新、晚一锅两吃。周末才允许点一次外卖当奖励。'),
    p('1️⃣ 备菜｜周日花 40 分钟切好葱姜蒜和叶菜，分装进保鲜盒\n2️⃣ 工具｜一个厚底锅 + 空气炸锅，覆盖 80% 场景\n3️⃣ 清单｜冰箱门贴「本周必吃」三行，吃完再补'),
    p('省下来的不只是钱，还有每天晚饭前那 20 分钟的犹豫。想要完整周菜单的，评论区扣「菜单」。'),
  ].join(''),
  d3: (n) => {
    const q = (n && n.quote) || '「别把更新频率当成努力的证据。作品的密度，才是。」'
    return [
      p(q.replace(/\n/g, ' ')),
      p('这句话是我停掉日更之后写在书桌对面的。产量会给人「我在努力」的错觉，但读者记住的永远是那三五篇愿意转发的东西。'),
      p('如果你也在被日更绑架，试着把本周目标改成：一篇你愿意署名三年的稿子。'),
    ].join('')
  },
  d4: () => [
    p('选题库我改到第 4 版了。这一版终于把「想写」和「会卖」拆开：左边灵感池，右边转发预测分。'),
    p('模板里有三张表：灵感池、选题评分（谁会转发 / 谁会付费 / 可一稿三用）、本月发布节奏。'),
    p('评论区回「模板」我发 Notion 副本链接。会员可在资料库直接下载带公式的版本。'),
  ].join(''),
  d5: () => [
    p('裸辞第 90 天，我把账本摊开给自己看：不是励志，是怕自己骗自己。'),
    p('固定支出｜房租+社保≈7200；可变｜餐饮交通≈2800；收入｜专栏+星球分成≈1.1 万。账面还活着，心理账户已经见底过两次。'),
    p('最有用的一笔：把「安全感现金」单独开户，不动用。剩下的才允许做内容实验。完整表在下一篇。'),
  ].join(''),
  d6: () => [
    p('秋天浅烘也能很暖。这 6 杯手冲我按「甜感优先」挑的，适合写稿时慢慢喝。'),
    p('1️⃣ 日晒耶加｜蜂蜜尾韵\n2️⃣ 水洗肯尼亚｜果汁感\n3️⃣ 厌氧瑰夏｜花香但不飘\n4️⃣ 曼特宁｜厚实垫底\n5️⃣ 哥伦比亚｜平衡日常\n6️⃣ 拼配暖调｜晚上写到很晚也不苦'),
    p('水温统一 90℃，粉水比 1:15。想要冲煮参数卡的扣「手冲」。'),
  ].join(''),
  d7: () => [
    p('读完《深度工作》后，我删掉了 11 个 App。不是自律表演，是发现通知本身在偷走选题。'),
    p('留下的：备忘录、日历、相机、银行。社交只留一个，且关掉一切红点。'),
    p('第一周会慌，第二周开始能写完整段落。如果你也想试，先删最常点开却从不产出的那个。'),
  ].join(''),
  d8: () => [
    p('在县城开一家小书店，第一年的真实账：不是浪漫，是房租、滞销与偶尔的高光。'),
    p('收入结构｜零售 42% / 活动门票 28% / 咖啡轻食 30%。真正养店的是每月两场共读，不是畅销榜。'),
    p('踩过的坑：进太多「看起来很美」的书。现在只进我愿意手写荐语的。完整表格下期发。'),
  ].join(''),
}

const ARTICLE_BODIES = {
  a1: () => [
    `<p class="lead">${escHtml('把节奏交还给作品本身，比交给算法更稳。这篇聊聊我如何重建选题库与发布节奏。')}</p>`,
    p('第三年我才敢承认：日更从来不是创作纪律，是平台驯化。我停更两周，阅读不降反升，因为剩下的稿子终于有密度。'),
    '<h2>重建节奏的三步</h2>',
    '<ul><li>选题库按「转发意愿」打分，而不是按灵感新鲜度</li><li>周更一篇长文 + 两条笔记，替代每天交差</li><li>每月留一篇「愿意署名三年」的深稿</li></ul>',
    p('完整方法论与三张表，在文末会员区。'),
  ].join(''),
  a2: () => [
    `<p class="lead">${escHtml('含欢迎语模板、周更节奏表、活跃度指标三张表，可直接抄作业。')}</p>`,
    p('冷启动最怕两件事：没人说话，和说话的人很快走。SOP 的核心不是「热闹」，是让每个新成员在 72 小时内完成一次有效互动。'),
    '<h2>第一个 100 人清单</h2>',
    '<ul><li>欢迎语分层：访客 / 付费 / 沉默老成员</li><li>周更节奏：问答日、共读日、作业日</li><li>活跃指标：回帖率、完课率、邀请率，而不是群消息条数</li></ul>',
    p('模板包在会员资料库，标题含「社群冷启动」。'),
  ].join(''),
  a3: featureArticleHtml,
  a4: () => [
    p('「免费培养的是消费习惯，而不是付费意愿。」'),
    p('这是编辑部在选题会上反复拿出来用的一句。当你还在用免费堆阅读量时，读者学到的是：好内容本来就该白嫖。'),
    p('改法很简单也很难：先选一篇你愿意为之收费的稿，写进付费墙后面，看谁愿意留下来。'),
  ].join(''),
  feature: featureArticleHtml,
  '1000': featureArticleHtml,
}

function matchNoteKey(item) {
  const uid = String(item.uid || item.id || '').toLowerCase()
  if (NOTE_BODIES[uid]) return uid
  const title = String(item.title || item.quote || '')
  if (/书桌改造/.test(title)) return 'd1'
  if (/三餐|做饭/.test(title)) return 'd2'
  if (/更新频率|作品的密度|quote|别把更新/.test(title) || item.isText) {
    if (/密度|更新频率/.test(title + (item.quote || ''))) return 'd3'
  }
  if (/选题库|Notion/.test(title)) return 'd4'
  if (/裸辞|现金流/.test(title)) return 'd5'
  if (/手冲|秋天/.test(title)) return 'd6'
  if (/深度工作|删掉了/.test(title)) return 'd7'
  if (/书店|县城/.test(title)) return 'd8'
  return ''
}

function matchArticleKey(item) {
  const uid = String(item.uid || item.id || '').toLowerCase()
  if (ARTICLE_BODIES[uid]) return uid
  const title = String(item.title || '')
  if (/内容不再免费|第\s*1000/.test(title)) return 'a3'
  if (/日更.*伪命题|承认「?日更/.test(title)) return 'a1'
  if (/社群运营 SOP|冷启动/.test(title)) return 'a2'
  if (/免费培养|付费意愿/.test(title + (item.quote || ''))) return 'a4'
  return ''
}

function buildNoteHtml(item) {
  const key = matchNoteKey(item || {})
  if (key && NOTE_BODIES[key]) return NOTE_BODIES[key](item)
  if (item && item.quote) {
    return [
      p(String(item.quote).replace(/\n/g, ' ')),
      p('把这句话放在手边，比再多写三条「今日打卡」更有用。欢迎在评论区写下你的版本。'),
    ].join('')
  }
  const title = (item && (item.title || item.summary)) || '笔记'
  const summary = (item && item.summary) || ''
  return [
    p(summary || `关于「${title}」，我记了几件真实发生的小事。`),
    p('过程比结论重要：我把踩坑、清单和可复用的小方法写在下面，方便你直接抄走。'),
    p('若这篇帮到你，收藏后在评论区留下你的场景，我看见会回。'),
  ].join('')
}

function buildArticleHtml(item) {
  const key = matchArticleKey(item || {})
  if (key && ARTICLE_BODIES[key]) return ARTICLE_BODIES[key](item)
  const title = (item && item.title) || '长文'
  const lead = (item && (item.summary || item.lead)) || ''
  // never seed pill-only body
  const safeLead = lead && !/^(深度长文|会员专享|年度精选|图文笔记|今日精选)$/.test(String(lead).trim())
    ? lead
    : `这篇写「${title}」背后的判断、实验与可复用步骤。`
  return [
    `<p class="lead">${escHtml(safeLead)}</p>`,
    p('先说结论，再说证据。我把可直接落地的清单放在中间，把踩过的坑放在后半段。'),
    '<h2>你可以带走的三件事</h2>',
    '<ul><li>一套可复用的判断框架</li><li>一张能抄走的清单或表格</li><li>至少两个真实案例的对照</li></ul>',
    p('若你正在做类似的事，欢迎把你的场景写在评论区，我在下一轮迭代里回应高频问题。'),
  ].join('')
}

function buildHomeFeedHtml(item) {
  if (!item) return buildArticleHtml({})
  if (item.seg === 'note' || /笔记|书桌|三餐/.test(item.title || '')) {
    return buildNoteHtml({
      title: item.title,
      summary: item.summary,
      uid: /书桌/.test(item.title || '') ? 'd1' : /三餐/.test(item.title || '') ? 'd2' : '',
    })
  }
  return buildArticleHtml({
    title: item.title,
    summary: item.summary,
    uid: /日更/.test(item.title || '') ? 'a1' : /SOP|社群/.test(item.title || '') ? 'a2' : /1000|不再免费/.test(item.title || '') ? 'a3' : '',
  })
}

function buildRankHtml(r) {
  return buildArticleHtml({
    title: r.title,
    summary: `${r.views || ''} 阅读`.trim(),
    uid: /1000|不再免费/.test(r.title || '') ? 'a3' : /日更/.test(r.title || '') ? 'a1' : /SOP|社群/.test(r.title || '') ? 'a2' : '',
  })
}

function buildListRowHtml(r) {
  const isNote = r.contentType === 'note' || r.layout === 'grid3'
  if (isNote) return buildNoteHtml({ title: r.title, summary: r.summary })
  return buildArticleHtml({ title: r.title, summary: r.summary })
}

function buildListBigHtml(b) {
  return buildArticleHtml({
    title: b.title,
    summary: b.summary,
    uid: /算法|停下来|长期主义/.test(b.title || '') ? '' : '',
  })
}

module.exports = {
  deskNoteHtml,
  featureArticleHtml,
  buildNoteHtml,
  buildArticleHtml,
  buildHomeFeedHtml,
  buildRankHtml,
  buildListRowHtml,
  buildListBigHtml,
  DEMO_NOTE,
  DEMO_ARTICLE,
}
