'use strict';

var _require = require('@graphql-tools/load'),
    loadSchemaSync = _require.loadSchemaSync;

var _require2 = require('graphql'),
    graphql = _require2.graphql;

var _require3 = require('@graphql-tools/graphql-file-loader'),
    GraphQLFileLoader = _require3.GraphQLFileLoader;

var _require4 = require('@graphql-tools/mock'),
    addMocksToSchema = _require4.addMocksToSchema;

var GraphQL = function GraphQL(_ref) {
  var schemaPath = _ref.schemaPath;

  var schema = loadSchemaSync(schemaPath, {
    loaders: [new GraphQLFileLoader()]
  });
  var preserveResolvers = false;

  var wrapper = function wrapper(mocks) {
    return function (req, res, next) {
      var schemaWithMocks = addMocksToSchema({ schema: schema, mocks: mocks, preserveResolvers: preserveResolvers });
      graphql(schemaWithMocks, req.body.query, undefined, undefined, req.body.variables).then(function (result) {
        res.json(result);
      }).catch(next);
    };
  };
  wrapper.isGraphQLEndpoint = function () {
    return true;
  };
  return wrapper;
};

module.exports = { GraphQL: GraphQL };