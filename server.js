#!/usr/bin/env node
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var program = require('commander');
var path = require('path');

var _require = require('ramda'),
    compose = _require.compose,
    pluck = _require.pluck;

var cors = require('cors');
var express = require('express');
var debug = require('debug');
var logger = require('morgan-debug');
var Farso = require('.');
var loginfo = debug('farso');
var DEFAULT_CONFIG = './farso.config.js';

var listVibes = function listVibes(farso) {
  return function (req, res) {
    return res.send({
      currentVibe: farso.currentVibe && farso.currentVibe.name,
      vibes: compose(pluck('name'))(farso.listVibes())
    });
  };
};

var selectVibe = function selectVibe(farso) {
  return function (req, res) {
    var vibe = req.params.vibe;

    farso.select(vibe);
    res.send({ currentVibe: farso.currentVibe.name });
  };
};

var adminPath = '/_vibes_';

var initServer = function initServer(ctx) {
  var _ctx$host = ctx.host,
      host = _ctx$host === undefined ? 'localhost' : _ctx$host,
      port = ctx.port,
      farso = ctx.farso,
      bodySizeLimit = ctx.bodySizeLimit;

  return new Promise(function (resolve, reject) {
    var app = express();
    app.use(cors());
    app.use(express.json({ limit: bodySizeLimit || '100kb' }));
    app.use(express.urlencoded());
    app.get(adminPath + '/:vibe', selectVibe(farso));
    app.get(adminPath, listVibes(farso));
    app.use(logger('farso', 'dev'));
    app.use(farso.router);
    var srv = app.listen(port, host, function (err) {
      if (err) return reject(err);

      var _srv$address = srv.address(),
          sport = _srv$address.port;

      srv.url = 'http://' + host + ':' + sport;
      loginfo('server started on \'' + srv.url + '\'');
      loginfo('check vibes here: \'' + srv.url + adminPath + '\'');
      return resolve(_extends({}, ctx, { server: srv }));
    });
  });
};

var initFarso = function initFarso(ctx) {
  var endpoints = ctx.endpoints,
      vibes = ctx.vibes,
      globals = ctx.globals;

  var farso = Farso({
    endpoints: endpoints,
    vibes: vibes,
    globals: globals
  });
  farso.on('mock.error', function (_ref) {
    var message = _ref.message,
        data = _ref.data;

    loginfo(message);
    console.log(data); // eslint-disable-line no-console
  });
  farso.on('endpoint.selected', function (vibe, endpoint) {
    return loginfo('Endpoint \'' + endpoint.getLabel(vibe) + '\' selected');
  });
  farso.on('mock.visited', function (mock) {
    return loginfo('Mock \'' + mock.getLabel() + '\' visited');
  });
  farso.on('endpoint.added', function (endpoint) {
    return loginfo('Endpoint \'' + endpoint.getLabel() + '\' created');
  });
  farso.on('vibe.adding', function (vibe) {
    return loginfo('Adding Vibe \'' + vibe.name + '\'');
  });
  farso.on('vibe.updating', function (vibe) {
    return loginfo('Updating Vibe \'' + vibe.name + '\'');
  });
  farso.on('vibe.selected', function (vibe) {
    return loginfo('Vibe \'' + vibe.name + '\' is now active');
  });
  return Promise.resolve(_extends({}, ctx, { farso: farso }));
};

var runServer = function runServer(config) {
  return initFarso(config).then(initServer).then(function (ctx) {
    ctx.farso.loadConfig();
    ctx.farso.start();
    return ctx;
  });
};

if (require.main === module) {
  program.option('-c, --config <path>', 'set config path').parse(process.argv);
  var config = require(path.join(process.cwd(), program.config || DEFAULT_CONFIG));
  runServer(config).catch(console.error); // eslint-disable-line no-console
}

module.exports = { runServer: runServer, initFarso: initFarso, initServer: initServer };