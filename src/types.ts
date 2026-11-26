export type Category = {
  id: string
  name: string
  color: string
  builtin: boolean
}

export type Expense = {
  id: string
  amountCents: number
  categoryId: string
  note: string
  occurredAt: string
  createdAt: string
  updatedAt: string
}

export type Habit = {
  id: string
  name: string
  color: string
  archived: boolean
  createdAt: string
  updatedAt: string
}

export type CheckIn = {
  habitId: string
  date: string
}

export type AppState = {
  version: 1
  categories: Category[]
  expenses: Expense[]
  habits: Habit[]
  checkIns: CheckIn[]
  lastCategoryId: string | null
}

export type ExpenseInput = {
  amountCents: number
  categoryId: string
  note: string
  occurredAt: string
}

export type HabitInput = {
  name: string
  color: string
}
