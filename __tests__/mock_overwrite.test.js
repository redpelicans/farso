'use strict';

var axios = require('axios');

var _require = require('../server'),
  initServer = _require.initServer;

var Farso = require('..');

var errorCode = 500;
var ctx;
var farso;
var LSETVALUE1 = 'LSETVALUE1';
var LSETVALUE2 = 'LSETVALUE2';
var LSETVALUE3 = 'LSETVALUE3';

var initFarso = function initFarso() {
  farso = Farso({
    errorCode: errorCode,
  });
  farso.createEndpoint('test1', {
    uri: '/test1',
    method: 'get',
  });
  farso.createEndpoint('test2', {
    uri: '/test2',
    method: 'get',
  });
  farso.createEndpoint('test3', {
    uri: '/test3',
    method: 'get',
  });
  farso.registerEndpoints();
  farso.createVibe(
    'v1',
    function (mock, _ref) {
      var lget = _ref.lget;
      mock('test1')
        .lset(function () {
          return [['data1'], LSETVALUE1];
        })
        .reply(200);
      mock('test2')
        .lset(function () {
          return [['data', 'value2'], LSETVALUE2];
        })
        .reply(function (req, res) {
          return res.send([lget('data1').value, lget(['data', 'value2']).value]);
        });
    },
    {
      isDefault: true,
    },
  );
  farso.createVibe('v2', function (mock, _ref2) {
    var lvalue = _ref2.lvalue;
    mock('test1')
      .lset(function () {
        return [['data1'], LSETVALUE3];
      })
      .reply(201);
    mock('test3').reply(function (req, res) {
      return res.send([lvalue('data1'), lvalue(['data', 'value2'])]);
    });
  });
  farso.select('v2');
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
  it('should select second mock definition', function () {
    return axios({
      method: 'get',
      url: ''.concat(ctx.server.url, '/test1'),
    }).then(function (_ref3) {
      var status = _ref3.status;
      return expect(status).toEqual(201);
    });
  });
  it('should select first mock definition', function () {
    return axios({
      method: 'get',
      url: ''.concat(ctx.server.url, '/test2'),
    }).then(function (_ref4) {
      var data = _ref4.data;
      expect(data).toEqual([LSETVALUE3, LSETVALUE2]);
    });
  });
  it('should get right data', function () {
    return axios({
      method: 'get',
      url: ''.concat(ctx.server.url, '/test3'),
    }).then(function (_ref5) {
      var data = _ref5.data;
      expect(data).toEqual([LSETVALUE3, LSETVALUE2]);
    });
  });
});
