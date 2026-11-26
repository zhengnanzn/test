import { useEffect, useMemo, useReducer, useRef } from 'react'
import type { ReactNode } from 'react'
import { createContext, useContext } from 'react'
import { createId, nextCategoryColor, reducer } from './model'
import { loadState, saveState, STORAGE_KEY } from './storage'
import type { AppState, ExpenseInput, HabitInput } from './types'

export type CategoryResult = { ok: true; id: string } | { ok: false; message: string }
export type DeleteCategoryResult = { ok: true } | { ok: false; message: string }

type StoreApi = {
  state: AppState
  addExpense: (input: ExpenseInput) => void
  updateExpense: (id: string, input: ExpenseInput) => void
  deleteExpense: (id: string) => void
  addCategory: (name: string) => CategoryResult
  deleteCategory: (id: string) => DeleteCategoryResult
  addHabit: (input: HabitInput) => void
  updateHabit: (id: string, input: HabitInput) => void
  setHabitArchived: (id: string, archived: boolean) => void
  toggleCheckIn: (habitId: string, date: string) => void
}

const StoreContext = createContext<StoreApi | null>(null)

function charLength(value: string): number {
  return Array.from(value).length
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    saveState(state)
  }, [state])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return
      dispatch({ type: 'hydrate', state: loadState() })
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const actions = useMemo<Omit<StoreApi, 'state'>>(() => {
    return {
      addExpense(input) {
        const current = stateRef.current
        if (!current.categories.some((category) => category.id === input.categoryId)) return
        const now = new Date().toISOString()
        dispatch({
          type: 'addExpense',
          expense: {
            id: createId('exp'),
            amountCents: input.amountCents,
            categoryId: input.categoryId,
            note: input.note.trim().slice(0, 80),
            occurredAt: input.occurredAt,
            createdAt: now,
            updatedAt: now,
          },
        })
      },
      updateExpense(id, input) {
        const current = stateRef.current
        const existing = current.expenses.find((expense) => expense.id === id)
        if (!existing || !current.categories.some((category) => category.id === input.categoryId)) return
        dispatch({
          type: 'updateExpense',
          expense: {
            ...existing,
            amountCents: input.amountCents,
            categoryId: input.categoryId,
            note: input.note.trim().slice(0, 80),
            occurredAt: input.occurredAt,
            updatedAt: new Date().toISOString(),
          },
        })
      },
      deleteExpense(id) {
        dispatch({ type: 'deleteExpense', id })
      },
      addCategory(name) {
        const trimmed = name.trim()
        if (!trimmed) return { ok: false, message: '请填写分类名称' }
        if (charLength(trimmed) > 12) return { ok: false, message: '分类名称最多 12 个字' }
        const current = stateRef.current
        if (current.categories.some((category) => category.name === trimmed)) {
          return { ok: false, message: '已有同名分类' }
        }
        const category = {
          id: createId('cat'),
          name: trimmed,
          color: nextCategoryColor(current.categories),
          builtin: false,
        }
        dispatch({ type: 'addCategory', category })
        return { ok: true, id: category.id }
      },
      deleteCategory(id) {
        const current = stateRef.current
        const category = current.categories.find((item) => item.id === id)
        if (!category) return { ok: false, message: '找不到这个分类' }
        if (category.builtin) return { ok: false, message: '默认分类不能删除' }
        if (current.expenses.some((expense) => expense.categoryId === id)) {
          return { ok: false, message: '还有支出在使用这个分类，暂时不能删除' }
        }
        dispatch({ type: 'deleteCategory', id })
        return { ok: true }
      },
      addHabit(input) {
        const name = input.name.trim()
        if (!name || charLength(name) > 20) return
        const now = new Date().toISOString()
        dispatch({
          type: 'addHabit',
          habit: {
            id: createId('hab'),
            name,
            color: input.color,
            archived: false,
            createdAt: now,
            updatedAt: now,
          },
        })
      },
      updateHabit(id, input) {
        const existing = stateRef.current.habits.find((habit) => habit.id === id)
        const name = input.name.trim()
        if (!existing || !name || charLength(name) > 20) return
        dispatch({
          type: 'updateHabit',
          habit: {
            ...existing,
            name,
            color: input.color,
            updatedAt: new Date().toISOString(),
          },
        })
      },
      setHabitArchived(id, archived) {
        dispatch({ type: 'setHabitArchived', id, archived, updatedAt: new Date().toISOString() })
      },
      toggleCheckIn(habitId, date) {
        dispatch({ type: 'toggleCheckIn', habitId, date })
      },
    }
  }, [])

  const value = useMemo<StoreApi>(() => ({ state, ...actions }), [state, actions])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreApi {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore must be used within StoreProvider')
  return store
}
