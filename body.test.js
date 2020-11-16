'use strict';

function ownKeys(object, enumerableOnly) {
  var keys = Object.keys(object);

  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object);
    if (enumerableOnly)
      symbols = symbols.filter(function (sym) {
        return Object.getOwnPropertyDescriptor(object, sym).enumerable;
      });
    keys.push.apply(keys, symbols);
  }

  return keys;
}

function _objectSpread(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i] != null ? arguments[i] : {};

    if (i % 2) {
      ownKeys(Object(source), true).forEach(function (key) {
        _defineProperty(target, key, source[key]);
      });
    } else if (Object.getOwnPropertyDescriptors) {
      Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
    } else {
      ownKeys(Object(source)).forEach(function (key) {
        Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
      });
    }
  }

  return target;
}

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

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
  it('should check body', function () {
    var checks1 = {
      a: '111',
      b: /\w+123$/,
      c: function c(value) {
        return value === 'value';
      },
    };

    var checks = _objectSpread(
      _objectSpread({}, checks1),
      {},
      {
        e: checks1,
      },
    );

    farso
      .createVibe('t1', function (mock) {
        return mock('test').checkBody(checks).reply(200);
      })
      .select('t1');
    var data1 = {
      a: '111',
      b: 'abc123',
      c: 'value',
    };

    var data = _objectSpread(
      _objectSpread({}, data1),
      {},
      {
        e: data1,
      },
    );

    return axios({
      method: 'post',
      url: ''.concat(ctx.server.url, '/test'),
      data: data,
    });
  });
  it('should check body with fn', function () {
    var checks1 = {
      a: '111',
      b: /\w+123$/,
      c: function c(value) {
        return value === 'value';
      },
    };

    var checks = _objectSpread(
      _objectSpread({}, checks1),
      {},
      {
        e: checks1,
      },
    );

    farso
      .createVibe('t1', function (mock) {
        return mock('test')
          .checkBody(function (body) {
            return body.e.a === checks.e.a;
          })
          .reply(200);
      })
      .select('t1');
    var data1 = {
      a: '111',
      b: 'abc123',
      c: 'value',
    };

    var data = _objectSpread(
      _objectSpread({}, data1),
      {},
      {
        e: data1,
      },
    );

    return axios({
      method: 'post',
      url: ''.concat(ctx.server.url, '/test'),
      data: data,
    });
  });
  it('should not check body', function () {
    var checks1 = {
      a: '111',
      b: /\w+123$/,
      c: function c(value) {
        return value === 'value';
      },
    };

    var checks = _objectSpread(
      _objectSpread({}, checks1),
      {},
      {
        e: checks1,
      },
    );

    farso
      .createVibe('t1', function (mock) {
        return mock('test').checkBody(checks).reply(200);
      })
      .select('t1');
    var data1 = {
      a: '111',
      b: 'abc123',
      c: 'value',
    };

    var data = _objectSpread(
      _objectSpread({}, data1),
      {},
      {
        c: 'xxx',
        e: data1,
      },
    );

    return axios({
      method: 'post',
      url: ''.concat(ctx.server.url, '/test'),
      data: data,
    })['catch'](function (error) {
      return expect(error.response.status).toEqual(errorCode);
    });
  });
});
