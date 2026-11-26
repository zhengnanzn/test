import { describe, expect, it } from 'vitest'
import { initialState, reducer, sanitize } from './model'
import type { Expense, Habit } from './types'

const habit: Habit = {
  id: 'hab_1',
  name: '早睡',
  color: '#0f6a45',
  archived: false,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
}

function makeExpense(id: string, categoryId = 'food'): Expense {
  return {
    id,
    amountCents: 1200,
    categoryId,
    note: '午饭',
    occurredAt: '2026-11-26T04:00:00.000Z',
    createdAt: '2026-11-26T04:00:00.000Z',
    updatedAt: '2026-11-26T04:00:00.000Z',
  }
}

describe('sanitize', () => {
  it('坏数据回到空白初始状态，并保留默认分类', () => {
    const state = sanitize(null)
    expect(state.expenses).toEqual([])
    expect(state.habits).toEqual([])
    expect(state.categories.map((category) => category.name)).toEqual(['餐饮', '交通', '购物', '住房', '娱乐', '其他'])
  })

  it('丢掉金额非法或分类不存在的支出，保留自定义分类', () => {
    const state = sanitize({
      version: 1,
      categories: [{ id: 'cat_tea', name: '奶茶', color: '#8a3d4b', builtin: false }],
      expenses: [
        makeExpense('ok', 'cat_tea'),
        { ...makeExpense('bad'), amountCents: 0 },
        makeExpense('missing', 'nope'),
      ],
      habits: [habit, { ...habit, id: 'hab_2', name: '   ' }],
      checkIns: [
        { habitId: 'hab_1', date: '2026-11-26' },
        { habitId: 'hab_1', date: '2026-11-26' },
        { habitId: 'missing', date: '2026-11-26' },
      ],
      lastCategoryId: 'cat_tea',
    })
    expect(state.categories.map((category) => category.name)).toContain('奶茶')
    expect(state.expenses.map((item) => item.id)).toEqual(['ok'])
    expect(state.habits.map((item) => item.id)).toEqual(['hab_1'])
    expect(state.checkIns).toEqual([{ habitId: 'hab_1', date: '2026-11-26' }])
    expect(state.lastCategoryId).toBe('cat_tea')
  })
})

describe('reducer', () => {
  it('不能删除默认分类，可以增删未使用的自定义分类', () => {
    const state = initialState()
    expect(reducer(state, { type: 'deleteCategory', id: 'food' })).toBe(state)
    const withCategory = reducer(state, {
      type: 'addCategory',
      category: { id: 'cat_tea', name: '奶茶', color: '#8a3d4b', builtin: false },
    })
    expect(withCategory.categories.at(-1)?.name).toBe('奶茶')
    const removed = reducer(withCategory, { type: 'deleteCategory', id: 'cat_tea' })
    expect(removed.categories.some((category) => category.id === 'cat_tea')).toBe(false)
  })

  it('有支出的自定义分类不能删除', () => {
    let state = initialState()
    state = reducer(state, {
      type: 'addCategory',
      category: { id: 'cat_tea', name: '奶茶', color: '#8a3d4b', builtin: false },
    })
    state = reducer(state, { type: 'addExpense', expense: makeExpense('exp_1', 'cat_tea') })
    expect(reducer(state, { type: 'deleteCategory', id: 'cat_tea' })).toBe(state)
  })

  it('打卡可以取消，归档后不能再打卡', () => {
    let state = reducer(initialState(), { type: 'addHabit', habit })
    state = reducer(state, { type: 'toggleCheckIn', habitId: 'hab_1', date: '2026-11-26' })
    expect(state.checkIns).toEqual([{ habitId: 'hab_1', date: '2026-11-26' }])
    state = reducer(state, { type: 'toggleCheckIn', habitId: 'hab_1', date: '2026-11-26' })
    expect(state.checkIns).toEqual([])
    state = reducer(state, { type: 'toggleCheckIn', habitId: 'hab_1', date: '2026-11-25' })
    state = reducer(state, {
      type: 'setHabitArchived',
      id: 'hab_1',
      archived: true,
      updatedAt: '2026-11-26T00:00:00.000Z',
    })
    const blocked = reducer(state, { type: 'toggleCheckIn', habitId: 'hab_1', date: '2026-11-26' })
    expect(blocked.checkIns).toEqual([{ habitId: 'hab_1', date: '2026-11-25' }])
  })
})
