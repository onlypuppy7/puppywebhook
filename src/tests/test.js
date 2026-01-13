import PuppyWebhook from '../index.js';

const webhook = new PuppyWebhook({
    webhookUrl: "https://discord.com/api/webhooks/1460782220192256031/Fkibsumk3hWg4M6F2eCmDe_ylXaJlY_z3W9XeCMWbiw4r8zcYfQJg64YeIhaHT-7tpbT",
    username: 'StateFarmBot',
    maxMessageLength: 1800,

    //logs just for testing
    logSends: true,
    logErrors: true
});

console.log('Queuing some test webhook messages...');

webhook.send('Bot started');
webhook.send('Loaded config');
webhook.send('Something happened');

process.on('exit', async () => {
    console.log('Flushing webhook messages before exit...');
    await webhook.flush();
});