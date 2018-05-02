const axios = require('axios');
const { initServer } = require('../server');
const Trip = require('..');

const errorCode = 500;
let ctx;
let trip;
const initTrip = () => {
  trip = Trip({ errorCode });
  trip.createEndpoint('test', { uri: '/test/:a', method: 'patch' });
  trip.registerEndpoints();
  trip.createVibe(
    'v1',
    mock =>
      mock('test')
        .checkHeader({ 'x-test': 'abc' })
        .reply(200),
    { isDefault: true },
  );
  trip.createVibe(
    'v1',
    mock =>
      mock('test')
        .checkParams({ a: '123' })
        .reply(200),
    { isDefault: true },
  );
  return Promise.resolve({ trip });
};

beforeAll(() =>
  initTrip()
    .then(initServer)
    .then(c => (ctx = c)));
afterAll(() => ctx.server.close());

describe('Headers', () => {
  it('should check selected second mock', () => {
    return axios({ method: 'patch', url: `${ctx.server.url}/test/123`, headers: { 'X-test': '123' } });
  });

  it('should check selected first mock', () => {
    return axios({ method: 'patch', url: `${ctx.server.url}/test/abc`, headers: { 'X-test': 'abc' } });
  });

  it('should check not selected a mock', () => {
    return axios({ method: 'patch', url: `${ctx.server.url}/test/xyz`, headers: { 'X-test': 'xyz' } }).catch(error =>
      expect(error.response.status).toEqual(errorCode),
    );
  });
});
