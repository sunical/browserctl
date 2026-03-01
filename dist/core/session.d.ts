import { SessionOptions, SessionInfo } from '../types.js';
import type { Page } from 'playwright';
export declare class Session {
    readonly id: string;
    readonly createdAt: number;
    readonly recording: boolean;
    private instance;
    private timeoutMs;
    private timer;
    private _lastActivity;
    private constructor();
    static create(options?: SessionOptions): Promise<Session>;
    get page(): Page;
    get lastActivity(): number;
    get url(): string;
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