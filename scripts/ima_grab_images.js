/* ==========================================================================
 * ima 图片批量抓取脚本（在你的 Chrome 里已登录 ima 的标签页控制台运行）
 *
 * 用法：
 *   1. 打开 https://ima.qq.com/wikis 进「跨境电商项目知识库」
 *   2. F12 → Console
 *   3. 整段粘贴 → 回车
 *   4. 等待完成，会自动下载 ima_images.json
 *
 * 原理：复用页面自己的 token 调 /api/knowledge/get_knowledge_list，
 *      拿到每个文件的 imgUrls（带签名，剥离 imageMogr2 即原图）
 * ========================================================================== */
(async () => {
  const OUT = [];
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // 1) 取 token
  let token = '';
  try {
    const ai = localStorage.getItem('ima-universal-local-storage-accountInfo');
    if (ai) token = JSON.parse(ai).token || '';
  } catch (e) {}
  if (!token) { console.error('✗ 拿不到 token，请先登录'); return; }
  console.log('✓ token 已获取');

  // 2) 当前知识库 ID（从 URL 或接口取）
  let kbId = new URLSearchParams(location.search).get('knowledgeBaseId');
  if (!kbId) {
    const st = JSON.parse(localStorage.getItem('KnowledgeBase_GET_HOME_PAGE_DATA') || '{}');
    kbId = st?.value?.knowledgeBaseInfo?.id || st?.value?.userId;
  }
  if (!kbId) { console.error('✗ 取不到 knowledgeBaseId'); return; }
  console.log('✓ 知识库:', kbId);

  // 3) 探测 API 前缀
  const prefixes = ['/api/knowledge', '/cgi-bin/knowledge', '/api'];
  let base = null, listData = null;
  for (const p of prefixes) {
    try {
      const r = await fetch(p + '/get_knowledge_list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ knowledgeBaseId: kbId, offset: 0, count: 20, cursor: '', noContent: 0 })
      });
      const j = await r.json();
      if (j && (j.knowledgeListInfo || j.knowledgeList || j.code === 0)) {
        base = p; listData = j; break;
      }
    } catch (e) {}
  }
  if (!base) { console.error('✗ API 前缀探测失败'); return; }
  console.log('✓ API 前缀:', base);

  const extract = j =>
    (j.knowledgeListInfo && j.knowledgeListInfo.list) ||
    (j.knowledgeList && j.knowledgeList.list) ||
    j.list || [];

  // 4) BFS 遍历所有文件夹
  const queue = [{ folderId: '', name: '根目录' }];
  const seen = new Set();
  const folders = [];

  while (queue.length) {
    const { folderId, name } = queue.shift();
    const key = folderId || '_root';
    if (seen.has(key)) continue;
    seen.add(key);

    let cursor = '', all = [];
    for (let page = 0; page < 30; page++) {
      let j;
      try {
        const r = await fetch(base + '/get_knowledge_list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({
            knowledgeBaseId: kbId, folderId, offset: 0,
            count: 100, cursor, noContent: 0
          })
        });
        j = await r.json();
      } catch (e) { break; }

      const list = extract(j);
      all = all.concat(list);
      const end = j.knowledgeListInfo?.isEnd ?? j.isEnd;
      const nc = j.knowledgeListInfo?.nextCursor ?? j.nextCursor;
      if (end || !nc || nc === cursor || !list.length) break;
      cursor = nc;
      await sleep(250);
    }

    // 文件夹：收集文件 + 入队子文件夹
    const files = [];
    for (const it of all) {
      if (it.mediaType === 99 || it.folderInfo) {       // 99 = FOLDER
        queue.push({
          folderId: it.folderId || it.folderInfo?.folderId || it.mediaId,
          name: it.title || it.folderInfo?.name
        });
        folders.push({ folderId: it.folderId, name: it.title });
      } else {
        files.push(it);
      }
    }
    console.log('  📁 %s → %d 个文件', name, files.length);

    for (const f of files) {
      const urls = (f.imgUrls || []).map(u =>
        u.replace(/&imageMogr2\/[^&]*/, '').replace(/\?imageMogr2\/[^&]*/, '')
      );
      OUT.push({
        folder: name,
        title: f.title,
        mediaId: f.mediaId,
        mediaType: f.mediaType,
        size: f.fileSize,
        imgUrls: urls,
        rawImgUrls: f.imgUrls || []
      });
    }
    await sleep(300);
  }

  console.log('\n✓ 抓取完成：%d 个文件', OUT.length);
  const withImg = OUT.filter(x => x.imgUrls.length);
  console.log('  含图片 URL 的文件：%d', withImg.length);

  // 5) 下载 JSON
  const blob = new Blob([JSON.stringify({
    knowledgeBaseId: kbId,
    capturedAt: new Date().toISOString(),
    folders,
    items: OUT
  }, null, 2)], { type: 'application/json' });

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ima_images_' + kbId + '.json';
  a.click();

  console.log('\n📦 已下载 ima_images_%s.json', kbId);
  console.log('   把这个文件发给我，我就能批量下载原图并上传到小程序。');
  window.__imaImages = OUT;   // 便于控制台继续查
})();
