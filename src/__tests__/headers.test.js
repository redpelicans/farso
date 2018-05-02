const axios = require('axios');
const { initServer } = require('../server');
const Farso = require('..');

const errorCode = 501;
let ctx;
let farso;
const initFarso = () => {
  farso = Farso({ errorCode });
  farso.createEndpoint('test', { uri: '/test', method: 'get' });
  farso.registerEndpoints();
  return Promise.resolve({ farso });
};

beforeAll(() =>
  initFarso()
    .then(initServer)
    .then(c => (ctx = c)));
afterAll(() => ctx.server.close());

describe('Headers', () => {
  it('should check header with regexp', () => {
    farso
      .createVibe('t1', mock =>
        mock('test')
          .checkHeader({ 'x-test': /^12/ })
          .reply(200),
      )
      .select('t1');
    return axios({ method: 'get', url: `${ctx.server.url}/test`, headers: { 'X-test': '123' } });
  });

  it('should check header with data', () => {
    const headers = {
      'X-test': '123',
      'Y-test': '456',
    };
    farso
      .createVibe('t2', mock =>
        mock('test')
          .checkHeader(headers)
          .reply(200),
      )
      .select('t2');
    return axios({ method: 'get', url: `${ctx.server.url}/test`, headers });
  });

  it('should not check header with data', () => {
    const headers = { 'X-test': '123', 'Y-test': '456' };
    farso
      .createVibe('t3', mock =>
        mock('test')
          .checkHeader({ test: '123' })
          .reply(200),
      )
      .select('t3');
    return axios({ method: 'get', url: `${ctx.server.url}/test`, headers }).catch(error =>
      expect(error.response.status).toEqual(errorCode),
    );
  });

  it('should check header with function', () => {
    farso
      .createVibe('t4', mock =>
        mock('test')
          .checkHeader(headers => headers['x-test'] === '123')
          .reply(200),
      )
      .select('t4');
    return axios({ method: 'get', url: `${ctx.server.url}/test`, headers: { 'X-test': '123' } });
  });
});
