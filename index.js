const {
  assocPath,
  reduce,
  forEach,
  bind,
  identity,
  has,
  equals,
  is,
  path,
  pathOr,
  find,
  prop,
  values,
  compose,
  all,
  allPass,
  map,
  toPairs,
  fromPairs,
  curry,
} = require('ramda');
const express = require('express');
const glob = require('glob');
const EventEmitter = require('events');

class LocalGetter {
  constructor(fn, vibe) {
    this.fn = fn;
    this.vibe = vibe;
  }

  equals(v) {
    return this.value === v;
  }

  get value() {
    return this.fn(this.vibe.locals);
  }
}

const isFunction = is(Function);
const isRegExp = is(RegExp);
const isArray = is(Array);
const isObject = is(Object);
const isLocalGetter = is(LocalGetter);

const deepMatch = curry((spec, obj) => {
  return compose(
    reduce((acc, [key, value]) => {
      if (value.equals && isFunction(value.equals)) return acc && value.equals(obj[key]);
      else if (isRegExp(value)) return acc && value.test(obj[key]);
      else if (isArray(value)) return Boolean(acc && obj[key] && deepMatch(value, obj[key]));
      else if (isObject(value)) return Boolean(acc && obj[key] && deepMatch(value, obj[key]));
      return acc && value === obj[key];
    }, true),
    toPairs,
  )(spec);
});

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
  constructor(name, description) {
    this.name = name;
    this.description = description;
    this.doReply = null;
    this.bodyChecks = [];
    this.headerChecks = [];
    this.queryChecks = [];
    this.paramsChecks = [];
    this.setters = [];
  }

  lset(fn) {
    this.setters.push(fn);
    return this;
  }

  doAssocs(locals, req) {
    return reduce(
      (acc, fn) => {
        const [path, value] = fn(req);
        return assocPath(path, value, acc);
      },
      locals,
      this.setters,
    );
  }

  getLabel() {
    return this.description || this.name;
  }

  // replyError(param) {
  //   if (isFunction(param)) this.doError = param;
  //   else
  //     this.doError = res => {
  //       res.sendStatus(param);
  //     };
  //   return this;
  // }

  checkBody(param) {
    if (isFunction(param)) this.bodyChecks.push(param);
    else {
      this.bodyChecks.push(deepMatch(param));
    }
    return this;
  }

  checkParams(param) {
    if (isFunction(param)) this.paramsChecks.push(param);
    else {
      const checkProp = query => ([key, value]) =>
        has(key, query) && isRegExp(value) ? value.test(query[key]) : equals(query[key], value);
      this.paramsChecks.push(query => compose(all(identity), map(checkProp(query)), toPairs)(param));
    }
    return this;
  }

  checkQuery(param) {
    if (isFunction(param)) this.queryChecks.push(param);
    else {
      const checkProp = query => ([key, value]) =>
        has(key, query) && isRegExp(value) ? value.test(query[key]) : equals(query[key], value);
      this.queryChecks.push(query => compose(all(identity), map(checkProp(query)), toPairs)(param));
    }
    return this;
  }

  checkHeader(param) {
    if (isFunction(param)) this.headerChecks.push(param);
    else {
      const checkProp = header => ([key, value]) =>
        has(key, header) && isRegExp(value) ? value.test(header[key]) : equals(header[key], value);
      this.headerChecks.push(header =>
        compose(all(identity), map(checkProp(header)), map(([key, value]) => [key.toLowerCase(), value]), toPairs)(
          param,
        ),
      );
    }
    return this;
  }

  doCheckHeaders(req) {
    return allPass(this.headerChecks, req.headers);
  }

  doCheckParams(req) {
    return allPass(this.paramsChecks)(req.params);
  }

  doCheckQuery(req) {
    return allPass(this.queryChecks)(req.query);
  }

  doCheckBody(req) {
    return allPass(this.bodyChecks)(req.body);
  }

  isChecked(req) {
    const checks = [
      this.doCheckHeaders.bind(this),
      this.doCheckParams.bind(this),
      this.doCheckQuery.bind(this),
      this.doCheckBody.bind(this),
    ];
    return allPass(checks)(req);
  }

  reply(param) {
    if (isFunction(param)) this.doReply = param;
    else if (isArray(param)) this.doReply = (req, res) => res.status(param[0]).send(param[1]);
    else this.doReply = (req, res) => res.sendStatus(param);
    return this;
  }
}

const mockMaker = vibe => (name, description) => {
  const endpoint = vibe.getEndpoint(name);
  if (!endpoint) throw new Error(`Unkown endpoint '${name}' for vibe '${vibe.name}'`);
  return vibe.addMock(new Mock(name, description));
};

class Vibe {
  constructor(name, trip, { isDefault }) {
    this.name = name;
    this.trip = trip;
    this.isDefault = isDefault;
    this.mocks = {};
    this.locals = {};
  }

  setLocals(locals) {
    this.locals = locals;
    return this;
  }

  addMock(mock) {
    if (!this.mocks[mock.name]) this.mocks[mock.name] = [mock];
    else this.mocks[mock.name].push(mock);
    return mock;
  }

  getEndpoint(name) {
    return this.trip.getEndpoint(name);
  }

  getMocks(name) {
    return this.mocks[name];
  }
}

const getEligibleMock = (trip, endpoint) => (req, res, next) => {
  req.vibe = trip.currentVibe;
  if (!req.vibe) return next('route');
  const mocks = req.vibe.getMocks(endpoint.name);
  req.mock = find(mock => mock.isChecked(req))(mocks);
  if (!req.mock) return res.sendStatus(500);
  req.vibe.setLocals(req.mock.doAssocs(req.vibe.locals, req));
  next();
};

const localGetter = vibe => fn => new LocalGetter(fn, vibe);

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
    this.router[endpoint.method](endpoint.uri, getEligibleMock(this, endpoint), (req, res, next) => {
      this.emit('endpoint.selected', this.currentVibe, endpoint, req);
      const mockFn = (req.mock && req.mock.doReply) || endpoint.reply;
      if (!mockFn) return next('route');
      mockFn(req, res);
      this.emit('mock.satisfied', req.mock);
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
    fn(mockMaker(vibe), { lget: localGetter(vibe), globals: this.globals });
    this.emit('vibe.added', vibe);
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
trip.deepMatch = deepMatch;

module.exports = trip;
