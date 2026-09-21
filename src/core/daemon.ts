import express from 'express'
import { mkdir, writeFile, readFile, unlink } from 'fs/promises'
import { SessionRegistry } from './session.js'
import { commands, executeCommand, parseScript, Args } from './dispatch.js'
import { observe } from './observe.js'
import { DAEMON_PORT, CONFIG_DIR, PORT_FILE, DEFAULT_SESSION_FILE } from './config.js'
import { SessionOptions, StepResult, RunResult } from '../types.js'

async function ensureConfigDir() {
  await mkdir(CONFIG_DIR, { recursive: true })
}

export async function startDaemon(): Promise<void> {
  await ensureConfigDir()

  const registry = new SessionRegistry()
  const app = express()
  // Observations and --full trees can be large; the default 100kb limit is too low.
  app.use(express.json({ limit: '10mb' }))

  // Create session
  app.post('/sessions', async (req, res) => {
    try {
      const options: SessionOptions = {
        headless: req.body?.headless ?? true,
        timeout: req.body?.timeout,
        record: req.body?.record ?? false,
        deviceScaleFactor: req.body?.deviceScaleFactor,
        viewport: req.body?.viewport,
      }
      const session = await registry.create(options)
      await writeFile(DEFAULT_SESSION_FILE, session.id)
      res.json({ success: true, data: session.info() })
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message })
    }
  })

  // List sessions
  app.get('/sessions', (_req, res) => {
    res.json({ success: true, data: registry.list().map(s => s.info()) })
  })

  // Delete session
  app.delete('/sessions/:sessionId', async (req, res) => {
    const result = await registry.remove(req.params.sessionId)
    if (!result.found) {
      res.status(404).json({ success: false, error: 'Session not found' })
      return
    }
    // Clear default session file if it pointed to this session
    const defaultId = await readFile(DEFAULT_SESSION_FILE, 'utf8').catch(() => '')
    if (defaultId.trim() === req.params.sessionId) {
      await unlink(DEFAULT_SESSION_FILE).catch(() => {})
    }
    res.json({ success: true, data: { videoPath: result.videoPath } })
  })

  /**
   * One endpoint per command, all sharing the dispatch table so `run` and the
   * individual routes cannot drift apart.
   */
  app.post('/sessions/:sessionId/:command', async (req, res) => {
    const { sessionId, command } = req.params
    const spec = commands[command]

    if (!spec) {
      res.status(404).json({ success: false, error: `Unknown command: ${command}` })
      return
    }

    const session = registry.get(sessionId)
    if (!session) {
      res.status(404).json({
        success: false,
        error: `Session not found: ${sessionId}. It may have expired — run 'browserctl start'.`,
      })
      return
    }
    session.touch()

    // Auto-observe: hand back the resulting page state so the agent does not
    // need a second call (and a second inference turn) to see what changed.
    const wantsObservation = spec.mutating && req.body?.observe !== false
    const snapshot = async () =>
      wantsObservation ? await observe(session.page).catch(() => undefined) : undefined

    try {
      const data = await executeCommand(session.page, command, (req.body ?? {}) as Args)
      res.json({ success: true, data, observation: await snapshot() })
    } catch (err) {
      // A failure is exactly when the agent most needs to see the page, so it
      // can recover without spending a turn asking what went wrong.
      res.status(500).json({
        success: false,
        error: (err as Error).message,
        observation: await snapshot(),
      })
    }
  })

  /** Batch: run a whole script in one round trip, observing only at the end. */
  app.post('/sessions/:sessionId/batch/run', async (req, res) => {
    const session = registry.get(req.params.sessionId)
    if (!session) {
      res.status(404).json({
        success: false,
        error: `Session not found: ${req.params.sessionId}. It may have expired — run 'browserctl start'.`,
      })
      return
    }
    session.touch()

    let steps
    try {
      steps = parseScript(String(req.body?.script ?? ''))
    } catch (err) {
      res.status(400).json({ success: false, error: (err as Error).message })
      return
    }

    if (steps.length === 0) {
      res.status(400).json({ success: false, error: 'Script contained no commands' })
      return
    }

    const results: StepResult[] = []
    let failed = false
    let touchedPage = false

    for (const [index, step] of steps.entries()) {
      try {
        const data = await executeCommand(session.page, step.name, step.args)
        if (commands[step.name].mutating) touchedPage = true
        results.push({ step: index + 1, command: step.source, success: true, data })
      } catch (err) {
        results.push({ step: index + 1, command: step.source, success: false, error: (err as Error).message })
        // Stop on first failure: later steps almost always assume the earlier
        // ones landed, and blindly continuing produces confusing wreckage.
        failed = true
        break
      }
      session.touch()
    }

    const wantsObservation = touchedPage && req.body?.observe !== false
    const observation = wantsObservation ? await observe(session.page).catch(() => undefined) : undefined

    const data: RunResult = { steps: results, completed: results.filter(r => r.success).length, observation }
    res.status(failed ? 500 : 200).json({ success: !failed, data, observation })
  })

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ ok: true, sessions: registry.list().length })
  })

  const server = app.listen(DAEMON_PORT, '127.0.0.1', async () => {
    await writeFile(PORT_FILE, String(DAEMON_PORT))
    console.log(`browserctl daemon running on port ${DAEMON_PORT}`)
  })

  // Graceful shutdown
  const shutdown = async () => {
    await registry.closeAll()
    await unlink(PORT_FILE).catch(() => {})
    await unlink(DEFAULT_SESSION_FILE).catch(() => {})
    server.close()
    process.exit(0)
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

export { DAEMON_PORT, DEFAULT_SESSION_FILE, CONFIG_DIR }
