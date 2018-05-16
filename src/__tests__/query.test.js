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
  it('should check query', () => {
    const checks = {
      a: '111',
      b: /\w+123$/,
      c: value => value === 'value',
    };
    farso
      .createVibe('t1', mock =>
        mock('test')
          .checkQuery(checks)
          .reply(200),
      )
      .select('t1');

    const params = {
      a: '111',
      b: 'abc123',
      c: 'value',
    };
    return axios({ method: 'get', url: `${ctx.server.url}/test`, params });
  });

  it('should check query with fn', () => {
    const checks = {
      a: '111',
      b: /\w+123$/,
      c: value => value === 'value',
    };
    farso
      .createVibe('t1', mock =>
        mock('test')
          .checkQuery(query => query.a === checks.a)
          .reply(200),
      )
      .select('t1');

    const params = {
      a: '111',
      b: 'abc123',
      c: 'value',
    };
    return axios({ method: 'get', url: `${ctx.server.url}/test`, params });
  });

  it('should not check query', () => {
    const checks = {
      a: '111',
      b: /\w+123$/,
      c: value => value === 'Xvalue',
    };
    farso
      .createVibe('t1', mock =>
        mock('test')
          .checkQuery(checks)
          .reply(200),
      )
      .select('t1');

    const params = {
      a: '111',
      b: 'abc123',
      c: 'value',
    };
    return axios({ method: 'get', url: `${ctx.server.url}/test`, params }).catch(error =>
      expect(error.response.status).toEqual(errorCode),
    );
  });
});
