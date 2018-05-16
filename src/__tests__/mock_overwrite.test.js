const axios = require('axios');
const { initServer } = require('../server');
const Farso = require('..');

const errorCode = 500;
let ctx;
let farso;
const LSETVALUE1 = 'LSETVALUE1';
const LSETVALUE2 = 'LSETVALUE2';
const LSETVALUE3 = 'LSETVALUE3';

const initFarso = () => {
  farso = Farso({ errorCode });
  farso.createEndpoint('test1', { uri: '/test1', method: 'get' });
  farso.createEndpoint('test2', { uri: '/test2', method: 'get' });
  farso.createEndpoint('test3', { uri: '/test3', method: 'get' });
  farso.registerEndpoints();

  farso.createVibe(
    'v1',
    (mock, { lget }) => {
      mock('test1')
        .lset(() => [['data1'], LSETVALUE1])
        .reply(200);
      mock('test2')
        .lset(() => [['data', 'value2'], LSETVALUE2])
        .reply((req, res) => res.send([lget('data1').value, lget(['data', 'value2']).value]));
    },
    { isDefault: true },
  );

  farso.createVibe('v2', (mock, { lvalue }) => {
    mock('test1')
      .lset(() => [['data1'], LSETVALUE3])
      .reply(201);
    mock('test3').reply((req, res) => res.send([lvalue('data1'), lvalue(['data', 'value2'])]));
  });

  farso.select('v2');

  return Promise.resolve({ farso });
};

beforeAll(() =>
  initFarso()
    .then(initServer)
    .then(c => (ctx = c)));
afterAll(() => ctx.server.close());

describe('Headers', () => {
  it('should select second mock definition', () => {
    return axios({ method: 'get', url: `${ctx.server.url}/test1` }).then(({ status }) => expect(status).toEqual(201));
  });

  it('should select first mock definition', () => {
    return axios({ method: 'get', url: `${ctx.server.url}/test2` }).then(({ data }) => {
      expect(data).toEqual([LSETVALUE3, LSETVALUE2]);
    });
  });

  it('should get right data', () => {
    return axios({ method: 'get', url: `${ctx.server.url}/test3` }).then(({ data }) => {
      expect(data).toEqual([LSETVALUE3, LSETVALUE2]);
    });
  });
});
