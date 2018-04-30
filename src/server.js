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

const adminPath = '/_trips_';

const initServer = ctx => {
  const { host = 'localhost', port, trip } = ctx;
  return new Promise((resolve, reject) => {
    const app = express();
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded());
    app.get(`${adminPath}/:vibe`, selectVibe(trip));
    app.get(adminPath, listVibes(trip));
    app.use(logger('trip', 'dev'));
    app.use(trip.router);
    const srv = app.listen(port, host, err => {
      if (err) return reject(err);
      const { port: sport } = srv.address();
      srv.url = `http://${host}:${sport}`;
      loginfo(`server started on '${srv.url}'`);
      loginfo(`check vibes here: '${srv.url}${adminPath}'`);
      return resolve({ ...ctx, server: srv });
    });
  });
};

const initTrip = ctx => {
  const { endpoints, trips, globals } = ctx;
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
  trip.on('mock.visited', mock => loginfo(`Mock '${mock.getLabel()}' visited`));
  trip.on('endpoint.added', endpoint => loginfo(`Endpoint '${endpoint.getLabel()}' created`));
  trip.on('vibe.adding', vibe => loginfo(`Adding Vibe '${vibe.name}'`));
  trip.on('vibe.updating', vibe => loginfo(`Updating Vibe '${vibe.name}'`));
  trip.on('vibe.selected', vibe => loginfo(`Vibe '${vibe.name}' is now active`));
  return Promise.resolve({ ...ctx, trip });
};

const runServer = config =>
  initTrip(config)
    .then(initServer)
    .then(ctx => {
      ctx.trip.start();
      return ctx;
    });

if (require.main === module) {
  program.option('-c, --config <path>', 'set config path').parse(process.argv);
  const config = require(path.join(process.cwd(), program.config || DEFAULT_CONFIG));
  runServer(config).catch(console.error); // eslint-disable-line no-console
}

module.exports = { runServer, initTrip, initServer };
