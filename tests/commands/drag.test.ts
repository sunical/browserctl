import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Session } from '../../src/core/session.js'
import { drag } from '../../src/commands/drag.js'

describe('drag', () => {
  let session: Session

  beforeAll(async () => {
    session = await Session.create({ headless: true })
    await session.page.setContent('<html><body style="width:500px;height:500px"></body></html>')
  })

  afterAll(async () => {
    await session.close()
  })

  it('returns from and to coordinates', async () => {
    const result = await drag(session.page, 10, 20, 100, 200)
    expect(result.from).toEqual({ x: 10, y: 20 })
    expect(result.to).toEqual({ x: 100, y: 200 })
  })
})
