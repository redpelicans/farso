'use strict';

var axios = require('axios');

var path = require('path');

var _require = require('../server'),
  runServer = _require.runServer;

var globals = {
  prefix: 'prefix',
};

var makeUrl = function makeUrl(uri) {
  return ''.concat(farsoServer.url).concat(uri);
};

var config = {
  vibes: path.join(__dirname, '../../examples/graphql.vibes.js'),
  endpoints: path.join(__dirname, '../../examples/graphql.endpoint.js'),
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
describe('GraphQL', function () {
  it('should query echo', function () {
    var query = 'query Echo($message: String){ echo(message: $message) }';
    var variables = {
      message: 'COUCOU',
    };
    return axios
      .post(makeUrl('/graphql'), {
        query: query,
        variables: variables,
      })
      .then(function (_ref2) {
        var data = _ref2.data;
        return expect(data.data.echo).toEqual(variables.message);
      });
  });
  it('should query echo on another vibe', function () {
    return axios(makeUrl('/_vibes_/prefix')).then(function () {
      var query = 'query Echo($message: String){ echo(message: $message) }';
      var variables = {
        message: 'COUCOU',
      };
      return axios
        .post(makeUrl('/graphql'), {
          query: query,
          variables: variables,
        })
        .then(function (_ref3) {
          var data = _ref3.data;
          if (data.errors) throw data.errors[0];
          expect(data.data.echo).toEqual(''.concat(globals.prefix, '-').concat(variables.message));
        });
    });
  });
});
