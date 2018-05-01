# trip-mock

[![Build Status](https://travis-ci.org/redpelicans/trip.svg?branch=develop)](https://travis-ci.org/redpelicans/trip)


`trip-mock` is an HTTP mocking library for nodeJS.

`trip-mock` is mainly used to craft e2e/human tests of HTTP services.

# How does it work?

`trip-mock` is made for developers and avoid the use of tons of json files to setup mocks, it offers a comprehensive DSL and a low level api based on [expressjs](http://expressjs.com) so developers can precisely tweak their mock services to their needs where DSL do not cover use cases.

Mocking with `trip-mock` invite you to travel in different vibes!

First of all, you have to define destinations (`endpoints`) you want to mock.

Then define all the `vibes` (scenarios) of your trip.

A `vibe` is made of mocks (mocked endpoints). Definition of mocks are inspired by [nock](https://github.com/node-nock/nock)

`trip-mock` library is bundled with an http server api (also bin script) to run your vibes.

Then manually or from your testing framework you can select the desired vibe and run tests on it, change the vibe and ...

# Install

```
$ npm install trip-mock
```

# 'trip mock' at first glance

Let's say your system is using a CRM backoffice with an HTTP API offering an endpoint `GET /public/v0/people`.

You have to mock this endpoint.

First install `trip-mock`, then add config files below: 

```
// ./endpoints.js

const { endpoint } = require('trip-mock');
endpoint('people', { uri: '/public/v0/people', method: 'get' });

// vibes.js
const { vibe } = require('trip-mock');
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


// trip.config.js
module.exports = {
  host: 'localhost',
  // port: 8181,
  vibes: path.join(__dirname, './vibes.js'),
  endpoints: path.join(__dirname, './endpoints.js'),
};
```

Then run:

```
$ DEBUG=trip* npx trip-server --config ./trip.config.js 
  trip Creating Vibe 'Main'
  trip Endpoint 'people:/public/v0/people' created
  trip Vibe 'Main' is now active
  trip server started on 'http://localhost:33811'
```

And now:

```
$ curl http://localhost:33811/public/v0/people
[{"id":1,"name":"Mohr"},{"id":2,"name":"Muller"}]                  
```

Here it is, you made your first trip mock.

# DSL API

## config

With DSL api we will use the embendded server and will setup trip library with setup files like above sample. 

`config` file must export and object with those properties:

* `host`: default to localhost
* `port`: optional, server's binding port, when no set server will bind dynamically to an available port
* `errorCode`: optional, http status code to return when an `endpoint` matches without a `mock`.
* `vibes`: glob partern to select vibe's files to load (see below) ex : `path.join(__dirname, './data/**/*.vibes.js')` or just `path.join(__dirname, './vibes.js')`
* `endpoint`: glob partern to select endpoint's files to load (see below)
* `globals`: optional, data injected to vibes (see below) to share states between http calls and vibes.

trip's server must be launched with: ``` $ DEBUG=trip* npx trip-server --config ./trip.config.js ```

Server can be also setup and launched thanks { initTrip, initServer, runServer } functions exported from 
'trip-mock/server' (see Low Level API section below)

## endpoint

`endpoint` files are used to define ..., endpoints, aka `expressjs` routes.

```
	const { endpoint } = require('trip-mock');
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
	
returns the current `trip`.

A default `vibe` will be the one used to search mocks, to switch to another one use `trip#select(name)`.

trip's server offers a minimalist http api to list existing vibes:

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

### checkParams

### checkHeaders

### checkQuery

### checkBody

### reply

### lset

# Low level API

## server

## trip

## vibe


