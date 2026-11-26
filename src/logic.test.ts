import { describe, expect, it } from 'vitest'
import {
  addDays,
  categoryBreakdown,
  combineDateTime,
  currentStreak,
  filterExpenses,
  formatPercent,
  formatYuan,
  groupByDate,
  monthBounds,
  parseYuanToCents,
  startOfWeek,
  sumInRange,
  weekStrip,
} from './logic'
import type { Expense } from './types'

function expense(partial: Partial<Expense> & Pick<Expense, 'amountCents' | 'occurredAt' | 'categoryId'>): Expense {
  return {
    id: partial.id ?? 'exp',
    amountCents: partial.amountCents,
    categoryId: partial.categoryId,
    note: partial.note ?? '',
    occurredAt: partial.occurredAt,
    createdAt: partial.createdAt ?? partial.occurredAt,
    updatedAt: partial.updatedAt ?? partial.occurredAt,
  }
}

function localIso(year: number, month: number, day: number, hours = 12, minutes = 0): string {
  return new Date(year, month - 1, day, hours, minutes, 0, 0).toISOString()
}

describe('金额', () => {
  it('解析并格式化元', () => {
    expect(parseYuanToCents('12.5')).toBe(1250)
    expect(parseYuanToCents('12.50')).toBe(1250)
    expect(parseYuanToCents('0.01')).toBe(1)
    expect(parseYuanToCents('￥8')).toBe(800)
    expect(parseYuanToCents('1,234.50')).toBe(123450)
    expect(parseYuanToCents('12.')).toBe(1200)
    expect(parseYuanToCents('0')).toBeNull()
    expect(parseYuanToCents('12.555')).toBeNull()
    expect(parseYuanToCents('abc')).toBeNull()
    expect(formatYuan(0)).toBe('0.00')
    expect(formatYuan(50)).toBe('0.50')
    expect(formatYuan(123450)).toBe('1,234.50')
  })

  it('百分比', () => {
    expect(formatPercent(0)).toBe('0%')
    expect(formatPercent(0.004)).toBe('<1%')
    expect(formatPercent(0.46)).toBe('46%')
  })
})

describe('日期', () => {
  it('跨月加减天数，周一为一周的开始', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(startOfWeek('2026-11-26')).toBe('2026-11-23')
    expect(startOfWeek('2026-11-29')).toBe('2026-11-23')
    expect(monthBounds(new Date(2026, 10, 26))).toEqual({ start: '2026-11-01', end: '2026-11-30' })
  })

  it('拒绝不存在的日期', () => {
    expect(combineDateTime('2026-02-31', '12:00')).toBeNull()
    expect(combineDateTime('2026-11-26', '25:00')).toBeNull()
    expect(combineDateTime('2026-11-26', '08:05')).not.toBeNull()
  })
})

describe('连续打卡', () => {
  const today = '2026-11-26'

  it('今天已打卡时把今天算进去', () => {
    expect(currentStreak(['2026-11-24', '2026-11-25', '2026-11-26'], today)).toEqual({
      count: 3,
      includesToday: true,
    })
  })

  it('今天没打卡时从昨天接着数', () => {
    expect(currentStreak(['2026-11-24', '2026-11-25'], today)).toEqual({
      count: 2,
      includesToday: false,
    })
  })

  it('中间断开则重新计算', () => {
    expect(currentStreak(['2026-11-23', '2026-11-26'], today)).toEqual({
      count: 1,
      includesToday: true,
    })
    expect(currentStreak(['2026-11-20'], today)).toEqual({ count: 0, includesToday: false })
  })

  it('本周从周一开始，未来的日子单独标出', () => {
    const days = weekStrip(['2026-11-23', '2026-11-26'], today)
    expect(days.map((day) => day.date)).toEqual([
      '2026-11-23',
      '2026-11-24',
      '2026-11-25',
      '2026-11-26',
      '2026-11-27',
      '2026-11-28',
      '2026-11-29',
    ])
    expect(days[0]?.status).toBe('done')
    expect(days[1]?.status).toBe('open')
    expect(days[3]?.status).toBe('done')
    expect(days[4]?.status).toBe('future')
    expect(days.map((day) => day.shortLabel).join('')).toBe('一二三四五六日')
  })
})

describe('支出统计', () => {
  const expenses = [
    expense({ id: 'a', amountCents: 1000, categoryId: 'food', occurredAt: localIso(2026, 11, 26, 8) }),
    expense({ id: 'b', amountCents: 2500, categoryId: 'transit', occurredAt: localIso(2026, 11, 2, 9) }),
    expense({ id: 'c', amountCents: 500, categoryId: 'food', occurredAt: localIso(2026, 10, 31, 21) }),
    expense({ id: 'd', amountCents: 800, categoryId: 'food', occurredAt: localIso(2026, 11, 26, 19), createdAt: localIso(2026, 11, 26, 19) }),
  ]

  it('今天和本月分开合计', () => {
    expect(sumInRange(expenses, '2026-11-26', '2026-11-26')).toBe(1800)
    expect(sumInRange(expenses, '2026-11-01', '2026-11-30')).toBe(4300)
  })

  it('按分类汇总本月', () => {
    expect(categoryBreakdown(expenses, '2026-11-01', '2026-11-30')).toEqual([
      { categoryId: 'transit', cents: 2500, ratio: 2500 / 4300 },
      { categoryId: 'food', cents: 1800, ratio: 1800 / 4300 },
    ])
  })

  it('筛选含首尾日期，并按时间倒序分组', () => {
    const filtered = filterExpenses(expenses, { start: '2026-11-26', end: '2026-11-26', categoryId: 'food' })
    expect(filtered.map((item) => item.id)).toEqual(['d', 'a'])
    expect(groupByDate(filtered, '2026-11-26').map((group) => group.label)).toEqual(['今天'])
    expect(filterExpenses(expenses, { start: '2026-11-01', end: '2026-11-30', categoryId: '' })).toHaveLength(3)
  })
})
