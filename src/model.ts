import type { AppState, Category, CheckIn, Expense, Habit } from './types'

export const HABIT_COLORS = [
  { id: 'persimmon', label: '柿红', value: '#9a3412' },
  { id: 'pine', label: '松绿', value: '#0f6a45' },
  { id: 'sea', label: '海蓝', value: '#1d4e89' },
  { id: 'amber', label: '琥珀', value: '#7a4e0d' },
  { id: 'plum', label: '梅紫', value: '#6d3a6d' },
  { id: 'ink', label: '墨色', value: '#3f3a34' },
] as const

const CATEGORY_PALETTE = ['#8a3d4b', '#1f5d5d', '#9a3412', '#1d4e89', '#6d3a6d', '#0f6a45', '#7a4e0d', '#3f3a34']

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food', name: '餐饮', color: '#9a3412', builtin: true },
  { id: 'transit', name: '交通', color: '#1d4e89', builtin: true },
  { id: 'shopping', name: '购物', color: '#6d3a6d', builtin: true },
  { id: 'housing', name: '住房', color: '#0f6a45', builtin: true },
  { id: 'fun', name: '娱乐', color: '#7a4e0d', builtin: true },
  { id: 'other', name: '其他', color: '#3f3a34', builtin: true },
]

const HEX = /^#[0-9a-fA-F]{6}$/
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/
const MAX_CENTS = 999_999_999

export function initialState(): AppState {
  return {
    version: 1,
    categories: DEFAULT_CATEGORIES.map((category) => ({ ...category })),
    expenses: [],
    habits: [],
    checkIns: [],
    lastCategoryId: null,
  }
}

export function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`
}

export function nextCategoryColor(categories: readonly Category[]): string {
  const used = new Set(categories.map((category) => category.color.toLowerCase()))
  return CATEGORY_PALETTE.find((color) => !used.has(color.toLowerCase())) ?? CATEGORY_PALETTE[0] ?? '#3f3a34'
}

export type Action =
  | { type: 'hydrate'; state: AppState }
  | { type: 'addExpense'; expense: Expense }
  | { type: 'updateExpense'; expense: Expense }
  | { type: 'deleteExpense'; id: string }
  | { type: 'addCategory'; category: Category }
  | { type: 'deleteCategory'; id: string }
  | { type: 'addHabit'; habit: Habit }
  | { type: 'updateHabit'; habit: Habit }
  | { type: 'setHabitArchived'; id: string; archived: boolean; updatedAt: string }
  | { type: 'toggleCheckIn'; habitId: string; date: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function sanitizeCustomCategory(raw: unknown): Category | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.name !== 'string') return null
  if (DEFAULT_CATEGORIES.some((category) => category.id === raw.id)) return null
  const name = raw.name.trim()
  if (!name || Array.from(name).length > 12) return null
  if (DEFAULT_CATEGORIES.some((category) => category.name === name)) return null
  const color = typeof raw.color === 'string' && HEX.test(raw.color) ? raw.color : '#3f3a34'
  return { id: raw.id, name, color, builtin: false }
}

function sanitizeExpense(raw: unknown, categoryIds: Set<string>): Expense | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || !raw.id) return null
  if (typeof raw.amountCents !== 'number' || !Number.isInteger(raw.amountCents)) return null
  if (raw.amountCents <= 0 || raw.amountCents > MAX_CENTS) return null
  if (typeof raw.categoryId !== 'string' || !categoryIds.has(raw.categoryId)) return null
  if (typeof raw.occurredAt !== 'string' || Number.isNaN(new Date(raw.occurredAt).getTime())) return null
  const note = typeof raw.note === 'string' ? raw.note.slice(0, 80) : ''
  const createdAt = typeof raw.createdAt === 'string' ? raw.createdAt : raw.occurredAt
  const updatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt : createdAt
  return {
    id: raw.id,
    amountCents: raw.amountCents,
    categoryId: raw.categoryId,
    note,
    occurredAt: raw.occurredAt,
    createdAt,
    updatedAt,
  }
}

function sanitizeHabit(raw: unknown): Habit | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || !raw.id || typeof raw.name !== 'string') return null
  const name = raw.name.trim()
  if (!name || Array.from(name).length > 20) return null
  const color = typeof raw.color === 'string' && HEX.test(raw.color) ? raw.color : '#0f6a45'
  const createdAt = typeof raw.createdAt === 'string' ? raw.createdAt : new Date(0).toISOString()
  const updatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt : createdAt
  return {
    id: raw.id,
    name,
    color,
    archived: raw.archived === true,
    createdAt,
    updatedAt,
  }
}

function sanitizeCheckIn(raw: unknown, habitIds: Set<string>): CheckIn | null {
  if (!isRecord(raw) || typeof raw.habitId !== 'string' || !habitIds.has(raw.habitId)) return null
  if (typeof raw.date !== 'string' || !DATE_KEY.test(raw.date)) return null
  return { habitId: raw.habitId, date: raw.date }
}

export function sanitize(raw: unknown): AppState {
  if (!isRecord(raw) || raw.version !== 1) return initialState()

  const seenCategory = new Set<string>()
  const customCategories = (Array.isArray(raw.categories) ? raw.categories : [])
    .map(sanitizeCustomCategory)
    .filter((category): category is Category => {
      if (!category || seenCategory.has(category.id) || seenCategory.has(category.name)) return false
      seenCategory.add(category.id)
      seenCategory.add(category.name)
      return true
    })

  const categories = [...DEFAULT_CATEGORIES.map((category) => ({ ...category })), ...customCategories]
  const categoryIds = new Set(categories.map((category) => category.id))

  const seenExpense = new Set<string>()
  const expenses = (Array.isArray(raw.expenses) ? raw.expenses : [])
    .map((item) => sanitizeExpense(item, categoryIds))
    .filter((expense): expense is Expense => {
      if (!expense || seenExpense.has(expense.id)) return false
      seenExpense.add(expense.id)
      return true
    })

  const seenHabit = new Set<string>()
  const habits = (Array.isArray(raw.habits) ? raw.habits : [])
    .map(sanitizeHabit)
    .filter((habit): habit is Habit => {
      if (!habit || seenHabit.has(habit.id)) return false
      seenHabit.add(habit.id)
      return true
    })
  const habitIds = new Set(habits.map((habit) => habit.id))

  const seenCheckIn = new Set<string>()
  const checkIns = (Array.isArray(raw.checkIns) ? raw.checkIns : [])
    .map((item) => sanitizeCheckIn(item, habitIds))
    .filter((item): item is CheckIn => {
      if (!item) return false
      const key = `${item.habitId}|${item.date}`
      if (seenCheckIn.has(key)) return false
      seenCheckIn.add(key)
      return true
    })

  const lastCategoryId =
    typeof raw.lastCategoryId === 'string' && categoryIds.has(raw.lastCategoryId) ? raw.lastCategoryId : null

  return { version: 1, categories, expenses, habits, checkIns, lastCategoryId }
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'hydrate':
      return action.state
    case 'addExpense': {
      if (!state.categories.some((category) => category.id === action.expense.categoryId)) return state
      if (state.expenses.some((expense) => expense.id === action.expense.id)) return state
      return {
        ...state,
        expenses: [action.expense, ...state.expenses],
        lastCategoryId: action.expense.categoryId,
      }
    }
    case 'updateExpense': {
      if (!state.expenses.some((expense) => expense.id === action.expense.id)) return state
      if (!state.categories.some((category) => category.id === action.expense.categoryId)) return state
      return {
        ...state,
        expenses: state.expenses.map((expense) => (expense.id === action.expense.id ? action.expense : expense)),
        lastCategoryId: action.expense.categoryId,
      }
    }
    case 'deleteExpense': {
      if (!state.expenses.some((expense) => expense.id === action.id)) return state
      return { ...state, expenses: state.expenses.filter((expense) => expense.id !== action.id) }
    }
    case 'addCategory': {
      if (
        state.categories.some(
          (category) => category.id === action.category.id || category.name === action.category.name,
        )
      ) {
        return state
      }
      return { ...state, categories: [...state.categories, action.category] }
    }
    case 'deleteCategory': {
      const category = state.categories.find((item) => item.id === action.id)
      if (!category || category.builtin) return state
      if (state.expenses.some((expense) => expense.categoryId === action.id)) return state
      return {
        ...state,
        categories: state.categories.filter((item) => item.id !== action.id),
        lastCategoryId: state.lastCategoryId === action.id ? null : state.lastCategoryId,
      }
    }
    case 'addHabit':
      if (state.habits.some((habit) => habit.id === action.habit.id)) return state
      return { ...state, habits: [...state.habits, action.habit] }
    case 'updateHabit':
      if (!state.habits.some((habit) => habit.id === action.habit.id)) return state
      return { ...state, habits: state.habits.map((habit) => (habit.id === action.habit.id ? action.habit : habit)) }
    case 'setHabitArchived':
      if (!state.habits.some((habit) => habit.id === action.id)) return state
      return {
        ...state,
        habits: state.habits.map((habit) =>
          habit.id === action.id ? { ...habit, archived: action.archived, updatedAt: action.updatedAt } : habit,
        ),
      }
    case 'toggleCheckIn': {
      const habit = state.habits.find((item) => item.id === action.habitId)
      if (!habit || habit.archived) return state
      const exists = state.checkIns.some((item) => item.habitId === action.habitId && item.date === action.date)
      return {
        ...state,
        checkIns: exists
          ? state.checkIns.filter((item) => !(item.habitId === action.habitId && item.date === action.date))
          : [...state.checkIns, { habitId: action.habitId, date: action.date }],
      }
    }
    default: {
      const unreachable: never = action
      return unreachable
    }
  }
}
