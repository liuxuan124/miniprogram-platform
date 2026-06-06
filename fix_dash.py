import pathlib
pathl = pathlib.Path(r'D:\\工程剩计\[及课们的意预订新文件\\admin\\src\\views\\dashboard\\index.vue')
c = pathlib.read_text(pathl, 'utf-8')

# Fix 1: Replace import * as echɂts with conditional import
old_import = "import * as echarts from 'echarts'"
new_import = "// Conditional echarts import - gracefully degrades if not installed\nlet echarts: any = null\ntry {\n  echarts = await import('echarts').then(m => m.default || m)\n} catch {\n  echarts = null\n}"

if old_import in c:
    c = c.replace(old_import, new_import)
    print('Fix 1: Replaced import * as echarts')
else:
    print('Fix 1: WARNING - import * as echarts not found')

# Fix 2: Add echartsAvailable ref
if 'echartsAvailable' not in c:
    c = c.replace(
        "const currentDate = ref('')",
        "const currentDate = ref('')\nconst echartsAvailable = ref(true)"
    )
    print('Fix 2: Added echartsAvailable ref')
else:
    print('Fix 2: echartsAvailable already exists')

# Fix 3: Update initChart function
if 'echartsAvailable.value = false' not in c:
    old_init = 'function initChart() {\n  if (!chartRef.value) return\n  chartInstance = echarts.init(chartRef.value)'
    new_init = 'function initChart() {\n  if (!echarts) {\n    echartsAvailable.value = false\n    return\n  }\n  if (!chartRef.value) return\n  chartInstance = echarts.init(chartRef.value)'
    c = c.replace(old_init, new_init)
    print('Fix 3: Updated initChart with echarts fallback')
else:
    print('Fix 3: initChart fallback already exists')

pathlib.write_text(pathl, c, 'utf-8')
print('Phase 1 complete')