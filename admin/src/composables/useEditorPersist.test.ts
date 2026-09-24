import { describe, expect, it } from 'vitest'
import { retryDelayMs } from './useEditorPersist'

describe('useEditorPersist retry backoff', () => {
  it('uses exponential delay capped at 60s', () => {
    expect(retryDelayMs(1)).toBe(1000)
    expect(retryDelayMs(2)).toBe(2000)
    expect(retryDelayMs(3)).toBe(4000)
    expect(retryDelayMs(10)).toBe(60_000)
  })
})
