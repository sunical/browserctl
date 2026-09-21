export { Session, SessionRegistry } from '../core/session.js'
export { launch, close, DEFAULT_VIEWPORT } from '../core/browser.js'
export type { LaunchOptions, Viewport } from '../core/browser.js'
export { observe } from '../core/observe.js'
export { commands, executeCommand, parseScript } from '../core/dispatch.js'
export type { CommandSpec, ParsedStep, Args } from '../core/dispatch.js'
export {
  DAEMON_PORT,
  CONFIG_DIR,
  PORT_FILE,
  DEFAULT_SESSION_FILE,
  SCREENSHOT_DIR,
  VIDEO_DIR,
} from '../core/config.js'

export { screenshot } from '../commands/screenshot.js'
export { a11y, REF_ATTR } from '../commands/a11y.js'
export { goto } from '../commands/goto.js'
export { act } from '../commands/act.js'
export { click } from '../commands/click.js'
export { type } from '../commands/type.js'
export { scroll } from '../commands/scroll.js'
export { extract } from '../commands/extract.js'
export { keys } from '../commands/keys.js'
export { wait, waitFor, parseWaitCondition } from '../commands/wait.js'
export { back } from '../commands/back.js'
export { drag } from '../commands/drag.js'
export { fillform, parseFields } from '../commands/fillform.js'
export { think } from '../commands/think.js'

export type {
  SessionOptions,
  CommandResult,
  ScreenshotResult,
  A11yResult,
  ExtractResult,
  ActResult,
  Observation,
  StepResult,
  RunResult,
  WaitCondition,
  WaitResult,
  SessionInfo,
  DaemonStatus,
} from '../types.js'
