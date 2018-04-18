const { vibe } = require('..');

vibe.default('Main', (mock, { globals: { api: { clientId, clientSecret, token } } }) => {
  mock('sms')
    .checkHeader({ 'content-Type': /application\/json/ })
    .checkBody({ phoneNumber: /^\+[0-9]+/ })
    .reply(204);

  const req = {
    grant_type: 'sms',
    client_id: clientId,
    client_secret: clientSecret,
    scope: ['IDENTIFIED', 'AUTHENTICATED', 'APPROVED'],
    sms_code: '42',
    plate_number: /\w+/,
    phone_number: /^\+[0-9]+/,
    firstname: /\w+/,
    lastname: /\w+/,
  };

  mock('token')
    .checkHeader({ 'content-type': 'application/x-www-form-urlencoded' })
    .checkBody(req)
    .reply([201, token]);
});
