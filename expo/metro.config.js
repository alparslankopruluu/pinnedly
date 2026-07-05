const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withRorkMetro } = require("@rork-ai/toolkit-sdk/metro");

const config = getDefaultConfig(__dirname);
const expensifyCommonShim = path.resolve(__dirname, "lib/expensify-common-shim.js");

const { resolveRequest } = config.resolver;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "expensify-common") {
    return {
      filePath: expensifyCommonShim,
      type: "sourceFile",
    };
  }

  if (resolveRequest) {
    return resolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withRorkMetro(config);
