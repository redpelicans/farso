const { loadSchemaSync } = require('@graphql-tools/load');
const { graphql } = require('graphql');
const { GraphQLFileLoader } = require('@graphql-tools/graphql-file-loader');
const { addMocksToSchema } = require('@graphql-tools/mock');

const GraphQL = ({ schemaPath }) => {
  const schema = loadSchemaSync(schemaPath, {
    loaders: [
      new GraphQLFileLoader(),
    ]
  });
  const preserveResolvers = false;

  const wrapper = mocks => {
    return (req, res, next) => {
      const schemaWithMocks = addMocksToSchema({ schema, mocks, preserveResolvers });
      graphql(schemaWithMocks, req.body.query, undefined, undefined, req.body.variables)
        .then(result => {
          res.json(result)
        })
        .catch(next);
    }
  };
  wrapper.isGraphQLEndpoint = () => true;
  return wrapper;
};

module.exports = { GraphQL };
