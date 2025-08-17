const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add buffer polyfill
config.resolver.alias = {
  ...config.resolver.alias,
  buffer: require.resolve('buffer'),
};

// Handle package exports issues
const resolveRequestWithPackageExports = (context, moduleName, platform) => {
  // Package exports in `isows` (a `viem` dependency) are incompatible, so they need to be disabled
  if (moduleName === "isows") {
    const ctx = {
      ...context,
      unstable_enablePackageExports: false,
    };
    return ctx.resolveRequest(ctx, moduleName, platform);
  }
  // Package exports in `zustand@4` are incompatible, so they need to be disabled
  if (moduleName.startsWith("zustand")) {
    const ctx = {
      ...context,
      unstable_enablePackageExports: false,
    };
    return ctx.resolveRequest(ctx, moduleName, platform);
  }
  // Package exports in `jose` are incompatible, so the browser version version is used
  if (moduleName === "jose") {
    const ctx = {
      ...context,
      unstable_conditionNames: ["browser"],
    };
    return ctx.resolveRequest(ctx, moduleName, platform);
  }

  // The following block is only needed if you are
  // running React Native 0.78 *or older*.
  if (moduleName.startsWith('@privy-io/')) {
    const ctx = {
      ...context,
      unstable_enablePackageExports: true,
    };
    return ctx.resolveRequest(ctx, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

config.resolver.resolveRequest = resolveRequestWithPackageExports;

module.exports = config; 