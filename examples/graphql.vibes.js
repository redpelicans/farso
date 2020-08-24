const { vibe } = require('../src');

vibe.default('main', mock => {
  const mocks = {
    Query: () => ({
      echo: (_, { message }) => message,
    })
  }
  mock('graphql').resolve(mocks);
});

vibe('prefix', (mock, { globals: { prefix } }) => {
  const mocks = {
    Query: () => ({
      echo: (_, { message }) => `${prefix}-${message}`,
    })
  }
  mock('graphql').resolve(mocks);
});
