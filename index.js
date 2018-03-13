const Hapi = require('hapi');
const NodeRSA = require('node-rsa');
const got = require('got');
const config = require('./config.json');

const server = new Hapi.Server(config.server);

(async () => {
    const result = await got.get('https://api.travis-ci.org/config', { json: true });
    const key = new NodeRSA(result.body.config.notifications.webhook.public_key);

    server.route(require('./routes/webhook')(key));

    await server.start();

    return console.log(`Server running at: ${server.info.uri}`);
})();