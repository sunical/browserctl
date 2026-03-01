import express from 'express';
import { mkdir, writeFile, readFile, unlink } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import { SessionRegistry } from './session.js';
import { screenshot } from '../commands/screenshot.js';
import { a11y } from '../commands/a11y.js';
import { goto } from '../commands/goto.js';
import { act } from '../commands/act.js';
import { click } from '../commands/click.js';
import { type as typeCmd } from '../commands/type.js';
import { scroll } from '../commands/scroll.js';
import { extract } from '../commands/extract.js';
import { keys } from '../commands/keys.js';
import { wait } from '../commands/wait.js';
import { back } from '../commands/back.js';
import { drag } from '../commands/drag.js';
import { fillform } from '../commands/fillform.js';
import { think } from '../commands/think.js';
const DAEMON_PORT = 3756;
const CONFIG_DIR = join(homedir(), '.browserctl');
const PORT_FILE = join(CONFIG_DIR, 'port');
const DEFAULT_SESSION_FILE = join(CONFIG_DIR, 'session');
async function ensureConfigDir() {
    await mkdir(CONFIG_DIR, { recursive: true });
}
function withSession(registry, req, res, handler) {
    const sessionId = req.params.sessionId ?? req.body?.sessionId ?? req.query.sessionId;
    const session = registry.get(sessionId);
    if (!session) {
        res.status(404).json({ success: false, error: `Session not found: ${sessionId}` });
        return;
    }
    session.touch();
    handler(session.page)
        .then(data => res.json({ success: true, data }))
        .catch((err) => res.status(500).json({ success: false, error: err.message }));
}
export async function startDaemon() {
    await ensureConfigDir();
    const registry = new SessionRegistry();
    const app = express();
    app.use(express.json());
    // Create session
    app.post('/sessions', async (req, res) => {
        try {
            const options = {
                headless: req.body?.headless ?? true,
                timeout: req.body?.timeout,
                record: req.body?.record ?? false,
            };
            const session = await registry.create(options);
            await writeFile(DEFAULT_SESSION_FILE, session.id);
            res.json({ success: true, data: session.info() });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });
    // List sessions
    app.get('/sessions', (_req, res) => {
        res.json({ success: true, data: registry.list().map(s => s.info()) });
    });
    // Delete session
    app.delete('/sessions/:sessionId', async (req, res) => {
        const result = await registry.remove(req.params.sessionId);
        if (!result.found) {
            res.status(404).json({ success: false, error: 'Session not found' });
            return;
        }
        // Clear default session file if it pointed to this session
        const defaultId = await readFile(DEFAULT_SESSION_FILE, 'utf8').catch(() => '');
        if (defaultId.trim() === req.params.sessionId) {
            await unlink(DEFAULT_SESSION_FILE).catch(() => { });
        }
        res.json({ success: true, data: { videoPath: result.videoPath } });
    });
    // Commands
    app.post('/sessions/:sessionId/screenshot', (req, res) => {
        withSession(registry, req, res, page => screenshot(page, req.body?.fullPage ?? true));
    });
    app.post('/sessions/:sessionId/a11y', (req, res) => {
        withSession(registry, req, res, page => a11y(page));
    });
    app.post('/sessions/:sessionId/goto', (req, res) => {
        withSession(registry, req, res, page => goto(page, req.body.url));
    });
    app.post('/sessions/:sessionId/act', (req, res) => {
        withSession(registry, req, res, page => act(page, req.body.instruction));
    });
    app.post('/sessions/:sessionId/click', (req, res) => {
        withSession(registry, req, res, page => click(page, req.body.x, req.body.y));
    });
    app.post('/sessions/:sessionId/type', (req, res) => {
        withSession(registry, req, res, page => typeCmd(page, req.body.x, req.body.y, req.body.text));
    });
    app.post('/sessions/:sessionId/scroll', (req, res) => {
        withSession(registry, req, res, page => scroll(page, req.body.direction, req.body.percent));
    });
    app.post('/sessions/:sessionId/extract', (req, res) => {
        withSession(registry, req, res, page => extract(page, req.body.selector));
    });
    app.post('/sessions/:sessionId/keys', (req, res) => {
        withSession(registry, req, res, page => keys(page, req.body.method, req.body.value, req.body.repeat));
    });
    app.post('/sessions/:sessionId/wait', (_req, res) => {
        wait(_req.body.ms).then(data => res.json({ success: true, data }));
    });
    app.post('/sessions/:sessionId/back', (req, res) => {
        withSession(registry, req, res, page => back(page));
    });
    app.post('/sessions/:sessionId/drag', (req, res) => {
        withSession(registry, req, res, page => drag(page, req.body.x1, req.body.y1, req.body.x2, req.body.y2));
    });
    app.post('/sessions/:sessionId/fillform', (req, res) => {
        withSession(registry, req, res, page => fillform(page, req.body.fields));
    });
    app.post('/sessions/:sessionId/think', (req, res) => {
        res.json({ success: true, data: think(req.body.reasoning) });
    });
    // Health check
    app.get('/health', (_req, res) => {
        res.json({ ok: true, sessions: registry.list().length });
    });
    const server = app.listen(DAEMON_PORT, '127.0.0.1', async () => {
        await writeFile(PORT_FILE, String(DAEMON_PORT));
        console.log(`browserctl daemon running on port ${DAEMON_PORT}`);
    });
    // Graceful shutdown
    const shutdown = async () => {
        await registry.closeAll();
        await unlink(PORT_FILE).catch(() => { });
        await unlink(DEFAULT_SESSION_FILE).catch(() => { });
        server.close();
        process.exit(0);
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}
export { DAEMON_PORT, DEFAULT_SESSION_FILE, CONFIG_DIR };
//# sourceMappingURL=daemon.js.map