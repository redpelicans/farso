'use strict';

var axios = require('axios');

var _require = require('../server'),
  initServer = _require.initServer;

var Farso = require('..');

var errorCode = 501;
var ctx;
var farso;

var initFarso = function initFarso() {
  farso = Farso({
    errorCode: errorCode,
  });
  farso.createEndpoint('test', {
    uri: '/test',
    method: 'get',
  });
  farso.registerEndpoints();
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
  it('should check header with regexp', function () {
    farso
      .createVibe('t1', function (mock) {
        return mock('test')
          .checkHeader({
            'x-test': /^12/,
          })
          .reply(200);
      })
      .select('t1');
    return axios({
      method: 'get',
      url: ''.concat(ctx.server.url, '/test'),
      headers: {
        'X-test': '123',
      },
    });
  });
  it('should check header with data', function () {
    var headers = {
      'X-test': '123',
      'Y-test': '456',
    };
    farso
      .createVibe('t2', function (mock) {
        return mock('test').checkHeader(headers).reply(200);
      })
      .select('t2');
    return axios({
      method: 'get',
      url: ''.concat(ctx.server.url, '/test'),
      headers: headers,
    });
  });
  it('should not check header with data', function () {
    var headers = {
      'X-test': '123',
      'Y-test': '456',
    };
    farso
      .createVibe('t3', function (mock) {
        return mock('test')
          .checkHeader({
            test: '123',
          })
          .reply(200);
      })
      .select('t3');
    return axios({
      method: 'get',
      url: ''.concat(ctx.server.url, '/test'),
      headers: headers,
    })['catch'](function (error) {
      return expect(error.response.status).toEqual(errorCode);
    });
  });
  it('should check header with function', function () {
    farso
      .createVibe('t4', function (mock) {
        return mock('test')
          .checkHeader(function (headers) {
            return headers['x-test'] === '123';
          })
          .reply(200);
      })
      .select('t4');
    return axios({
      method: 'get',
      url: ''.concat(ctx.server.url, '/test'),
      headers: {
        'X-test': '123',
      },
    });
  });
});
