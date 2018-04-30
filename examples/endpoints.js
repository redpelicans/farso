const { endpoint } = require('../src');

endpoint('sms', { uri: '/auth/v0/sms', method: 'post' });
endpoint('token', { uri: '/oauth/token', method: 'post', reply: (req, res) => res.send('COUCOU') });
