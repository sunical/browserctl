export interface SessionOptions {
  headless?: boolean
  timeout?: number // inactivity timeout in ms, default 30 min
  record?: boolean // enable video recording, saved on stop
  deviceScaleFactor?: number // pixels per CSS pixel; 2 = retina screenshots
  viewport?: { width: number; height: number }
}

export interface CommandResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface ScreenshotResult {
  path: string
  /** Image dimensions in real pixels — CSS pixels multiplied by the scale factor. */
  width: number
  height: number
  /**
   * Pixels per CSS pixel. Coordinates read off this image must be divided by
   * this before being passed to click/type/drag, which take CSS pixels.
   */
  deviceScaleFactor: number
  /** Only present when explicitly requested — see screenshot(). */
  base64?: string
}

export interface A11yResult {
  tree: string
  url: string
  title: string
  count: number // number of refs assigned; 0 for --full trees
}

export interface ExtractResult {
  text: string
  url: string
  /** Set when maxChars cut the text short. */
  truncated?: boolean
  totalChars?: number
}

export interface ActResult {
  success: boolean
  method: string
  selector: string
  target: string // human-readable description of what was acted on
}

/**
 * Page state returned alongside every mutating command, so the agent does not
 * need a second round trip (and a second inference turn) to see the result.
 */
export interface Observation {
  url: string
  title: string
  tree: string
  count: number
}

export interface StepResult {
  step: number
  command: string
  success: boolean
  data?: unknown
  error?: string
}

export interface RunResult {
  steps: StepResult[]
  completed: number
  observation?: Observation
}

export type WaitCondition =
  | { kind: 'ms'; ms: number }
  | { kind: 'selector'; selector: string }
  | { kind: 'text'; text: string }
  | { kind: 'gone'; selector: string }
  | { kind: 'networkIdle' }
  | { kind: 'navigation' }

export interface WaitResult {
  waited: number // elapsed ms
  condition: string
}

export interface SessionInfo {
  id: string
  url: string
  createdAt: number
  lastActivity: number
  recording: boolean
}

export interface DaemonStatus {
  running: boolean
  sessions: SessionInfo[]
}
