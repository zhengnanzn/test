import { useState } from 'react'
import type { MouseEvent } from 'react'
import { currentStreak, datesForHabit, sortByCreated, streakText, weekDoneCount } from '../logic'
import { useDialog } from '../useDialog'
import { useStore } from '../store'
import { useTodayKey } from '../useToday'
import type { Habit } from '../types'
import { EmptyState } from './EmptyState'
import { HabitDialog } from './HabitDialog'
import { Seal } from './Seal'
import { WeekStrip } from './WeekStrip'

export function HabitsPage() {
  const today = useTodayKey()
  const { state, addHabit, updateHabit, setHabitArchived, toggleCheckIn } = useStore()
  const dialog = useDialog()
  const [editing, setEditing] = useState<Habit | null>(null)
  const active = sortByCreated(state.habits.filter((habit) => !habit.archived))
  const archived = sortByCreated(state.habits.filter((habit) => habit.archived))

  return (
    <div className="page">
      <header className="page-head">
        <div className="top-row">
          <div>
            <p className="brand">日迹</p>
            <h1>习惯</h1>
          </div>
          <button
            type="button"
            className="btn primary"
            onClick={(event) => {
              setEditing(null)
              dialog.show(event.currentTarget)
            }}
          >
            新建习惯
          </button>
        </div>
        <p className="lede">只能为今天打卡。漏掉的日期不能补记。</p>
      </header>

      <section>
        <div className="section-head">
          <h2>进行中</h2>
        </div>
        {active.length === 0 ? (
          <EmptyState title="还没有进行中的习惯" body="从一件小事开始，比如喝水、散步或早睡。" />
        ) : (
          <ul className="stack">
            {active.map((habit) => (
              <li key={habit.id}>
                <HabitCard
                  habit={habit}
                  today={today}
                  dates={datesForHabit(state.checkIns, habit.id)}
                  onEdit={(event) => {
                    setEditing(habit)
                    dialog.show(event.currentTarget)
                  }}
                  onToggle={() => toggleCheckIn(habit.id, today)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {archived.length > 0 ? (
        <section>
          <details className="archived">
            <summary>已归档（{archived.length}）</summary>
            <ul className="stack">
              {archived.map((habit) => (
                <li key={habit.id}>
                  <article className="habit-card">
                    <div className="habit-card-top">
                      <Seal text={habit.name} color={habit.color} />
                      <div className="habit-copy">
                        <h3>{habit.name}</h3>
                        <p>{streakText(currentStreak(datesForHabit(state.checkIns, habit.id), today))}</p>
                      </div>
                    </div>
                    <WeekStrip dates={datesForHabit(state.checkIns, habit.id)} today={today} />
                    <button type="button" className="btn secondary" aria-label={`恢复${habit.name}`} onClick={() => setHabitArchived(habit.id, false)}>
                      恢复
                    </button>
                  </article>
                </li>
              ))}
            </ul>
          </details>
        </section>
      ) : null}

      {dialog.open ? (
        <HabitDialog
          habit={editing}
          onClose={dialog.hide}
          onSubmit={(input) => {
            if (editing) updateHabit(editing.id, input)
            else addHabit(input)
            dialog.hide()
          }}
          onArchive={
            editing
              ? () => {
                  setHabitArchived(editing.id, true)
                  dialog.hide()
                }
              : undefined
          }
        />
      ) : null}
    </div>
  )
}

function HabitCard({
  habit,
  today,
  dates,
  onEdit,
  onToggle,
}: {
  habit: Habit
  today: string
  dates: string[]
  onEdit: (event: MouseEvent<HTMLButtonElement>) => void
  onToggle: () => void
}) {
  const streak = currentStreak(dates, today)
  const weekCount = weekDoneCount(dates, today)
  return (
    <article className="habit-card">
      <div className="habit-card-top">
        <Seal text={habit.name} color={habit.color} />
        <div className="habit-copy">
          <h3>{habit.name}</h3>
          <p>{streakText(streak)}</p>
        </div>
        <button type="button" className="btn ghost" aria-label={`编辑${habit.name}`} onClick={onEdit}>
          编辑
        </button>
      </div>
      <p className="week-count">本周 {weekCount} 天</p>
      <WeekStrip dates={dates} today={today} />
      <button type="button" className={streak.includesToday ? 'btn secondary' : 'btn primary'} aria-pressed={streak.includesToday} onClick={onToggle}>
        {streak.includesToday ? '取消今天的打卡' : '今天打卡'}
      </button>
    </article>
  )
}
