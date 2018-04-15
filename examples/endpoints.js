const endpoints = {
  sms: {
    uri: '/auth/v0/sms',
    method: 'post',
  },
  token: {
    uri: '/oauth/token',
    method: 'post',
    reply: (req, res) => res.send('COUCOU'),
  },
};

module.exports = endpoints;
