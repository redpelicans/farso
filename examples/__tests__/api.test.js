const axios = require('axios');
const path = require('path');
const faker = require('faker');
var querystring = require('querystring');
const { initServer } = require('../server');
const Trip = require('../..');
const endpoints = require('../endpoints');

const  config = {
  host: 'localhost',
  port: 8181,
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
    }
  }
};


const initConfig = () => Promise.resolve({ config });
const initTrip = ctx => {
  const mock = Trip({
    path: path.join(__dirname, '../mocks/**/*.trip.js'),
    endpoints,
    config: ctx,
  });
  mock.start('Main');
  return Promise.resolve({ ...ctx, trip: mock });
};

let tripServer;

beforeAll(() => initConfig()
  .then(initTrip)
  .then(initServer)
  .then(({ server}) => tripServer = server));

afterAll(() => tripServer.close());

describe('Test api', () => {
  it('should post /auth/v0/sms', () => {
    return axios
      .post('http://localhost:8181/auth/v0/sms', { phoneNumber: config.api.phoneNumber })
      .then(({status}) => expect(status).toEqual(204));
  })

  it('should not post /auth/v0/sms', () => {
    return axios
      .post('http://localhost:8181/auth/v0/sms', { phoneNumber: faker.random.word() })
      .catch(({ response: { status}}) => expect(status).toEqual(500));
  })

  it('should post /oauth/token', () => {
    const params = {
      grant_type: 'sms',
      client_id: config.api.clientId,
      client_secret: config.api.clientSecret,
      scope: ['IDENTIFIED', 'AUTHENTICATED', 'APPROVED'],
      sms_code: '42',
      plate_number: faker.lorem.word(),
      phone_number: config.api.phoneNumber,
      firstname: faker.name.firstName(),
      lastname: faker.name.lastName(),
    };

    const headers = {'content-type': 'application/x-www-form-urlencoded'};
    const query = querystring.stringify(params);

    return axios
      .post('http://localhost:8181/oauth/token', query, headers)
      .then(({status, data}) => {
        expect(status).toEqual(201);
        expect(data).toEqual(config.api.token);
      });
  })

});
