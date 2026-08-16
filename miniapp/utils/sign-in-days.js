/**
 * 连续签到 7 日格子：对齐真实日期，并标出「今天」
 * @param {{ streak?: number, todaySigned?: boolean }} status
 * @param {number[]} [pointsList]
 */
function buildSignInDays(status = {}, pointsList = [5, 10, 15, 20, 25, 30, 50]) {
  const streak = Math.max(0, Number(status.streak) || 0)
  const todaySigned = !!status.todaySigned
  // 已签到：今天落在第 streak 天；未签到：今天是下一格
  let todayIndex = todaySigned ? streak - 1 : streak
  if (todayIndex < 0) todayIndex = 0
  if (todayIndex > 6) todayIndex = 6

  const today = startOfLocalDay(new Date())
  const days = []

  for (let i = 0; i < 7; i++) {
    const date = addDays(today, i - todayIndex)
    const isToday = i === todayIndex
    const signed = todaySigned ? i < streak : i < streak
    days.push({
      day: i + 1,
      points: pointsList[i] || 0,
      signed,
      today: isToday,
      dateText: formatMonthDay(date),
      dateKey: formatDateKey(date),
    })
  }
  return days
}

function startOfLocalDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function addDays(date, offset) {
  const next = new Date(date.getTime())
  next.setDate(next.getDate() + offset)
  return next
}

function formatMonthDay(date) {
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function formatDateKey(date) {
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}

/**
 * 本周（周一到周日）签到格子，带日期
 */
function buildWeekSignDays(weekSignIn = []) {
  const signedSet = new Set((weekSignIn || []).map((n) => Number(n)))
  const now = startOfLocalDay(new Date())
  const jsDay = now.getDay() // 0=周日
  const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay
  const monday = addDays(now, mondayOffset)
  const labels = ['一', '二', '三', '四', '五', '六', '日']

  return labels.map((label, index) => {
    const date = addDays(monday, index)
    const isToday = formatDateKey(date) === formatDateKey(now)
    const isSigned = signedSet.has(index + 1)
    const isPast = date.getTime() < now.getTime()
    return {
      label: `周${label}`,
      dateText: formatMonthDay(date),
      isToday,
      isSigned,
      isPast,
      status: isSigned ? 'signed' : (isToday ? 'today' : (isPast ? 'missed' : 'future')),
    }
  })
}

module.exports = {
  buildSignInDays,
  buildWeekSignDays,
  formatMonthDay,
}
