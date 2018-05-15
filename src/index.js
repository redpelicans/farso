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

class LocalGetter {
  constructor(fn, vibe) {
    this.fn = fn;
    this.vibe = vibe;
  }

  equals(v) {
    console.log(this.getValue(), v, this);
    return this.getValue() === v;
  }

  getValue() {
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
    console.log('Body', this.doCheckBody(req));
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
  defaultVibe.setLocals(req.mock.doAssocs(defaultVibe.locals, req));
  next();
};

const localGetter = vibe => fn => new LocalGetter(fn, vibe);

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
    if (endpoint.use) this.router.use(endpoint.uri, endpoint.use);
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
    fn(mockMaker(vibe), { lget: localGetter(vibe), globals: this.globals });
    return this;
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
    return this;
  }

  loadConfig() {
    const endpointFiles = glob.sync(path(['config', 'endpoints'], this));
    endpointFiles.forEach(file => require(file));
    const farsoFiles = glob.sync(path(['config', 'vibes'], this));
    farsoFiles.forEach(file => require(file));
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
