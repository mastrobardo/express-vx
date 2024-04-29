const fastify = require('fastify')({ logger: true });
const axios = require('axios');
const cors = require('@fastify/cors');
require('dotenv').config({ path: './.env' });

fastify.register(cors, { 
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
});

fastify.route({
  method: 'GET',
  url: '/api/user/:userId',
  handler: async (request, reply) => {
    const targetUrl = `${process.env.NX_FUSION_AUTH_URL}/api/user/${request.params.userId}`;
    console.log("USER")
    console.log('Making request to:', targetUrl);
    console.log('Authorization:', request.headers['authorization']);
    try {
      const response = await axios.get(targetUrl, {
        headers: {
          'Authorization': request.headers['authorization']
        }
      });
      reply.send(response.data);
    } catch (error) {
      request.log.error('Error proxying request:', targetUrl, error);
      if (error.response) {
        reply.status(error.response.status).send(error.response.data);
      } else {
        reply.status(500).send({ error: 'Failed to proxy request' });
      }
    }
  }
});

fastify.route({
  method: 'POST',
  url: '/get-token',
  handler: async (request, reply) => {
    const {code} = request.body
    if (!code) {
      return reply.status(400).send({ error: 'Code parameter is required' });
    }

    const params = new URLSearchParams();
    params.append('client_id', process.env.NX_FUSION_AUTH_CLIENT_ID);
    params.append('client_secret', process.env.NX_FUSION_AUTH_CLIENT_SECRET);
    params.append('code', code);
    params.append('grant_type', 'authorization_code');
    params.append('redirect_uri', process.env.NX_FUSION_AUTH_REDIRECT_URI);

    console.log('Requesting token with URL:', process.env.NX_FUSION_AUTH_TOKEN_URL);
    try {
      const response = await axios.post(process.env.NX_FUSION_AUTH_TOKEN_URL, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      reply.send(response.data);
    } catch (error) {
      request.log.error('Error fetching token from FusionAuth:', process.env.NX_FUSION_AUTH_TOKEN_URL, error);
      reply.status(500).send({ error: 'Failed to fetch token from FusionAuth', error });
    }
  }
});

// Start the server
fastify.listen(3000, err => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`server listening on ${fastify.server.address().port}`);
});
