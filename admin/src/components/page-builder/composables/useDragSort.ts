import { ref, type Ref } from 'vue'

/**
 * 列表拖拽重排序（原生 HTML5 DnD，不引第三方库）。
 *
 * 为什么不上 SortableJS：属性面板里只排 8 条小卡片，拖拽需求就是「换个顺序」，
 * 为此塞一个 40KB 的依赖不值得；原生 DnD 够用且零包体（后台主包预算敏感）。
 *
 * 两个已知坑（都踩过）：
 *
 * 1. **dragover 必须 preventDefault**，否则 drop 事件根本不触发。
 *    而且必须在 dragenter / dragover 每次都调（连续事件），只调 dragenter 会时灵时不灵。
 *
 * 2. **拖拽时数据要打「搬运标记」**：dragover 里读 `dataTransfer.getData()` 在
 *    Firefox 下返回空串（安全限制，只有 drop 时才可读）。所以在 dragstart
 *    就把 from 索引写进闭包变量，drop 时用闭包值，不依赖 dragover 取值。
 *
 * @param list  要重排的数组（computed/ref 均可，只读）
 * @param commit 排完序的回调，参数是新数组
 */
export function useDragSort<T>(list: Readonly<Ref<T[]>>, commit: (next: T[]) => void) {
  /** 正在拖拽的源下标；-1 表示当前无拖拽 */
  const dragFrom = ref(-1)
  /** 当前悬停的目标下标（用于插入指示线） */
  const dragOver = ref(-1)

  function reset() {
    dragFrom.value = -1
    dragOver.value = -1
  }

  function onDragStart(index: number, e: DragEvent) {
    dragFrom.value = index
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move'
      // Firefox 必须有 setData 才认为是可拖元素（尽管我们不靠它取值）
      try {
        e.dataTransfer.setData('text/plain', String(index))
      } catch {
        /* 某些浏览器在只读上下文下会抛，忽略即可 */
      }
    }
  }

  /** dragover 高频触发：只更新指示位置，不做数据搬运 */
  function onDragOver(index: number, e: DragEvent) {
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
    if (dragOver.value !== index) dragOver.value = index
  }

  function onDrop(index: number, e: DragEvent) {
    e.preventDefault()
    const from = dragFrom.value
    reset()
    if (from < 0 || from === index) return
    const next = [...list.value]
    if (from >= next.length) return
    const [moved] = next.splice(from, 1)
    // 从前往后拖时，源项移除后目标下标会左移一位；不补偿会把卡插到目标后面一位。
    next.splice(from < index ? index - 1 : index, 0, moved)
    commit(next)
  }

  function onDragEnd() {
    reset()
  }

  return {
    dragFrom,
    dragOver,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
    reset,
  }
}
