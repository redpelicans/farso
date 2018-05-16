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

var _slicedToArray = (function() {
  function sliceIterator(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;
    try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);
        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i['return']) _i['return']();
      } finally {
        if (_d) throw _e;
      }
    }
    return _arr;
  }
  return function(arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (Symbol.iterator in Object(arr)) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError('Invalid attempt to destructure non-iterable instance');
    }
  };
})();

var _createClass = (function() {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ('value' in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }
  return function(Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
})();

function _possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }
  return call && (typeof call === 'object' || typeof call === 'function') ? call : self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== 'function' && superClass !== null) {
    throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass);
  }
  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: { value: subClass, enumerable: false, writable: true, configurable: true },
  });
  if (superClass)
    Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : (subClass.__proto__ = superClass);
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError('Cannot call a class as a function');
  }
}

var _require = require('ramda'),
  concat = _require.concat,
  assocPath = _require.assocPath,
  reduce = _require.reduce,
  forEach = _require.forEach,
  bind = _require.bind,
  identity = _require.identity,
  has = _require.has,
  equals = _require.equals,
  is = _require.is,
  path = _require.path,
  pathOr = _require.pathOr,
  find = _require.find,
  prop = _require.prop,
  values = _require.values,
  compose = _require.compose,
  all = _require.all,
  allPass = _require.allPass,
  map = _require.map,
  toPairs = _require.toPairs,
  fromPairs = _require.fromPairs,
  curry = _require.curry;

var express = require('express');
var glob = require('glob');
var EventEmitter = require('events');

var LocalGetter = (function() {
  function LocalGetter(fn, farso) {
    _classCallCheck(this, LocalGetter);

    this.fn = fn;
    this.farso = farso;
  }

  _createClass(LocalGetter, [
    {
      key: 'equals',
      value: function equals(v) {
        return this.value === v;
      },
    },
    {
      key: 'value',
      get: function get() {
        var locals = pathOr({}, ['currentVibe', 'locals'], this.farso);
        if (isFunction(this.fn)) return this.fn(locals);
        if (isArray(this.fn)) return path(this.fn, locals);
        return path([this.fn], locals);
      },
    },
  ]);

  return LocalGetter;
})();

var isFunction = is(Function);
var isRegExp = is(RegExp);
var isArray = is(Array);
var isObject = is(Object);
var isLocalGetter = is(LocalGetter);

var deepMatch = curry(function(spec, obj) {
  return compose(
    reduce(function(acc, _ref) {
      var _ref2 = _slicedToArray(_ref, 2),
        key = _ref2[0],
        value = _ref2[1];

      if (value.equals && isFunction(value.equals)) return acc && value.equals(obj[key]);
      else if (isRegExp(value)) return acc && value.test(obj[key]);
      else if (isArray(value)) return Boolean(acc && obj[key] && deepMatch(value, obj[key]));
      else if (isObject(value)) return Boolean(acc && obj[key] && deepMatch(value, obj[key]));
      return acc && value === obj[key];
    }, true),
    toPairs,
  )(spec);
});

var Endpoint = (function() {
  function Endpoint(_ref3) {
    var name = _ref3.name,
      uri = _ref3.uri,
      method = _ref3.method,
      reply = _ref3.reply,
      use = _ref3.use;

    _classCallCheck(this, Endpoint);

    if (!name) throw new Error("Endpoint's name is mandatory!");
    if (!uri) throw new Error("Endpoint['" + name + "']'s uri is mandatory!");
    if (!method && !use) throw new Error("Endpoint['" + method + "']'s method is mandatory!");
    this.name = name;
    this.uri = uri;
    if (method) this.method = method.toLowerCase();
    this.use = use;
    this.reply = reply;
  }

  _createClass(Endpoint, [
    {
      key: 'getLabel',
      value: function getLabel(vibe) {
        return vibe ? vibe.name + '@' + this.name + ':' + this.uri : this.name + ':' + this.uri;
      },
    },
  ]);

  return Endpoint;
})();

var Mock = (function() {
  function Mock(name, description) {
    _classCallCheck(this, Mock);

    this.name = name;
    this.description = description;
    this.doReply = null;
    this.bodyChecks = [];
    this.headerChecks = [];
    this.queryChecks = [];
    this.paramsChecks = [];
    this.setters = [];
  }

  _createClass(Mock, [
    {
      key: 'lset',
      value: function lset(fn) {
        this.setters.push(fn);
        return this;
      },
    },
    {
      key: 'doAssocs',
      value: function doAssocs(locals, req) {
        return reduce(
          function(acc, fn) {
            var _fn = fn(req),
              _fn2 = _slicedToArray(_fn, 2),
              path = _fn2[0],
              value = _fn2[1];

            return assocPath(path, value, acc);
          },
          locals,
          this.setters,
        );
      },
    },
    {
      key: 'getLabel',
      value: function getLabel() {
        return this.description || this.name;
      },

      // replyError(param) {
      //   if (isFunction(param)) this.doError = param;
      //   else
      //     this.doError = res => {
      //       res.sendStatus(param);
      //     };
      //   return this;
      // }
    },
    {
      key: 'checkBody',
      value: function checkBody(param) {
        if (isFunction(param)) this.bodyChecks.push(param);
        else {
          this.bodyChecks.push(deepMatch(param));
        }
        return this;
      },
    },
    {
      key: 'checkParams',
      value: function checkParams(param) {
        if (isFunction(param)) this.paramsChecks.push(param);
        else {
          var checkProp = function checkProp(query) {
            return function(_ref4) {
              var _ref5 = _slicedToArray(_ref4, 2),
                key = _ref5[0],
                value = _ref5[1];

              return has(key, query) && isRegExp(value) ? value.test(query[key]) : equals(query[key], value);
            };
          };
          this.paramsChecks.push(function(query) {
            return compose(all(identity), map(checkProp(query)), toPairs)(param);
          });
        }
        return this;
      },
    },
    {
      key: 'checkQuery',
      value: function checkQuery(param) {
        if (isFunction(param)) this.queryChecks.push(param);
        else {
          var checkProp = function checkProp(query) {
            return function(_ref6) {
              var _ref7 = _slicedToArray(_ref6, 2),
                key = _ref7[0],
                value = _ref7[1];

              return has(key, query) && isRegExp(value) ? value.test(query[key]) : equals(query[key], value);
            };
          };
          this.queryChecks.push(function(query) {
            return compose(all(identity), map(checkProp(query)), toPairs)(param);
          });
        }
        return this;
      },
    },
    {
      key: 'checkHeader',
      value: function checkHeader(param) {
        if (isFunction(param)) this.headerChecks.push(param);
        else {
          var checkProp = function checkProp(header) {
            return function(_ref8) {
              var _ref9 = _slicedToArray(_ref8, 2),
                key = _ref9[0],
                value = _ref9[1];

              return has(key, header) && isRegExp(value) ? value.test(header[key]) : equals(header[key], value);
            };
          };
          this.headerChecks.push(function(header) {
            return compose(
              all(identity),
              map(checkProp(header)),
              map(function(_ref10) {
                var _ref11 = _slicedToArray(_ref10, 2),
                  key = _ref11[0],
                  value = _ref11[1];

                return [key.toLowerCase(), value];
              }),
              toPairs,
            )(param);
          });
        }
        return this;
      },
    },
    {
      key: 'doCheckHeaders',
      value: function doCheckHeaders(req) {
        return allPass(this.headerChecks)(req.headers);
      },
    },
    {
      key: 'doCheckParams',
      value: function doCheckParams(req) {
        return allPass(this.paramsChecks)(req.params);
      },
    },
    {
      key: 'doCheckQuery',
      value: function doCheckQuery(req) {
        return allPass(this.queryChecks)(req.query);
      },
    },
    {
      key: 'doCheckBody',
      value: function doCheckBody(req) {
        return allPass(this.bodyChecks)(req.body);
      },
    },
    {
      key: 'isChecked',
      value: function isChecked(req) {
        var checks = [
          this.doCheckHeaders.bind(this),
          this.doCheckParams.bind(this),
          this.doCheckQuery.bind(this),
          this.doCheckBody.bind(this),
        ];
        return allPass(checks)(req);
      },
    },
    {
      key: 'reply',
      value: function reply(param) {
        if (isFunction(param)) this.doReply = param;
        else if (isArray(param))
          this.doReply = function(req, res) {
            return res.status(param[0]).send(param[1]);
          };
        else
          this.doReply = function(req, res) {
            return res.sendStatus(param);
          };
        return this;
      },
    },
  ]);

  return Mock;
})();

var mockMaker = function mockMaker(vibe) {
  return function(name, description) {
    var endpoint = vibe.getEndpoint(name);
    if (!endpoint) throw new Error("Unkown endpoint '" + name + "' for vibe '" + vibe.name + "'");
    return vibe.addMock(new Mock(name, description));
  };
};

var Vibe = (function() {
  function Vibe(name, farso) {
    var _ref12 = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {},
      isDefault = _ref12.isDefault;

    _classCallCheck(this, Vibe);

    this.name = name;
    this.farso = farso;
    this.isDefault = isDefault;
    this.mocks = {};
    this.locals = {};
  }

  _createClass(Vibe, [
    {
      key: 'setLocals',
      value: function setLocals(locals) {
        this.locals = locals;
        return this;
      },
    },
    {
      key: 'addMock',
      value: function addMock(mock) {
        if (!this.mocks[mock.name]) this.mocks[mock.name] = [mock];
        else this.mocks[mock.name].push(mock);
        return mock;
      },
    },
    {
      key: 'getEndpoint',
      value: function getEndpoint(name) {
        return this.farso.getEndpoint(name);
      },
    },
    {
      key: 'getMocks',
      value: function getMocks(name) {
        return this.mocks[name] || [];
      },
    },
  ]);

  return Vibe;
})();

var getEligibleMock = function getEligibleMock(farso, endpoint) {
  return function(req, res, next) {
    var _ref13 = [farso.currentVibe, farso.getDefaultVibe()],
      currentVibe = _ref13[0],
      defaultVibe = _ref13[1];

    if (!currentVibe) return next('route');
    var mocks = concat(
      (currentVibe && currentVibe.getMocks(endpoint.name)) || [],
      (defaultVibe && defaultVibe.getMocks(endpoint.name)) || [],
    );
    req.mock = find(function(mock) {
      return mock.isChecked(req);
    })(mocks);
    if (!req.mock) return res.sendStatus(farso.config.errorCode || 500);
    currentVibe.setLocals(req.mock.doAssocs(currentVibe.locals, req));
    next();
  };
};

var localGetter = function localGetter(farso) {
  return function(fn) {
    return new LocalGetter(fn, farso);
  };
};
var localGetterValue = function localGetterValue(farso) {
  return function(fn) {
    var getter = localGetter(farso)(fn);
    return getter && getter.value;
  };
};

var Farso = (function(_EventEmitter) {
  _inherits(Farso, _EventEmitter);

  function Farso(_ref14) {
    var router = _ref14.router,
      endpoints = _ref14.endpoints,
      vibes = _ref14.vibes,
      globals = _ref14.globals,
      errorCode = _ref14.errorCode;

    _classCallCheck(this, Farso);

    var _this = _possibleConstructorReturn(this, (Farso.__proto__ || Object.getPrototypeOf(Farso)).call(this));

    _this.router = router;
    _this.config = { endpoints: endpoints, vibes: vibes, errorCode: errorCode };
    _this.globals = globals;
    _this.currentVibe = null;
    _this.vibes = {};
    _this.endpoints = {};
    return _this;
  }

  _createClass(Farso, [
    {
      key: 'registerEndpoint',
      value: function registerEndpoint(endpoint) {
        var _this2 = this;

        if (endpoint.use) this.router.use(endpoint.uri, endpoint.use);
        else {
          this.router[endpoint.method](endpoint.uri, getEligibleMock(this, endpoint), function(req, res, next) {
            _this2.emit('endpoint.selected', _this2.currentVibe, endpoint, req);
            var mockFn = (req.mock && req.mock.doReply) || endpoint.reply;
            if (!mockFn) return next('route');
            mockFn(req, res);
            _this2.emit('mock.visited', req.mock);
          });
        }
        this.emit('endpoint.added', endpoint);
        return this;
      },
    },
    {
      key: 'registerEndpoints',
      value: function registerEndpoints() {
        var _this3 = this;

        compose(
          forEach(function(endpoint) {
            return _this3.registerEndpoint(endpoint);
          }),
          values,
        )(this.endpoints);
        var error = function error(err, req, res, next) {
          if (!err) return next();
          console.error(err.stack); // eslint-disable-line no-console
          return res.sendStatus(500);
        };
        this.router.use(error);
        return this;
      },
    },
    {
      key: 'createEndpoint',
      value: function createEndpoint(name, config) {
        if (this.endpoints[name]) throw new Error('Endpoint ' + name + ' is already defined!');
        this.endpoints[name] = new Endpoint(_extends({ name: name }, config));
        return this;
      },
    },
    {
      key: 'createVibe',
      value: function createVibe(name, fn, params) {
        var vibe = this.vibes[name] || new Vibe(name, this, params);
        this.emit(this.vibes[name] ? 'vibe.updating' : 'vibe.adding', vibe);
        this.vibes[name] = vibe;
        if (vibe.isDefault) this.currentVibe = vibe;
        fn(mockMaker(vibe), { lvalue: localGetterValue(this), lget: localGetter(this), globals: this.globals });
        return this;
      },
    },
    {
      key: 'getEndpoint',
      value: function getEndpoint(name) {
        return this.endpoints[name];
      },
    },
    {
      key: 'getDefaultVibe',
      value: function getDefaultVibe() {
        return compose(find(prop('isDefault')), values)(this.vibes);
      },
    },
    {
      key: 'getVibe',
      value: function getVibe(name) {
        return this.vibes[name];
      },
    },
    {
      key: 'loadConfig',
      value: function loadConfig() {
        var endpointFiles = glob.sync(path(['config', 'endpoints'], this));
        endpointFiles.forEach(function(file) {
          return require(file);
        });
        var farsoFiles = glob.sync(path(['config', 'vibes'], this));
        farsoFiles.forEach(function(file) {
          return require(file);
        });
        return this;
      },
    },
    {
      key: 'select',
      value: function select(name) {
        var vibe = this.getVibe(name);
        if (!vibe) throw new Error("Unkown vibe '" + name + "'");
        this.currentVibe = vibe;
        this.emit('vibe.selected', vibe);
        return this;
      },
    },
    {
      key: 'start',
      value: function start(name) {
        this.registerEndpoints();
        var vibe = name ? this.vibes[name] : this.getDefaultVibe();
        if (!vibe && !name) throw new Error('Unkown default vibe');
        if (!vibe && name) throw new Error("Unkown vibe '" + name + "'");
        this.currentVibe = vibe;
        this.emit('vibe.selected', vibe);
        return this;
      },
    },
    {
      key: 'listVibes',
      value: function listVibes() {
        return values(this.vibes);
      },
    },
  ]);

  return Farso;
})(EventEmitter);

var farso = void 0;
module.exports = function(config) {
  return (farso = new Farso(_extends({}, config, { router: express() })));
};
module.exports.vibe = function(name, fn, isDefault) {
  return farso.createVibe(name, fn, { isDefault: isDefault });
};
module.exports.vibe.default = function(name, fn) {
  return module.exports.vibe(name, fn, true);
};
module.exports.endpoint = function(name, config) {
  return farso.createEndpoint(name, config);
};
module.exports.deepMatch = deepMatch;
