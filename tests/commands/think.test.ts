import { describe, it, expect } from 'vitest'
import { think } from '../../src/commands/think.js'

describe('think', () => {
  it('returns the reasoning unchanged', () => {
    const result = think('I should click the login button')
    expect(result.reasoning).toBe('I should click the login button')
  })

  it('handles empty string', () => {
    const result = think('')
    expect(result.reasoning).toBe('')
  })
})
