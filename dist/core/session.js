import { v4 as uuidv4 } from 'uuid';
import { launch } from './browser.js';
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
export class Session {
    id;
    createdAt;
    recording;
    instance;
    timeoutMs;
    timer = null;
    _lastActivity;
    constructor(id, instance, timeoutMs, recording) {
        this.id = id;
        this.instance = instance;
        this.timeoutMs = timeoutMs;
        this.createdAt = Date.now();
        this._lastActivity = Date.now();
        this.recording = recording;
    }
    static async create(options = {}) {
        const instance = await launch({ headless: options.headless ?? true, record: options.record });
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
    get url() {
        return this.instance.page.url();
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
        // Grab video path before closing context (only available after context.close())
        const video = this.instance.page.video();
        await this.instance.context.close();
        await this.instance.browser.close().catch(() => { });
        if (video) {
            return video.path();
        }
    }
    resetTimer() {
        this.clearTimer();
        this.timer = setTimeout(async () => {
            await this.close();
        }, this.timeoutMs);
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
        this.sessions.set(session.id, session);
        return session;
    }
    get(id) {
        return this.sessions.get(id);
    }
    list() {
        return Array.from(this.sessions.values());
    }
    async remove(id) {
        const session = this.sessions.get(id);
        if (!session)
            return { found: false };
        const videoPath = await session.close();
        this.sessions.delete(id);
        return { found: true, videoPath };
    }
    async closeAll() {
        await Promise.all(this.list().map(s => s.close()));
        this.sessions.clear();
    }
}
//# sourceMappingURL=session.js.map