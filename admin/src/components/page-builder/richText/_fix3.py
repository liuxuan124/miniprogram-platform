"""修掉上一步引入的两处引号错误：
1. 正则里的 ` 被写成了字面量（'([^']*)` 多了一对反引号）
2. `''` 被写成反引号包裹的字面量，而不是空字符串
用单引号 + 字符串拼接规避反引号，Python 源里用 chr(96) 规避 shell 展开。
"""
import io

P = 'richTextSanitizer.ts'
s = io.open(P, encoding='utf-8').read()

EMPTY = "''"          # 真正的空字符串字面量
BT = chr(96)

bad_img = "const src = tag.match(/src\\s*=\\s*(?:\"([^\"]*)\"|" + BT + "'([^']*)" + BT + ')/i)'
good_img = "const src = tag.match(/src\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)')/i)"

bad_a = "work = work.replace(/<a\\b[^>]*href\\s*=\\s*(?:\"([^\"]*)\"|" + BT + "'([^']*)" + BT + ')[^>]*>([\\s\\S]*?)<\\/a>/gi,"
good_a = "work = work.replace(/<a\\b[^>]*href\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)')[^>]*>([\\s\\S]*?)<\\/a>/gi,"

bad_url = "const url = src ? (src[1] ?? src[2] ?? " + BT + EMPTY + BT + ") : " + BT + EMPTY + BT
good_url = "const url = src ? (src[1] ?? src[2] ?? " + EMPTY + ") : " + EMPTY

bad_href = "const href = dq ?? sq ?? " + BT + EMPTY + BT
good_href = "const href = dq ?? sq ?? " + EMPTY

bad_style = ".replace(/\\sstyle\\s*=\\s*(\"([^\"]*)\"|" + BT + "'([^']*)" + BT + ')/gi, ' + BT + EMPTY + BT + ')'
good_style = ".replace(/\\sstyle\\s*=\\s*(\"([^\"]*)\"|'([^']*)')/gi, " + EMPTY + ")"

bad_restore = "(_all, i) => tokens[Number(i)] || " + BT + EMPTY + BT
good_restore = "(_all, i) => tokens[Number(i)] || " + EMPTY

pairs = [
    (bad_img, good_img),
    (bad_a, good_a),
    (bad_url, good_url),
    (bad_href, good_href),
    (bad_style, good_style),
    (bad_restore, good_restore),
]

for bad, good in pairs:
    if bad in s:
        s = s.replace(bad, good, 1)
        print('修正:', good[:70])
    else:
        print('未匹配(跳过):', bad[:70])

io.open(P, 'w', encoding='utf-8').write(s)
print('✅ 引号修正完成；NUL 残留:', '\x00' in s)
