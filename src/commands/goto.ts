import type { Page } from 'playwright'

// A scheme followed by "//" means an absolute URL with an authority. The
// second group covers schemes that legitimately have no authority, which a
// bare `includes(':')` check cannot distinguish from a host:port like
// "localhost:8080" — that one does want https:// in front of it.
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i
const SCHEMELESS_AUTHORITY = /^(data|about|blob|file):/i

export async function goto(page: Page, url: string): Promise<{ url: string }> {
  const target = HAS_SCHEME.test(url) || SCHEMELESS_AUTHORITY.test(url) ? url : `https://${url}`
  await page.goto(target, { waitUntil: 'domcontentloaded' })
  return { url: page.url() }
}
