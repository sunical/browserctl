export interface SessionOptions {
  headless?: boolean
  timeout?: number // inactivity timeout in ms, default 30 min
  record?: boolean // enable video recording, saved on stop
}

export interface CommandResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface ScreenshotResult {
  path: string
  base64: string
}

export interface A11yResult {
  tree: string
  url: string
}

export interface ExtractResult {
  text: string
  url: string
}

export interface ActResult {
  success: boolean
  method: string
  selector: string
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
