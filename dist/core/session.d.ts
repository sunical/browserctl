import { SessionOptions, SessionInfo } from '../types.js';
import type { Page } from 'playwright';
export declare class Session {
    readonly id: string;
    readonly createdAt: number;
    readonly recording: boolean;
    /**
     * Called when the inactivity timer closes the browser. The registry uses this
     * to drop the entry — otherwise expired sessions accumulate forever and
     * commands against them fail with an opaque "target closed" from Playwright.
     */
    onExpire?: (session: Session) => void;
    private instance;
    private timeoutMs;
    private timer;
    private _lastActivity;
    private _closed;
    /** Tail of the per-session command chain — see run(). */
    private queue;
    private constructor();
    static create(options?: SessionOptions): Promise<Session>;
    get page(): Page;
    get lastActivity(): number;
    get closed(): boolean;
    get url(): string;
    /**
     * Serialise work against this session's page.
     *
     * Two commands arriving concurrently for the same session would otherwise
     * interleave — a click landing between another command's snapshot and its
     * action, for instance. Sessions are independent, so this only orders work
     * within one.
     */
    run<T>(task: () => Promise<T>): Promise<T>;
    touch(): void;
    info(): SessionInfo;
    close(): Promise<string | undefined>;
    private resetTimer;
    private clearTimer;
}
export declare class SessionRegistry {
    private sessions;
    create(options?: SessionOptions): Promise<Session>;
    get(id: string): Session | undefined;
    list(): Session[];
    remove(id: string): Promise<{
        found: boolean;
        videoPath?: string;
    }>;
    closeAll(): Promise<void>;
}
//# sourceMappingURL=session.d.ts.map