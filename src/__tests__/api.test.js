const axios = require('axios');
const path = require('path');
const faker = require('faker');
const querystring = require('querystring');
const { runServer } = require('../server');

const globals = {
  api: {
    clientId: faker.random.uuid(),
    clientSecret: faker.random.uuid(),
    phoneNumber: '+33656453423',
    token: {
      access_token: faker.random.uuid(),
      refresh_token: faker.random.uuid(),
      token_type: 'bearer',
      expires_in: 3599,
      scope: 'AUTHENTICATED IDENTIFIED APPROVED',
    },
  },
};

const makeUrl = uri => `${farsoServer.url}${uri}`;
const config = {
  vibes: path.join(__dirname, '../../examples/api.vibe.js'),
  endpoints: path.join(__dirname, '../../examples/endpoints.js'),
  globals,
};

let farsoServer;
beforeAll(() => runServer(config).then(({ server }) => (farsoServer = server)));
afterAll(() => farsoServer.close());

describe('Test api', () => {
  it('should post /auth/v0/sms', () => {
    return axios
      .post(makeUrl('/auth/v0/sms'), { phoneNumber: globals.api.phoneNumber })
      .then(({ status }) => expect(status).toEqual(204));
  });

  it('should not post /auth/v0/sms', () => {
    return axios
      .post(makeUrl('/auth/v0/sms'), { phoneNumber: faker.random.word() })
      .catch(({ response: { status } }) => expect(status).toEqual(500));
  });

  it('should post /oauth/token', () => {
    const params = {
      grant_type: 'sms',
      client_id: globals.api.clientId,
      client_secret: globals.api.clientSecret,
      scope: ['IDENTIFIED', 'AUTHENTICATED', 'APPROVED'],
      sms_code: '42',
      plate_number: faker.lorem.word(),
      phone_number: globals.api.phoneNumber,
      firstname: faker.name.firstName(),
      lastname: faker.name.lastName(),
    };

    const headers = { 'content-type': 'application/x-www-form-urlencoded' };
    const query = querystring.stringify(params);

    return axios.post(makeUrl('/oauth/token'), query, headers).then(({ status, data }) => {
      expect(status).toEqual(201);
      expect(data).toEqual(globals.api.token);
    });
  });
});
