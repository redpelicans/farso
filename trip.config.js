const path = require('path');
const faker = require('faker');

module.exports = {
  host: 'localhost',
  port: 8181,
  trips: path.join(__dirname, './examples/**/*.trip.js'),
  endpoints: path.join(__dirname, './examples/endpoints.js'),
  globals: { 
    api: {
      clientId: faker.random.uuid(),
      clientSecret: faker.random.uuid(),
    }
  },
};
