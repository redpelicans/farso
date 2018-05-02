const axios = require('axios');
const { initServer } = require('../server');
const Trip = require('..');

const errorCode = 500;
let ctx;
let trip;
const initTrip = () => {
  trip = Trip({ errorCode });
  return Promise.resolve({ trip });
};

beforeAll(() =>
  initTrip()
    .then(initServer)
    .then(c => (ctx = c)));
afterAll(() => ctx.server.close());

describe('Headers', () => {
  it('should get 404 because no endpoint exist', () => {
    return axios({ method: 'get', url: `${ctx.server.url}/test` }).catch(error =>
      expect(error.response.status).toEqual(404),
    );
  });

  it('should get 404 because no mock exist', () => {
    trip.createEndpoint('test', { uri: '/test', method: 'get' });
    trip.registerEndpoints();
    return axios({ method: 'get', url: `${ctx.server.url}/test` }).catch(error =>
      expect(error.response.status).toEqual(404),
    );
  });

  it('should get 404 because no mock set as default', () => {
    trip.createVibe('v1', mock => mock('test').reply(200));
    return axios({ method: 'get', url: `${ctx.server.url}/test` }).catch(error =>
      expect(error.response.status).toEqual(404),
    );
  });

  it('should visit right mock', () => {
    trip.select('v1');
    return axios({ method: 'get', url: `${ctx.server.url}/test` });
  });

  it('should get 404 because no mock set as default', () => {
    return axios({ method: 'get', url: `${ctx.server.url}/Xtest` }).catch(error =>
      expect(error.response.status).toEqual(404),
    );
  });
});
