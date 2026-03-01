import { v4 as uuidv4 } from 'uuid'
import { launch, close, BrowserInstance } from './browser.js'
import { SessionOptions, SessionInfo } from '../types.js'
import type { Page } from 'playwright'

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

export class Session {
  readonly id: string
  readonly createdAt: number
  readonly recording: boolean
  private instance: BrowserInstance
  private timeoutMs: number
  private timer: NodeJS.Timeout | null = null
  private _lastActivity: number

  private constructor(id: string, instance: BrowserInstance, timeoutMs: number, recording: boolean) {
    this.id = id
    this.instance = instance
    this.timeoutMs = timeoutMs
    this.createdAt = Date.now()
    this._lastActivity = Date.now()
    this.recording = recording
  }

  static async create(options: SessionOptions = {}): Promise<Session> {
    const instance = await launch({ headless: options.headless ?? true, record: options.record })
    const session = new Session(uuidv4(), instance, options.timeout ?? DEFAULT_TIMEOUT_MS, !!options.record)
    session.resetTimer()
    return session
  }

  get page(): Page {
    return this.instance.page
  }

  get lastActivity(): number {
    return this._lastActivity
  }

  get url(): string {
    return this.instance.page.url()
  }

  touch(): void {
    this._lastActivity = Date.now()
    this.resetTimer()
  }

  info(): SessionInfo {
    return {
      id: this.id,
      url: this.url,
      createdAt: this.createdAt,
      lastActivity: this._lastActivity,
      recording: this.recording,
    }
  }

  async close(): Promise<string | undefined> {
    this.clearTimer()
    // Grab video path before closing context (only available after context.close())
    const video = this.instance.page.video()
    await this.instance.context.close()
    await this.instance.browser.close().catch(() => {})
    if (video) {
      return video.path()
    }
  }

  private resetTimer(): void {
    this.clearTimer()
    this.timer = setTimeout(async () => {
      await this.close()
    }, this.timeoutMs)
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }
}

export class SessionRegistry {
  private sessions = new Map<string, Session>()

  async create(options: SessionOptions = {}): Promise<Session> {
    const session = await Session.create(options)
    this.sessions.set(session.id, session)
    return session
  }

  get(id: string): Session | undefined {
    return this.sessions.get(id)
  }

  list(): Session[] {
    return Array.from(this.sessions.values())
  }

  async remove(id: string): Promise<{ found: boolean; videoPath?: string }> {
    const session = this.sessions.get(id)
    if (!session) return { found: false }
    const videoPath = await session.close()
    this.sessions.delete(id)
    return { found: true, videoPath }
  }

  async closeAll(): Promise<void> {
    await Promise.all(this.list().map(s => s.close()))
    this.sessions.clear()
  }
}
