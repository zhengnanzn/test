import { initialState, sanitize } from './model'
import type { AppState } from './types'

export const STORAGE_KEY = 'riji.v1'

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState()
    return sanitize(JSON.parse(raw))
  } catch {
    return initialState()
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // 隐私模式或空间不足时，这一次仍可继续用，只是刷新后恢复不了。
  }
}
