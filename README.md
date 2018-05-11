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

`endpoints` are useless without `mocks`, an endpoint will be associated with many vibes made of mocks:

```
const personSchema = { 
	firstname: /\w+/,
	lastname: /\w+/
};
	
vibe('Main', mock => { 
	mock('people:list').reply([200, people]);
	mock('people:get').checkParams({ id: /\d+/ }).reply([200, person]);
	mock('people:create').checkBoby(personSchema).reply([200, person]);
	mock('people:update').checkParams({ id: /\d+/ }).checkBoby(personSchema).reply([200, person]);
});
```

**function vibe(name, fn, options) or vibe.default(name, fn)**
* `name`: String **must** match an existing `endpoint`
* `options`: { isDefault }, set vibe as default
* `fn`: function(mock, { globals, lget })
	* `mock`: function to define new mocks (see below)
	* `globals`: config's `globals` property 
	* `lget`: TODO[lset/lget]
	
returns the current `farso`.

A default `vibe` will be the one used to search mocks, to switch to another one use `farso#select(name)`.

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

### checkParams

### checkHeaders

### checkQuery

### checkBody

### reply

### lset

# Low level API

## server

## farso

## vibe


