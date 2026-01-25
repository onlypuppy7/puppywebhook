import fetch from 'node-fetch';

/**
 * A simple rate-limited Discord webhook sender.
 */
export class PuppyWebhook {
    /**
     * @param {Object} options
     * @param {string} options.webhookUrl - The webhook URL to send messages to.
     * @param {string} [options.username='puppywebhook'] - The username to display for messages.
     * @param {string|null} [options.avatar=null] - The avatar URL to use for messages.
     * @param {number} [options.maxMessageLength=1900] - Maximum message length before splitting.
     * @param {number} [options.minDelay=5000] - Minimum delay between messages in ms.
     * @param {number} [options.maxDelay=15000] - Maximum delay between messages in ms.
     * @param {boolean} [options.logSends=false] - Whether to log sent messages.
     * @param {boolean} [options.logErrors=true] - Whether to log errors when sending.
     */
    constructor(options = {}) {
        this.webhookUrl = options.webhookUrl;
        this.username = options.username ?? 'puppywebhook';
        this.avatar = options.avatar ?? null;

        this.maxMessageLength = options.maxMessageLength ?? 1900;
        this.minDelay = options.minDelay ?? 5000;
        this.maxDelay = options.maxDelay ?? 15000;
        this.logSends = options.logSends ?? false;
        this.logErrors = options.logErrors ?? true;

        this.logQueue = [];
        this.queuedChunks = [];
        this.messagesSent = 0;

        this.interval = null;

        if (!this.webhookUrl) {
            throw new Error('webhookUrl is required');
        }

        this.start();
    }

    /**
     * Queues a message to be sent to the webhook.
     * @param {string} message
     */
    send(message) {
        if (typeof message !== 'string') {
            message = String(message);
        }

        this.logQueue.push(message);
    }

    /** Starts the sending loop. */
    start() {
        if (this.interval) return;
        this.interval = setInterval(() => this._process(), this._nextDelay());
    }

    /** Stops the sending loop. */
    stop() {
        if (!this.interval) return;
        clearInterval(this.interval);
        this.interval = null;
    }

    /**
     * Immediately processes all queued messages.
     * @returns {Promise<void>}
     */
    flush() {
        return this._process(true);
    }

    /**
     * Processes the message queue and sends chunks to the webhook.
     * @param {boolean} [force=false] - Whether to force sending even if queue is empty.
     * @private
     */
    async _process(force = false) {
        while (this.logQueue.length > 0) {
            const msg = this.logQueue.shift();

            if (msg.length > this.maxMessageLength) {
                const parts = this._split(msg);
                this.logQueue.unshift(...parts);
                continue;
            }

            const last = this.queuedChunks[0] ?? '';
            const next = last + '\n' + msg;

            if (next.length > this.maxMessageLength) {
                this.queuedChunks.unshift(msg);
            } else {
                this.queuedChunks[0] = next;
            }
        }

        if (this.queuedChunks.length === 0 && !force) return;

        const chunkContent = this.queuedChunks[this.queuedChunks.length - 1];
        if (!chunkContent) return;

        try {
            const content = chunkContent.slice(0, 2000) + ` (${this.messagesSent % 1000})`

            const res = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: this.username,
                    avatar_url: this.avatar,
                    content: content
                })
            });

            if (!res.ok) {
                throw new Error(res.statusText);
            }

            this.logSends && console.log('Sent webhook message:', content);

            this.queuedChunks.pop();
            this.messagesSent++;
        } catch (err) {
            this.logErrors && console.error('Error sending webhook:', err);
            this.logQueue.unshift(chunkContent);
        }

        this._reschedule();
    }

    /**
     * Splits a string into chunks no longer than maxMessageLength.
     * @param {string} str
     * @returns {string[]}
     * @private
     */
    _split(str) {
        const chunks = [];
        for (let i = 0; i < str.length; i += this.maxMessageLength) {
            chunks.push(str.slice(i, i + this.maxMessageLength));
        }
        return chunks;
    }

    /**
     * Calculates the next delay before sending a chunk.
     * @returns {number} Delay in milliseconds.
     * @private
     */
    _nextDelay() {
        const base = this.maxDelay - Math.min(this.queuedChunks.length, 7) * 1000;
        const jitter = (Math.floor(Math.random() * 8) - 4) * 1000;
        return Math.max(this.minDelay, base + jitter);
    }

    /** Reschedules the sending loop with a new delay. @private */
    _reschedule() {
        if (!this.interval) return;
        clearInterval(this.interval);
        this.interval = setInterval(() => this._process(), this._nextDelay());
    }
}

export default PuppyWebhook;