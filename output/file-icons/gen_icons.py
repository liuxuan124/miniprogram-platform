#!/Users/lx/.workbuddy/binaries/python/envs/default/bin/python
"""生成资料文件类型图标：SVG → 512px PNG（圆角方块渐变底 + 白色纸张 + 类型字母）"""
import os

OUT = os.path.dirname(os.path.abspath(__file__))

TYPES = {
    "pdf":  {"label": "PDF",  "c1": "#F2705B", "c2": "#E74C3C", "deep": "#C0392B"},
    "word": {"label": "DOC",  "c1": "#3E8ED0", "c2": "#2980B9", "deep": "#21618C"},
    "excel": {"label": "XLS", "c1": "#2ECC71", "c2": "#27AE60", "deep": "#1E8449"},
    "ppt":  {"label": "PPT",  "c1": "#F0904A", "c2": "#E67E22", "deep": "#BA6A17"},
    "zip":  {"label": "ZIP",  "c1": "#9B59B6", "c2": "#8E44AD", "deep": "#6C3483"},
    "file": {"label": "FILE", "c1": "#7B8CA3", "c2": "#64748B", "deep": "#475569"},
}

TPL = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect x="16" y="16" width="480" height="480" rx="112" fill="{c2}"/>
  <path d="M16 232 v-104 a112 112 0 0 1 112 -112 h256 a112 112 0 0 1 112 112 v104 z" fill="#ffffff" opacity="0.10"/>
  <path d="M156 108 h132 l68 68 v196 a24 24 0 0 1 -24 24 H156 a24 24 0 0 1 -24 -24 V132 a24 24 0 0 1 24 -24 z" fill="#ffffff"/>
  <path d="M288 108 l68 68 h-56 a12 12 0 0 1 -12 -12 z" fill="{deep}"/>
  <rect x="164" y="216" width="118" height="10" rx="5" fill="{c2}" opacity="0.28"/>
  <rect x="164" y="246" width="150" height="10" rx="5" fill="{c2}" opacity="0.18"/>
  <rect x="164" y="276" width="94" height="10" rx="5" fill="{c2}" opacity="0.12"/>
  <rect x="132" y="316" width="248" height="72" rx="16" fill="{deep}"/>
  <text x="256" y="366" font-family="PingFang SC, Helvetica Neue, Arial, sans-serif" font-size="{fs}" font-weight="800" fill="#ffffff" text-anchor="middle">{label}</text>
</svg>
"""

SIZES = {"pdf": 76, "word": 78, "excel": 78, "ppt": 78, "zip": 80, "file": 62}

for key, t in TYPES.items():
    svg = TPL.format(label=t["label"], c1=t["c1"], c2=t["c2"], deep=t["deep"], fs=SIZES[key])
    svg_path = os.path.join(OUT, f"icon-{key}.svg")
    with open(svg_path, "w") as f:
        f.write(svg)
    import fitz
    doc = fitz.open(stream=svg.encode(), filetype="svg")
    page = doc[0]
    pix = page.get_pixmap(matrix=fitz.Matrix(512 / page.rect.width, 512 / page.rect.height), alpha=False)
    png_path = os.path.join(OUT, f"icon-{key}.png")
    pix.save(png_path)
    doc.close()
    print(png_path, pix.width, "x", pix.height, os.path.getsize(png_path), "bytes")
