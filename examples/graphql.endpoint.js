const { join } = require('path');
const { endpoint } = require('../src');
const { GraphQL } = require('../src/graphql');
const schema = join(__dirname, './schema.graphql');

endpoint('graphql', { uri: '/graphql', use: GraphQL({ schemaPath: schema }) });
