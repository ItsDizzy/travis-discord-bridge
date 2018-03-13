const Boom = require('boom');
const got = require('got');
const config = require('../config.json');


module.exports = (key) => ({
  path: '/webhook/{repository}',
  method: 'POST',
  handler: async (req) => {
    // if(!req.headers.signature) {
    //   return Boom.badRequest('No signature found on request');
    // }

    if(!req.payload) {
      return Boom.badRequest('No data submitted');
    }

    // if(!key.verify(req.payload), req.headers.signature, 'base64', 'base64') {
    //   return Boom.unauthorized('Signed payload does not match signature');
    // }

    const foundEntry = config.repositories.find(repository => repository.name === req.params.repository)

    if(!foundEntry) {
      return Boom.unauthorized('Repository not registered!');
    }
    
    //console.log(req.payload);

    const { number, author_name, build_url, repository, branch, commit, message, finished_at } = JSON.parse(req.payload);

    const status = {
      color: 3779158,
      message: 'Success'
    }

    const payload = {
      username: "Travis CI",
      avatar_url: 'http://i.imgur.com/kOfUGNS.png',
      embeds: [{
        color: status.color,
        author: {
          name: `Build #${number} ${status.message} - ${author_name}`,
          url: build_url
        },
        title: `[${repository.name}:${branch}]`,
        url: `https://github.com/${repository.owner_name}/${repository.name}`,
        description: `[${commit.substring(0, 7)}](https://github.com/${repository.owner_name}/${repository.name}/commit/${commit}) ${message}`,
        timestamp: finished_at
      }]
    }

    console.log(JSON.stringify(payload));
    try {
      await got.post(foundEntry.webhook, {
        body: payload,
        json: true
      })
    } catch(e) {
      console.log(e);
    }

    return {
      ok: true
    };
  }
});