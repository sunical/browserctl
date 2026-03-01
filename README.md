# browserctl

Browser automation CLI and Node.js library for AI agents and developers.

Built on [Playwright](https://playwright.dev). Runs a persistent local daemon so browser sessions survive across commands — no browser startup cost per call.

## Install

```bash
npm install -g browserctl
```

This automatically installs Chromium via `playwright`.

## Using with AI Agents

browserctl is designed to be called by LLMs and AI agents as shell tools. The typical agent loop is:

1. **`a11y`** — get the accessibility tree to understand what's on the page (buttons, links, inputs, text)
2. **decide** — the agent reads the tree and decides what to do next
3. **act** — run `act`, `click`, `type`, `fillform`, etc.
4. **`screenshot`** — capture the page to visually verify the result
5. repeat

```bash
browserctl start

# Agent reads the page structure
browserctl a11y
# → URL: https://example.com
# → [button] Sign in
# → [link] Learn more
# → ...

# Agent decides to click "Sign in"
browserctl act "click Sign in"

# Agent takes a screenshot to verify the result
browserctl screenshot
# → /tmp/browserctl/screenshot-xyz.png  (agent reads this as an image)

# Agent fills in the login form
browserctl fillform "Email=me@example.com,Password=secret"
browserctl keys press Enter

browserctl stop
```

`think` lets agents log their reasoning as part of the session without triggering any browser action — useful for tracing agent decisions.

```bash
browserctl think "The sign in button is visible, clicking it to proceed"
```

## CLI Quick Start

```bash
# Start a browser session
browserctl start

# Navigate, inspect, interact
browserctl goto https://example.com
browserctl screenshot          # prints path to image file
browserctl a11y                # print accessibility tree
browserctl act "click Sign in" # click element by description
browserctl extract             # extract all text from the page

# Stop the session
browserctl stop
```

## Commands

### Session management

```bash
browserctl start                       # start session (saves as default)
browserctl start --new                 # start additional session, prints session ID
browserctl start --no-headless         # open visible browser window
browserctl start --timeout 1h          # custom inactivity timeout (default: 30m)
browserctl start --record              # record session as video
browserctl stop                        # stop default session
browserctl stop --session <id>         # stop a specific session
browserctl sessions                    # list all active sessions
```

### Navigation

```bash
browserctl goto https://example.com    # navigate to URL (https:// prepended if omitted)
browserctl back                        # go back in browser history
```

### Inspection

```bash
browserctl screenshot                  # full-page screenshot, prints file path
browserctl screenshot --no-full-page   # viewport only
browserctl a11y                        # accessibility tree (use before act/click)
browserctl extract                     # extract all text content
browserctl extract --selector "main"   # scope extraction to a CSS selector
```

### Interaction

```bash
browserctl act "click Sign in"         # click by description (uses a11y tree)
browserctl click 640 400               # click at coordinates
browserctl type 640 400 "hello"        # click then type at coordinates
browserctl keys press Enter            # press a key (Enter, Tab, Escape, Cmd+A, ...)
browserctl keys type "hello world"     # type into focused element
browserctl keys press Tab --repeat 3   # repeat a key press
browserctl scroll down                 # scroll down 80% of viewport
browserctl scroll up --percent 50      # scroll up 50%
browserctl drag 100 200 300 400        # drag from (x1,y1) to (x2,y2)
browserctl fillform "Email=me@example.com,Password=secret"  # fill multiple fields
browserctl wait 1000                   # wait 1000ms
```

### Utility

```bash
browserctl think "reasoning here"      # log reasoning without browser action
```

All commands accept `--session <id>` to target a specific session. Without it, the last started session is used.

## Multiple Sessions

```bash
SESSION1=$(browserctl start --new)
SESSION2=$(browserctl start --new)

browserctl goto https://example.com --session $SESSION1
browserctl goto https://github.com --session $SESSION2

browserctl stop --session $SESSION1
browserctl stop --session $SESSION2
```

## Node.js Library

```typescript
import { launch, close, goto, screenshot, a11y, act, extract } from 'browserctl'

const browser = await launch({ headless: true })
const { page } = browser

await goto(page, 'https://example.com')
const { path } = await screenshot(page)
const { tree } = await a11y(page)
await act(page, 'click Sign in')
const { text } = await extract(page)

await close(browser)
```

### Available exports

```typescript
// Browser lifecycle
launch(options?)   // launch Playwright browser, returns { browser, page }
close(browser)     // close browser

// Session management (for multi-session use)
Session, SessionRegistry

// Commands (all take a Playwright Page as first argument)
goto(page, url)
screenshot(page, fullPage?)
a11y(page)
act(page, instruction)
click(page, x, y)
type(page, x, y, text)
scroll(page, direction, percent?)
extract(page, selector?)
keys(page, method, value, repeat?)
wait(ms)
back(page)
drag(page, x1, y1, x2, y2)
fillform(page, fields)
think(reasoning)
```

## Architecture

`browserctl` runs a local HTTP daemon (`localhost:3756`) that manages browser sessions. The CLI communicates with the daemon, which is started automatically on `browserctl start`. Sessions persist until explicitly stopped or the inactivity timeout elapses.

## Development

```bash
git clone https://github.com/sunical/browserctl
cd browserctl
npm install
npm run build   # compile TypeScript → dist/
npm test        # run tests
```

## License

MIT
