const { composePlugins, withNx } = require('@nx/webpack');

// Nx plugins for webpack to build Node applications
module.exports = composePlugins(withNx(), (config) => {
  return config;
});