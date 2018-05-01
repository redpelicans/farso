const axios = require('axios');
const { initServer } = require('../server');
const Trip = require('..');

const errorCode = 501;
let ctx;
let trip;
const initTrip = () => {
  trip = Trip({ errorCode });
  trip.createEndpoint('test', { uri: '/test', method: 'get' });
  return Promise.resolve({ trip });
};

beforeAll(() =>
  initTrip()
    .then(initServer)
    .then(c => (ctx = c)));
afterAll(() => ctx.server.close());

describe('Headers', () => {
  it('should check header with regexp', () => {
    trip.createVibe(
      't1',
      mock =>
        mock('test')
          .checkHeader({ 'x-test': /^12/ })
          .reply(200),
      { isDefault: true },
    );
    trip.start();
    return axios({ method: 'get', url: `${ctx.server.url}/test`, headers: { 'X-test': '123' } });
  });

  it('should check header with data', () => {
    const headers = {
      'X-test': '123',
      'Y-test': '456',
    };
    trip.createVibe('t2', mock =>
      mock('test')
        .checkHeader(headers)
        .reply(200),
    );
    trip.start('t2');
    return axios({ method: 'get', url: `${ctx.server.url}/test`, headers });
  });

  it('should not check header with data', () => {
    const headers = {
      'X-test': '123',
      'Y-test': '456',
    };
    trip.createVibe('t3', mock =>
      mock('test')
        .checkHeader({ test: '123' })
        .reply(200),
    );
    trip.start('t3');
    return axios({ method: 'get', url: `${ctx.server.url}/test`, headers }).catch(error =>
      expect(error.response.status).toEqual(errorCode),
    );
  });

  it('should check header with function', () => {
    trip.createVibe('t4', mock =>
      mock('test')
        .checkHeader(headers => headers['x-test'] === '123')
        .reply(200),
    );
    trip.start('t4');
    return axios({ method: 'get', url: `${ctx.server.url}/test`, headers: { 'X-test': '123' } });
  });
});
