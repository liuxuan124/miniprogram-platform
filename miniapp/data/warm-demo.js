const { picsum } = require('./warm-media')

const DEMO_LIST = {
  cats: ['全部', '内容创业', '写作方法', '私域运营', '工具', '访谈', '年度精选'],
  ranks: [
    { id: 'd1', title: '当内容不再免费：一个创作者的第 1000 天', views: '2.3万', top: true },
    { id: 'd2', title: '做内容的第三年，我承认日更是伪命题', views: '1.8万', top: true },
    { id: 'd3', title: '付费社群运营 SOP：冷启动到第一个 100 人', views: '9.4k', top: true },
    { id: 'd4', title: '我把公众号后台数据全部公开了', views: '7.2k', top: false },
  ],
  big: {
    id: 'big1',
    title: '被算法推着走的三年，和我决定停下来的那天',
    summary: '一篇关于节奏、耐心与长期主义的长文。附我重建内容系统的完整方法论与三张可用表格。',
    cover: picsum('ls1', 800, 420),
    author: '墨白 · 主理人',
    avatar: picsum('u3', 40, 40),
    meta: '09-13 · 18 分钟阅读',
    tag: '年度精选',
  },
  rows: [
    {
      id: 'r1',
      layout: 'row',
      title: '付费社群运营 SOP：从冷启动到第一个 100 人',
      summary: '含欢迎语模板、周更节奏表、活跃度指标三张表，可直接抄作业。',
      cover: picsum('warmp4', 300, 240),
      meta: '会员专享 · 老陈 · 9.4k 阅读',
      tag: '会员专享',
    },
    {
      id: 'r2',
      layout: 'audio',
      title: '访谈 EP.24｜和一位月入 3 万的独立写作者聊聊',
      duration: '42:18',
    },
    {
      id: 'r3',
      layout: 'row',
      title: '视频课：一条选题从想法到发布的完整 30 分钟',
      summary: '全程录屏，不剪辑。看我如何把一个模糊念头变成可发布的稿子。',
      cover: picsum('ls2', 300, 240),
      meta: '视频 · 墨白 · 5.6k 播放',
      tag: '视频',
      duration: '30:12',
    },
    {
      id: 'r4',
      layout: 'grid3',
      title: '我的 2026 工位全家桶｜9 张图讲清一个内容人的装备',
      images: [picsum('lg1', 300, 300), picsum('lg2', 300, 300), picsum('lg3', 300, 300)],
      meta: '图文笔记 · 小满 · ❤ 4.2k',
      tag: '图文笔记',
      contentType: 'note',
    },
    {
      id: 'r5',
      layout: 'row',
      title: '星球精选：知识付费定价 99 和 199 差别有多大？',
      summary: '星主长回答 + 86 条球友真实数据，已收录进「资料库 · 定价」。',
      cover: picsum('pp1', 300, 240),
      meta: '星球内容 · 暖阁星球 · 3.1k 浏览',
      tag: '星球内容',
      toMoment: true,
    },
  ],
}

const DEMO_ARTICLE = {
  title: '当内容不再免费：一个创作者的第 1000 天',
  cover: picsum('warmfeat', 900, 760),
  tag: '深度 · 创作者手记',
  author: '墨白',
  authorRole: '主理人',
  avatar: picsum('u3', 90, 90),
  meta: '09-13 · 12 分钟阅读 · 2.3 万阅读',
  lead: '这篇写给所有正在犹豫「要不要收费」的人。1000 天里我换过三次模式，亏过钱，也第一次靠文字养活了自己。',
  html: [
    '<p>第 1000 天的早上，我把后台数据导出来算了一笔账：累计 412 篇文章、3241 位付费读者、单篇最高 11 万阅读——但真正让我活下来的，是其中不到 20 篇。</p>',
    '<h2>一、免费换来的不是信任，是习惯</h2>',
    '<p>最初两年我坚持全免费。那时的逻辑很朴素：先把人聚起来，再想变现。结果是，我聚起了 5 万人，其中愿意为内容付一分钱的，不到 0.6%。</p>',
    '<p>后来我才明白，<b>免费培养的是“消费习惯”，而不是“付费意愿”</b>。你越勤奋地免费供给，读者越确信这件事本就不该花钱。</p>',
    `<figure><img src="${picsum('art1', 800, 500)}" alt="" /><figcaption>2023-2026 三年间的收入结构变化</figcaption></figure>`,
    '<blockquote>「不要用产量换存在感。读者记住的永远是那三五篇，让他愿意转发给同事的东西。」</blockquote>',
    '<h2>二、我做对的三件事</h2>',
    '<ul><li>把选题库从“我想写什么”改成“谁会为它转发”</li><li>停掉日更，改成周更 + 每月一篇长稿</li><li>把社群从微信群搬进星球，让沉淀可被检索</li></ul>',
    '<p>第三件尤其关键。微信群里的好内容，24 小时后就等于不存在；而星球里的一条精华，半年后还在源源不断地带来新成员。</p>',
  ].join(''),
  tags: ['内容创业', '知识付费', '创作者经济', '私域'],
  related: [
    { id: 'rel1', title: '付费社群运营 SOP：从冷启动到第一个 100 人', meta: '老陈 · 9.4k 阅读', cover: picsum('warmp4', 300, 240) },
    { id: 'rel2', title: '做内容的第三年，我终于承认「日更」是个伪命题', meta: '墨白 · 1.8 万阅读', cover: picsum('warmp1', 300, 240) },
    { id: 'rel3', title: '星球热议：知识付费定价 99 和 199 差别有多大？', meta: '暖阁星球 · 142 条讨论', cover: picsum('pp1', 300, 240), toMoment: true },
  ],
}

const DEMO_NOTE = {
  title: '我的书桌改造 ✨ 一个内容人的暖光角落',
  author: '小满',
  authorRole: '特约作者',
  avatar: picsum('u1', 80, 80),
  // proto counter 1/9
  gallery: [
    picsum('nt1', 780, 940), picsum('nt1b', 780, 940), picsum('nt1c', 780, 940),
    picsum('nt1d', 780, 940), picsum('nt1e', 780, 940), picsum('nt1f', 780, 940),
    picsum('nt1g', 780, 940), picsum('nt1h', 780, 940), picsum('nt1i', 780, 940),
  ],
  topics: ['#书桌改造', '#工位美学', '#内容创作者日常', '#暖光'],
  meta: '编辑于 09-12 · 杭州',
  likeDisplay: '4.2k',
  favoriteDisplay: '1.1k',
  commentDisplay: '286',
  commentCount: 286,
  paras: [
    '去年整整一年，我都在客厅那张餐桌上写东西。腰酸、没有仪式感、一到晚上灯光冷得像办公室。今年终于给自己搭了一个只属于写作的角落，成本 2000 出头。',
    '1 桌板｜橡木直拼 120×60，2cm 厚，¥399',
    '2 桌腿｜手摇升降，站着写更专注，¥520',
    '3 灯｜3000K 暖光落地灯，是整个角落的灵魂，¥289',
    '4 椅子｜二手人体工学，闲鱼 ¥650，成色九成',
    '5 小物｜陶土杯垫、藤编收纳、一束永生花',
    '最想说的一点：灯光比家具更重要。把顶灯关掉，只留一盏暖光，桌面立刻从「工位」变成「书房」。我现在晚上坐下就想写字，这件事本身就值回票价。',
    '下一篇写我的收纳逻辑，想看的评论区扣 1 🙋‍♀️',
  ],
  html: [
    '<p>去年整整一年，我都在客厅那张餐桌上写东西。腰酸、没有仪式感、一到晚上灯光冷得像办公室。今年终于给自己搭了一个只属于写作的角落，成本 2000 出头。</p>',
    '<p>1 桌板｜橡木直拼 120×60，2cm 厚，¥399<br/>2 桌腿｜手摇升降，站着写更专注，¥520<br/>3 灯｜3000K 暖光落地灯，是整个角落的灵魂，¥289<br/>4 椅子｜二手人体工学，闲鱼 ¥650，成色九成<br/>5 小物｜陶土杯垫、藤编收纳、一束永生花</p>',
    '<p>最想说的一点：<b>灯光比家具更重要</b>。把顶灯关掉，只留一盏暖光，桌面立刻从「工位」变成「书房」。我现在晚上坐下就想写字，这件事本身就值回票价。</p>',
    '<p>下一篇写我的收纳逻辑，想看的评论区扣 1 🙋‍♀️</p>',
  ].join(''),
  goods: {
    title: '一个人的内容生意 · 专栏',
    desc: '笔记提到的选题库模板在第 6 讲',
    cover: picsum('warmc1', 200, 200),
    url: '/pages/product-detail/product-detail?demo=column',
  },
  comments: [
    { nick: '阿桃', avatar: picsum('u2', 80, 80), text: '1！求收纳篇，我桌面线材已经乱成一团了 😭', likes: 128, reply: '小满（作者）：这周就写！线材我全走了桌下理线架，超救命' },
    { nick: '十一', avatar: picsum('u5', 80, 80), text: '升降桌真的有用吗，一直在犹豫要不要上', likes: 46 },
    { nick: '豆先生', avatar: picsum('u6', 80, 80), text: '3000K 这个建议太真实了，冷光下我一个字都写不出来', likes: 31 },
  ],
}

/** 首页推荐流九宫格笔记（warm-home f3 / warm-note-d2） */
const DEMO_MEAL_NOTE = {
  title: '一周三餐记录｜在家做饭其实很省时间',
  author: '暖阁编辑部',
  authorRole: '官方',
  avatar: picsum('ed1', 80, 80),
  gallery: [
    picsum('warmg1', 780, 780), picsum('warmg2', 780, 780), picsum('warmg3', 780, 780),
    picsum('nt2', 780, 780), picsum('nt3', 780, 780), picsum('nt5', 780, 780),
    picsum('nt4', 780, 780), picsum('nt6', 780, 780), picsum('nt7', 780, 780),
  ],
  topics: ['#一周三餐', '#在家做饭', '#备菜', '#内容创作者日常'],
  meta: '编辑于 09-14 · 杭州',
  likeDisplay: '1.9k',
  favoriteDisplay: '486',
  commentDisplay: '128',
  commentCount: 128,
  paras: [
    '这周试着把三餐都在家里解决。不是为了省钱，是为了把「决策」从外卖软件里拿回来。',
    '周一到周五固定：早燕麦、午剩菜翻新、晚一锅两吃。周末才允许点一次外卖当奖励。',
    '1️⃣ 备菜｜周日花 40 分钟切好葱姜蒜和叶菜，分装进保鲜盒',
    '2️⃣ 工具｜一个厚底锅 + 空气炸锅，覆盖 80% 场景',
    '3️⃣ 清单｜冰箱门贴「本周必吃」三行，吃完再补',
    '省下来的不只是钱，还有每天晚饭前那 20 分钟的犹豫。想要完整周菜单的，评论区扣「菜单」。',
  ],
  html: [
    '<p>这周试着把三餐都在家里解决。不是为了省钱，是为了把「决策」从外卖软件里拿回来。</p>',
    '<p>周一到周五固定：早燕麦、午剩菜翻新、晚一锅两吃。周末才允许点一次外卖当奖励。</p>',
    '<p>1️⃣ 备菜｜周日花 40 分钟切好葱姜蒜和叶菜，分装进保鲜盒<br/>2️⃣ 工具｜一个厚底锅 + 空气炸锅，覆盖 80% 场景<br/>3️⃣ 清单｜冰箱门贴「本周必吃」三行，吃完再补</p>',
    '<p>省下来的不只是钱，还有每天晚饭前那 20 分钟的犹豫。想要完整周菜单的，评论区扣「菜单」。</p>',
  ].join(''),
  goods: {
    title: '一个人的内容生意 · 专栏',
    desc: '把「决策系统」从外卖 App 搬回生活，同款节奏在第 4 讲',
    cover: picsum('warmc1', 200, 200),
    url: '/pages/product-detail/product-detail?demo=column',
  },
  comments: [
    { nick: '阿柚', avatar: picsum('u8', 80, 80), text: '菜单！求一份可直接抄的周菜单 🙏', likes: 86, reply: '编辑部：下周发「一人食备菜清单」，先关注不迷路' },
    { nick: '十一', avatar: picsum('u5', 80, 80), text: '空气炸锅真能覆盖 80%？我感觉只适合复热…', likes: 42 },
    { nick: '豆先生', avatar: picsum('u6', 80, 80), text: '「决策从外卖软件拿回来」这句话太准了，每天纠结比做饭还累', likes: 37 },
  ],
}

const DEMO_PLANET_POST = {
  author: '十一',
  authorTag: '读者提问',
  avatar: picsum('u5', 90, 90),
  time: '今天 05:26 · 杭州',
  title: '知识付费定价 99 和 199，差别到底有多大？',
  content: '我的专栏大概 20 讲，录了一半。身边朋友劝我定 99 先跑量，但我自己算下来 199 才刚够覆盖成本。\n\n纠结了整整一周，想听听球友们真实的数据：你们的第一款产品定了多少？转化率如何？',
  images: [picsum('pp1', 320, 320), picsum('pp2', 320, 320), picsum('pp3', 320, 320)],
  topics: '#定价策略 #知识付费 #新手提问',
  stats: '3,124 浏览 · 86 条讨论 · 收录于「资料库 · 定价」',
  answer: {
    bar: '⭐️ 星主回答 · 已设为精华',
    paras: [
      '差别不在转化率，在你后面还想不想卖第二个产品。',
      '99 是引流位，199 才是利润位。先想清楚它在你产品矩阵里站哪个位置，再倒推价格——而不是反过来用价格去凑成本。',
      '如果这是你唯一的产品，且短期不打算做第二款，定 199；如果你后面还有社群、陪跑、线下课，那第一款就该定 99 甚至 69，把人筛进来。',
    ],
    likes: 231,
    asks: 24,
  },
  likeWall: {
    avatars: [picsum('u1', 60, 60), picsum('u2', 60, 60), picsum('u4', 60, 60), picsum('u6', 60, 60), picsum('u8', 60, 60)],
    text: '小满、阿桃 等 231 位球友觉得有用',
  },
  comments: [
    { nick: '墨白', badge: '星主', isHost: true, avatar: picsum('u3', 80, 80), text: '先把产品在矩阵里的位置想清楚，再倒推价格。引流位和利润位别混成一锅。', likes: 312 },
    { nick: '小满', badge: '特约作者', avatar: picsum('u1', 80, 80), text: '我第一款 99，转化 3.2%；第二款同样内容换个封面卖 199，转化 2.8%。说明什么？价格不是主要变量，信任才是。', likes: 189, reply: '十一：这个数据太有说服力了，谢谢！那我先做信任资产' },
    { nick: 'Ray', avatar: picsum('u4', 80, 80), text: '补充一个坑：别一上来就打折。首发价就是你的锚点，后面再想涨回去基本不可能。', likes: 112 },
    { nick: '野格', avatar: picsum('u7', 80, 80), text: '我是 20 讲定 149，算是折中。真实反馈是：买的人根本没提价格，提的都是更新太慢 😅', likes: 64 },
  ],
}

const DEMO_COLUMN = {
  title: '一个人的内容生意',
  cover: picsum('warmc1', 900, 700),
  introImage: picsum('col1', 800, 440),
  tag: '连载中 · 每周三更新',
  price: 199,
  original: 399,
  chapterCount: 32,
  reviewCountLabel: '1.6k',
  learners: '1.2 万人在学',
  teacher: {
    name: '墨白',
    role: '暖阁主理人',
    avatar: picsum('u3', 90, 90),
    bio: '前媒体主编，独立创作第 1000 天。公众号 5 万订阅、星球 3241 人，全部一个人完成。',
  },
  intro: [
    '这不是一门教你「涨粉」的课。它讲的是，当你只有一个人、没有团队也没有预算时，如何把写作变成一门能长期养活自己的生意。',
    '全部内容来自我三年里真实跑通（和跑砸）的实验：三次改版、两次定价失败、一次被平台限流到归零。每一讲都会给出可以直接抄走的表格或模板。',
  ],
  pts: [
    { b: '📐 可复用模板', s: '选题库 / 发布节奏表 / 定价模型' },
    { b: '🎧 音频 + 讲稿', s: '通勤能听，回看有文字稿' },
    { b: '🪐 星球陪跑', s: '购买即赠 90 天星球会员' },
    { b: '♾️ 永久回看', s: '更新不加价，一次买断' },
  ],
  chapterGroups: [
    {
      title: '第一章 · 先想清楚你在卖什么',
      items: [
        { no: '01', title: '为什么「涨粉」是最没用的目标', free: true, meta: '免费试听 · 12:40' },
        { no: '02', title: '找到你的 100 个真实读者', free: true, meta: '免费试听 · 15:02' },
        { no: '03', title: '内容产品的三层货架结构', free: false, meta: '18:24 · 含模板 ×2' },
      ],
    },
    {
      title: '第二章 · 把写作变成系统',
      items: [
        { no: '04', title: '选题库：我用了三年的那张表', free: false, meta: '21:10 · 含模板 ×1' },
        { no: '05', title: '停掉日更之后，我的数据反而涨了', free: false, meta: '16:38' },
        { no: '06', title: '如何一稿三用：长文 / 笔记 / 星球', free: false, meta: '19:55' },
      ],
    },
  ],
  chapters: [
    { no: '01', title: '为什么「涨粉」是最没用的目标', free: true, meta: '免费试听 · 12:40' },
    { no: '02', title: '找到你的 100 个真实读者', free: true, meta: '免费试听 · 15:02' },
    { no: '03', title: '内容产品的三层货架结构', free: false, meta: '18:24 · 含模板 ×2' },
    { no: '04', title: '选题库：我用了三年的那张表', free: false, meta: '21:10 · 含模板 ×1' },
    { no: '05', title: '停掉日更之后，我的数据反而涨了', free: false, meta: '16:38' },
    { no: '06', title: '如何一稿三用：长文 / 笔记 / 星球', free: false, meta: '19:55' },
  ],
  reviews: [
    { nick: '阿桃', avatar: picsum('u2', 60, 60), stars: '★★★★★', text: '第 4 讲那张选题表我直接搬到 Notion 用了两个月，现在写东西再也不会开天窗。光这一张表就值回价格。' },
    { nick: '阿柚', avatar: picsum('u8', 60, 60), stars: '★★★★★', text: '很少见到把失败案例讲这么细的课。第 11 讲那次限流复盘，我听了三遍。' },
    { nick: '十一', avatar: picsum('u5', 60, 60), stars: '★★★★☆', text: '买完立刻把定价从 99 调到 199，转化几乎没掉。方法论很落地。' },
  ],
  faqs: [
    { q: '购买后多久可以看？', a: '支付成功后立即开通全部已更新章节，后续更新不加价。' },
    { q: '支持退款吗？', a: '虚拟专栏不支持无理由退款。可先免费试听前两讲确认是否适合你。' },
    { q: '和星球会员有什么关系？', a: '购买专栏即赠 90 天星球会员，可在星球里追问本课相关问题。' },
    { q: '有发票吗？', a: '可在「我的 - 订单与发票」申请电子发票。' },
  ],
}

const DEMO_GOODS = {
  title: '内容生意手册',
  cover: picsum('eb1', 400, 560),
  bg: picsum('eb1', 900, 700),
  introImage: picsum('ebd', 800, 420),
  price: 39,
  original: 79,
  memberPrice: 31,
  memberPerk: '另享资料库全解锁',
  metaLine: '墨白 著 · 12 万字 · EPUB / PDF · ⭐️ 4.9',
  specs: [
    { k: '商品类型', v: '虚拟商品 · 电子书' },
    {
      k: '交付方式',
      vBefore: '支付后立即到账，',
      em: '在小程序内阅读',
      vAfter: '，不发实体',
      v: '支付后立即到账，在小程序内阅读，不发实体',
    },
    { k: '可用格式', v: '在线阅读 / EPUB / PDF（转发保存）' },
    { k: '阅读期限', v: '永久有效 · 换手机登录同一微信可继续读' },
  ],
  tryRead: {
    cfg: '试读范围由后台配置',
    title: '第 1 章　先想清楚你在卖什么',
    paragraphs: [
      '我见过太多人把「涨粉」当成目标。粉丝数是一个结果指标，它会随着你做对的事情自然增长，但把它当成目标之后，你所有的动作都会开始变形——追热点、蹭话题、发标题党，最后留下一群不会为你付一分钱的人。',
      '真正该问的问题只有一个：谁会因为这篇东西，愿意把它转发给同事？这个人就是你的核心读者，而你的产品，最终只卖给他和他身边的人。',
    ],
    readChapters: 2,
    totalChapters: 12,
    percent: 16,
  },
  about: [
    '这不是一本教你涨粉的书。它讲的是当你只有一个人、没有团队也没有预算时，如何把写作变成一门能长期养活自己的生意。',
    '全书 12 章，来自我三年里真实跑通和跑砸的实验：三次改版、两次定价失败、一次被平台限流到归零。每章末尾附一份可直接使用的表格。',
  ],
  toc: [
    { no: '01', title: '先想清楚你在卖什么', free: true },
    { no: '02', title: '找到你的 100 个真实读者', free: true },
    { no: '03', title: '内容产品的三层货架结构', free: false },
    { no: '04', title: '选题库：我用了三年的那张表', free: false },
    { no: '05', title: '定价：99 和 199 的真实差别', free: false },
  ],
  reviews: [
    { nick: '阿桃', avatar: picsum('u2', 60, 60), stars: '★★★★★', text: '第 4 章那张选题表我直接搬到 Notion 用了两个月，光这一张表就值回价格。' },
    { nick: '阿柚', avatar: picsum('u8', 60, 60), stars: '★★★★☆', text: '很少见到把失败案例写这么细的。唯一遗憾是没有纸质版。' },
  ],
  reviewCountLabel: '826',
}

const DEMO_RESOURCES = {
  cats: ['全部 128', '模板', '提纲', '数据表', '清单', '合集'],
  groups: [
    {
      title: '本周更新',
      items: [
        { id: 'f1', name: '9月共读·领读提纲', ext: 'PDF', meta: '2.4 MB · 12 页 · 812 人看过', locked: false, actionText: '试读 ›', tryHint: '可看前 2 页 / 20%' },
        { id: 'f2', name: '2026 全年选题库模板（含公式）', ext: 'XLSX', meta: '860 KB · 3 个工作表 · 会员专享', locked: true, actionText: '🔒 解锁', tryHint: '仅首页可见' },
        { id: 'f3', name: '付费社群冷启动 SOP 全套', ext: 'PDF', meta: '4.1 MB · 28 页 · 会员专享', locked: true, actionText: '🔒 解锁', tryHint: '可看前 2 页' },
      ],
    },
    {
      title: '高频下载',
      items: [
        { id: 'f4', name: '暖阁封面模板包 · 24 款', ext: 'ZIP', meta: '36 MB · 含 PSD / Figma · 1,204 人看过', locked: false, actionText: '试读 ›', tryHint: '可预览缩略图' },
        { id: 'f5', name: '内容账号数据周报表', ext: 'XLSX', meta: '420 KB · 自动计算 · 会员专享', locked: true, actionText: '🔒 解锁', tryHint: '仅首页可见' },
      ],
    },
  ],
  footerText: '共 128 份 · 已解锁 2 份',
}

/** 会员态：全部解锁 / 可转发保存 */
const DEMO_RESOURCES_MEMBER = {
  cats: DEMO_RESOURCES.cats,
  groups: [
    {
      title: '本周更新',
      items: [
        { id: 'f1', name: '9月共读·领读提纲', ext: 'PDF', meta: '2.4 MB · 12 页 · 已看过', locked: false, actionText: '预览 ›', tryHint: '可转发保存' },
        { id: 'f2', name: '2026 全年选题库模板（含公式）', ext: 'XLSX', meta: '860 KB · 3 个工作表 · 已解锁', locked: false, actionText: '预览 ›', tryHint: '可转发保存' },
        { id: 'f3', name: '付费社群冷启动 SOP 全套', ext: 'PDF', meta: '4.1 MB · 28 页 · 已解锁', locked: false, actionText: '预览 ›', tryHint: '可转发保存' },
      ],
    },
    {
      title: '高频下载',
      items: [
        { id: 'f4', name: '暖阁封面模板包 · 24 款', ext: 'ZIP', meta: '36 MB · 含 PSD / Figma · 已解锁', locked: false, actionText: '预览 ›', tryHint: '可转发保存' },
        { id: 'f5', name: '内容账号数据周报表', ext: 'XLSX', meta: '420 KB · 自动计算 · 已解锁', locked: false, actionText: '预览 ›', tryHint: '可转发保存' },
      ],
    },
  ],
  footerText: '共 128 份 · 全部已解锁',
}

const DEMO_JOIN = {
  title: '来加个微信吧\n有问题随时找得到人',
  desc: '新书首发、资料更新、线下活动都会先在群里通知。购买、发票、解锁异常也可以直接找客服处理。',
  memberCount: '已有 2,860 位读者加入读者群',
  avatars: [picsum('u1', 50, 50), picsum('u2', 50, 50), picsum('u5', 50, 50), picsum('u8', 50, 50)],
  ownerWay: {
    name: '加主理人墨白',
    desc: '仅限年度会员与专栏学员，验证时请备注手机号后四位',
    icon: '✍️',
    qrcode: '',
  },
  groups: [
    { id: 'g1', name: '内容创业交流群 · 7 群', desc: '186 / 200 人', icon: '💡', fill: 93, full: false, tip: '入群后请修改备注为「城市 + 方向」' },
    { id: 'g2', name: '共读打卡群 · 3 群', desc: '124 / 200 人', icon: '📖', fill: 62, full: false },
    { id: 'g3', name: '新书 / 上新通知群', desc: '200 / 200 人 · 已满', icon: '🛍', fill: 100, full: true },
  ],
  faqs: [
    { q: '买了电子书打不开怎么办？', a: '先在「我的 - 已购内容」确认订单状态。若显示已支付但未解锁，把订单号发给在线客服，通常 5 分钟内手动补发。' },
    { q: '进群需要付费吗？', a: '读者群免费。星球和专栏是单独的付费产品，不影响进群。' },
    { q: '群二维码扫不出来？', a: '群码 7 天更新一次，过期请回到本页重新获取，或直接联系在线客服拉你进群。' },
  ],
}

const DEMO_SHARE = {
  title: '当内容不再免费：一个创作者的第 1000 天',
  cover: picsum('warmfeat', 900, 700),
  quote: '不要用产量换存在感。读者记住的永远是那三五篇，让他愿意转发给同事的东西。',
  author: '墨白',
  avatar: picsum('u3', 60, 60),
  inviteDays: 21,
  inviteCount: 3,
}

const DEMO_CONTRIBUTE = {
  heroTitle: '平台正在招募\n长期供稿的创作者',
  heroDesc: '目前站内内容由编辑部与特约作者产出。我们每月放开少量名额，通过后即可在小程序内直接发布长文与图文笔记。',
  stats: [
    { b: '12', s: '本月名额' },
    { b: '3-5 天', s: '审核周期' },
    { b: '60%', s: '内容分成' },
  ],
  why: [
    { ic: '🪧', b: '署名与身份标识', p: '通过后获得「特约作者」标识，出现在首页作者位与每篇内容署名处。' },
    { ic: '💰', b: '付费内容分成', p: '你的长文进入会员区后，按阅读时长与转化参与分成，月度结算。' },
    { ic: '🪐', b: '星球共建权限', p: '可在星球发起话题、回答读者提问，内容沉淀进资料库。' },
  ],
  topics: ['内容创业', '写作方法', '工位美学', '读书', '副业', '咖啡'],
  forms: ['深度长文', '图文笔记', '音频', '视频'],
  publishTypes: [
    { key: 'note', label: '图文笔记' },
    { key: 'article', label: '长文' },
    { key: 'moment', label: '星球动态' },
  ],
}

const DEMO_ORDER = {
  productName: '内容生意手册',
  cover: picsum('eb1', 160, 160),
  subtitle: '虚拟商品 · EPUB / PDF · 12 万字',
  price: '39.00',
  original: '79',
  coupon: '5.00',
  beans: '2.40',
  pay: '31.60',
  orderNo: 'NG202609140941',
}

/** ¥1 支付验通路（暖阁体验包）— demo=pay1|1；布局对齐 goods 暖色虚拟详情 */
const DEMO_PAY1 = {
  title: '暖阁体验包 · 1元',
  subtitle: '支付体验',
  metaLine: '虚拟商品 · 支付后立即开通 · 实付 ¥1',
  cover: picsum('pay1', 400, 400),
  price: 1,
  original: 9.9,
  productType: 'digital',
  deliveryMode: 'auto',
  description: '虚拟商品 · 支付成功后立即开通体验权限，无需填写收货地址。',
  specs: [
    { k: '商品类型', v: '虚拟商品 · 体验包' },
    {
      k: '交付方式',
      vBefore: '支付后立即到账，',
      em: '开通体验权限',
      vAfter: '，无需物流',
      v: '支付后立即到账，开通体验权限，无需物流',
    },
    { k: '用途说明', v: '用于支付通路体验，实付 ¥1' },
    { k: '有效期', v: '即时生效 · 换手机登录同一微信可继续用' },
  ],
  gains: [
    '走通「下单 → 支付 → 到账」全流程',
    '虚拟权限即时开通，无需填地址',
    '可复用方法论与清单模板预览',
  ],
  about: [
    '这是暖阁用于验证微信支付通路的体验包：支付成功后立即开通体验权限，无需填写收货地址。',
    '适合先走通支付与到账流程，再购买专栏、电子书等正式内容。',
  ],
  notice: '⚠️ 虚拟商品说明：体验包为数字权益，支付成功后立即开通，不支持退款。发票可在「我的 - 订单与发票」申请。',
}

module.exports = {
  picsum,
  DEMO_LIST,
  DEMO_ARTICLE,
  DEMO_NOTE,
  DEMO_MEAL_NOTE,
  DEMO_PLANET_POST,
  DEMO_COLUMN,
  DEMO_GOODS,
  DEMO_PAY1,
  DEMO_RESOURCES,
  DEMO_RESOURCES_MEMBER,
  DEMO_JOIN,
  DEMO_SHARE,
  DEMO_CONTRIBUTE,
  DEMO_ORDER,
  /** 商城页完整演示数据见 data/warm-shop.js */
  DEMO_SHOP_VIP: require('./warm-shop').VIP_BAR,
}
