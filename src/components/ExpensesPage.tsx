import { useMemo, useState } from 'react'
import type { FormEvent, MouseEvent } from 'react'
import {
  categoryBreakdown,
  filterExpenses,
  formatClock,
  formatMonthLabel,
  formatPercent,
  formatYuan,
  groupByDate,
  monthBounds,
  parseDateKey,
  sumInRange,
} from '../logic'
import { useDialog } from '../useDialog'
import { useStore } from '../store'
import { useTodayKey } from '../useToday'
import type { Expense } from '../types'
import { EmptyState } from './EmptyState'
import { ExpenseDialog } from './ExpenseDialog'
import { Seal } from './Seal'

export function ExpensesPage() {
  const today = useTodayKey()
  const { state, addExpense, updateExpense, deleteExpense, addCategory, deleteCategory } = useStore()
  const bounds = monthBounds(parseDateKey(today))
  const [start, setStart] = useState(bounds.start)
  const [end, setEnd] = useState(today)
  const [categoryId, setCategoryId] = useState('')
  const [editing, setEditing] = useState<Expense | null>(null)
  const [categoryMessage, setCategoryMessage] = useState('')
  const [newName, setNewName] = useState('')
  const dialog = useDialog()

  const todayTotal = sumInRange(state.expenses, today, today)
  const monthTotal = sumInRange(state.expenses, bounds.start, bounds.end)
  const breakdown = categoryBreakdown(state.expenses, bounds.start, bounds.end)
  const rangeInvalid = start !== '' && end !== '' && start > end
  const filtered = useMemo(
    () => (rangeInvalid ? [] : filterExpenses(state.expenses, { start, end, categoryId })),
    [state.expenses, start, end, categoryId, rangeInvalid],
  )
  const groups = groupByDate(filtered, today)

  function resetFilters() {
    const next = monthBounds(parseDateKey(today))
    setStart(next.start)
    setEnd(today)
    setCategoryId('')
  }

  function addCustomCategory(event: FormEvent) {
    event.preventDefault()
    const result = addCategory(newName)
    if (!result.ok) {
      setCategoryMessage(result.message)
      return
    }
    setNewName('')
    setCategoryMessage('已添加分类')
  }

  return (
    <div className="page">
      <header className="page-head">
        <div className="top-row">
          <div>
            <p className="brand">日迹</p>
            <h1>记账</h1>
          </div>
          <button
            type="button"
            className="btn primary"
            onClick={(event) => {
              setEditing(null)
              dialog.show(event.currentTarget)
            }}
          >
            记一笔
          </button>
        </div>
        <p className="lede">{formatMonthLabel(today)}</p>
      </header>

      <section className="summary" aria-label="支出合计">
        <article className="stat">
          <h2>今日</h2>
          <p className="figure">
            <span className="yen">¥</span>
            {formatYuan(todayTotal)}
          </p>
        </article>
        <article className="stat">
          <h2>本月</h2>
          <p className="figure">
            <span className="yen">¥</span>
            {formatYuan(monthTotal)}
          </p>
        </article>
      </section>

      <section>
        <div className="section-head">
          <h2>本月分类</h2>
        </div>
        {breakdown.length === 0 ? (
          <p className="hint">本月还没有支出。</p>
        ) : (
          <ul className="bars">
            {breakdown.map((row) => {
              const category = state.categories.find((item) => item.id === row.categoryId)
              const name = category?.name ?? '未分类'
              return (
                <li key={row.categoryId}>
                  <div className="bar-label">
                    <span>{name}</span>
                    <span className="money">
                      ¥{formatYuan(row.cents)} · {formatPercent(row.ratio)}
                    </span>
                  </div>
                  <div className="bar-track" aria-hidden="true">
                    <div
                      className="bar-fill"
                      style={{ width: `${Math.max(row.ratio * 100, 3)}%`, background: category?.color ?? '#3f3a34' }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section>
        <div className="section-head">
          <h2>明细</h2>
          {filtered.length > 0 ? <p className="hint">共 {filtered.length} 笔</p> : null}
        </div>
        <form
          className="filters"
          onSubmit={(event) => {
            event.preventDefault()
          }}
        >
          <label className="field">
            <span>从</span>
            <input type="date" value={start} onChange={(event) => setStart(event.target.value)} />
          </label>
          <label className="field">
            <span>到</span>
            <input type="date" value={end} onChange={(event) => setEnd(event.target.value)} />
          </label>
          <label className="field">
            <span>分类</span>
            <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              <option value="">全部分类</option>
              {state.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn secondary" onClick={resetFilters}>
            重置
          </button>
        </form>
        {rangeInvalid ? (
          <EmptyState title="日期范围不对" body="开始日期不能晚于结束日期。" />
        ) : groups.length === 0 ? (
          <EmptyState
            title={state.expenses.length === 0 ? '还没有支出' : '没有符合条件的记录'}
            body={state.expenses.length === 0 ? '记下一笔之后，可以在这里按日期和分类查看。' : '换一个日期或分类再看看。'}
          />
        ) : (
          <div className="history">
            {groups.map((group) => (
              <section key={group.date}>
                <h3 className="day-label">{group.label}</h3>
                <ul className="stack">
                  {group.items.map((expense) => (
                    <li key={expense.id}>
                      <HistoryRow
                        expense={expense}
                        categories={state.categories}
                        onEdit={(event) => {
                          setEditing(expense)
                          dialog.show(event.currentTarget)
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="section-head">
          <h2>分类</h2>
        </div>
        <ul className="cat-manage">
          {state.categories.map((category) => {
            const inUse = state.expenses.some((expense) => expense.categoryId === category.id)
            return (
              <li key={category.id}>
                <Seal text={category.name} color={category.color} size={36} />
                <span className="cat-manage-name">{category.name}</span>
                {category.builtin ? (
                  <span className="tag">默认</span>
                ) : inUse ? (
                  <span className="tag">使用中</span>
                ) : (
                  <button
                    type="button"
                    className="btn ghost"
                    aria-label={`删除分类${category.name}`}
                    onClick={() => {
                      const result = deleteCategory(category.id)
                      setCategoryMessage(result.ok ? '已删除分类' : result.message)
                    }}
                  >
                    删除
                  </button>
                )}
              </li>
            )
          })}
        </ul>
        <form className="inline-add" onSubmit={addCustomCategory}>
          <label className="grow">
            <span className="sr-only">分类名称</span>
            <input
              value={newName}
              maxLength={12}
              placeholder="新分类名称"
              onChange={(event) => setNewName(event.target.value)}
            />
          </label>
          <button type="submit" className="btn secondary">
            添加
          </button>
        </form>
        {categoryMessage ? (
          <p className="hint" role="status">
            {categoryMessage}
          </p>
        ) : (
          <p className="hint">默认分类会一直保留。自己添加的分类，在没有支出使用时可以删除。</p>
        )}
      </section>

      {dialog.open ? (
        <ExpenseDialog
          categories={state.categories}
          expense={editing}
          defaultCategoryId={state.lastCategoryId}
          onAddCategory={addCategory}
          onClose={dialog.hide}
          onSubmit={(input) => {
            if (editing) updateExpense(editing.id, input)
            else addExpense(input)
            dialog.hide()
          }}
          onDelete={
            editing
              ? () => {
                  deleteExpense(editing.id)
                  dialog.hide()
                }
              : undefined
          }
        />
      ) : null}
    </div>
  )
}

function HistoryRow({
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
