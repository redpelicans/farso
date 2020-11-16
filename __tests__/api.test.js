'use strict';

var axios = require('axios');

var path = require('path');

var faker = require('faker');

var querystring = require('querystring');

var _require = require('../server'),
  runServer = _require.runServer;

var globals = {
  api: {
    clientId: faker.random.uuid(),
    clientSecret: faker.random.uuid(),
    phoneNumber: '+33656453423',
    token: {
      access_token: faker.random.uuid(),
      refresh_token: faker.random.uuid(),
      token_type: 'bearer',
      expires_in: 3599,
      scope: 'AUTHENTICATED IDENTIFIED APPROVED',
    },
  },
};

var makeUrl = function makeUrl(uri) {
  return ''.concat(farsoServer.url).concat(uri);
};

var config = {
  vibes: path.join(__dirname, '../../examples/api.vibe.js'),
  endpoints: path.join(__dirname, '../../examples/endpoints.js'),
  globals: globals,
};
var farsoServer;
beforeAll(function () {
  return runServer(config).then(function (_ref) {
    var server = _ref.server;
    return (farsoServer = server);
  });
});
afterAll(function () {
  return farsoServer.close();
});
describe('Test api', function () {
  it('should post /auth/v0/sms', function () {
    return axios
      .post(makeUrl('/auth/v0/sms'), {
        phoneNumber: globals.api.phoneNumber,
      })
      .then(function (_ref2) {
        var status = _ref2.status;
        return expect(status).toEqual(204);
      });
  });
  it('should not post /auth/v0/sms', function () {
    return axios
      .post(makeUrl('/auth/v0/sms'), {
        phoneNumber: faker.random.word(),
      })
      ['catch'](function (_ref3) {
        var status = _ref3.response.status;
        return expect(status).toEqual(500);
      });
  });
  it('should post /oauth/token', function () {
    var params = {
      grant_type: 'sms',
      client_id: globals.api.clientId,
      client_secret: globals.api.clientSecret,
      scope: ['IDENTIFIED', 'AUTHENTICATED', 'APPROVED'],
      sms_code: '42',
      plate_number: faker.lorem.word(),
      phone_number: globals.api.phoneNumber,
      firstname: faker.name.firstName(),
      lastname: faker.name.lastName(),
    };
    var headers = {
      'content-type': 'application/x-www-form-urlencoded',
    };
    var query = querystring.stringify(params);
    return axios.post(makeUrl('/oauth/token'), query, headers).then(function (_ref4) {
      var status = _ref4.status,
        data = _ref4.data;
      expect(status).toEqual(201);
      expect(data).toEqual(globals.api.token);
    });
  });
});
