const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const axiosBrowserPath = require.resolve('axios/dist/browser/axios.cjs');
const zustandCjsPath = require.resolve('zustand');
const zustandMiddlewareCjsPath = require.resolve('zustand/middleware');
const defaultResolveRequest = config.resolver.resolveRequest;

// Enable ESM modules
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs'];

// Force axios browser bundle so Metro never resolves Node build (crypto).
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'axios' || moduleName === 'axios/dist/node/axios.cjs') {
    return {
      filePath: axiosBrowserPath,
      type: 'sourceFile',
    };
  }

  // Force Zustand CJS build to avoid import.meta in web Hermes bundles.
  if (moduleName === 'zustand') {
    return {
      filePath: zustandCjsPath,
      type: 'sourceFile',
    };
  }
  if (moduleName === 'zustand/middleware') {
    return {
      filePath: zustandMiddlewareCjsPath,
      type: 'sourceFile',
    };
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

// Configure for web
config.server.port = 8500;

module.exports = config;
