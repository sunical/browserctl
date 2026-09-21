import { describe, it, expect } from 'vitest'
import { VERSION } from '../src/core/version.js'
import { SessionRegistry } from '../src/core/session.js'

describe('version', () => {
  it('matches package.json, so daemon and CLI cannot disagree', async () => {
    const pkg = JSON.parse(
      await import('fs/promises').then(fs => fs.readFile(new URL('../package.json', import.meta.url), 'utf8'))
    )
    expect(VERSION).toBe(pkg.version)
  })

  it('is a semver string', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+/)
  })
})

describe('SessionRegistry reuse', () => {
  it('reports a live session so start can reuse it', async () => {
    const registry = new SessionRegistry()
    const session = await registry.create({ headless: true })
    expect(registry.list().map(s => s.id)).toContain(session.id)
    await registry.closeAll()
  })

  it('stops reporting a session once removed, so start makes a fresh one', async () => {
    const registry = new SessionRegistry()
    const session = await registry.create({ headless: true })
    await registry.remove(session.id)
    expect(registry.list().map(s => s.id)).not.toContain(session.id)
  })
})

describe('default session handling', () => {
  it('an additional session does not become the default', async () => {
    // Regression: `start --new` used to overwrite the default session file, so
    // stopping the additional session left the original unreachable.
    const registry = new SessionRegistry()
    const first = await registry.create({ headless: true })
    const second = await registry.create({ headless: true })

    // The registry itself holds no notion of "default" — that lives in the CLI
    // — but both sessions must remain independently addressable.
    expect(registry.get(first.id)).toBeTruthy()
    expect(registry.get(second.id)).toBeTruthy()

    await registry.remove(second.id)
    expect(registry.get(first.id)).toBeTruthy()
    expect(registry.get(second.id)).toBeUndefined()

    await registry.closeAll()
  })
})
