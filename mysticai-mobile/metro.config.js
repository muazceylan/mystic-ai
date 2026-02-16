const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable ESM modules
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs'];

// Use browser build of axios to avoid Node core module usage (crypto)
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  axios: require.resolve('axios/dist/browser/axios.cjs'),
};

// Configure for web
config.server.port = 8500;

module.exports = config;
