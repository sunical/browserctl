import { describe, it, expect } from 'vitest'
import { parseScript, commands } from '../src/core/dispatch.js'

describe('parseScript', () => {
  it('splits steps on semicolons', () => {
    const steps = parseScript('goto example.com; back')
    expect(steps.map(s => s.name)).toEqual(['goto', 'back'])
  })

  it('splits steps on newlines and ignores blank lines', () => {
    const steps = parseScript('goto example.com\n\n  back  \n')
    expect(steps.map(s => s.name)).toEqual(['goto', 'back'])
  })

  it('maps positional arguments by name', () => {
    const [step] = parseScript('goto https://example.com')
    expect(step.args).toEqual({ url: 'https://example.com' })
  })

  it('coerces numeric arguments', () => {
    const [step] = parseScript('click 640 400')
    expect(step.args).toEqual({ x: 640, y: 400 })
  })

  it('keeps quoted arguments intact, semicolons included', () => {
    const [step] = parseScript('act "click Sign in; now"')
    expect(step.args.instruction).toBe('click Sign in; now')
  })

  it('handles single quotes', () => {
    const [step] = parseScript("act 'click Sign in'")
    expect(step.args.instruction).toBe('click Sign in')
  })

  it('collapses trailing positionals into the last slot', () => {
    const [step] = parseScript('act click Sign in')
    expect(step.args.instruction).toBe('click Sign in')
  })

  it('parses --flag value pairs', () => {
    const [step] = parseScript('wait --for-selector "#results"')
    expect(step.args['for-selector']).toBe('#results')
  })

  it('parses --flag=value pairs', () => {
    const [step] = parseScript('extract --selector=main')
    expect(step.args.selector).toBe('main')
  })

  it('treats declared boolean flags as booleans', () => {
    const [step] = parseScript('a11y --full')
    expect(step.args.full).toBe(true)
  })

  it('does not let a boolean flag swallow the next token', () => {
    const steps = parseScript('wait --for-network-idle; back')
    expect(steps[0].args['for-network-idle']).toBe(true)
    expect(steps.map(s => s.name)).toEqual(['wait', 'back'])
  })

  it('rejects unknown commands at parse time', () => {
    expect(() => parseScript('goto example.com; frobnicate')).toThrow(/Unknown command "frobnicate"/)
  })

  it('rejects an unterminated quote', () => {
    expect(() => parseScript('act "click Sign in')).toThrow(/Unterminated/)
  })

  it('preserves the source text of each step for reporting', () => {
    const [step] = parseScript('  act "click Sign in"  ')
    expect(step.source).toBe('act "click Sign in"')
  })
})

describe('command specs', () => {
  it('marks page-changing commands as mutating', () => {
    for (const name of ['goto', 'act', 'click', 'type', 'scroll', 'back', 'drag', 'fillform', 'keys']) {
      expect(commands[name].mutating, name).toBe(true)
    }
  })

  it('marks read-only commands as non-mutating, so they skip the snapshot', () => {
    for (const name of ['a11y', 'extract', 'screenshot', 'think']) {
      expect(commands[name].mutating, name).toBe(false)
    }
  })
})

describe('numeric validation', () => {
  it('rejects a non-numeric value instead of passing NaN through', () => {
    expect(() => parseScript('click 640 400 oops')).toThrow(/Expected a number for "y"/)
    expect(() => parseScript('scroll down --percent abc')).toThrow(/Expected a number for "percent"/)
  })

  it('still accepts valid numbers', () => {
    expect(parseScript('drag 1 2 3 4')[0].args).toEqual({ x1: 1, y1: 2, x2: 3, y2: 4 })
    expect(parseScript('scroll down --percent 50')[0].args).toEqual({ direction: 'down', percent: 50 })
  })

  it('allows wait with no duration, since a condition may supply it', () => {
    expect(() => parseScript('wait --for-selector "#x"')).not.toThrow()
  })
})
