import { useMemo, useState } from 'react'
import type { MouseEvent } from 'react'
import {
  datesForHabit,
  formatClock,
  formatLongDate,
  formatYuan,
  isOnDate,
  monthBounds,
  parseDateKey,
  streakText,
  currentStreak,
  sumInRange,
} from '../logic'
import { useDialog } from '../useDialog'
import { useStore } from '../store'
import { useTodayKey } from '../useToday'
import type { Expense, Habit } from '../types'
import { EmptyState } from './EmptyState'
import { ExpenseDialog } from './ExpenseDialog'
import { HabitDialog } from './HabitDialog'
import { Seal } from './Seal'
import { CheckIcon } from './Icons'
import { WeekStrip } from './WeekStrip'

export function TodayPage() {
  const today = useTodayKey()
  const { state, toggleCheckIn, addExpense, updateExpense, deleteExpense, addCategory, addHabit } = useStore()
  const expenseDialog = useDialog()
  const habitDialog = useDialog()
  const [editing, setEditing] = useState<Expense | null>(null)

  const activeHabits = useMemo(
    () => state.habits.filter((habit) => !habit.archived).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [state.habits],
  )
  const todayExpenses = useMemo(
    () =>
      state.expenses
        .filter((expense) => isOnDate(expense, today))
        .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()),
    [state.expenses, today],
  )
  const bounds = monthBounds(parseDateKey(today))
  const todayTotal = sumInRange(state.expenses, today, today)
  const monthTotal = sumInRange(state.expenses, bounds.start, bounds.end)
  const checkedCount = activeHabits.filter((habit) =>
    datesForHabit(state.checkIns, habit.id).includes(today),
  ).length
  const shown = todayExpenses.slice(0, 5)
  const rest = todayExpenses.length - shown.length

  return (
    <div className="page">
      <header className="page-head">
        <div className="top-row">
          <div>
            <p className="brand">日迹</p>
            <h1>今天</h1>
          </div>
          <button type="button" className="btn primary" onClick={(event) => {
            setEditing(null)
            expenseDialog.show(event.currentTarget)
          }}>
            记一笔
          </button>
        </div>
        <p className="lede">{formatLongDate(today)}</p>
      </header>

      <section className="summary" aria-label="今日概览">
        <article className="stat">
          <h2>今日支出</h2>
          <p className="figure">
            <span className="yen">¥</span>
            {formatYuan(todayTotal)}
          </p>
          <p className="sub">本月 ¥{formatYuan(monthTotal)}</p>
        </article>
        <article className={activeHabits.length > 0 && checkedCount === activeHabits.length ? 'stat stat-done' : 'stat'}>
          <h2>今日习惯</h2>
          <p className="figure">{activeHabits.length === 0 ? '—' : `${checkedCount}/${activeHabits.length}`}</p>
          <p className="sub">
            {activeHabits.length === 0 ? '还没有习惯' : checkedCount === activeHabits.length ? '全部完成' : `还剩 ${activeHabits.length - checkedCount} 项`}
          </p>
        </article>
      </section>

      <section>
        <div className="section-head">
          <h2>习惯</h2>
          {activeHabits.length > 0 ? (
            <button type="button" className="btn ghost" onClick={(event) => habitDialog.show(event.currentTarget)}>
              新建
            </button>
          ) : null}
        </div>
        {activeHabits.length === 0 ? (
          <EmptyState title="还没有习惯" body="添加一件想每天做到的小事。">
            <button type="button" className="btn primary" onClick={(event) => habitDialog.show(event.currentTarget)}>
              新建习惯
            </button>
          </EmptyState>
        ) : (
          <ul className="stack">
            {activeHabits.map((habit) => (
              <li key={habit.id}>
                <HabitCheckRow habit={habit} today={today} checkIns={state.checkIns} onToggle={() => toggleCheckIn(habit.id, today)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="section-head">
          <h2>支出</h2>
        </div>
        {shown.length === 0 ? (
          <EmptyState
            title="今天还没记账"
            body={state.expenses.length === 0 ? '记下吃的、坐的、买的，回头一看就清楚。' : '今天的花费会列在这里。'}
          />
        ) : (
          <>
            <ul className="stack">
              {shown.map((expense) => (
                <li key={expense.id}>
                  <ExpenseRow
                    expense={expense}
                    categories={state.categories}
                    onEdit={(event) => {
                      setEditing(expense)
                      expenseDialog.show(event.currentTarget)
                    }}
                  />
                </li>
              ))}
            </ul>
            {rest > 0 ? (
              <p className="hint more-link">
                还有 {rest} 笔，<a href="#/expenses">去记账查看</a>
              </p>
            ) : null}
          </>
        )}
      </section>

      {expenseDialog.open ? (
        <ExpenseDialog
          categories={state.categories}
          expense={editing}
          defaultCategoryId={state.lastCategoryId}
          onAddCategory={addCategory}
          onClose={expenseDialog.hide}
          onSubmit={(input) => {
            if (editing) updateExpense(editing.id, input)
            else addExpense(input)
            expenseDialog.hide()
          }}
          onDelete={
            editing
              ? () => {
                  deleteExpense(editing.id)
                  expenseDialog.hide()
                }
              : undefined
          }
        />
      ) : null}
      {habitDialog.open ? (
        <HabitDialog
          habit={null}
          onClose={habitDialog.hide}
          onSubmit={(input) => {
            addHabit(input)
            habitDialog.hide()
          }}
        />
      ) : null}
    </div>
  )
}

function HabitCheckRow({
  habit,
  today,
  checkIns,
  onToggle,
}: {
  habit: Habit
  today: string
  checkIns: { habitId: string; date: string }[]
  onToggle: () => void
}) {
  const dates = datesForHabit(checkIns, habit.id)
  const streak = currentStreak(dates, today)
  return (
    <button type="button" className="habit-row" aria-pressed={streak.includesToday} onClick={onToggle}>
      <Seal text={habit.name} color={habit.color} />
      <span className="habit-copy">
        <span className="row-title">{habit.name}</span>
        <span className="row-meta">{streakText(streak)}</span>
        <WeekStrip dates={dates} today={today} compact />
      </span>
      <span className="check" aria-hidden="true">
        {streak.includesToday ? <CheckIcon /> : null}
      </span>
    </button>
  )
}

function ExpenseRow({
  expense,
  categories,
  onEdit,
}: {
  expense: Expense
  categories: { id: string; name: string; color: string }[]
  onEdit: (event: MouseEvent<HTMLButtonElement>) => void
}) {
  const category = categories.find((item) => item.id === expense.categoryId)
  const name = category?.name ?? '未分类'
  return (
    <button type="button" className="expense-row" onClick={onEdit}>
      <Seal text={name} color={category?.color ?? '#3f3a34'} />
      <span className="expense-copy">
        <span className="row-title">{name}</span>
        <span className="row-meta">
          {expense.note ? `${expense.note} · ` : ''}
          {formatClock(expense.occurredAt)}
          <span className="sr-only">，编辑</span>
        </span>
      </span>
      <span className="expense-amount">¥{formatYuan(expense.amountCents)}</span>
    </button>
  )
}
