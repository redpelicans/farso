const {
  identity,
  has,
  equals,
  is,
  path,
  pathOr,
  forEach,
  find,
  prop,
  values,
  compose,
  all,
  map,
  toPairs,
  fromPairs,
} = require('ramda');
const express = require('express');
const glob = require('glob');
const EventEmitter = require('events');

const isFunction = is(Function);
const isRegExp = is(RegExp);
const isArray = is(Array);

class Endpoint {
  constructor({ name, uri, method, reply }) {
    if (!name) throw new Error("Endpoint's name is mandatory!");
    if (!uri) throw new Error(`Endpoint['${name}']'s uri is mandatory!`);
    if (!method) throw new Error(`Endpoint['${method}']'s method is mandatory!`);
    this.name = name;
    this.uri = uri;
    this.method = method.toLowerCase();
    this.reply = reply;
  }

  getLabel(vibe) {
    return vibe ? `${vibe.name}@${this.name}:${this.uri}` : `${this.name}:${this.uri}`;
  }
}

class Mock {
  constructor(name) {
    this.name = name;
    this.checkBodies = [];
    this.checkHeaders = [];
    this.checkQueries = [];
  }

  replyError(param) {
    if (isFunction(param)) this.doError = param;
    else
      this.doError = res => {
        res.sendStatus(param);
      };
    return this;
  }

  checkBody(param) {
    if (isFunction(param)) this.checkBodies.push(param);
    else {
      const checkProp = body => ([key, value]) =>
        has(key, body) && isRegExp(value) ? value.test(body[key]) : equals(body[key], value);
      this.checkBodies.push(body => compose(all(identity), map(checkProp(body)), toPairs)(param));
    }
    return this;
  }

  checkQuery(param) {
    if (isFunction(param)) this.checkQueries.push(param);
    else {
      const checkProp = query => ([key, value]) =>
        has(key, query) && isRegExp(value) ? value.test(query[key]) : equals(query[key], value);
      this.checkQueries.push(query => compose(all(identity), map(checkProp(query)), toPairs)(param));
    }
    return this;
  }

  checkHeader(param) {
    if (isFunction(param)) this.checkHeaders.push(param);
    else {
      const checkProp = header => ([key, value]) =>
        has(key, header) && isRegExp(value) ? value.test(header[key]) : equals(header[key], value);
      this.checkHeaders.push(header =>
        compose(all(identity), map(checkProp(header)), map(([key, value]) => [key.toLowerCase(), value]), toPairs)(
          param,
        ),
      );
    }
    return this;
  }

  reply(param) {
    if (isFunction(param)) this.doReply = param;
    else if (isArray(param)) this.doReply = (req, res) => res.status(param[0]).send(param[1]);
    else this.doReply = (req, res) => res.sendStatus(param);
    return this;
  }
}

const mockMaker = vibe => name => {
  const endpoint = vibe.getEndpoint(name);
  if (!endpoint) throw new Error(`Unkown endpoint '${name}' for vibe '${vibe.name}'`);
  return vibe.addMock(new Mock(name));
};

class Vibe {
  constructor(name, trip, { isDefault }) {
    this.name = name;
    this.trip = trip;
    this.isDefault = isDefault;
    this.mocks = {};
  }

  addMock(mock) {
    this.mocks[mock.name] = mock;
    return mock;
  }

  getEndpoint(name) {
    return this.trip.getEndpoint(name);
  }

  getMock(name) {
    return this.mocks[name];
  }
}

const checkQueries = trip => (req, res, next) => {
  const {
    query,
    mock: { name, doError, checkQueries },
  } = req; // eslint-disable-line no-shadow
  const oneFailed = find(check => !check(query))(checkQueries);
  if (!oneFailed) return next();
  trip.emit('mock.error', { message: `check query failed for mock '${name}'`, data: query });
  doError ? doError(res) : res.sendStatus(500); // eslint-disable-line no-unused-expressions
};

const checkBodies = trip => (req, res, next) => {
  const {
    body,
    mock: { name, doError, checkBodies },
  } = req; // eslint-disable-line no-shadow
  const oneFailed = find(check => !check(body))(checkBodies);
  if (!oneFailed) return next();
  trip.emit('mock.error', { message: `check body failed for mock '${name}'`, data: body });
  doError ? doError(res) : res.sendStatus(500); // eslint-disable-line no-unused-expressions
};

const checkHeaders = trip => (req, res, next) => {
  const {
    headers,
    mock: { name, doError, checkHeaders },
  } = req; // eslint-disable-line no-shadow
  const oneFailed = find(check => !check(headers))(checkHeaders);
  if (!oneFailed) return next();
  trip.emit('mock.error', { message: `check header failed for mock '${name}'`, data: headers });
  doError ? doError(res) : res.sendStatus(500); // eslint-disable-line no-unused-expressions
};

const getContext = (trip, endpoint) => (req, res, next) => {
  req.vibe = trip.currentVibe;
  if (!req.vibe) return next('route');
  req.mock = req.vibe.getMock(endpoint.name);
  next();
};

class Trip extends EventEmitter {
  constructor({ router, endpoints, trips, globals }) {
    super();
    this.router = router;
    this.config = { endpoints, trips };
    this.globals = globals;
    this.currentVibe = null;
    this.vibes = {};
    this.endpoints = {};
  }

  registerEndpoint(endpoint) {
    const middlewares = [getContext(this, endpoint), checkHeaders(this), checkQueries(this), checkBodies(this)];

    this.router[endpoint.method](endpoint.uri, middlewares, (req, res, next) => {
      const mockFn = (req.mock && req.mock.doReply) || endpoint.reply;
      if (!mockFn) return next('route');
      mockFn(req, res);
      this.emit('endpoint.satisfied', this.currentVibe, endpoint);
    });
    this.emit('endpoint.added', endpoint);
  }

  registerEndpoints() {
    compose(forEach(endpoint => this.registerEndpoint(endpoint)), values)(this.endpoints);
  }

  createEndpoint(name, config) {
    if (this.endpoints[name]) throw new Error(`Endpoint ${name} is already defined!`);
    this.endpoints[name] = new Endpoint({ name, ...config });
  }

  createVibe(name, fn, params) {
    const vibe = this.vibes[name] || new Vibe(name, this, params);
    this.vibes[name] = vibe;
    fn(mockMaker(vibe), this.globals);
  }

  getEndpoint(name) {
    return this.endpoints[name];
  }

  getDefaultVibe() {
    return compose(find(prop('isDefault')), values)(this.vibes);
  }

  select(name) {
    const vibe = this.vibes[name];
    if (!vibe) throw new Error(`Unkown vibe '${name}'`);
    this.currentVibe = vibe;
    this.emit('vibe.selected', vibe);
  }

  start(name) {
    const endpointFiles = glob.sync(path(['config', 'endpoints'], this));
    endpointFiles.forEach(file => require(file));
    const tripFiles = glob.sync(path(['config', 'trips'], this));
    tripFiles.forEach(file => require(file));
    this.registerEndpoints();
    const vibe = name ? this.vibes[name] : this.getDefaultVibe();
    if (!vibe && !name) throw new Error('Unkown default vibe');
    if (!vibe && name) throw new Error(`Unkown vibe '${name}'`);
    this.currentVibe = vibe;
    this.emit('vibe.selected', vibe);
  }

  listVibes() {
    return values(this.vibes);
  }
}

let trips;
const trip = config => (trips = new Trip({ ...config, router: express() }));
trip.vibe = (name, fn, isDefault) => trips.createVibe(name, fn, { isDefault });
trip.vibe.default = (name, fn) => trip.vibe(name, fn, true);
trip.endpoint = (name, config) => trips.createEndpoint(name, config);

module.exports = trip;
