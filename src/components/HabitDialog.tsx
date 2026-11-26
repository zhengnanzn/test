import { useState } from 'react'
import type { CSSProperties } from 'react'
import { HABIT_COLORS } from '../model'
import type { Habit, HabitInput } from '../types'
import { Modal } from './Modal'
import { Seal } from './Seal'

type HabitDialogProps = {
  habit: Habit | null
  onSubmit: (input: HabitInput) => void
  onArchive?: () => void
  onClose: () => void
}

export function HabitDialog({ habit, onSubmit, onArchive, onClose }: HabitDialogProps) {
  const [name, setName] = useState(habit?.name ?? '')
  const [color, setColor] = useState(habit?.color ?? HABIT_COLORS[1].value)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const preview = name.trim() || '习'

  if (confirming) {
    return (
      <Modal title="归档这个习惯？" onClose={onClose}>
        <p className="confirm-copy">归档后不会出现在今天的列表里，已有打卡会保留。</p>
        <div className="dialog-actions">
          <button type="button" className="btn secondary" onClick={() => setConfirming(false)}>
            返回
          </button>
          <button type="button" className="btn danger" onClick={onArchive} autoFocus>
            确认归档
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title={habit ? '编辑习惯' : '新建习惯'} onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          const trimmed = name.trim()
          if (!trimmed) {
            setError('请填写习惯名称')
            return
          }
          if (Array.from(trimmed).length > 20) {
            setError('习惯名称最多 20 个字')
            return
          }
          onSubmit({ name: trimmed, color })
        }}
      >
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <label className="field">
          <span>习惯名称</span>
          <input
            autoFocus
            maxLength={20}
            placeholder="例如：早睡、喝水、散步"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <fieldset className="field">
          <legend>颜色</legend>
          <div className="color-row" role="radiogroup" aria-label="颜色">
            {HABIT_COLORS.map((item, index) => {
              const selected = item.value === color
              const tabIndex = selected || (!HABIT_COLORS.some((entry) => entry.value === color) && index === 0) ? 0 : -1
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={item.label}
                  tabIndex={tabIndex}
                  className="color-choice"
                  style={{ '--seal': item.value } as CSSProperties}
                  onClick={() => setColor(item.value)}
                  onKeyDown={(event) => {
                    if (!['ArrowRight', 'ArrowLeft'].includes(event.key)) return
                    event.preventDefault()
                    const delta = event.key === 'ArrowLeft' ? -1 : 1
                    const next = HABIT_COLORS[(index + delta + HABIT_COLORS.length) % HABIT_COLORS.length]
                    if (!next) return
                    setColor(next.value)
                    document.getElementById(`habit-color-${next.id}`)?.focus()
                  }}
                  id={`habit-color-${item.id}`}
                >
                  <Seal text={preview} color={item.value} size={36} />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>
        </fieldset>
        <div className="dialog-actions">
          <button type="button" className="btn secondary" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="btn primary">
            保存
          </button>
        </div>
        {habit && onArchive ? (
          <button type="button" className="btn text-danger" onClick={() => setConfirming(true)}>
            归档
          </button>
        ) : null}
      </form>
    </Modal>
  )
}
