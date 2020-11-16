#!/usr/bin/env node
'use strict';

function ownKeys(object, enumerableOnly) {
  var keys = Object.keys(object);
  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object);
    if (enumerableOnly)
      symbols = symbols.filter(function (sym) {
        return Object.getOwnPropertyDescriptor(object, sym).enumerable;
      });
    keys.push.apply(keys, symbols);
  }
  return keys;
}

function _objectSpread(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i] != null ? arguments[i] : {};
    if (i % 2) {
      ownKeys(Object(source), true).forEach(function (key) {
        _defineProperty(target, key, source[key]);
      });
    } else if (Object.getOwnPropertyDescriptors) {
      Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
    } else {
      ownKeys(Object(source)).forEach(function (key) {
        Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
      });
    }
  }
  return target;
}

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true });
  } else {
    obj[key] = value;
  }
  return obj;
}

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
      vibes: compose(pluck('name'))(farso.listVibes()),
    });
  };
};

var selectVibe = function selectVibe(farso) {
  return function (req, res) {
    var vibe = req.params.vibe;
    farso.select(vibe);
    res.send({
      currentVibe: farso.currentVibe.name,
    });
  };
};

var adminPath = '/_vibes_';

var initServer = function initServer(ctx) {
  var _ctx$host = ctx.host,
    host = _ctx$host === void 0 ? 'localhost' : _ctx$host,
    port = ctx.port,
    farso = ctx.farso,
    bodySizeLimit = ctx.bodySizeLimit;
  return new Promise(function (resolve, reject) {
    var app = express();
    app.use(cors());
    app.use(
      express.json({
        limit: bodySizeLimit || '100kb',
      }),
    );
    app.use(express.urlencoded());
    app.get(''.concat(adminPath, '/:vibe'), selectVibe(farso));
    app.get(adminPath, listVibes(farso));
    app.use(logger('farso', 'dev'));
    app.use(farso.router);
    var srv = app.listen(port, host, function (err) {
      if (err) return reject(err);

      var _srv$address = srv.address(),
        sport = _srv$address.port;

      srv.url = 'http://'.concat(host, ':').concat(sport);
      loginfo("server started on '".concat(srv.url, "'"));
      loginfo("check vibes here: '".concat(srv.url).concat(adminPath, "'"));
      return resolve(
        _objectSpread(
          _objectSpread({}, ctx),
          {},
          {
            server: srv,
          },
        ),
      );
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
    globals: globals,
  });
  farso.on('mock.error', function (_ref) {
    var message = _ref.message,
      data = _ref.data;
    loginfo(message);
    console.log(data); // eslint-disable-line no-console
  });
  farso.on('endpoint.selected', function (vibe, endpoint) {
    return loginfo("Endpoint '".concat(endpoint.getLabel(vibe), "' selected"));
  });
  farso.on('mock.visited', function (mock) {
    return loginfo("Mock '".concat(mock.getLabel(), "' visited"));
  });
  farso.on('endpoint.added', function (endpoint) {
    return loginfo("Endpoint '".concat(endpoint.getLabel(), "' created"));
  });
  farso.on('vibe.adding', function (vibe) {
    return loginfo("Adding Vibe '".concat(vibe.name, "'"));
  });
  farso.on('vibe.updating', function (vibe) {
    return loginfo("Updating Vibe '".concat(vibe.name, "'"));
  });
  farso.on('vibe.selected', function (vibe) {
    return loginfo("Vibe '".concat(vibe.name, "' is now active"));
  });
  return Promise.resolve(
    _objectSpread(
      _objectSpread({}, ctx),
      {},
      {
        farso: farso,
      },
    ),
  );
};

var runServer = function runServer(config) {
  return initFarso(config)
    .then(initServer)
    .then(function (ctx) {
      ctx.farso.loadConfig();
      ctx.farso.start();
      return ctx;
    });
};

if (require.main === module) {
  program.option('-c, --config <path>', 'set config path').parse(process.argv);

  var config = require(path.join(process.cwd(), program.config || DEFAULT_CONFIG));

  runServer(config)['catch'](console.error); // eslint-disable-line no-console
}

module.exports = {
  runServer: runServer,
  initFarso: initFarso,
  initServer: initServer,
};
