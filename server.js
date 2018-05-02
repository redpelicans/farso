#!/usr/bin/env node
'use strict';

var _extends =
  Object.assign ||
  function(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };

var program = require('commander');
var path = require('path');

var _require = require('ramda'),
  compose = _require.compose,
  pluck = _require.pluck;

var cors = require('cors');
var express = require('express');
var debug = require('debug');
var logger = require('morgan-debug');
var Trip = require('.');
var loginfo = debug('trip');
var DEFAULT_CONFIG = './trip.config.js';

var listVibes = function listVibes(trip) {
  return function(req, res) {
    return res.send({
      currentVibe: trip.currentVibe && trip.currentVibe.name,
      vibes: compose(pluck('name'))(trip.listVibes()),
    });
  };
};

var selectVibe = function selectVibe(trip) {
  return function(req, res) {
    var vibe = req.params.vibe;

    trip.select(vibe);
    res.send({ currentVibe: trip.currentVibe.name });
  };
};

var adminPath = '/_vibes_';

var initServer = function initServer(ctx) {
  var _ctx$host = ctx.host,
    host = _ctx$host === undefined ? 'localhost' : _ctx$host,
    port = ctx.port,
    trip = ctx.trip;

  return new Promise(function(resolve, reject) {
    var app = express();
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded());
    app.get(adminPath + '/:vibe', selectVibe(trip));
    app.get(adminPath, listVibes(trip));
    app.use(logger('trip', 'dev'));
    app.use(trip.router);
    var srv = app.listen(port, host, function(err) {
      if (err) return reject(err);

      var _srv$address = srv.address(),
        sport = _srv$address.port;

      srv.url = 'http://' + host + ':' + sport;
      loginfo("server started on '" + srv.url + "'");
      loginfo("check vibes here: '" + srv.url + adminPath + "'");
      return resolve(_extends({}, ctx, { server: srv }));
    });
  });
};

var initTrip = function initTrip(ctx) {
  var endpoints = ctx.endpoints,
    vibes = ctx.vibes,
    globals = ctx.globals;

  var trip = Trip({
    endpoints: endpoints,
    vibes: vibes,
    globals: globals,
  });
  trip.on('mock.error', function(_ref) {
    var message = _ref.message,
      data = _ref.data;

    loginfo(message);
    console.log(data); // eslint-disable-line no-console
  });
  trip.on('endpoint.selected', function(vibe, endpoint) {
    return loginfo("Endpoint '" + endpoint.getLabel(vibe) + "' selected");
  });
  trip.on('mock.visited', function(mock) {
    return loginfo("Mock '" + mock.getLabel() + "' visited");
  });
  trip.on('endpoint.added', function(endpoint) {
    return loginfo("Endpoint '" + endpoint.getLabel() + "' created");
  });
  trip.on('vibe.adding', function(vibe) {
    return loginfo("Adding Vibe '" + vibe.name + "'");
  });
  trip.on('vibe.updating', function(vibe) {
    return loginfo("Updating Vibe '" + vibe.name + "'");
  });
  trip.on('vibe.selected', function(vibe) {
    return loginfo("Vibe '" + vibe.name + "' is now active");
  });
  return Promise.resolve(_extends({}, ctx, { trip: trip }));
};

var runServer = function runServer(config) {
  return initTrip(config)
    .then(initServer)
    .then(function(ctx) {
      ctx.trip.loadConfig();
      ctx.trip.start();
      return ctx;
    });
};

if (require.main === module) {
  program.option('-c, --config <path>', 'set config path').parse(process.argv);
  var config = require(path.join(process.cwd(), program.config || DEFAULT_CONFIG));
  runServer(config).catch(console.error); // eslint-disable-line no-console
}

module.exports = { runServer: runServer, initTrip: initTrip, initServer: initServer };
