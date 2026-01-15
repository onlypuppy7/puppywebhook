export interface PuppyWebhookOptions {
    webhookUrl: string;
    username?: string;
    avatar?: string | null;
    maxMessageLength?: number;
    minDelay?: number;
    maxDelay?: number;
    logSends?: boolean;
    logErrors?: boolean;
}

/**
 * A rate-limited Discord webhook sender that queues and splits messages automatically.
 */
export declare class PuppyWebhook {
    webhookUrl: string;
    username: string;
    avatar: string | null;
    maxMessageLength: number;
    minDelay: number;
    maxDelay: number;
    logSends: boolean;
    logErrors: boolean;
    logQueue: string[];
    queuedChunks: string[];
    messagesSent: number;
    interval: NodeJS.Timer | null;

    constructor(options: PuppyWebhookOptions);

    /** Queues a message to be sent to the webhook */
    send(message: string | any): void;

    /** Starts the sending loop */
    start(): void;

    /** Stops the sending loop */
    stop(): void;

    /** Immediately processes all queued messages */
    flush(): Promise<void>;

    /** @private */
    private _process(force?: boolean): Promise<void>;

    /** @private */
    private _split(str: string): string[];

    /** @private */
    private _nextDelay(): number;

    /** @private */
    private _reschedule(): void;
}

declare const _default: typeof PuppyWebhook;
export default _default;