import type { ReactNode } from 'react'

type EmptyStateProps = {
  title: string
  body: string
  children?: ReactNode
}

export function EmptyState({ title, body, children }: EmptyStateProps) {
  return (
    <div className="empty">
      <svg className="empty-art" viewBox="0 0 72 52" aria-hidden="true">
        <rect x="8" y="8" width="56" height="36" rx="8" fill="#fff" stroke="#e3dbcf" />
        <path d="M18 22h22M18 30h14" stroke="#d5cbbd" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="50" cy="20" r="7" fill="#f8e7df" stroke="#9a3412" strokeWidth="1.6" />
      </svg>
      <p className="empty-title">{title}</p>
      <p className="empty-body">{body}</p>
      {children}
    </div>
  )
}
