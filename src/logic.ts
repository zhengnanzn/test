import type { Expense } from './types'

const WEEKDAY_FULL = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
const WEEKDAY_SHORT = ['日', '一', '二', '三', '四', '五', '六']

export function localDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayKey(now = new Date()): string {
  return localDateKey(now)
}

export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

export function addDays(dateKey: string, days: number): string {
  const date = parseDateKey(dateKey)
  date.setDate(date.getDate() + days)
  return localDateKey(date)
}

export function startOfWeek(dateKey: string): string {
  const day = parseDateKey(dateKey).getDay()
  const delta = day === 0 ? -6 : 1 - day
  return addDays(dateKey, delta)
}

export function formatLongDate(dateKey: string): string {
  const date = parseDateKey(dateKey)
  return `${date.getMonth() + 1}月${date.getDate()}日 ${WEEKDAY_FULL[date.getDay()]}`
}

export function formatMonthLabel(dateKey: string): string {
  const date = parseDateKey(dateKey)
  return `${date.getFullYear()}年${date.getMonth() + 1}月`
}

export function formatClock(iso: string): string {
  const date = new Date(iso)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

export function monthBounds(now: Date): { start: string; end: string } {
  const start = localDateKey(new Date(now.getFullYear(), now.getMonth(), 1))
  const end = localDateKey(new Date(now.getFullYear(), now.getMonth() + 1, 0))
  return { start, end }
}

export function splitDateTime(iso: string): { date: string; time: string } {
  const date = new Date(iso)
  return { date: localDateKey(date), time: formatClock(iso) }
}

export function nowParts(now = new Date()): { date: string; time: string } {
  return splitDateTime(now.toISOString())
}

export function combineDateTime(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null
  const [year, month, day] = date.split('-').map(Number)
  const [hours, minutes] = time.split(':').map(Number)
  if (
    month === undefined ||
    day === undefined ||
    hours === undefined ||
    minutes === undefined ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hours > 23 ||
    minutes > 59
  ) {
    return null
  }
  const value = new Date(year, month - 1, day, hours, minutes, 0, 0)
  if (value.getFullYear() !== year || value.getMonth() !== month - 1 || value.getDate() !== day) {
    return null
  }
  return value.toISOString()
}

const MAX_CENTS = 999_999_999

export function parseYuanToCents(input: string): number | null {
  const trimmed = input.trim().replaceAll(',', '').replaceAll('，', '').replaceAll('¥', '').replaceAll('￥', '')
  if (!/^\d+(\.\d{0,2})?$/.test(trimmed)) return null
  const [whole, frac = ''] = trimmed.split('.')
  if (whole === undefined || (whole.length > 1 && whole.startsWith('0'))) return null
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, '0'))
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > MAX_CENTS) return null
  return cents
}

export function formatYuan(cents: number): string {
  const negative = cents < 0
  const abs = Math.abs(Math.trunc(cents))
  const whole = Math.floor(abs / 100)
  const frac = String(abs % 100).padStart(2, '0')
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${negative ? '-' : ''}${grouped}.${frac}`
}

export function expenseDateKey(expense: Expense): string {
  return localDateKey(new Date(expense.occurredAt))
}

export function isOnDate(expense: Expense, dateKey: string): boolean {
  return expenseDateKey(expense) === dateKey
}

export function isInRange(expense: Expense, start: string, end: string): boolean {
  const key = expenseDateKey(expense)
  if (start && key < start) return false
  if (end && key > end) return false
  return true
}

export function sumInRange(expenses: readonly Expense[], start: string, end: string): number {
  let total = 0
  for (const expense of expenses) {
    if (isInRange(expense, start, end)) total += expense.amountCents
  }
  return total
}

export type CategoryTotal = {
  categoryId: string
  cents: number
  ratio: number
}

export function categoryBreakdown(expenses: readonly Expense[], start: string, end: string): CategoryTotal[] {
  const totals = new Map<string, number>()
  let total = 0
  for (const expense of expenses) {
    if (!isInRange(expense, start, end)) continue
    total += expense.amountCents
    totals.set(expense.categoryId, (totals.get(expense.categoryId) ?? 0) + expense.amountCents)
  }
  const rows: CategoryTotal[] = []
  for (const [categoryId, cents] of totals) {
    rows.push({ categoryId, cents, ratio: total === 0 ? 0 : cents / total })
  }
  rows.sort((a, b) => b.cents - a.cents || a.categoryId.localeCompare(b.categoryId))
  return rows
}

export function formatPercent(ratio: number): string {
  if (!(ratio > 0)) return '0%'
  const percent = ratio * 100
  if (percent < 1) return '<1%'
  return `${Math.round(percent)}%`
}

export function filterExpenses(
  expenses: readonly Expense[],
  filter: { start: string; end: string; categoryId: string },
): Expense[] {
  return expenses
    .filter((expense) => {
      if (filter.categoryId && expense.categoryId !== filter.categoryId) return false
      return isInRange(expense, filter.start, filter.end)
    })
    .sort((a, b) => {
      const byTime = new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
      if (byTime !== 0) return byTime
      return b.createdAt.localeCompare(a.createdAt)
    })
}

export type ExpenseGroup = {
  date: string
  label: string
  items: Expense[]
}

export function groupByDate(expenses: readonly Expense[], today: string): ExpenseGroup[] {
  const yesterday = addDays(today, -1)
  const groups: ExpenseGroup[] = []
  for (const expense of expenses) {
    const date = expenseDateKey(expense)
    const label = date === today ? '今天' : date === yesterday ? '昨天' : formatLongDate(date)
    const last = groups[groups.length - 1]
    if (!last || last.date !== date) groups.push({ date, label, items: [expense] })
    else last.items.push(expense)
  }
  return groups
}

export type Streak = {
  count: number
  includesToday: boolean
}

/**
 * 连续天数截至今天。今天还没打卡时，从昨天往前数；
 * 昨天也没有打卡，连续天数就是 0。
 */
export function currentStreak(dates: readonly string[], today: string): Streak {
  const set = new Set(dates)
  const includesToday = set.has(today)
  let cursor = includesToday ? today : addDays(today, -1)
  let count = 0
  while (set.has(cursor)) {
    count += 1
    cursor = addDays(cursor, -1)
    if (count > 3660) break
  }
  return { count, includesToday }
}

export function streakText(streak: Streak): string {
  if (streak.count === 0) return '尚未连续打卡'
  if (streak.includesToday) return `已连续 ${streak.count} 天`
  return `已连续 ${streak.count} 天，今天还没打卡`
}

export type WeekDay = {
  date: string
  shortLabel: string
  status: 'done' | 'open' | 'future'
}

export function weekStrip(dates: readonly string[], today: string): WeekDay[] {
  const set = new Set(dates)
  const start = startOfWeek(today)
  const days: WeekDay[] = []
  for (let index = 0; index < 7; index += 1) {
    const date = addDays(start, index)
    const shortLabel = WEEKDAY_SHORT[parseDateKey(date).getDay()] ?? ''
    let status: WeekDay['status'] = 'open'
    if (date > today) status = 'future'
    else if (set.has(date)) status = 'done'
    days.push({ date, shortLabel, status })
  }
  return days
}

export function weekDoneCount(dates: readonly string[], today: string): number {
  return weekStrip(dates, today).filter((day) => day.status === 'done').length
}

export function datesForHabit(
  checkIns: readonly { habitId: string; date: string }[],
  habitId: string,
): string[] {
  const dates: string[] = []
  for (const item of checkIns) {
    if (item.habitId === habitId) dates.push(item.date)
  }
  return dates
}

export function sortByCreated<T extends { createdAt: string; id: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
}
