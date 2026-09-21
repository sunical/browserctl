import { Command, InvalidArgumentError } from 'commander'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'
// Only config.js — importing daemon.js here would pull playwright and express
// into every CLI invocation, adding ~700ms of module load to every command.
import { DAEMON_PORT, DEFAULT_SESSION_FILE, CONFIG_DIR } from '../core/config.js'
import { VERSION } from '../core/version.js'
import { Observation, RunResult, StepResult } from '../types.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// --- HTTP client ---

interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  observation?: Observation
}

async function api<T = unknown>(path: string, body?: Record<string, unknown>): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`http://127.0.0.1:${DAEMON_PORT}${path}`, {
      method: body !== undefined ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    return (await res.json()) as ApiResponse<T>
  } catch {
    return { success: false, error: `Cannot reach the browserctl daemon. Run: browserctl start` }
  }
}

async function getDefaultSession(): Promise<string> {
  const id = await readFile(DEFAULT_SESSION_FILE, 'utf8').catch(() => '')
  if (!id.trim()) {
    console.error('No active session. Run: browserctl start')
    process.exit(1)
  }
  return id.trim()
}

async function resolveSession(opts: { session?: string }): Promise<string> {
  return opts.session ?? (await getDefaultSession())
}

function printObservation(observation?: Observation) {
  if (!observation) return
  console.log()
  console.log(`URL: ${observation.url}`)
  if (observation.title) console.log(`Title: ${observation.title}`)
  console.log(`${observation.count} interactive element${observation.count === 1 ? '' : 's'}`)
  console.log()
  console.log(observation.tree)
}

/** Print a command result, plus the observation that came back with it. */
function printResult(result: ApiResponse, summary?: (data: never) => string) {
  if (!result.success) {
    console.error(result.error ?? 'Command failed')
    if (result.data) console.error(JSON.stringify(result.data, null, 2))
    // Show where the page actually ended up, so a retry does not need a
    // separate round trip to find out.
    printObservation(result.observation)
    process.exit(1)
  }
  if (summary && result.data !== undefined) {
    console.log(summary(result.data as never))
  } else if (result.data !== undefined && !result.observation) {
    console.log(typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2))
  }
  printObservation(result.observation)
}

/** Shared flags for every command that can change the page. */
function mutating(cmd: Command): Command {
  return cmd
    .option('--session <id>', 'Session ID (default: last started)')
    .option('--no-observe', 'Skip the page snapshot normally returned after the action')
}

function observeFlag(opts: { observe?: boolean }): boolean {
  return opts.observe !== false
}

function parseViewport(value: string): { width: number; height: number } {
  const match = value.match(/^(\d+)\s*[x×]\s*(\d+)$/i)
  if (!match) throw new InvalidArgumentError(`Use WIDTHxHEIGHT, e.g. 1440x900.`)
  return { width: Number(match[1]), height: Number(match[2]) }
}

function parseScaleFactor(value: string): number {
  const scale = Number(value)
  if (!Number.isFinite(scale) || scale <= 0 || scale > 4) {
    throw new InvalidArgumentError(`Use a number between 0 and 4, e.g. 2.`)
  }
  return scale
}

function parseDuration(value: string): number {
  const match = value.match(/^(\d+)(ms|s|m|h)?$/)
  if (!match) throw new InvalidArgumentError(`Use e.g. 30m, 1h, 5000ms.`)
  const num = parseInt(match[1])
  const unit = match[2] ?? 'ms'
  return { ms: num, s: num * 1000, m: num * 60_000, h: num * 3_600_000 }[unit]!
}

interface Health {
  ok: boolean
  sessions: number
  version?: string
}

async function daemonHealth(): Promise<Health | null> {
  try {
    const res = await fetch(`http://127.0.0.1:${DAEMON_PORT}/health`)
    if (!res.ok) return null
    return (await res.json()) as Health
  } catch {
    return null
  }
}

async function isDaemonRunning(): Promise<boolean> {
  return (await daemonHealth()) !== null
}

function spawnDaemon(): void {
  const daemonPath = join(__dirname, 'daemon-entry.js')
  const child = spawn(process.execPath, [daemonPath], { detached: true, stdio: 'ignore' })
  child.unref()
}

async function waitForDaemon(attempts = 20): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    await new Promise(r => setTimeout(r, 250))
    if (await isDaemonRunning()) return true
  }
  return false
}

async function stopDaemon(): Promise<number> {
  try {
    const res = await fetch(`http://127.0.0.1:${DAEMON_PORT}/shutdown`, { method: 'POST' })
    const body = (await res.json()) as { data?: { stopped?: number } }
    // Give the process a moment to release the port before anything rebinds it.
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 100))
      if (!(await isDaemonRunning())) break
    }
    return body.data?.stopped ?? 0
  } catch {
    return 0
  }
}

/**
 * A daemon started before an upgrade keeps serving the old code, with no
 * outward sign. Replace it when that is free to do, and say so plainly when
 * it is not.
 */
async function reconcileDaemonVersion(health: Health): Promise<void> {
  if (health.version === VERSION) return

  const running = health.version ?? 'an older version'

  if (health.sessions === 0) {
    await stopDaemon()
    spawnDaemon()
    await waitForDaemon()
    return
  }

  console.error(
    `Warning: the running daemon is ${running}, but this CLI is ${VERSION}. ` +
      `It has ${health.sessions} active session(s), so it was left alone.\n` +
      `Commands will keep using the old code until you run: browserctl restart`
  )
}

// --- CLI ---

const program = new Command()
  .name('browserctl')
  .description(`Browser automation CLI for AI agents and developers

Every page-changing command returns the resulting page snapshot, so you do not
need a separate 'a11y' call after each action. Use --no-observe to suppress it.

The snapshot indexes interactive elements. Target them directly by ref:

  browserctl a11y
  # [0] link "Home"
  # [3] button "Sign in"
  browserctl act 3

Use 'run' to execute several steps in a single round trip:

  browserctl run 'goto example.com; act "click Sign in"; wait --for-selector "#app"'

Session Management:
  browserctl start                    Start a session (saves as default)
  browserctl start --new              Start additional session, prints session ID
  browserctl stop                     Stop the default session
  browserctl sessions                 List all active sessions

Most commands accept --session <id>. If omitted, the last started session is used.`)
  .version('0.2.0')

// start
program
  .command('start')
  .description('Start a browser session (launches daemon if not running)')
  .option('--headless', 'Run browser in headless mode (default: true)')
  .option('--no-headless', 'Run browser with visible window')
  .option('--timeout <duration>', 'Inactivity timeout, e.g. 30m, 1h', parseDuration, 30 * 60_000)
  .option('--record', 'Record session as video. Video path printed on stop.')
  .option('--new', 'Force a new session even if one already exists')
  .option(
    '--device-scale-factor <n>',
    'Pixels per CSS pixel, e.g. 2 for retina screenshots. Does not change layout ' +
      'or the coordinates click/type/drag take.',
    parseScaleFactor
  )
  .option(
    '--viewport <WxH>',
    'Viewport size in CSS pixels, e.g. 1440x900 (default: 1280x720)',
    parseViewport
  )
  .action(async opts => {
    await mkdir(CONFIG_DIR, { recursive: true })

    const health = await daemonHealth()
    if (!health) {
      spawnDaemon()
      await waitForDaemon()
    } else {
      await reconcileDaemonVersion(health)
    }

    // Is the recorded default still alive?
    const recorded = (await readFile(DEFAULT_SESSION_FILE, 'utf8').catch(() => '')).trim()
    let defaultIsLive = false
    if (recorded) {
      const list = await api<Array<{ id: string }>>('/sessions')
      defaultIsLive = !!list.success && !!list.data?.some(session => session.id === recorded)
    }

    // Without --new, reuse it. Starting a fresh browser for every `start` was
    // wasteful and made --new a no-op.
    if (!opts.new && defaultIsLive) {
      console.log(recorded)
      return
    }

    const result = await api<{ id: string }>('/sessions', {
      headless: opts.headless,
      timeout: opts.timeout,
      record: !!opts.record,
      deviceScaleFactor: opts.deviceScaleFactor,
      viewport: opts.viewport,
      // Keep the existing default pointing where it did, so stopping an
      // additional session does not leave the original unreachable.
      setDefault: !(opts.new && defaultIsLive),
    })

    if (!result.success) {
      console.error(result.error)
      process.exit(1)
    }

    const sessionId = result.data!.id
    if (!(opts.new && defaultIsLive)) {
      await writeFile(DEFAULT_SESSION_FILE, sessionId)
    }
    console.log(sessionId)
  })

// stop
program
  .command('stop')
  .description('Stop a browser session. Prints video path if session was recorded.')
  .option('--session <id>', 'Session ID (default: last started)')
  .action(async opts => {
    const sessionId = await resolveSession(opts)
    try {
      const res = await fetch(`http://127.0.0.1:${DAEMON_PORT}/sessions/${sessionId}`, { method: 'DELETE' })
      const result = (await res.json()) as ApiResponse<{ videoPath?: string }>
      if (!result.success) {
        console.error(result.error)
        process.exit(1)
      }
      if (result.data?.videoPath) console.log(result.data.videoPath)
    } catch {
      console.error('Cannot reach the browserctl daemon.')
      process.exit(1)
    }
  })

// restart
program
  .command('restart')
  .description(
    'Replace the running daemon with one running this version. Closes every ' +
      'active session. Needed after upgrading, since a daemon keeps the code it started with.'
  )
  .action(async () => {
    const health = await daemonHealth()
    if (!health) {
      spawnDaemon()
      if (!(await waitForDaemon())) {
        console.error('Daemon did not come up.')
        process.exit(1)
      }
      console.log(`Daemon started (${VERSION}).`)
      return
    }

    const stopped = await stopDaemon()
    spawnDaemon()
    if (!(await waitForDaemon())) {
      console.error('Daemon did not come back up.')
      process.exit(1)
    }
    const was = health.version ?? 'unknown'
    console.log(
      `Daemon restarted (${was} -> ${VERSION})` +
        (stopped ? `, closed ${stopped} session${stopped === 1 ? '' : 's'}.` : '.')
    )
  })

// sessions
program
  .command('sessions')
  .description('List all active sessions')
  .action(async () => {
    printResult(await api('/sessions'))
  })

// run — batch
program
  .command('run <script>')
  .description(
    'Run several commands in one round trip. Steps are separated by ";" or newlines, ' +
      'and stop at the first failure. Only the final page state is reported. ' +
      'E.g. \'goto example.com; act "click Sign in"; wait --for-selector "#app"\''
  )
  .option('--session <id>', 'Session ID (default: last started)')
  .option('--no-observe', 'Skip the final page snapshot')
  .action(async (script, opts) => {
    const sessionId = await resolveSession(opts)
    const result = await api<RunResult>(`/sessions/${sessionId}/batch/run`, {
      script,
      observe: observeFlag(opts),
    })

    const steps: StepResult[] = result.data?.steps ?? []
    for (const step of steps) {
      if (step.success) {
        console.log(`✓ ${step.step}. ${step.command}`)
      } else {
        console.log(`✗ ${step.step}. ${step.command}`)
        console.log(`    ${step.error}`)
      }
    }

    if (!result.success) {
      if (!steps.length) console.error(result.error ?? 'Script failed')
      else console.error(`\nStopped after ${steps.length} step(s).`)
      printObservation(result.observation)
      process.exit(1)
    }

    printObservation(result.observation)
  })

// goto
mutating(program.command('goto <url>').description('Navigate to a URL. Prepends https:// if no protocol given.')).action(
  async (url, opts) => {
    const sessionId = await resolveSession(opts)
    printResult(
      await api(`/sessions/${sessionId}/goto`, { url, observe: observeFlag(opts) }),
      (d: { url: string }) => `✓ ${d.url}`
    )
  }
)

// back
mutating(program.command('back').description('Navigate back to the previous page in browser history.')).action(
  async opts => {
    const sessionId = await resolveSession(opts)
    printResult(
      await api(`/sessions/${sessionId}/back`, { observe: observeFlag(opts) }),
      (d: { url: string }) => `✓ ${d.url}`
    )
  }
)

// screenshot
program
  .command('screenshot')
  .description('Take a screenshot. Prints the file path to stdout — read it as an image.')
  .option('--no-full-page', 'Capture viewport only instead of the full scrollable page')
  .option('--session <id>', 'Session ID (default: last started)')
  .action(async opts => {
    const sessionId = await resolveSession(opts)
    const result = await api<{
      path: string
      width: number
      height: number
      deviceScaleFactor: number
    }>(`/sessions/${sessionId}/screenshot`, { 'no-full-page': opts.fullPage === false })
    if (!result.success) {
      console.error(result.error)
      process.exit(1)
    }
    const { path, width, height, deviceScaleFactor } = result.data!
    console.log(path)
    console.log(`${width}x${height}px at ${deviceScaleFactor}x`)
    if (deviceScaleFactor !== 1) {
      // Without this the agent reads a coordinate off the image and passes it
      // straight to `click`, overshooting by the scale factor.
      console.log(
        `Divide coordinates read from this image by ${deviceScaleFactor} before ` +
          `passing them to click/type/drag.`
      )
    }
  })

// a11y
program
  .command('a11y')
  .description(
    'Snapshot the page as an indexed list of interactive elements. ' +
      'Target them with "act <n>". Headings are shown for orientation.'
  )
  .option('--full', 'Unfiltered DOM tree — much larger, for pages with non-semantic markup')
  .option('--session <id>', 'Session ID (default: last started)')
  .action(async opts => {
    const sessionId = await resolveSession(opts)
    const result = await api<Observation>(`/sessions/${sessionId}/a11y`, { full: !!opts.full })
    if (!result.success) {
      console.error(result.error)
      process.exit(1)
    }
    const { url, title, tree, count } = result.data!
    console.log(`URL: ${url}`)
    if (title) console.log(`Title: ${title}`)
    if (!opts.full) console.log(`${count} interactive element${count === 1 ? '' : 's'}`)
    console.log()
    console.log(tree)
  })

// act
mutating(
  program
    .command('act <target>')
    .description(
      'Click an element. Prefer a ref from the a11y snapshot ("act 3") — exact and fast. ' +
        'A description ("act \'click Sign in\'") is matched heuristically and may miss.'
    )
).action(async (target, opts) => {
  const sessionId = await resolveSession(opts)
  printResult(
    await api(`/sessions/${sessionId}/act`, { instruction: target, observe: observeFlag(opts) }),
    (d: { method: string; target: string }) => `✓ ${d.method} → ${d.target}`
  )
})

// click
mutating(
  program.command('click <x> <y>').description('Click at exact coordinates. Use screenshot to identify coordinates.')
).action(async (x, y, opts) => {
  const sessionId = await resolveSession(opts)
  printResult(
    await api(`/sessions/${sessionId}/click`, { x: Number(x), y: Number(y), observe: observeFlag(opts) }),
    (d: { x: number; y: number }) => `✓ clicked (${d.x}, ${d.y})`
  )
})

// type
mutating(
  program.command('type <x> <y> <text>').description('Click at coordinates then type text into the focused element.')
).action(async (x, y, text, opts) => {
  const sessionId = await resolveSession(opts)
  printResult(
    await api(`/sessions/${sessionId}/type`, { x: Number(x), y: Number(y), text, observe: observeFlag(opts) }),
    (d: { text: string }) => `✓ typed "${d.text}"`
  )
})

// scroll
mutating(
  program.command('scroll <direction>').description('Scroll the page. direction: up | down. Default 80% of viewport.')
)
  .option('--percent <number>', 'Percentage of viewport height to scroll (default: 80)', '80')
  .action(async (direction, opts) => {
    const sessionId = await resolveSession(opts)
    printResult(
      await api(`/sessions/${sessionId}/scroll`, {
        direction,
        percent: Number(opts.percent),
        observe: observeFlag(opts),
      }),
      (d: { direction: string; percent: number; scrollY: number }) =>
        `✓ scrolled ${d.direction} ${d.percent}% (scrollY=${d.scrollY})`
    )
  })

// extract
program
  .command('extract')
  .description('Extract all text content from the page. Use --selector to scope to a CSS element.')
  .option('--selector <css>', 'CSS selector to scope extraction (e.g. "main", ".pricing-table")')
  .option('--max-chars <n>', 'Truncate output to this many characters')
  .option('--session <id>', 'Session ID (default: last started)')
  .action(async opts => {
    const sessionId = await resolveSession(opts)
    const result = await api<{ text: string; truncated?: boolean; totalChars?: number }>(
      `/sessions/${sessionId}/extract`,
      { selector: opts.selector, 'max-chars': opts.maxChars ? Number(opts.maxChars) : undefined }
    )
    if (!result.success) {
      console.error(result.error)
      process.exit(1)
    }
    console.log(result.data!.text)
    if (result.data!.truncated) {
      console.error(`\n[truncated: showing ${opts.maxChars} of ${result.data!.totalChars} characters]`)
    }
  })

// keys
mutating(
  program
    .command('keys <method> <value>')
    .description('Send keyboard input. method: press (e.g. "Enter", "Tab", "Cmd+A") | type (text into focused element).')
)
  .option('--repeat <n>', 'Number of times to repeat, press only (default: 1)', '1')
  .action(async (method, value, opts) => {
    const sessionId = await resolveSession(opts)
    printResult(
      await api(`/sessions/${sessionId}/keys`, {
        method,
        value,
        repeat: Number(opts.repeat),
        observe: observeFlag(opts),
      }),
      (d: { method: string; value: string }) => `✓ ${d.method} ${d.value}`
    )
  })

// wait
mutating(
  program
    .command('wait [ms]')
    .description(
      'Wait for a page condition, or a fixed number of milliseconds. ' +
        'Prefer a condition — a fixed sleep is either too short (wasted retry) or too long (dead time).'
    )
)
  .option('--for-selector <css>', 'Wait until a CSS selector is visible')
  .option('--for-text <text>', 'Wait until text is visible on the page')
  .option('--for-gone <css>', 'Wait until a CSS selector is hidden or removed (e.g. a spinner)')
  .option('--for-network-idle', 'Wait until there are no network connections for 500ms')
  .option('--for-navigation', 'Wait until the next navigation commits')
  .option('--timeout <ms>', 'Give up after this many ms (default: 30000)')
  .action(async (ms, opts) => {
    const sessionId = await resolveSession(opts)
    printResult(
      await api(`/sessions/${sessionId}/wait`, {
        ms: ms === undefined ? undefined : Number(ms),
        'for-selector': opts.forSelector,
        'for-text': opts.forText,
        'for-gone': opts.forGone,
        'for-network-idle': !!opts.forNetworkIdle,
        'for-navigation': !!opts.forNavigation,
        timeout: opts.timeout ? Number(opts.timeout) : undefined,
        observe: observeFlag(opts),
      }),
      (d: { waited: number; condition: string }) => `✓ ${d.condition} after ${d.waited}ms`
    )
  })

// drag
mutating(
  program.command('drag <x1> <y1> <x2> <y2>').description('Drag from coordinates (x1,y1) to (x2,y2).')
).action(async (x1, y1, x2, y2, opts) => {
  const sessionId = await resolveSession(opts)
  printResult(
    await api(`/sessions/${sessionId}/drag`, {
      x1: Number(x1),
      y1: Number(y1),
      x2: Number(x2),
      y2: Number(y2),
      observe: observeFlag(opts),
    }),
    () => `✓ dragged (${x1}, ${y1}) → (${x2}, ${y2})`
  )
})

// fillform
mutating(
  program
    .command('fillform <fields>')
    .description('Fill multiple form fields at once. Format: "fieldLabel=value,fieldLabel=value".')
).action(async (fields, opts) => {
  const sessionId = await resolveSession(opts)
  printResult(
    await api(`/sessions/${sessionId}/fillform`, { fields, observe: observeFlag(opts) }),
    (d: { filled: number }) => `✓ filled ${d.filled} field${d.filled === 1 ? '' : 's'}`
  )
})

// think
program
  .command('think <reasoning>')
  .description('Log your reasoning without performing any browser action.')
  .option('--session <id>', 'Session ID (default: last started)')
  .action(async (reasoning, opts) => {
    const sessionId = await resolveSession(opts)
    printResult(await api(`/sessions/${sessionId}/think`, { reasoning }))
  })

program.parse()
