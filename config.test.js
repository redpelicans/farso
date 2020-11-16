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
  it('should get 404 because no endpoint exist', function () {
    return axios({
      method: 'get',
      url: ''.concat(ctx.server.url, '/test'),
    })['catch'](function (error) {
      return expect(error.response.status).toEqual(404);
    });
  });
  it('should get 404 because no mock exist', function () {
    farso.createEndpoint('test', {
      uri: '/test',
      method: 'get',
    });
    farso.registerEndpoints();
    return axios({
      method: 'get',
      url: ''.concat(ctx.server.url, '/test'),
    })['catch'](function (error) {
      return expect(error.response.status).toEqual(404);
    });
  });
  it('should get 404 because no mock set as default', function () {
    farso.createVibe('v1', function (mock) {
      return mock('test').reply(200);
    });
    return axios({
      method: 'get',
      url: ''.concat(ctx.server.url, '/test'),
    })['catch'](function (error) {
      return expect(error.response.status).toEqual(404);
    });
  });
  it('should visit right mock', function () {
    farso.select('v1');
    return axios({
      method: 'get',
      url: ''.concat(ctx.server.url, '/test'),
    });
  });
  it('should get 404 because no mock set as default', function () {
    return axios({
      method: 'get',
      url: ''.concat(ctx.server.url, '/Xtest'),
    })['catch'](function (error) {
      return expect(error.response.status).toEqual(404);
    });
  });
});
