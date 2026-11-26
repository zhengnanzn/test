import { useEffect, useState } from 'react'

export type PageId = 'today' | 'expenses' | 'habits'

const TITLES: Record<PageId, string> = {
  today: '今天 · 日迹',
  expenses: '记账 · 日迹',
  habits: '习惯 · 日迹',
}

export function pageFromHash(hash: string): PageId {
  if (hash === '#/expenses') return 'expenses'
  if (hash === '#/habits') return 'habits'
  return 'today'
}

export function usePage(): PageId {
  const [page, setPage] = useState<PageId>(() => pageFromHash(window.location.hash))

  useEffect(() => {
    const onHash = () => setPage(pageFromHash(window.location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    document.title = TITLES[page]
  }, [page])

  return page
}
