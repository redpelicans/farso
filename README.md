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
    .checkHeader({ 'content-Type': /application\/json/ })
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

# API

## endpoint

## mock

## config

## server
