const axios = require('axios');
const { initServer } = require('../server');
const Farso = require('..');

const errorCode = 500;
let ctx;
let farso;
const initFarso = () => {
  farso = Farso({ errorCode });
  return Promise.resolve({ farso });
};

beforeAll(() =>
  initFarso()
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
    farso.createEndpoint('test', { uri: '/test', method: 'get' });
    farso.registerEndpoints();
    return axios({ method: 'get', url: `${ctx.server.url}/test` }).catch(error =>
      expect(error.response.status).toEqual(404),
    );
  });

  it('should get 404 because no mock set as default', () => {
    farso.createVibe('v1', mock => mock('test').reply(200));
    return axios({ method: 'get', url: `${ctx.server.url}/test` }).catch(error =>
      expect(error.response.status).toEqual(404),
    );
  });

  it('should visit right mock', () => {
    farso.select('v1');
    return axios({ method: 'get', url: `${ctx.server.url}/test` });
  });

  it('should get 404 because no mock set as default', () => {
    return axios({ method: 'get', url: `${ctx.server.url}/Xtest` }).catch(error =>
      expect(error.response.status).toEqual(404),
    );
  });
});
