import { useRef, useState } from 'react'

export function useDialog() {
  const [open, setOpen] = useState(false)
  const returnFocus = useRef<HTMLElement | null>(null)

  function show(trigger?: EventTarget | null) {
    if (trigger instanceof HTMLElement) returnFocus.current = trigger
    else if (document.activeElement instanceof HTMLElement) returnFocus.current = document.activeElement
    else returnFocus.current = null
    setOpen(true)
  }

  function hide() {
    setOpen(false)
    const target = returnFocus.current
    window.requestAnimationFrame(() => target?.focus())
  }

  return { open, show, hide }
}
