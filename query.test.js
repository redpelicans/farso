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
  it('should check query', function () {
    var checks = {
      a: '111',
      b: /\w+123$/,
      c: function c(value) {
        return value === 'value';
      },
    };
    farso
      .createVibe('t1', function (mock) {
        return mock('test').checkQuery(checks).reply(200);
      })
      .select('t1');
    var params = {
      a: '111',
      b: 'abc123',
      c: 'value',
    };
    return axios({
      method: 'get',
      url: ''.concat(ctx.server.url, '/test'),
      params: params,
    });
  });
  it('should check query with fn', function () {
    var checks = {
      a: '111',
      b: /\w+123$/,
      c: function c(value) {
        return value === 'value';
      },
    };
    farso
      .createVibe('t1', function (mock) {
        return mock('test')
          .checkQuery(function (query) {
            return query.a === checks.a;
          })
          .reply(200);
      })
      .select('t1');
    var params = {
      a: '111',
      b: 'abc123',
      c: 'value',
    };
    return axios({
      method: 'get',
      url: ''.concat(ctx.server.url, '/test'),
      params: params,
    });
  });
  it('should not check query', function () {
    var checks = {
      a: '111',
      b: /\w+123$/,
      c: function c(value) {
        return value === 'Xvalue';
      },
    };
    farso
      .createVibe('t1', function (mock) {
        return mock('test').checkQuery(checks).reply(200);
      })
      .select('t1');
    var params = {
      a: '111',
      b: 'abc123',
      c: 'value',
    };
    return axios({
      method: 'get',
      url: ''.concat(ctx.server.url, '/test'),
      params: params,
    })['catch'](function (error) {
      return expect(error.response.status).toEqual(errorCode);
    });
  });
});
