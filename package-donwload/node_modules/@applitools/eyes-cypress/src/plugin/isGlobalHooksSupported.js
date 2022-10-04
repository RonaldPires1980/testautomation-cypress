const CYPRESS_SUPPORTED_VERSION = '6.2.0';
const CYPRESS_NO_FLAG_VERSION = '6.7.0';

function isGlobalHooksSupported(config) {
  const {version, experimentalRunEvents} = config;

  return (
    parseFloat(version, 10) >= parseFloat(CYPRESS_NO_FLAG_VERSION, 10) ||
    (parseFloat(version, 10) >= parseFloat(CYPRESS_SUPPORTED_VERSION, 10) &&
      !!experimentalRunEvents)
  );
}

module.exports = isGlobalHooksSupported;
