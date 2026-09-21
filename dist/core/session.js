import { v4 as uuidv4 } from 'uuid';
import { launch } from './browser.js';
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
export class Session {
    id;
    createdAt;
    recording;
    /**
     * Called when the inactivity timer closes the browser. The registry uses this
     * to drop the entry — otherwise expired sessions accumulate forever and
     * commands against them fail with an opaque "target closed" from Playwright.
     */
    onExpire;
    instance;
    timeoutMs;
    timer = null;
    _lastActivity;
    _closed = false;
    /** Tail of the per-session command chain — see run(). */
    queue = Promise.resolve();
    constructor(id, instance, timeoutMs, recording) {
        this.id = id;
        this.instance = instance;
        this.timeoutMs = timeoutMs;
        this.createdAt = Date.now();
        this._lastActivity = Date.now();
        this.recording = recording;
    }
    static async create(options = {}) {
        const instance = await launch({
            headless: options.headless ?? true,
            record: options.record,
            deviceScaleFactor: options.deviceScaleFactor,
            viewport: options.viewport,
        });
        const session = new Session(uuidv4(), instance, options.timeout ?? DEFAULT_TIMEOUT_MS, !!options.record);
        session.resetTimer();
        return session;
    }
    get page() {
        return this.instance.page;
    }
    get lastActivity() {
        return this._lastActivity;
    }
    get closed() {
        return this._closed;
    }
    get url() {
        return this.instance.page.url();
    }
    /**
     * Serialise work against this session's page.
     *
     * Two commands arriving concurrently for the same session would otherwise
     * interleave — a click landing between another command's snapshot and its
     * action, for instance. Sessions are independent, so this only orders work
     * within one.
     */
    run(task) {
        const result = this.queue.then(task, task);
        // Keep the chain alive after a rejection, without swallowing it for the caller.
        this.queue = result.then(() => undefined, () => undefined);
        return result;
    }
    touch() {
        this._lastActivity = Date.now();
        this.resetTimer();
    }
    info() {
        return {
            id: this.id,
            url: this.url,
            createdAt: this.createdAt,
            lastActivity: this._lastActivity,
            recording: this.recording,
        };
    }
    async close() {
        this.clearTimer();
        if (this._closed)
            return undefined;
        this._closed = true;
        // Grab video path before closing context (only available after context.close())
        const video = this.instance.page.video();
        await this.instance.context.close().catch(() => { });
        await this.instance.browser.close().catch(() => { });
        if (!video)
            return undefined;
        // path() throws "did not produce any video frames" for a session that
        // closed before anything painted. A missing recording is not a reason to
        // fail the close — and an exception here used to strand the session in the
        // registry, since the caller never reached its delete.
        return video.path().catch(() => undefined);
    }
    resetTimer() {
        this.clearTimer();
        if (this._closed)
            return;
        this.timer = setTimeout(async () => {
            await this.close().catch(() => { });
            this.onExpire?.(this);
        }, this.timeoutMs);
        // Don't hold the daemon's event loop open just for an idle session.
        this.timer.unref?.();
    }
    clearTimer() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }
}
export class SessionRegistry {
    sessions = new Map();
    async create(options = {}) {
        const session = await Session.create(options);
        session.onExpire = expired => this.sessions.delete(expired.id);
        this.sessions.set(session.id, session);
        return session;
    }
    get(id) {
        const session = this.sessions.get(id);
        // Defensive: a session whose browser died out from under us is not usable.
        if (session?.closed) {
            this.sessions.delete(id);
            return undefined;
        }
        return session;
    }
    list() {
        return Array.from(this.sessions.values()).filter(s => !s.closed);
    }
    async remove(id) {
        const session = this.sessions.get(id);
        if (!session)
            return { found: false };
        try {
            const videoPath = await session.close();
            return { found: true, videoPath };
        }
        finally {
            // Drop the entry even if closing threw, so a failed stop cannot strand
            // an unusable session in the registry forever.
            this.sessions.delete(id);
        }
    }
    async closeAll() {
        // allSettled: one stubborn session must not prevent the rest from closing
        // or leave the map populated during shutdown.
        await Promise.allSettled(this.list().map(s => s.close()));
        this.sessions.clear();
    }
}
//# sourceMappingURL=session.js.map