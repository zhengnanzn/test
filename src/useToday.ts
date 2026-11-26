import { useEffect, useState } from 'react'
import { todayKey } from './logic'

export function useTodayKey(): string {
  const [key, setKey] = useState(() => todayKey())

  useEffect(() => {
    const update = () => setKey(todayKey())
    const timer = window.setInterval(update, 60_000)
    document.addEventListener('visibilitychange', update)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', update)
    }
  }, [])

  return key
}
