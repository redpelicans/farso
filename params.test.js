'use strict';

var axios = require('axios');

var _require = require('../server'),
  initServer = _require.initServer;

var Farso = require('..');

var errorCode = 502;
var ctx;
var farso;

var initFarso = function initFarso() {
  farso = Farso({
    errorCode: errorCode,
  });
  farso.createEndpoint('test', {
    uri: '/test/:a/:b/:c',
    method: 'post',
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
  it('should check params with data', function () {
    var params = {
      a: '10',
      b: '11',
      c: 'abc',
    };
    farso
      .createVibe('v1', function (mock) {
        return mock('test').checkParams(params).reply(200);
      })
      .select('v1');
    return axios({
      method: 'post',
      url: ''.concat(ctx.server.url, '/test/10/11/abc'),
    });
  });
  it('should check params with regexp', function () {
    var params = {
      a: /\d+/,
      b: '11',
      c: /\w+/,
    };
    farso
      .createVibe('v2', function (mock) {
        return mock('test').checkParams(params).reply(200);
      })
      .select('v2');
    return axios({
      method: 'post',
      url: ''.concat(ctx.server.url, '/test/10/11/abc'),
    });
  });
  it('should check params with function', function () {
    var params = function params(_params) {
      return 'c' in _params;
    };

    farso
      .createVibe('v3', function (mock) {
        return mock('test').checkParams(params).reply(200);
      })
      .select('v3');
    return axios({
      method: 'post',
      url: ''.concat(ctx.server.url, '/test/10/11/abc'),
    });
  });
  it('should no check params with function', function () {
    var params = function params(_params2) {
      return 'X' in _params2;
    };

    farso
      .createVibe('v4', function (mock) {
        return mock('test').checkParams(params).reply(200);
      })
      .select('v4');
    return axios({
      method: 'post',
      url: ''.concat(ctx.server.url, '/test/10/11/abc'),
    })['catch'](function (error) {
      return expect(error.response.status).toEqual(errorCode);
    });
  });
});
