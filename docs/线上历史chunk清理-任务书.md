# 任务：清理生产服务器 admin-static 的历史 chunk 残留

> 这是一段可直接交给 AI/同事执行的完整任务书。**脚本已在生产服务器实测跑通**（dry-run 验证：
> 自检通过、待删 18027 个、释放 341.1MB），不需要再做前置调研。

---

## 背景与目标

生产服务器 `zfculture`（124.220.11.79）的 `/opt/miniprogram-platform/admin-static/assets/`
里堆积了大量**永远不会被浏览器请求的历史构建产物**。

**成因**：本项目用 `tar -xzf` 做**解压式部署**（禁用 `rsync --delete`，因为它会删掉线上
非构建资源），且 vite 产出的 chunk 文件名带**内容哈希**（`index-DPK4QKmf.js` 中的
`DPK4QKmf`）。源码一改哈希就变、文件名就变，所以**每次部署只加不删**。

**实测数据（2026-10-05 核实）**：

| 指标 | 数值 |
|---|---|
| `assets/` 下文件总数 | 19042（js 18665 + css 377） |
| 实际被引用的文件数 | **470**（从 index.html 递归解析引用链得出） |
| 可清理孤儿 | **18027 个**（保留最近 3 次部署批次后） |
| 可释放空间 | **341.1 MB** |
| `assets/` 目录当前体积 | 397 MB |
| 部署批次数（按分钟聚合） | 81 |
| 磁盘 | `/dev/vda2` 40G，已用 23G，**可用 16G（60%）** |

堆积最严重的路由前缀：`index-` 754 个、`overview-` 451 个、`editor-` 362 个、`edit-` 275 个。

> ⚠️ **注意**：所有文件都是**今天 0-1 天内**写入的（最老 10-03），所以「只删 N 天前」
> 这种时间兜底**完全无效**（实测待删 = 0）。本任务书已改用**按部署批次保留**
> （保留最近 3 次部署），这才是对症的策略。

---

## ⚠️ 最高红线（违反即视为任务失败）

1. **绝不可用 `rsync --delete`**。本项目**明令禁用** `deploy/scripts/push-admin-dist-to-prod.sh`
   （它就是 `rsync --delete`），会连带删掉 logo / `golden-dsl.json` / `prototype/` /
   `images/` 等**不在 vite 构建产物里的线上资源**。
2. **绝不可动 `assets/` 以外的任何文件**（白名单见步骤 3）。
3. **必须满足「引用白名单」+「批次兜底」双重条件才允许删除**——只满足一条不删。
4. **必须先备份，后删除**。备份不成功不许开始删。
5. **第一轮必须 `DRY_RUN = True`**，看过清单再改。

---

## 步骤 1：备份（不可跳过）

```bash
ssh zfculture
cd /opt/miniprogram-platform
sudo cp -a admin-static admin-static.bak-chunkclean-$(date +%Y%m%d-%H%M%S)
df -h / | tail -1
```

> 备份约 400MB，磁盘只剩 16G，确认 `Avail` 充足再继续。
> 若空间不足，先跑 `bash deploy/scripts/prune-deploy-backups.sh`（该脚本只能在服务器上跑，
> 因为 `APP_ROOT=/opt/miniprogram-platform` 本地不存在）。

---

## 步骤 2：计算保留白名单与删除清单

在服务器上执行。脚本会：
- 从 `index.html` 递归解析引用链 → 保留集合
- **自检**：`index.html` 引用的入口必须在保留集合内，否则**自动中止**
- 把最近 3 个部署批次一并保留（防解析有漏）
- 只输出清单，**不删除**

**第一轮保持 `DRY_RUN = True`：**

```bash
python3 - << 'PYEOF'
import re, os, time
from collections import defaultdict

root = "/opt/miniprogram-platform/admin-static"
KEEP_BATCHES = 3      # 保留最近几次部署（时间兜底）
DRY_RUN = True        # ← 第一轮 True；确认清单后改 False

# ---- 1. 递归解析引用链 ----
def resolve(name):
    """把引用串解析成磁盘真实路径。必须同时试三种前缀：
       index.html 里是 /assets/xxx.js，chunk 之间多是 ./xxx.js。
       踩过坑：只拼 'assets/'+m 会得到 'assets/assets/xxx'，误判「入口未被引用」。"""
    m = name.lstrip("./")
    for cand in (m, "assets/" + m, m[7:] if m.startswith("assets/") else ""):
        if cand and os.path.isfile(os.path.join(root, cand)):
            return cand
    return None

used = set()
queue = ["index.html"]
while queue:
    rel = queue.pop()
    p = os.path.join(root, rel)
    if not os.path.isfile(p) or rel in used:
        continue
    used.add(rel)
    try:
        txt = open(p, encoding="utf-8", errors="ignore").read()
    except Exception:
        continue
    for m in re.findall(r"[\w./-]+\.(?:js|css)", txt):
        f = resolve(m)
        if f and f not in used:
            queue.append(f)

# ---- 2. 自检：入口必须全在保留集合内 ----
html = open(os.path.join(root, "index.html"), encoding="utf-8").read()
entries = re.findall(r"assets/[\w.-]+\.js", html)
missing = [e for e in entries if e not in used]
print("index.html entry:", entries)
print("self-check passed =", not missing, "| missing:", missing)
if missing:
    raise SystemExit("SELF-CHECK FAILED. Abort.")

assets_dir = os.path.join(root, "assets")
used_names = {os.path.basename(f) for f in used if f.startswith("assets/")}

# ---- 3. 按 mtime 聚成「部署批次」（同一分钟算一批）----
batches = defaultdict(list)
for f in os.listdir(assets_dir):
    fp = os.path.join(assets_dir, f)
    if os.path.isfile(fp):
        batches[int(os.path.getmtime(fp)) // 60].append((f, fp))
keys = sorted(batches.keys(), reverse=True)

# ---- 4. 删：既未被引用、又不属于最近 KEEP_BATCHES 批 ----
to_delete = []
for k in keys[KEEP_BATCHES:]:
    for f, fp in batches[k]:
        if f not in used_names:
            to_delete.append((f, fp))

free = sum(os.path.getsize(fp) for _, fp in to_delete)
print(f"\ntotal batches: {len(keys)}")
print(f"kept by reference: {len(used_names)}")
print(f"to delete: {len(to_delete)}  ->  free {free/1024/1024:.1f} MB")
print("samples:", [f for f, _ in to_delete[:5]])

with open("/tmp/chunk-delete-list.txt", "w") as fh:
    for f, _ in to_delete:
        fh.write(f + "\n")

if DRY_RUN:
    print("\nDRY_RUN=True. Nothing deleted. Check /tmp/chunk-delete-list.txt")
else:
    for f, fp in to_delete:
        os.remove(fp)
    print(f"\nDELETED {len(to_delete)} files")
PYEOF
```

**dry-run 的期望输出**（实测值，用来对照）：

```
self-check passed = True | missing: []
total batches: 81
kept by reference: 470
to delete: 18027  ->  free 341.1 MB
```

**确认数字接近后**，把 `DRY_RUN = True` 改成 `False` 重跑同一脚本。

---

## 步骤 3：白名单——这些**绝对不能删**

即使看似「没被引用」也必须保留：

```
/opt/miniprogram-platform/admin-static/
├── index.html                    ← 入口
├── logo.svg
├── logo-motaibai.svg
├── vite.svg
├── kuajing-motaibai-header.png
├── section-bar-tech-bg.jpg
├── golden-dsl.json               ← 装修器基准配置，不在 vite 产物里
├── images/                       ← 整目录
├── prototype/                    ← 整目录
└── assets/                       ← 只删其中「未被引用 + 非最近3批」的 js/css
```

清理脚本只操作 `assets/` 下的 `.js`/`.css`，不会碰上面任何一个。**执行后再 `ls` 确认一次。**

---

## 步骤 4：验证（必须全绿）

```bash
# ① 入口完好
ls -l /opt/miniprogram-platform/admin-static/index.html
ls -l /opt/miniprogram-platform/admin-static/assets/index-DPK4QKmf.js

# ② 非构建资源全在
cd /opt/miniprogram-platform/admin-static
ls logo.svg logo-motaibai.svg vite.svg golden-dsl.json \
   kuajing-motaibai-header.png section-bar-tech-bg.jpg
ls -d images prototype

# ③ 数量与磁盘
ls assets | wc -l          # 应约 1000 上下（470 引用 + 最近3批的未被引用部分）
df -h / | tail -1           # 应明显下降

# ④ 公网可访问
curl -s -o /dev/null -w "admin=%{http_code}\n" https://admin.zfculture.site/
curl -s -o /dev/null -w "api=%{http_code}\n" https://api.zfculture.site/actuator/health
```

**⑤ 浏览器真实验证（关键 —— 命令 200 不等于页面能用）**

用无头 Chrome 打开后台，逐项确认：

- 登录页正常渲染
- **进入「页面装修器」编辑器**（`/page-builder/editor/29`）—— 这是最重的路由，
  会按需 import 大量 chunk，**最容易暴露「删掉了被引用的文件」**
- 左侧组件库能加载、画布能渲染、属性面板能打开
- 切几个不同菜单（商城 / 会员 / 内容）各点一遍
- 浏览器 Console **无 404 / Failed to load module**

**出现白屏或某模块 404 → 立即回滚：**

```bash
cd /opt/miniprogram-platform
sudo rm -rf admin-static
sudo cp -a admin-static.bak-chunkclean-<步骤1的时间戳> admin-static
df -h / | tail -1
```

---

## 交付要求

汇报必须给「**原来是什么 → 现在是什么**」对照：

| 项目 | 清理前 | 清理后 |
|---|---|---|
| `assets/` 文件数 | 19042 | ? |
| `assets/` 体积 | 397 MB | ? |
| 磁盘可用 | 16 G (60%) | ? |

并说明：
1. 备份目录的**完整路径**
2. 步骤 4 的 ⑤ 浏览器验证**逐项结果**
3. 有无意外情况

---

## 已知坑（执行时留意）

1. **路径拼接**：解析引用时 `index.html` 写 `/assets/xxx.js`，chunk 之间多写 `./xxx.js`。
   **必须同时试三种候选前缀**，否则会误判「入口未被引用」触发假警报，
   或算出错误的删除清单（这个坑我实际踩了 2 次）。

2. **不要用「按天」兜底**：实测所有文件都在 0-1 天内，按天筛会得到「待删 0 个」。

3. **不要用 `grep -l "特征" *.js` 找「当前版本」**：清理前有 19042 个文件，
   这种方式会返回几百个文件，结论完全无效。

4. **磁盘只剩 16G**，备份前先确认空间；备份失败多半是磁盘满，**不是权限问题**。

5. **「保留最近 3 批」是有意为之**：万一引用解析漏了某个动态 import 的 chunk，
   用户最坏只会拿到 3 次部署内的旧版本（仍能跑），而不是 404 白屏。

---

## 后续建议（不属于本任务，勿顺手做）

把 `deploy/scripts/prune-deploy-backups.sh` 扩展成「部署后自动清理 N 批前的 chunk」，
才能从源头阻止堆积。但这属于改部署脚本，需单独评审。
