const axios = require('axios');
const { initServer } = require('../server');
const Trip = require('..');

const errorCode = 502;
let ctx;
let trip;
const initTrip = () => {
  trip = Trip({ errorCode });
  trip.createEndpoint('test', { uri: '/test/:a/:b/:c', method: 'post' });
  trip.registerEndpoints();
  return Promise.resolve({ trip });
};

beforeAll(() =>
  initTrip()
    .then(initServer)
    .then(c => (ctx = c)));
afterAll(() => ctx.server.close());

describe('Headers', () => {
  it('should check params with data', () => {
    const params = {
      a: '10',
      b: '11',
      c: 'abc',
    };
    trip
      .createVibe('v1', mock =>
        mock('test')
          .checkParams(params)
          .reply(200),
      )
      .select('v1');
    return axios({ method: 'post', url: `${ctx.server.url}/test/10/11/abc` });
  });

  it('should check params with regexp', () => {
    const params = {
      a: /\d+/,
      b: '11',
      c: /\w+/,
    };
    trip
      .createVibe('v2', mock =>
        mock('test')
          .checkParams(params)
          .reply(200),
      )
      .select('v2');
    return axios({ method: 'post', url: `${ctx.server.url}/test/10/11/abc` });
  });

  it('should check params with function', () => {
    const params = params => 'c' in params;
    trip
      .createVibe('v3', mock =>
        mock('test')
          .checkParams(params)
          .reply(200),
      )
      .select('v3');
    return axios({ method: 'post', url: `${ctx.server.url}/test/10/11/abc` });
  });

  it('should no check params with function', () => {
    const params = params => 'X' in params;
    trip
      .createVibe('v4', mock =>
        mock('test')
          .checkParams(params)
          .reply(200),
      )
      .select('v4');
    return axios({ method: 'post', url: `${ctx.server.url}/test/10/11/abc` }).catch(error =>
      expect(error.response.status).toEqual(errorCode),
    );
  });
});
