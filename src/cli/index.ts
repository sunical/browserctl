import { Command } from 'commander'
import { readFile, writeFile } from 'fs/promises'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'
import { DAEMON_PORT, DEFAULT_SESSION_FILE, CONFIG_DIR } from '../core/daemon.js'
import { mkdir } from 'fs/promises'
import { parseFields } from '../commands/fillform.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// --- HTTP client ---

async function api(path: string, body?: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`http://127.0.0.1:${DAEMON_PORT}${path}`, {
    method: body !== undefined ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  return res.json()
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
  return opts.session ?? await getDefaultSession()
}

function printResult(result: unknown) {
  const r = result as { success: boolean; data?: unknown; error?: string }
  if (!r.success) {
    console.error(r.error ?? 'Command failed')
    process.exit(1)
  }
  if (r.data !== undefined) {
    if (typeof r.data === 'string') {
      console.log(r.data)
    } else {
      console.log(JSON.stringify(r.data, null, 2))
    }
  }
}

function parseDuration(value: string): number {
  const match = value.match(/^(\d+)(ms|s|m|h)?$/)
  if (!match) throw new Error(`Invalid timeout: "${value}". Use e.g. 30m, 1h, 5000ms`)
  const num = parseInt(match[1])
  const unit = match[2] ?? 'ms'
  return { ms: num, s: num * 1000, m: num * 60_000, h: num * 3_600_000 }[unit]!
}

async function isDaemonRunning(): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${DAEMON_PORT}/health`)
    return res.ok
  } catch {
    return false
  }
}

// --- CLI ---

const program = new Command()
  .name('browserctl')
  .description(`Browser automation CLI for AI agents and developers

Session Management:
  browserctl start                    Start a session (saves as default)
  browserctl start --new              Start additional session, prints session ID
  browserctl stop                     Stop the default session
  browserctl stop --session <id>      Stop a specific session
  browserctl sessions                 List all active sessions

Most commands accept --session <id> to target a specific session.
If omitted, the last started session is used automatically.

Examples:
  browserctl start
  browserctl goto https://example.com
  browserctl screenshot
  browserctl a11y
  browserctl act "click Sign in"
  browserctl stop

  # Multiple sessions
  SESSION1=$(browserctl start --new)
  SESSION2=$(browserctl start --new)
  browserctl screenshot --session $SESSION1
  browserctl stop --session $SESSION1`)
  .version('0.1.0')

// start
program
  .command('start')
  .description('Start a browser session (launches daemon if not running)')
  .option('--headless', 'Run browser in headless mode (default: true)')
  .option('--no-headless', 'Run browser with visible window')
  .option('--timeout <duration>', 'Inactivity timeout, e.g. 30m, 1h (default: 30m)', '30m')
  .option('--record', 'Record session as video. Video path printed on stop.')
  .option('--new', 'Force a new session even if one already exists')
  .action(async opts => {
    await mkdir(CONFIG_DIR, { recursive: true })

    const running = await isDaemonRunning()
    if (!running) {
      const daemonPath = join(__dirname, 'daemon-entry.js')
      const child = spawn(process.execPath, [daemonPath], {
        detached: true,
        stdio: 'ignore',
      })
      child.unref()

      // Wait for daemon to be ready
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 250))
        if (await isDaemonRunning()) break
      }
    }

    const result = await api('/sessions', {
      headless: opts.headless,
      timeout: parseDuration(opts.timeout),
      record: !!opts.record,
    }) as { success: boolean; data?: { id: string }; error?: string }

    if (!result.success) {
      console.error(result.error)
      process.exit(1)
    }

    const sessionId = result.data!.id
    await writeFile(DEFAULT_SESSION_FILE, sessionId)
    console.log(sessionId)
  })

// stop
program
  .command('stop')
  .description('Stop a browser session. Prints video path if session was recorded.')
  .option('--session <id>', 'Session ID (default: last started)')
  .action(async opts => {
    const sessionId = await resolveSession(opts)
    const res = await fetch(`http://127.0.0.1:${DAEMON_PORT}/sessions/${sessionId}`, {
      method: 'DELETE',
    })
    const result = await res.json() as { success: boolean; data?: { videoPath?: string }; error?: string }
    if (!result.success) {
      console.error(result.error)
      process.exit(1)
    }
    if (result.data?.videoPath) {
      console.log(result.data.videoPath)
    }
  })

// sessions
program
  .command('sessions')
  .description('List all active sessions')
  .action(async () => {
    printResult(await api('/sessions'))
  })

// goto
program
  .command('goto <url>')
  .description('Navigate to a URL. Prepends https:// if no protocol given.')
  .option('--session <id>', 'Session ID (default: last started)')
  .action(async (url, opts) => {
    const sessionId = await resolveSession(opts)
    printResult(await api(`/sessions/${sessionId}/goto`, { url }))
  })

// screenshot
program
  .command('screenshot')
  .description('Take a screenshot. Prints the file path to stdout — read it as an image.')
  .option('--no-full-page', 'Capture viewport only instead of the full scrollable page')
  .option('--session <id>', 'Session ID (default: last started)')
  .action(async opts => {
    const sessionId = await resolveSession(opts)
    const result = await api(`/sessions/${sessionId}/screenshot`, { fullPage: opts.fullPage !== false }) as {
      success: boolean
      data?: { path: string; base64: string }
      error?: string
    }
    if (!result.success) {
      console.error(result.error)
      process.exit(1)
    }
    console.log(result.data!.path)
  })

// a11y
program
  .command('a11y')
  .description('Get the accessibility tree of the current page. Use this to understand page structure before act/click.')
  .option('--session <id>', 'Session ID (default: last started)')
  .action(async opts => {
    const sessionId = await resolveSession(opts)
    const result = await api(`/sessions/${sessionId}/a11y`, {}) as {
      success: boolean
      data?: { tree: string; url: string }
      error?: string
    }
    if (!result.success) {
      console.error(result.error)
      process.exit(1)
    }
    console.log(`URL: ${result.data!.url}\n`)
    console.log(result.data!.tree)
  })

// act
program
  .command('act <instruction>')
  .description('Click an element by description. Uses the visible text from the a11y tree — run a11y first to see available elements. E.g. "click Sign in", "click Learn more".')
  .option('--session <id>', 'Session ID (default: last started)')
  .action(async (instruction, opts) => {
    const sessionId = await resolveSession(opts)
    printResult(await api(`/sessions/${sessionId}/act`, { instruction }))
  })

// click
program
  .command('click <x> <y>')
  .description('Click at exact coordinates. Use screenshot to identify coordinates visually.')
  .option('--session <id>', 'Session ID (default: last started)')
  .action(async (x, y, opts) => {
    const sessionId = await resolveSession(opts)
    printResult(await api(`/sessions/${sessionId}/click`, { x: Number(x), y: Number(y) }))
  })

// type
program
  .command('type <x> <y> <text>')
  .description('Click at coordinates then type text into the focused element.')
  .option('--session <id>', 'Session ID (default: last started)')
  .action(async (x, y, text, opts) => {
    const sessionId = await resolveSession(opts)
    printResult(await api(`/sessions/${sessionId}/type`, { x: Number(x), y: Number(y), text }))
  })

// scroll
program
  .command('scroll <direction>')
  .description('Scroll the page. direction: up | down. Default 80% of viewport height.')
  .option('--percent <number>', 'Percentage of viewport height to scroll (default: 80)', '80')
  .option('--session <id>', 'Session ID (default: last started)')
  .action(async (direction, opts) => {
    const sessionId = await resolveSession(opts)
    printResult(await api(`/sessions/${sessionId}/scroll`, {
      direction,
      percent: Number(opts.percent),
    }))
  })

// extract
program
  .command('extract')
  .description('Extract all text content from the page. Use --selector to scope to a CSS element.')
  .option('--selector <css>', 'CSS selector to scope extraction (e.g. "main", ".pricing-table")')
  .option('--session <id>', 'Session ID (default: last started)')
  .action(async opts => {
    const sessionId = await resolveSession(opts)
    const result = await api(`/sessions/${sessionId}/extract`, { selector: opts.selector }) as {
      success: boolean
      data?: { text: string; url: string }
      error?: string
    }
    if (!result.success) {
      console.error(result.error)
      process.exit(1)
    }
    console.log(result.data!.text)
  })

// keys
program
  .command('keys <method> <value>')
  .description('Send keyboard input. method: press (for keys/shortcuts e.g. "Enter", "Tab", "Cmd+A") | type (for text into focused element).')
  .option('--repeat <n>', 'Number of times to repeat, press only (default: 1)', '1')
  .option('--session <id>', 'Session ID (default: last started)')
  .action(async (method, value, opts) => {
    const sessionId = await resolveSession(opts)
    printResult(await api(`/sessions/${sessionId}/keys`, {
      method,
      value,
      repeat: Number(opts.repeat),
    }))
  })

// wait
program
  .command('wait <ms>')
  .description('Wait for a number of milliseconds. Useful after navigation or actions that trigger async changes.')
  .option('--session <id>', 'Session ID (default: last started)')
  .action(async (ms, opts) => {
    const sessionId = await resolveSession(opts)
    printResult(await api(`/sessions/${sessionId}/wait`, { ms: Number(ms) }))
  })

// back
program
  .command('back')
  .description('Navigate back to the previous page in browser history.')
  .option('--session <id>', 'Session ID (default: last started)')
  .action(async opts => {
    const sessionId = await resolveSession(opts)
    printResult(await api(`/sessions/${sessionId}/back`, {}))
  })

// drag
program
  .command('drag <x1> <y1> <x2> <y2>')
  .description('Drag from coordinates (x1,y1) to (x2,y2). Use screenshot to identify coordinates.')
  .option('--session <id>', 'Session ID (default: last started)')
  .action(async (x1, y1, x2, y2, opts) => {
    const sessionId = await resolveSession(opts)
    printResult(await api(`/sessions/${sessionId}/drag`, {
      x1: Number(x1), y1: Number(y1),
      x2: Number(x2), y2: Number(y2),
    }))
  })

// fillform
program
  .command('fillform <fields>')
  .description('Fill multiple form fields at once. Format: "fieldLabel=value,fieldLabel=value". Faster than multiple type commands.')
  .option('--session <id>', 'Session ID (default: last started)')
  .action(async (fields, opts) => {
    const sessionId = await resolveSession(opts)
    const parsed = parseFields(fields)
    printResult(await api(`/sessions/${sessionId}/fillform`, { fields: parsed }))
  })

// think
program
  .command('think <reasoning>')
  .description('Log your reasoning without performing any browser action. Useful for agents to record their thought process.')
  .option('--session <id>', 'Session ID (default: last started)')
  .action(async (reasoning, opts) => {
    const sessionId = await resolveSession(opts)
    printResult(await api(`/sessions/${sessionId}/think`, { reasoning }))
  })

program.parse()
