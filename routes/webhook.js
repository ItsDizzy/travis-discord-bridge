const Boom = require('boom');
const got = require('got');
const Joi = require('joi');
const config = require('../config.json');

function getStatus(data) {
  const status = {
    color: 3779158,
    time: data.finished_at,
    message: data.result_message
  }

  if (status.message === null) {
    status.message = data.status_message;
  }

  switch (status.message) {
    case "Pending":
      status.color = 15588927;
      status.time = data.started_at;
      break;
    case "Passed":
    case "Fixed":
      status.color = 3779158;
      break;
    case "Broken":
    case "Failed":
    case "Still Failing":
      status.color = 14370117;
      break;
    case "Canceled":
      status.color = 10329501;
  }

  return status;
}

module.exports = (key) => ({
  path: '/webhook',
  method: 'POST',
  handler: async (req) => {
    if(!req.headers.signature) { 
      return Boom.badRequest('No signature found on request'); 
    }

    const data = JSON.parse(req.payload.payload);

    // if(!key.verify(data), req.headers.signature, 'base64', 'base64') {
    //   return Boom.unauthorized('Signed payload does not match signature');
    // }

    const status = getStatus(data);

    const foundEntry = config.repositories.find(repository => data.repository && repository.name === data.repository.name)

    if(!foundEntry) {
      return Boom.badRequest('Repository not registered!');
    }

    if(!~foundEntry.branches.indexOf(data.branch)) {
      return Boom.badRequest('Branch not registered!');
    }

    if(!~foundEntry.hooks.indexOf(status.message)) {
      return Boom.badRequest('Hook not registered!');
    }

    const payload = {
      username: "Travis CI",
      avatar_url: 'http://i.imgur.com/kOfUGNS.png',
      embeds: [{
        color: status.color,
        author: {
          name: `Build #${data.number} ${status.message} - ${data.author_name}`,
          url: data.build_url
        },
        title: `[${data.repository.name}:${data.branch}]`,
        url: `https://github.com/${data.repository.owner_name}/${data.repository.name}`,
        description: `[${data.commit.substring(0, 7)}](https://github.com/${data.repository.owner_name}/${data.repository.name}/commit/${data.commit}) ${data.message}`,
        timestamp: status.time
      }]
    }

    try {
      await got.post(foundEntry.webhook, {
        body: payload,
        json: true
      })
    } catch(e) {
      return Boom.internal(e.message);
    }

    return {
      ok: true
    };
  },

  options: {
    validate: {
      options: {
        allowUnknown: true
      },
      headers: {
        signature: Joi.string()
      },
      payload: Joi.object({
        number: Joi.number(),
        status_message: Joi.string(),
        result_message: Joi.string().optional(),
        started_at: Joi.string(),
        finished_at: Joi.string(),
        build_url: Joi.string(),
        commit: Joi.string(),
        branch: Joi.string(),
        message: Joi.string(),
        author_name: Joi.string(),
        repository: Joi.object({
          id: Joi.number(),
          name: Joi.string(),
          owner_name: Joi.string(),
        })
      })
    }
  }
});