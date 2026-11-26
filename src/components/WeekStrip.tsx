import { weekStrip } from '../logic'

type WeekStripProps = {
  dates: readonly string[]
  today: string
  compact?: boolean
}

export function WeekStrip({ dates, today, compact = false }: WeekStripProps) {
  const days = weekStrip(dates, today)
  const items = days.map((day) => {
    const statusText = day.status === 'done' ? '已打卡' : day.status === 'future' ? '未到' : '未打卡'
    return (
      <span key={day.date} className="week-item" role="listitem">
        {compact ? null : (
          <span className="week-name" aria-hidden="true">
            {day.shortLabel}
          </span>
        )}
        <span
          className={`dot ${day.status}${day.date === today ? ' is-today' : ''}`}
          role="img"
          aria-label={`周${day.shortLabel}，${statusText}`}
        />
      </span>
    )
  })

  if (compact) {
    return (
      <span className="week week-compact" aria-hidden="true">
        {items}
      </span>
    )
  }

  return (
    <div className="week" role="list" aria-label="本周打卡">
      {items}
    </div>
  )
}
