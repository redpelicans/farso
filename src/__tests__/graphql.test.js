const axios = require('axios');
const path = require('path');
const { runServer } = require('../server');

const globals = {
  prefix: 'prefix',
};

const makeUrl = uri => `${farsoServer.url}${uri}`;
const config = {
  vibes: path.join(__dirname, '../../examples/graphql.vibes.js'),
  endpoints: path.join(__dirname, '../../examples/graphql.endpoint.js'),
  globals,
};

let farsoServer;
beforeAll(() => runServer(config).then(({ server }) => (farsoServer = server)));
afterAll(() => farsoServer.close());

describe('GraphQL', () => {
  it('should query echo', () => {
    const query = 'query Echo($message: String){ echo(message: $message) }';
    const variables = { message: 'COUCOU' };
    return axios
      .post(makeUrl('/graphql'), { query, variables })
      .then(({ data }) => expect(data.data.echo).toEqual(variables.message));
  });
  
  it('should query echo on another vibe', () => {
    return axios(makeUrl('/_vibes_/prefix')).then(() => {
      const query = 'query Echo($message: String){ echo(message: $message) }';
      const variables = { message: 'COUCOU' };
      return axios
        .post(makeUrl('/graphql'), { query, variables })
        .then(({ data }) => {
          if(data.errors) throw data.errors[0];
          expect(data.data.echo).toEqual(`${globals.prefix}-${variables.message}`)
        });
      });
    });
});
