// Constants shared by the CLI and the daemon.
//
// This module must stay dependency-free. The CLI imports it on every
// invocation, so pulling in playwright or express here would add ~700ms of
// module-load time to every command.
import { homedir } from 'os'
import { join } from 'path'

export const DAEMON_PORT = 3756
export const CONFIG_DIR = join(homedir(), '.browserctl')
export const PORT_FILE = join(CONFIG_DIR, 'port')
export const DEFAULT_SESSION_FILE = join(CONFIG_DIR, 'session')
export const SCREENSHOT_DIR = join(CONFIG_DIR, 'screenshots')
export const VIDEO_DIR = join(CONFIG_DIR, 'videos')
