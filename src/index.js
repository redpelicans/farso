const {
  concat,
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
const { GraphQL} = require('./graphql');

class LocalGetter {
  constructor(fn, farso) {
    this.fn = fn;
    this.farso = farso;
  }

  equals(v) {
    return this.value === v;
  }

  get value() {
    const locals = pathOr({}, ['currentVibe', 'locals'], this.farso);
    if (isFunction(this.fn)) return this.fn(locals);
    if (isArray(this.fn)) return path(this.fn, locals);
    return path([this.fn], locals);
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
      else if (isFunction(value)) return acc && value(obj[key]);
      else if (isArray(value)) return Boolean(acc && obj[key] && deepMatch(value, obj[key]));
      else if (isObject(value)) return Boolean(acc && obj[key] && deepMatch(value, obj[key]));
      return acc && value === obj[key];
    }, true),
    toPairs,
  )(spec);
});

class Endpoint {
  constructor({ name, uri, method, reply, use }) {
    if (!name) throw new Error("Endpoint's name is mandatory!");
    if (!uri) throw new Error(`Endpoint['${name}']'s uri is mandatory!`);
    if (!method && !use) throw new Error(`Endpoint['${method}']'s method is mandatory!`);
    this.name = name;
    this.uri = uri;
    if (method) this.method = method.toLowerCase();
    this.use = use;
    this.reply = reply;
  }

  isGraphQLEndpoint(){
    return this.use && this.use.isGraphQLEndpoint();
  }

  getLabel(vibe) {
    return vibe ? `${vibe.name}@${this.name}:${this.uri}` : `${this.name}:${this.uri}`;
  }
}

class BaseMock {
  constructor(name, description) {
    this.name = name;
    this.description = description;
    this.doReply = null;
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
}

class GQLMock extends BaseMock{
  constructor(name, description, endpoint) {
    super(name, description);
    this.endpoint = endpoint;
  }

  isChecked(req) {
    return true;
  }

  resolve(mocks){
    this.doReply = this.endpoint.use(mocks);
  }

}

class HTTPMock extends BaseMock{
  constructor(name, description) {
    super(name, description);
    this.bodyChecks = [];
    this.headerChecks = [];
    this.queryChecks = [];
    this.paramsChecks = [];
  }

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
      this.paramsChecks.push(deepMatch(param));
    }
    return this;
  }

  checkQuery(param) {
    if (isFunction(param)) this.queryChecks.push(param);
    else {
      this.queryChecks.push(deepMatch(param));
    }
    return this;
  }

  checkHeader(param) {
    if (isFunction(param)) this.headerChecks.push(param);
    else {
      const newParam = compose(fromPairs, map(([key, value]) => [key.toLowerCase(), value]), toPairs)(param);
      this.headerChecks.push(deepMatch(newParam));
    }
    return this;
  }

  doCheckHeaders(req) {
    return allPass(this.headerChecks)(req.headers);
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
  return vibe.addMock(endpoint.isGraphQLEndpoint() ? new GQLMock(name, description, endpoint): new HTTPMock(name, description));
};

class Vibe {
  constructor(name, farso, { isDefault } = {}) {
    this.name = name;
    this.farso = farso;
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
    return this.farso.getEndpoint(name);
  }

  getMocks(name) {
    return this.mocks[name] || [];
  }
}

const getEligibleMock = (farso, endpoint) => (req, res, next) => {
  const [currentVibe, defaultVibe] = [farso.currentVibe, farso.getDefaultVibe()];
  if (!currentVibe) return next('route');
  const mocks = concat(
    (currentVibe && currentVibe.getMocks(endpoint.name)) || [],
    (defaultVibe && defaultVibe.getMocks(endpoint.name)) || [],
  );
  req.mock = find(mock => mock.isChecked(req))(mocks);
  if (!req.mock) return res.sendStatus(farso.config.errorCode || 500);
  currentVibe.setLocals(req.mock.doAssocs(currentVibe.locals, req));
  next();
};

const localGetter = farso => fn => new LocalGetter(fn, farso);
const localGetterValue = farso => fn => {
  const getter = localGetter(farso)(fn);
  return getter && getter.value;
};

class Farso extends EventEmitter {
  constructor({ router, endpoints, vibes, globals, errorCode }) {
    super();
    this.router = router;
    this.config = { endpoints, vibes, errorCode };
    this.globals = globals;
    this.currentVibe = null;
    this.vibes = {};
    this.endpoints = {};
  }

  registerEndpoint(endpoint) {
    if (endpoint.isGraphQLEndpoint()) {
      this.router.use(endpoint.uri, getEligibleMock(this, endpoint), (req, res, next) => {
        this.emit('endpoint.selected', this.currentVibe, endpoint, req);
        const mockFn = req.mock.doReply;
        if (!mockFn) return next('route');
        mockFn(req, res);
        this.emit('mock.visited', req.mock);
      });
    }
    else if (endpoint.use) this.router.use(endpoint.uri, endpoint.use);
    else {
      this.router[endpoint.method](endpoint.uri, getEligibleMock(this, endpoint), (req, res, next) => {
        this.emit('endpoint.selected', this.currentVibe, endpoint, req);
        const mockFn = (req.mock && req.mock.doReply) || endpoint.reply;
        if (!mockFn) return next('route');
        mockFn(req, res);
        this.emit('mock.visited', req.mock);
      });
    }
    this.emit('endpoint.added', endpoint);
    return this;
  }

  registerEndpoints() {
    compose(forEach(endpoint => this.registerEndpoint(endpoint)), values)(this.endpoints);
    const error = (err, req, res, next) => {
      if (!err) return next();
      console.error(err.stack); // eslint-disable-line no-console
      return res.sendStatus(500);
    };
    this.router.use(error);
    return this;
  }

  createEndpoint(name, config) {
    if (this.endpoints[name]) throw new Error(`Endpoint ${name} is already defined!`);
    this.endpoints[name] = new Endpoint({ name, ...config });
    return this;
  }

  createVibe(name, fn, params) {
    const vibe = this.vibes[name] || new Vibe(name, this, params);
    this.emit(this.vibes[name] ? 'vibe.updating' : 'vibe.adding', vibe);
    this.vibes[name] = vibe;
    if (vibe.isDefault) this.currentVibe = vibe;
    fn(mockMaker(vibe), { lvalue: localGetterValue(this), lget: localGetter(this), globals: this.globals });
    return this;
  }

  getEndpoint(name) {
    return this.endpoints[name];
  }

  getDefaultVibe() {
    return compose(find(prop('isDefault')), values)(this.vibes);
  }

  getVibe(name) {
    return this.vibes[name];
  }

  loadConfig() {
    const endpointFiles = glob.sync(path(['config', 'endpoints'], this));
    endpointFiles.forEach(file => require(file));
    const farsoFiles = glob.sync(path(['config', 'vibes'], this));
    farsoFiles.forEach(file => require(file));
    return this;
  }

  select(name) {
    const vibe = this.getVibe(name);
    if (!vibe) throw new Error(`Unkown vibe '${name}'`);
    this.currentVibe = vibe;
    this.emit('vibe.selected', vibe);
    return this;
  }

  start(name) {
    this.registerEndpoints();
    const vibe = name ? this.vibes[name] : this.getDefaultVibe();
    if (!vibe && !name) throw new Error('Unkown default vibe');
    if (!vibe && name) throw new Error(`Unkown vibe '${name}'`);
    this.currentVibe = vibe;
    this.emit('vibe.selected', vibe);
    return this;
  }

  listVibes() {
    return values(this.vibes);
  }
}

let farso;
module.exports = config => (farso = new Farso({ ...config, router: express() }));
module.exports.vibe = (name, fn, isDefault) => farso.createVibe(name, fn, { isDefault });
module.exports.vibe.default = (name, fn) => module.exports.vibe(name, fn, true);
module.exports.endpoint = (name, config) => farso.createEndpoint(name, config);
module.exports.deepMatch = deepMatch;
