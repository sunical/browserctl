import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Session } from '../src/core/session.js'

describe('per-session command queue', () => {
  let session: Session

  beforeAll(async () => {
    session = await Session.create({ headless: true })
  })

  afterAll(async () => {
    await session.close()
  })

  it('runs tasks one at a time, in order', async () => {
    const order: string[] = []
    const task = (name: string, delay: number) => async () => {
      order.push(`${name}:start`)
      await new Promise(r => setTimeout(r, delay))
      order.push(`${name}:end`)
      return name
    }

    // Fired concurrently. Without the queue these would interleave.
    const results = await Promise.all([
      session.run(task('a', 40)),
      session.run(task('b', 10)),
      session.run(task('c', 5)),
    ])

    expect(results).toEqual(['a', 'b', 'c'])
    expect(order).toEqual([
      'a:start', 'a:end',
      'b:start', 'b:end',
      'c:start', 'c:end',
    ])
  })

  it('keeps the chain alive after a task rejects', async () => {
    const failing = session.run(async () => {
      throw new Error('boom')
    })
    await expect(failing).rejects.toThrow('boom')

    // A rejection must not poison the queue for everything queued after it.
    await expect(session.run(async () => 'still works')).resolves.toBe('still works')
  })

  it('propagates rejection to the caller, not to its neighbours', async () => {
    const [bad, good] = await Promise.allSettled([
      session.run(async () => {
        throw new Error('nope')
      }),
      session.run(async () => 'fine'),
    ])
    expect(bad.status).toBe('rejected')
    expect(good.status).toBe('fulfilled')
  })

  it('does not serialise across different sessions', async () => {
    const other = await Session.create({ headless: true })
    const start = Date.now()
    await Promise.all([
      session.run(() => new Promise(r => setTimeout(r, 200))),
      other.run(() => new Promise(r => setTimeout(r, 200))),
    ])
    // Independent sessions run in parallel; serialised would be ~400ms.
    expect(Date.now() - start).toBeLessThan(380)
    await other.close()
  })
})
