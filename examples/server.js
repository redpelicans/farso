const { compose, pluck } = require('ramda');
const path = require('path');
const cors = require('cors');
const express = require('express');
const debug = require('debug');
const logger = require('morgan-debug');
const faker = require('faker');
const Trip = require('..');
const endpoints = require('./endpoints');
const loginfo = debug('trip');

const listVibes = trip => (req, res) =>
  res.send({
    currentVibe: trip.currentVibe.name,
    vibes: compose(pluck('name'))(trip.listVibes()),
  });

const selectVibe = trip => (req, res) => {
  const { vibe } = req.params;
  trip.select(vibe);
  res.send({ currentVibe: trip.currentVibe.name });
};

const initServer = ctx => {
  return new Promise((resolve, reject) => {
    const { trip, config: { host, port } } = ctx;
    const app = express();
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded());
    app.get('/_trips_/:vibe', selectVibe(trip));
    app.get('/_trips_', listVibes(trip));
    app.use(logger('trip', 'dev'));
    app.use(trip.router);
    const srv = app.listen(port, host, err => {
      if (err) return reject(err);
      const { port: sport } = srv.address();
      srv.url = `http://${host}:${sport}`;
      return resolve({ ...ctx, server: srv });
    });
  });
};

const initConfig = () => Promise.resolve({ 
  config: {
    host: 'localhost',
    port: 8181,
    api: {
      clientId: faker.random.uuid(),
      clientSecret: faker.random.uuid(),
    }
  }
});

const initTrip = ctx => {
  const mock = Trip({
    path: path.join(__dirname, 'mocks/**/*.trip.js'),
    endpoints,
    config: ctx,
  });
  mock.on('mock.error', ({ message, data }) => {
    loginfo(message);
    console.log(data); // eslint-disable-line no-console
  });
  mock.on('endpoint.satisfied', (vibe, endpoint) => loginfo(`Endpoint '${endpoint.getLabel(vibe)}' satisfied`));
  mock.on('endpoint.added', endpoint => loginfo(`Endpoint '${endpoint.getLabel()}' created`));
  mock.on('vibe.selected', vibe => loginfo(`Vibe '${vibe.name}' is now active`));
  return Promise.resolve({ ...ctx, trip: mock });
};

if (require.main === module) {
  initConfig()
    .then(initTrip)
    .then(initServer)
    .then(({ server: { url } }) => loginfo(`started on '${url}'`))
    .catch(console.error); // eslint-disable-line no-console
};

module.exports = { initTrip, initServer };
