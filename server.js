#!/usr/bin/env node

const program = require('commander');
const path = require('path');
const { compose, pluck } = require('ramda');
const cors = require('cors');
const express = require('express');
const debug = require('debug');
const logger = require('morgan-debug');
const Trip = require('.');
const loginfo = debug('trip');
const DEFAULT_CONFIG = './trip.config.js';

program.option('-c, --config <path>', 'set config path').parse(process.argv);
const config = require(path.join(process.cwd(), program.config || DEFAULT_CONFIG));
const listVibes = trip => (req, res) =>
  res.send({
    currentVibe: trip.currentVibe && trip.currentVibe.name,
    vibes: compose(pluck('name'))(trip.listVibes()),
  });

const selectVibe = trip => (req, res) => {
  const { vibe } = req.params;
  trip.select(vibe);
  res.send({ currentVibe: trip.currentVibe.name });
};

const initServer = (host, port) => ctx => {
  return new Promise((resolve, reject) => {
    const { trip } = ctx;
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

const initTrip = ({ endpoints, trips, globals }) => {
  const trip = Trip({
    endpoints,
    trips,
    globals,
  });
  trip.on('mock.error', ({ message, data }) => {
    loginfo(message);
    console.log(data); // eslint-disable-line no-console
  });
  trip.on('endpoint.selected', (vibe, endpoint) => loginfo(`Endpoint '${endpoint.getLabel(vibe)}' selected`));
  trip.on('mock.satisfied', mock => loginfo(`Mock '${mock.getLabel()}' visited`));
  trip.on('endpoint.added', endpoint => loginfo(`Endpoint '${endpoint.getLabel()}' created`));
  trip.on('vibe.added', vibe => loginfo(`Vibe '${vibe.name}' created`));
  trip.on('vibe.selected', vibe => loginfo(`Vibe '${vibe.name}' is now active`));
  return Promise.resolve({ trip });
};

if (require.main === module) {
  initTrip(config)
    .then(initServer(config.host, config.port))
    .then(({ trip, server: { url } }) => {
      trip.start();
      loginfo(`started on '${url}'`);
    })
    .catch(console.error); // eslint-disable-line no-console
}

module.exports = { initTrip, initServer };
