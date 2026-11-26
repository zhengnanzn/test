import { useEffect, useRef } from 'react'
import { StoreProvider } from './store'
import { usePage } from './usePage'
import { ExpensesPage } from './components/ExpensesPage'
import { HabitsPage } from './components/HabitsPage'
import { HabitIcon, LedgerIcon, TodayIcon } from './components/Icons'
import { TodayPage } from './components/TodayPage'

export function App() {
  const page = usePage()
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0)
  }, [page])

  return (
    <StoreProvider>
      <div className="app">
        <a className="skip" href="#main">
          跳到主要内容
        </a>
        <div className="accent" aria-hidden="true" />
        <main id="main" ref={mainRef} tabIndex={-1}>
          {page === 'today' ? <TodayPage /> : null}
          {page === 'expenses' ? <ExpensesPage /> : null}
          {page === 'habits' ? <HabitsPage /> : null}
        </main>
        <nav className="tabbar" aria-label="主导航">
          <a href="#/today" aria-current={page === 'today' ? 'page' : undefined}>
            <TodayIcon />
            <span>今天</span>
          </a>
          <a href="#/expenses" aria-current={page === 'expenses' ? 'page' : undefined}>
            <LedgerIcon />
            <span>记账</span>
          </a>
          <a href="#/habits" aria-current={page === 'habits' ? 'page' : undefined}>
            <HabitIcon />
            <span>习惯</span>
          </a>
        </nav>
      </div>
    </StoreProvider>
  )
}
