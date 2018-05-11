# farso

[![Build Status](https://travis-ci.org/redpelicans/farso.svg?branch=develop)](https://travis-ci.org/redpelicans/farso)
[![Coverage Status](https://coveralls.io/repos/github/redpelicans/farso/badge.svg?branch=develop)](https://coveralls.io/github/redpelicans/farso?branch=develop)

`farso` is an HTTP mocking library for nodeJS.

`farso` is mainly used to craft e2e/human tests of HTTP services.

# How does it work?

`farso` is made for developers and avoid the use of tons of json files to setup mocks, it offers a comprehensive DSL and a low level api based on [expressjs](http://expressjs.com) so developers can precisely tweak their mock services to their needs where DSL do not cover use cases.

Mocking with `farso` invite you to travel in different vibes!

First of all, you have to define `endpoints` (destinations) you want to mock.

Then define all the `vibes` (scenarios) of your farso.

A `vibe` is made of mocks (mocked endpoints). Definition of mocks are inspired by [nock](https://github.com/node-nock/nock)

`farso` library is bundled with an http server api (also bin script) to run your vibes.

Then manually or from your testing framework you can select the desired vibe and request endpoints, `farso` will try to select an eligible mock and execute it. Because many `mocks` can be associated to an `endpoint`, `farso` will in the order of definition run the fisrt that matches (see check methods below). If no eligible `mock` matches in current vibe `farso` will search in the default vibe to look for one.

Run tests on it, change the vibe and ...

# Install

```
$ npm install farso
```

# farso at first glance

Let's say your system is using a CRM backoffice with an HTTP API offering an endpoint `GET /public/v0/people`.

You have to mock this endpoint.

First install `farso`, then add config files below: 

```
// ./endpoints.js

const { endpoint } = require('farso');
endpoint('people', { uri: '/public/v0/people', method: 'get' });

// vibes.js
const { vibe } = require('farso');
const faker = require('faker');
const people = [
  {id: 1, name: faker.name.lastName()},
  {id: 2, name: faker.name.lastName()},
];

vibe.default('Main', mock => {
  mock('people')
    .checkHeader({ 'x-corporis': /^\d+-\w+$/ })
    .reply([200, people]);
});


// farso.config.js
module.exports = {
  host: 'localhost',
  // port: 8181,
  vibes: path.join(__dirname, './vibes.js'),
  endpoints: path.join(__dirname, './endpoints.js'),
};
```

Then run:

```
$ DEBUG=farso* npx farso-server --config ./farso.config.js 
  farso Creating Vibe 'Main'
  farso Endpoint 'people:/public/v0/people' created
  farso Vibe 'Main' is now active
  farso server started on 'http://localhost:33811'
```

And now:

```
$ curl http://localhost:33811/public/v0/people
[{"id":1,"name":"Mohr"},{"id":2,"name":"Muller"}]                  
```

Here it is, you made your first farso mock.

# DSL API

## config

With DSL api we will use the embendded server and will setup farso library with setup files like above sample. 

`config` file must export and object with those properties:

* `host`: default to localhost
* `port`: optional, server's binding port, when no set server will bind dynamically to an available port
* `errorCode`: optional, http status code to return when an `endpoint` matches without a `mock`.
* `vibes`: glob partern to select vibe's files to load (see below) ex : `path.join(__dirname, './data/**/*.vibes.js')` or just `path.join(__dirname, './vibes.js')`
* `endpoint`: glob partern to select endpoint's files to load (see below)
* `globals`: optional, data injected to vibes (see below) to share states between http calls and vibes.


```
const path = require('path');
const faker = require('faker');

module.exports = {
  host: 'localhost',
  port: 8181,
  vibes: path.join(__dirname, './mock/**/*.vibe.js'),
  endpoints: path.join(__dirname, './mock/endpoints.js'),
  globals: {
    api: {
      clientId: faker.random.uuid(),
      clientSecret: faker.random.uuid(),
    },
  },
};

```

farso's server must be launched with: ``` $ DEBUG=farso* npx farso-server --config ./farso.config.js ```

Server can be also setup and launched thanks { initTrip, initServer, runServer } functions exported from 
'farso-mock/server' (see Low Level API section below)

## endpoint

`endpoint` files are used to define ..., endpoints, aka `expressjs` routes.

```
	const { endpoint } = require('farso-mock');
	endpoint('people:list', { uri: '/public/v0/people', method: 'get' });
	endpoint('people:get', { uri: '/public/v0/people/:id', method: 'get' });
	endpoint('people:create', { uri: '/public/v0/people', method: 'post' });
	endpoint('people:update', { uri: '/public/v0/people/:id', method: 'patch' });
```

ex: First call to `endpoint` will register an expressjs route on GET '/public/v0/people'

**function endpoint(name, params)**
* `name`: String to identify an endpoint
* `params`: 
	* `uri`: endpoint's path
	* `method`: optional, endpoint's http method name
	* `use`: optional, expressjs middleware(s) associated with endpoint, could be useful to serve static files or code specific behaviour like ```endpoint('configs', { uri: '/configs', use: express.static(path.join(__dirname, './')) });```
	
	
## vibe

`endpoints` are useless without `vibe`, an endpoint will be associated with many vibes made of mocks:

```
const personSchema = { 
	firstname: /\w+/,
	lastname: /\w+/
};
	
vibe('Main', (mock, {globals: { api: { clientId, clientSecret } } }) => { 
	mock('people:list').reply([200, people]);
	mock('people:get').checkParams({ id: /\d+/ }).reply([200, person]);
	mock('people:create').checkBoby(personSchema).reply([200, person]);
	mock('people:update').checkParams({ id: /\d+/ }).checkBoby(personSchema).reply([200, person]);
})
```

**function vibe(name, fn, options) or vibe.default(name, fn)**
* `name`: String **must** match an existing `endpoint`
* `options`: { isDefault }, set vibe as default
* `fn`: function(mock, { globals, lget })
	* `mock`: function to define new mocks (see below)
	* `globals`: config's `globals` property 
	* `lget`: TODO[lset/lget]
	
returns the current `farso`.

A default `vibe` will become the current one to search mocks, to switch to another one use `farso#select(name)` or HTTP API.

When a non default `vibe` is selected, eligible mocks are first searched in former `vibe` then in the default one.

farso's server offers a minimalist http api to list existing vibes:

```
$ curl http://[host:port]/_vibes_
{
	currentVibe: "Main",
	vibes: [
		"Main", "Wrong_auth"
	]
}
```

and select one:

```
$ curl http://[host:port]/_vibes_/Wrong_auth
{
	currentVibe: "Wrong_auth"
}
```

## mock

A `mock` defines the behaviour of an `endpoint`:

```
vibe('V1', mock => mock('people:list').reply(200));
```
Requesting endpoint 'people:list' will return HTTP status code 200.

We can define many mocks per `endpoint`:

```
vibe('V1', mock => {
	mock('people:list').reply(200);
	mock('people:get').reply([200, person]);
});
```
or like this:

```
vibe('V1', mock => mock('people:list').reply(200));
vibe('V1', mock => 	mock('people:get').reply([200, person]));
```

We can define many mocks for the same `endpoint`:

```
vibe('V1', mock => mock('people:get').checkParams({ id: '12'}).reply([200, person]));
vibe('V1', mock => 	mock('people:get').checkParams({ id: '13'}).reply(404));
```

Order of definition matters.


We can define many mocks for the same `endpoint` in many vibes, in case you overwrite a mock already defined in the default endpoint, former wil be used. With a default `vibe`, an eligible mock is first look into current vibe, then if not found, in the default one.


### checkParams

Check url [params](https://expressjs.com/en/4x/api.html#req.params)

Ex: param `id`

```
endpoint('people:get', { uri: '/public/v0/people/:a/:b', method: 'get' });
vibe('V1', mock =>  {
	mock('people:get')
		.checkParams({ a: '12', b: '13'})
		.checkParams({ a: /\d+/ b: :\w+X$/})
		.checkParams(({ a }) => Number(a) < 5)
		.reply(200);
})
```

endpoint's `uri` property use expressjs route's syntax definition.

**function checkParams(options)**
* `options`: Object | Function
	* Object: if key/value do not match req.params `mock` will not be eligible, values can be a String or a RegExp
	* Function: `function(params): Boolean`, if returns false `mock` will not be eligible.

returns the current `mock`.

### checkHeaders

Check that requested headers match request.

**function checkHeaders(options)**
* `options`: Object | Function
	* Object: if key/value do not match sent headers `mock` will not be eligible, values can be a String or a RegExp, keys are converted to lower case.
	* Function: `function(headers): Boolean`, if it returns false `mock` will not be eligible.


### checkQuery

Check that requested query match request.

**function checkQuery(options)**
* `options`: Object | Function
	* Object: if key/value do not match [req.body](https://expressjs.com/en/4x/api.html#req.body) `mock` will not be eligible, values can be a String or a RegExp.
	* Function: `function(query): Boolean`, if it returns false `mock` will not be eligible.


### checkBody

Check that requested body match request.

**function checkBody(options)**
* `options`: Object | Function
	* Object: if key/value do not **deeply** match [req.query](https://expressjs.com/en/4x/api.html#req.query) `mock` will not be eligible, values can be a String or a RegExp. Object can be a nested object, is this case comparaison will be made using `farso.deepMatch`.
	* Function: `function(body): Boolean`, if it returns false `mock` will not be eligible.

### reply

Function executed when a mock is eligible.

**function reply(options)**
* options: Number | Function | Array
	* Number: status code to return: ``` res.sendStatus(options)```
	* Array: [status, data]: ```res.status(options[0]).send(options[1])```
	* Function: `function(req, res)`

returns current `mock`

### lset/lget

`lset/lget` allow to manage a global context between requests.

We can share global data thanks to `globals` prop in config and use it in vibes definition:

```
// farso.config.js
const path = require('path');
const faker = require('faker');

module.exports = {
  host: 'localhost',
  port: 8181,
  vibes: path.join(__dirname, './examples/**/*.vibe.js'),
  endpoints: path.join(__dirname, './examples/endpoints.js'),
  globals: {
    api: {
      clientId: faker.random.uuid(),
      clientSecret: faker.random.uuid(),
    },
  },
};

// main.vibe.js

vibe('Main', (mock, globals)  => { 
	mock('people:list').reply((req, res) => {
		globals.propA = valueA;
		res.send(200);
	});
})

```

But to avoid dirty side effect here comes `lset/lget`:

```
const { path } = require('ramda');

vibe.default('Main', (mock, { lget, globals: { token }}) => {

  mock('token')
    .lset(({ body }) => [['data', 'firstname'], body.firstname])
    .lset(({ body }) => [['data', 'lastname'], body.lastname])
    .reply([201, token]);

  const req_create_claim = {
    firstname: lget(path(['data', 'firstname'])),
   	lastname: lget(path(['data', 'lastname'])),
  };

  mock('claim:create')
    .checkBody(req_create_claim)
    .lset(({ body }) => [['data', 'claim'], body])
    .reply(201);
```

**function lget(fn)**
* fn: `function(Object): Object`, returns data from `globals`
use case: ```lget(path(['data', 'lastname']))``` returns ```globals.data.lastname```
We can use any path selector outside ramda

**function lset(fn)**
* fn: `function(req): returns [path, value]`
Use case : ```mock('token').lset(({ body }) => [['data', 'firstname'], body.firstname])``` will  exec ``` globals.data.firstname = body.firstname```


# Low level API

## server

`farso` server can be launched thanks to `farso-server` script, like:

```
$ DEBUG=farso* npx farso-server --config ./farso.config.js
```

But also with API entries, it could be useful if we want to start a mock server within test and not before:

```
const { runServer } = require('farso/server');

let farsoServer;

const config = {
  vibes: path.join(__dirname, '../../examples/api.vibe.js'),
  endpoints: path.join(__dirname, '../../examples/endpoints.js'),
  globals,
};

beforeAll(() => runServer(config).then(({ server }) => (farsoServer = server)));
afterAll(() => farsoServer.close());
```


## farso

We can dynamically register `endpoints` and create `vibes`, see unit tests for different samples.

```
const { initServer } = require('farso/server');
const Farso = require('farso');

let ctx;
let farso;
const initFarso = () => {
  farso = Farso({ errorCode });
  farso.createEndpoint('test', { uri: '/test', method: 'post' });
  farso.registerEndpoints();
  return Promise.resolve({ farso });
};

beforeAll(() =>
  initFarso()
    .then(initServer)
    .then(c => (ctx = c)));
afterAll(() => ctx.server.close());

describe('...', () => {
  it('should ...', () => {
    farso
      .createVibe('v1', mock => mock('test').reply(200))
      .select('v1');
    return axios({ method: 'post', url: `${ctx.server.url}/test` });
  });

```


That's all folks...



