import { beforeEach, describe, expect, it } from 'vitest'
import { initialState } from './model'
import { loadState, saveState, STORAGE_KEY } from './storage'

function installMemoryStorage(options?: { failSet?: boolean }) {
  const map = new Map<string, string>()
  const storage = {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (options?.failSet) throw new Error('quota')
      map.set(key, value)
    },
    removeItem: (key: string) => {
      map.delete(key)
    },
    clear: () => map.clear(),
    key: (index: number) => [...map.keys()][index] ?? null,
    get length() {
      return map.size
    },
  }
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true })
  return map
}

describe('localStorage', () => {
  beforeEach(() => {
    installMemoryStorage()
  })

  it('保存后再读回来', () => {
    const state = initialState()
    state.habits.push({
      id: 'hab_1',
      name: '喝水',
      color: '#0f6a45',
      archived: false,
      createdAt: '2026-11-26T00:00:00.000Z',
      updatedAt: '2026-11-26T00:00:00.000Z',
    })
    saveState(state)
    expect(loadState().habits[0]?.name).toBe('喝水')
    expect(globalThis.localStorage.getItem(STORAGE_KEY)).toContain('喝水')
  })

  it('损坏的 JSON 不会让应用崩掉', () => {
    globalThis.localStorage.setItem(STORAGE_KEY, '{')
    expect(loadState().version).toBe(1)
    expect(loadState().expenses).toEqual([])
  })

  it('写不进去时静默跳过', () => {
    installMemoryStorage({ failSet: true })
    expect(() => saveState(initialState())).not.toThrow()
  })
})
