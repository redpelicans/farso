#!/usr/bin/env node

const program = require('commander');
const path = require('path');
const { compose, pluck } = require('ramda');
const cors = require('cors');
const express = require('express');
const debug = require('debug');
const logger = require('morgan-debug');
const Farso = require('.');
const loginfo = debug('farso');
const DEFAULT_CONFIG = './farso.config.js';

const listVibes = farso => (req, res) =>
  res.send({
    currentVibe: farso.currentVibe && farso.currentVibe.name,
    vibes: compose(pluck('name'))(farso.listVibes()),
  });

const selectVibe = farso => (req, res) => {
  const { vibe } = req.params;
  farso.select(vibe);
  res.send({ currentVibe: farso.currentVibe.name });
};

const adminPath = '/_vibes_';

const initServer = ctx => {
  const { host = 'localhost', port, farso, bodySizeLimit } = ctx;
  return new Promise((resolve, reject) => {
    const app = express();
    app.use(cors());
    app.use(express.json({ limit: bodySizeLimit || '100kb' }));
    app.use(express.urlencoded());
    app.get(`${adminPath}/:vibe`, selectVibe(farso));
    app.get(adminPath, listVibes(farso));
    app.use(logger('farso', 'dev'));
    app.use(farso.router);
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

const initFarso = ctx => {
  const { endpoints, vibes, globals } = ctx;
  const farso = Farso({
    endpoints,
    vibes,
    globals,
  });
  farso.on('mock.error', ({ message, data }) => {
    loginfo(message);
    console.log(data); // eslint-disable-line no-console
  });
  farso.on('endpoint.selected', (vibe, endpoint) => loginfo(`Endpoint '${endpoint.getLabel(vibe)}' selected`));
  farso.on('mock.visited', mock => loginfo(`Mock '${mock.getLabel()}' visited`));
  farso.on('endpoint.added', endpoint => loginfo(`Endpoint '${endpoint.getLabel()}' created`));
  farso.on('vibe.adding', vibe => loginfo(`Adding Vibe '${vibe.name}'`));
  farso.on('vibe.updating', vibe => loginfo(`Updating Vibe '${vibe.name}'`));
  farso.on('vibe.selected', vibe => loginfo(`Vibe '${vibe.name}' is now active`));
  return Promise.resolve({ ...ctx, farso });
};

const runServer = config =>
  initFarso(config)
    .then(initServer)
    .then(ctx => {
      ctx.farso.loadConfig();
      ctx.farso.start();
      return ctx;
    });

if (require.main === module) {
  program.option('-c, --config <path>', 'set config path').parse(process.argv);
  const config = require(path.join(process.cwd(), program.config || DEFAULT_CONFIG));
  runServer(config).catch(console.error); // eslint-disable-line no-console
}

module.exports = { runServer, initFarso, initServer };
