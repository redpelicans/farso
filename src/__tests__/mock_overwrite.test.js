const axios = require('axios');
const { initServer } = require('../server');
const Farso = require('..');

const errorCode = 500;
let ctx;
let farso;
const initFarso = () => {
  farso = Farso({ errorCode });
  farso.createEndpoint('test1', { uri: '/test1', method: 'get' });
  farso.createEndpoint('test2', { uri: '/test2', method: 'get' });
  farso.registerEndpoints();
  farso.createVibe(
    'v1',
    mock => {
      mock('test1').reply(200);
      mock('test2').reply(200);
    },
    { isDefault: true },
  );
  farso.createVibe('v2', mock => mock('test1').reply(201));
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
    return axios({ method: 'get', url: `${ctx.server.url}/test2` }).then(({ status }) => expect(status).toEqual(200));
  });
});
