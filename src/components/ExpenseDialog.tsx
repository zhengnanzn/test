import { useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import { combineDateTime, formatYuan, nowParts, parseYuanToCents, splitDateTime } from '../logic'
import type { Category, Expense, ExpenseInput } from '../types'
import type { CategoryResult } from '../store'
import { Modal } from './Modal'
import { Seal } from './Seal'

type ExpenseDialogProps = {
  categories: Category[]
  expense: Expense | null
  defaultCategoryId: string | null
  onSubmit: (input: ExpenseInput) => void
  onDelete?: () => void
  onAddCategory: (name: string) => CategoryResult
  onClose: () => void
}

export function ExpenseDialog({
  categories,
  expense,
  defaultCategoryId,
  onSubmit,
  onDelete,
  onAddCategory,
  onClose,
}: ExpenseDialogProps) {
  const parts = expense ? splitDateTime(expense.occurredAt) : nowParts()
  const fallbackCategory =
    defaultCategoryId && categories.some((category) => category.id === defaultCategoryId) ? defaultCategoryId : ''
  const [amount, setAmount] = useState(expense ? formatYuan(expense.amountCents) : '')
  const [categoryId, setCategoryId] = useState(expense?.categoryId ?? fallbackCategory)
  const [note, setNote] = useState(expense?.note ?? '')
  const [date, setDate] = useState(parts.date)
  const [time, setTime] = useState(parts.time)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [categoryError, setCategoryError] = useState('')
  const [confirming, setConfirming] = useState(false)

  function submit() {
    const cents = parseYuanToCents(amount)
    if (cents === null) {
      setError('请输入 0.01 到 9,999,999.99 之间的金额')
      return
    }
    if (!categoryId) {
      setError('请选择分类')
      return
    }
    const occurredAt = combineDateTime(date, time)
    if (!occurredAt) {
      setError('请把日期和时间填完整')
      return
    }
    onSubmit({ amountCents: cents, categoryId, note, occurredAt })
  }

  function commitCategory() {
    const result = onAddCategory(newName)
    if (!result.ok) {
      setCategoryError(result.message)
      return
    }
    setCategoryId(result.id)
    setNewName('')
    setAdding(false)
    setCategoryError('')
  }

  function onCategoryKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
    event.preventDefault()
    const delta = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1
    const next = categories[(index + delta + categories.length) % categories.length]
    if (!next) return
    setCategoryId(next.id)
    document.getElementById(`category-${next.id}`)?.focus()
  }

  if (confirming) {
    return (
      <Modal title="删除这笔支出？" onClose={onClose}>
        <p className="confirm-copy">删除后无法恢复。</p>
        <div className="dialog-actions">
          <button type="button" className="btn secondary" onClick={() => setConfirming(false)}>
            返回
          </button>
          <button type="button" className="btn danger" onClick={onDelete} autoFocus>
            确认删除
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title={expense ? '编辑支出' : '记一笔'} onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <label className="field">
          <span>金额</span>
          <input
            className="amount-input"
            inputMode="decimal"
            autoComplete="off"
            autoFocus
            placeholder="0.00"
            value={amount}
            aria-invalid={error.includes('金额') || undefined}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
        <fieldset className="field">
          <legend>分类</legend>
          <div className="cat-grid" role="radiogroup" aria-label="分类">
            {categories.map((category, index) => {
              const selected = category.id === categoryId
              const tabIndex = categoryId ? (selected ? 0 : -1) : index === 0 ? 0 : -1
              return (
                <button
                  key={category.id}
                  id={`category-${category.id}`}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  tabIndex={tabIndex}
                  className="cat-choice"
                  style={{ '--seal': category.color } as CSSProperties}
                  onClick={() => setCategoryId(category.id)}
                  onKeyDown={(event) => onCategoryKeyDown(event, index)}
                >
                  <Seal text={category.name} color={category.color} size={28} />
                  <span>{category.name}</span>
                </button>
              )
            })}
          </div>
          {adding ? (
            <div className="inline-add">
              <label className="grow">
                <span className="sr-only">分类名称</span>
                <input
                  value={newName}
                  maxLength={12}
                  placeholder="分类名称"
                  autoFocus
                  onChange={(event) => setNewName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      commitCategory()
                    }
                  }}
                />
              </label>
              <button type="button" className="btn secondary" onClick={commitCategory}>
                添加
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setAdding(false)
                  setCategoryError('')
                }}
              >
                取消
              </button>
            </div>
          ) : (
            <button type="button" className="btn ghost add-cat" onClick={() => setAdding(true)}>
              新分类
            </button>
          )}
          {categoryError ? (
            <p className="form-error" role="alert">
              {categoryError}
            </p>
          ) : null}
        </fieldset>
        <label className="field">
          <span>备注（选填）</span>
          <input
            maxLength={80}
            placeholder="例如：午餐、地铁"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        <div className="datetime">
          <label className="field">
            <span>日期</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <label className="field">
            <span>时间</span>
            <input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
          </label>
        </div>
        <div className="dialog-actions">
          <button type="button" className="btn secondary" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="btn primary">
            保存
          </button>
        </div>
        {expense && onDelete ? (
          <button type="button" className="btn text-danger" onClick={() => setConfirming(true)}>
            删除这笔支出
          </button>
        ) : null}
      </form>
    </Modal>
  )
}
