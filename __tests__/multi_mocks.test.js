'use strict';

var axios = require('axios');

var _require = require('../server'),
  initServer = _require.initServer;

var Farso = require('..');

var errorCode = 500;
var ctx;
var farso;

var initFarso = function initFarso() {
  farso = Farso({
    errorCode: errorCode,
  });
  farso.createEndpoint('test', {
    uri: '/test/:a',
    method: 'patch',
  });
  farso.registerEndpoints();
  farso.createVibe(
    'v1',
    function (mock) {
      return mock('test')
        .checkHeader({
          'x-test': 'abc',
        })
        .reply(200);
    },
    {
      isDefault: true,
    },
  );
  farso.createVibe(
    'v1',
    function (mock) {
      return mock('test')
        .checkParams({
          a: '123',
        })
        .reply(200);
    },
    {
      isDefault: true,
    },
  );
  return Promise.resolve({
    farso: farso,
  });
};

beforeAll(function () {
  return initFarso()
    .then(initServer)
    .then(function (c) {
      return (ctx = c);
    });
});
afterAll(function () {
  return ctx.server.close();
});
describe('Headers', function () {
  it('should check selected second mock', function () {
    return axios({
      method: 'patch',
      url: ''.concat(ctx.server.url, '/test/123'),
      headers: {
        'X-test': '123',
      },
    });
  });
  it('should check selected first mock', function () {
    return axios({
      method: 'patch',
      url: ''.concat(ctx.server.url, '/test/abc'),
      headers: {
        'X-test': 'abc',
      },
    });
  });
  it('should check not selected a mock', function () {
    return axios({
      method: 'patch',
      url: ''.concat(ctx.server.url, '/test/xyz'),
      headers: {
        'X-test': 'xyz',
      },
    })['catch'](function (error) {
      return expect(error.response.status).toEqual(errorCode);
    });
  });
});
