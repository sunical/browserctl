import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Session } from '../../src/core/session.js'
import { a11y, REF_ATTR } from '../../src/commands/a11y.js'
import { goto } from '../../src/commands/goto.js'

describe('a11y', () => {
  let session: Session

  beforeAll(async () => {
    session = await Session.create({ headless: true })
    await goto(session.page, 'https://example.com')
  })

  afterAll(async () => {
    await session.close()
  })

  it('returns a tree, url, title and ref count', async () => {
    const result = await a11y(session.page)
    expect(result.url).toContain('example.com')
    expect(result.tree).toBeTruthy()
    expect(result.title).toBe('Example Domain')
    expect(result.count).toBeGreaterThan(0)
  })

  it('emits headings for orientation', async () => {
    const result = await a11y(session.page)
    expect(result.tree).toContain('# Example Domain')
  })

  it('indexes interactive elements with refs', async () => {
    const result = await a11y(session.page)
    expect(result.tree).toMatch(/\[0\] link "Learn more"/)
  })

  it('stamps refs onto the DOM so act can target them', async () => {
    await a11y(session.page)
    const count = await session.page.locator(`[${REF_ATTR}]`).count()
    expect(count).toBeGreaterThan(0)
  })

  it('reassigns refs from zero on each call', async () => {
    await a11y(session.page)
    await a11y(session.page)
    const duplicates = await session.page.locator(`[${REF_ATTR}="0"]`).count()
    expect(duplicates).toBe(1)
  })

  it('is far smaller than the --full tree', async () => {
    const slim = await a11y(session.page)
    const full = await a11y(session.page, { full: true })
    expect(slim.tree.length).toBeLessThan(full.tree.length)
  })

  it('handles a blank page without throwing', async () => {
    const blank = await Session.create({ headless: true })
    const result = await a11y(blank.page)
    expect(result.tree).toBeTruthy()
    await blank.close()
  })
})

describe('a11y element details', () => {
  let session: Session

  const fixture = `data:text/html,${encodeURIComponent(`
    <h1>Form</h1>
    <label for="e">Email</label><input id="e" type="email" required value="a@b.c">
    <label><input type="checkbox" id="c" checked> Remember</label>
    <select id="s"><option>Free</option><option selected>Pro</option></select>
    <button disabled>Save</button>
    <div hidden><button>Hidden</button></div>
    <div style="display:none"><a href="/x">Invisible</a></div>
  `)}`

  beforeAll(async () => {
    session = await Session.create({ headless: true })
    await session.page.goto(fixture)
  })

  afterAll(async () => {
    await session.close()
  })

  it('resolves names from label[for] and wrapping labels', async () => {
    const { tree } = await a11y(session.page)
    expect(tree).toContain('"Email"')
    expect(tree).toContain('"Remember"')
  })

  it('reports control state and value', async () => {
    const { tree } = await a11y(session.page)
    expect(tree).toContain('required')
    expect(tree).toContain('value="a@b.c"')
    expect(tree).toContain('checked')
    expect(tree).toContain('value="Pro"')
    expect(tree).toContain('disabled')
  })

  it('does not name a select from its option text', async () => {
    const { tree } = await a11y(session.page)
    expect(tree).not.toContain('"Free Pro"')
  })

  it('omits hidden and display:none elements', async () => {
    const { tree } = await a11y(session.page)
    expect(tree).not.toContain('Hidden')
    expect(tree).not.toContain('Invisible')
  })
})

describe('a11y shadow DOM', () => {
  let session: Session

  const fixture = `data:text/html,${encodeURIComponent(`
    <button>Light button</button>
    <my-widget></my-widget>
    <script>
      customElements.define('my-widget', class extends HTMLElement {
        connectedCallback() {
          this.attachShadow({ mode: 'open' }).innerHTML =
            '<button>Shadow button</button>' +
            '<label for="si">Shadow field</label><input id="si">' +
            '<div hidden><button>Shadow hidden</button></div>'
        }
      })
    </script>
  `)}`

  beforeAll(async () => {
    session = await Session.create({ headless: true })
    await session.page.goto(fixture)
    await session.page.waitForTimeout(100)
  })

  afterAll(async () => {
    await session.close()
  })

  it('finds elements inside open shadow roots', async () => {
    // querySelectorAll stops at shadow boundaries, so these were invisible to
    // the snapshot even though Playwright could click them.
    const { tree, count } = await a11y(session.page)
    expect(tree).toContain('Light button')
    expect(tree).toContain('Shadow button')
    expect(count).toBe(3)
  })

  it('resolves labels against the shadow root, not the document', async () => {
    const { tree } = await a11y(session.page)
    expect(tree).toContain('"Shadow field"')
  })

  it('still filters hidden shadow content', async () => {
    const { tree } = await a11y(session.page)
    expect(tree).not.toContain('Shadow hidden')
  })

  it('assigns refs that act can click through the shadow boundary', async () => {
    await a11y(session.page)
    const { act } = await import('../../src/commands/act.js')
    const result = await act(session.page, '1')
    expect(result.method).toBe('ref')
    expect(result.target).toContain('Shadow button')
  })
})
