# browserctl

Browser automation CLI and Node.js library for AI agents and developers.

Built on [Playwright](https://playwright.dev). Runs a persistent local daemon so browser sessions survive across commands — no browser startup cost per call.

## Install

```bash
npm install -g github:sunical/browserctl
```

Chromium is installed automatically via `playwright`. The command is
`browserctl`.

## Using with AI Agents

browserctl is designed to be called by LLMs and AI agents as shell tools. Two
things keep the loop short:

**1. Every page-changing command returns the resulting page.** You do not need a
separate `a11y` call after each action, which halves the number of agent turns.

**2. The snapshot indexes interactive elements.** Target them by ref instead of
describing them, so the tool never has to guess which element you meant.

```bash
browserctl start

browserctl goto example.com
# ✓ https://example.com/
#
# URL: https://example.com/
# Title: Example Domain
# 1 interactive element
#
# # Example Domain
# [0] link "Learn more"

browserctl act 0        # click element [0] — exact, no guessing
```

Snapshots list only visible, actionable elements plus headings for orientation.
On a Wikipedia article that is ~2.8k tokens instead of the ~57k a full DOM dump
costs, and the omitted nodes were not actionable anyway. Open shadow roots and
iframes are both traversed, so web-component pages and embedded widgets are
visible. Use `a11y --full` on pages that hide their behaviour in non-semantic
markup.

Elements inside an iframe are listed under a marker, and their refs continue
the same numbering — `act` resolves a ref in whichever frame holds it:

```
[0] button "Main button"
--- iframe 1 (checkout.stripe.com) ---
[1] button "Pay now"
[2] textbox "Card number"
```

When a command fails, the snapshot still comes back — so the agent can see where
the page actually ended up and retry without another round trip.

### Batch several steps into one round trip

`run` executes a whole script in a single call, reporting only the final page
state. Steps are separated by `;` or newlines and stop at the first failure.

```bash
browserctl run '
  goto your-app.test/login
  fillform "Email=me@example.com,Password=secret"
  act "click Sign in"
  wait --for-gone "#spinner"
'
# ✓ 1. goto your-app.test/login
# ✓ 2. fillform "Email=me@example.com,Password=secret"
# ✓ 3. act "click Sign in"
# ✓ 4. wait --for-gone "#spinner"
#
# URL: https://your-app.test/dashboard
# Title: Dashboard
# 12 interactive elements
#
# ...
```

A failing step stops the run, and the snapshot still comes back so you can see
where it stopped.

Refs inside a script refer to the page as it stands when that step runs, since
the agent never saw the intermediate pages. Prefer descriptions or selectors for
mid-script steps.

### Wait for conditions, not durations

A fixed sleep is either too short (the agent burns a turn retrying) or too long
(dead time every run). Conditions return the moment they are met.

```bash
browserctl wait --for-selector ".results"
browserctl wait --for-gone "#spinner"
browserctl wait --for-text "Welcome back"
browserctl wait --for-network-idle
browserctl wait 500                        # still available when you need it
```

`think` lets agents log their reasoning as part of the session without
triggering any browser action — useful for tracing agent decisions.

```bash
browserctl think "The sign in button is visible, clicking it to proceed"
```

## CLI Quick Start

```bash
# Start a browser session
browserctl start

# Navigate, inspect, interact
browserctl goto https://example.com   # navigates and returns the page snapshot
browserctl a11y                       # indexed list of interactive elements
browserctl act 3                      # click element [3] from the snapshot
browserctl act "click Sign in"        # or match by description
browserctl extract                    # extract all text from the page
browserctl screenshot                 # prints path to image file

# Several steps, one round trip
browserctl run 'goto example.com; act "click Learn more"'

# Stop the session
browserctl stop
```

## Commands

### Session management

```bash
browserctl start                       # reuse the default session, or start one; prints its ID
browserctl start --new                 # always start an additional session
browserctl start --no-headless         # open visible browser window
browserctl start --timeout 1h          # custom inactivity timeout (default: 30m)
browserctl start --record              # record session as video
browserctl start --viewport 1440x900   # viewport in CSS pixels (default: 1280x720)
browserctl start --device-scale-factor 2   # retina-density screenshots
browserctl stop                        # stop default session
browserctl stop --session <id>         # stop a specific session
browserctl sessions                    # list all active sessions
browserctl restart                     # replace the daemon with this version
```

`start` reuses the default session when it is still alive, so calling it twice
does not leave an orphaned browser behind. Use `--new` for a second session.

### Navigation

```bash
browserctl goto https://example.com    # navigate to URL (https:// prepended if omitted)
browserctl goto localhost:3000         # host:port is treated as a host, not a scheme
browserctl goto "data:text/html,<h1>hi</h1>"   # data:, file:, about: and blob: pass through
browserctl back                        # go back in browser history
```

### Inspection

```bash
browserctl screenshot                  # full-page screenshot, prints file path
browserctl screenshot --no-full-page   # viewport only, and where 2x actually pays off
browserctl a11y                        # indexed interactive elements + headings
browserctl a11y --full                 # unfiltered DOM tree (much larger)
browserctl extract                     # extract all text content
browserctl extract --selector "main"   # scope extraction to a CSS selector
browserctl extract --max-chars 2000    # truncate; the true length is reported
```

### Interaction

```bash
browserctl act 3                       # click element [3] from the snapshot
browserctl act "click Sign in"         # click by description (heuristic)
browserctl click 640 400               # click at coordinates
browserctl type 640 400 "hello"        # click then type at coordinates
browserctl keys press Enter            # press a key (Enter, Tab, Escape, ...)
browserctl keys press ControlOrMeta+A  # modifiers: Shift, Control, Alt, Meta, ControlOrMeta
browserctl keys type "hello world"     # type into focused element
browserctl keys press Tab --repeat 3   # repeat a key press
browserctl scroll down                 # scroll down 80% of viewport
browserctl scroll up --percent 50      # scroll up 50%
browserctl drag 100 200 300 400        # drag from (x1,y1) to (x2,y2)
browserctl fillform "Email=me@example.com,Password=secret"  # fill multiple fields
```

Every command above returns the resulting page snapshot. Pass `--no-observe` to
suppress it when you do not need to see the result.

### Screenshot resolution

`--device-scale-factor 2` renders two pixels per CSS pixel, the way a retina
display does. Layout is unchanged, and `click`/`type`/`drag` still take CSS
pixels — but coordinates *read off a 2x image* must be divided by 2 first. The
`screenshot` command prints the dimensions and scale factor so this is visible.

```bash
browserctl start --device-scale-factor 2 --viewport 1440x900
browserctl screenshot --no-full-page
# /Users/you/.browserctl/screenshots/1790007612320.png
# 2880x1800px at 2x
# Divide coordinates read from this image by 2 before passing them to click/type/drag.
```

**Use it with `--no-full-page`.** Vision models cap the long edge of an image
(commonly ~1568px) and downscale anything larger, so a tall full-page capture
throws the extra pixels away:

| capture | PNG | after a 1568px cap | effective detail |
| --- | --- | --- | --- |
| 1x viewport | 1280x720 | unchanged | 1.00 px per CSS px |
| **2x viewport** | 2560x1440 | x0.61 | **1.23 px per CSS px** |
| 1x full page | 1280x7529, 2.1MB | x0.21 | 0.21 px per CSS px |
| 2x full page | 2560x15058, 4.8MB | x0.10 | 0.21 px per CSS px |

At 2x full-page you pay 4.8MB for exactly the resolution 1x already gave you.
The gain is real only when the image stays near the cap.

### Waiting

```bash
browserctl wait --for-selector ".results"   # until a selector is visible
browserctl wait --for-gone "#spinner"       # until a selector is hidden/removed
browserctl wait --for-text "Welcome back"   # until text appears
browserctl wait --for-network-idle          # until the network settles
browserctl wait --for-navigation            # until the next navigation commits
browserctl wait 1000                        # fixed duration, in ms
browserctl wait --for-selector "#x" --timeout 5000
```

### Batch

```bash
browserctl run 'goto example.com; act "click Learn more"'
browserctl run --session $ID '
  goto your-app.test/login
  fillform "Email=me@example.com,Password=secret"
  act "click Sign in"
  wait --for-selector "#dashboard"
'
```

### Utility

```bash
browserctl think "reasoning here"      # log reasoning without browser action
```

Every command except `start` and `sessions` accepts `--session <id>`. Without it,
the most recently started session is used.

## Multiple Sessions

```bash
SESSION1=$(browserctl start)
SESSION2=$(browserctl start)

browserctl goto https://example.com --session $SESSION1
browserctl goto https://github.com --session $SESSION2

browserctl stop --session $SESSION1
browserctl stop --session $SESSION2
```

## Node.js Library

```typescript
import { launch, close, goto, screenshot, a11y, act, extract } from '@sunical/browserctl'

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
launch(options?)   // { headless?, record?, viewport?, deviceScaleFactor? }
                   // -> { browser, context, page }
close(browser)     // close browser

// Session management (for multi-session use)
Session, SessionRegistry

// Page snapshot returned after every mutating command
observe(page)      // { url, title, tree, count }

// Batch execution
commands           // the command dispatch table
executeCommand(page, name, args)
parseScript(script)  // "goto x; act 3" -> ParsedStep[]

// Commands (all take a Playwright Page as first argument)
goto(page, url)
screenshot(page, fullPage?, { base64? })   // -> { path, width, height, deviceScaleFactor }
a11y(page, { full? })
act(page, target)          // "3", "[3]", or "click Sign in"
click(page, x, y)
type(page, x, y, text)
scroll(page, direction, percent?)          // -> { direction, percent, scrollY }
extract(page, selector?, { maxChars? })
keys(page, method, value, repeat?)
wait(ms)                                   // fixed sleep
waitFor(page, condition, timeout?)         // { kind: 'selector', selector } etc.
back(page)
drag(page, x1, y1, x2, y2)
fillform(page, fields)
think(reasoning)
```

## Architecture

`browserctl` runs a local HTTP daemon (`localhost:3756`) that manages browser
sessions. The CLI communicates with the daemon, which is started automatically
on `browserctl start`. Sessions persist until explicitly stopped or the
inactivity timeout elapses.

The CLI deliberately imports nothing heavier than `commander` — pulling
Playwright into the CLI process costs ~700ms on every invocation, which matters
when an agent issues dozens of commands. Shared constants live in
`src/core/config.ts` precisely so the CLI never has to reach into the daemon.

Commands are defined once in `src/core/dispatch.ts` and shared by the
per-command HTTP routes and the `run` batch endpoint, so the two cannot drift.

The daemon keeps the code it started with, so an upgrade does not reach a
daemon that is already running. `browserctl start` compares its own version
against the daemon's and replaces it automatically when no sessions are open;
if sessions are open it warns instead of killing them, and `browserctl restart`
does it deliberately.

Commands against one session are serialised, so two concurrent calls cannot
interleave on the same page. Different sessions still run in parallel.

## Limitations

- **Closed shadow roots are invisible**, as they are to any script. Open shadow
  roots and iframes are traversed.
- **Cross-origin iframes depend on the browser letting Playwright in.** Most
  work; a frame that blocks script access is skipped silently rather than
  failing the snapshot.
- **`extract` returns the whole page text unless capped** — around 20k
  characters on a long Wikipedia article. Use `--max-chars` or `--selector`.
- `a11y` implements a practical subset of the accessible-name algorithm, not the
  full specification.
- **Commands are serialised per session**, so a long-running command blocks
  others against that same session. Use separate sessions for parallel work.

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
