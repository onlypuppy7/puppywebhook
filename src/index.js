import fetch from 'node-fetch';

export class PuppyWebhook {
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

    send(message) {
        if (typeof message !== 'string') {
            message = String(message);
        }

        this.logQueue.push(message);
    }

    start() {
        if (this.interval) return;
        this.interval = setInterval(() => this._process(), this._nextDelay());
    }

    stop() {
        if (!this.interval) return;
        clearInterval(this.interval);
        this.interval = null;
    }

    flush() {
        return this._process(true);
    }

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

    _split(str) {
        const chunks = [];
        for (let i = 0; i < str.length; i += this.maxMessageLength) {
            chunks.push(str.slice(i, i + this.maxMessageLength));
        }
        return chunks;
    }

    _nextDelay() {
        const base = this.maxDelay - Math.min(this.queuedChunks.length, 7) * 1000;
        const jitter = (Math.floor(Math.random() * 8) - 4) * 1000;
        return Math.max(this.minDelay, base + jitter);
    }

    _reschedule() {
        if (!this.interval) return;
        clearInterval(this.interval);
        this.interval = setInterval(() => this._process(), this._nextDelay());
    }
}

export default PuppyWebhook;