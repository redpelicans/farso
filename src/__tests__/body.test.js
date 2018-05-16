const axios = require('axios');
const { initServer } = require('../server');
const Farso = require('..');

const errorCode = 501;
let ctx;
let farso;
const initFarso = () => {
  farso = Farso({ errorCode });
  farso.createEndpoint('test', { uri: '/test', method: 'post' });
  farso.registerEndpoints();
  return Promise.resolve({ farso });
};

beforeAll(() =>
  initFarso()
    .then(initServer)
    .then(c => (ctx = c)));
afterAll(() => ctx.server.close());

describe('Headers', () => {
  it('should check body', () => {
    const checks1 = {
      a: '111',
      b: /\w+123$/,
      c: value => value === 'value',
    };
    const checks = {
      ...checks1,
      e: checks1,
    };
    farso
      .createVibe('t1', mock =>
        mock('test')
          .checkBody(checks)
          .reply(200),
      )
      .select('t1');

    const data1 = {
      a: '111',
      b: 'abc123',
      c: 'value',
    };
    const data = {
      ...data1,
      e: data1,
    };
    return axios({ method: 'post', url: `${ctx.server.url}/test`, data });
  });

  it('should check body with fn', () => {
    const checks1 = {
      a: '111',
      b: /\w+123$/,
      c: value => value === 'value',
    };
    const checks = {
      ...checks1,
      e: checks1,
    };
    farso
      .createVibe('t1', mock =>
        mock('test')
          .checkBody(body => body.e.a === checks.e.a)
          .reply(200),
      )
      .select('t1');

    const data1 = {
      a: '111',
      b: 'abc123',
      c: 'value',
    };
    const data = {
      ...data1,
      e: data1,
    };
    return axios({ method: 'post', url: `${ctx.server.url}/test`, data });
  });

  it('should not check body', () => {
    const checks1 = {
      a: '111',
      b: /\w+123$/,
      c: value => value === 'value',
    };
    const checks = {
      ...checks1,
      e: checks1,
    };
    farso
      .createVibe('t1', mock =>
        mock('test')
          .checkBody(checks)
          .reply(200),
      )
      .select('t1');

    const data1 = {
      a: '111',
      b: 'abc123',
      c: 'value',
    };
    const data = {
      ...data1,
      c: 'xxx',
      e: data1,
    };
    return axios({ method: 'post', url: `${ctx.server.url}/test`, data }).catch(error =>
      expect(error.response.status).toEqual(errorCode),
    );
  });
});
