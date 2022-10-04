const batchPropertiesRetriever = (args, appliConfFile) => {
  return function(prop, nestedProp) {
    nestedProp = nestedProp || prop;
    if (args.hasOwnProperty(prop)) {
      return args[prop];
    } else if (args.batch && args.batch.hasOwnProperty(nestedProp)) {
      return args.batch[nestedProp];
    } else if (appliConfFile.hasOwnProperty(prop)) {
      return appliConfFile[prop];
    } else if (appliConfFile.batch && appliConfFile.batch.hasOwnProperty(nestedProp)) {
      return appliConfFile.batch[nestedProp];
    }
    return undefined;
  };
};
function eyesOpenMapValues({args, appliConfFile, testName, shouldUseBrowserHooks}) {
  let browsersInfo = args.browser || appliConfFile.browser;
  let accessibilitySettings = args.accessibilityValidation || appliConfFile.accessibilityValidation;
  const batchProperties = batchPropertiesRetriever(args, appliConfFile);
  const batch = {
    id: batchProperties('batchId', 'id'),
    name: batchProperties('batchName', 'name'),
    sequenceName: batchProperties('batchSequenceName', 'sequenceName'),
    notifyOnCompletion: batchProperties('notifyOnCompletion'),
    properties:
      (args.batch ? args.batch.properties : undefined) ||
      (appliConfFile.batch ? appliConfFile.batch.properties : undefined),
  };
  for (let prop in batch) {
    if (typeof batch[prop] === 'undefined') {
      delete batch[prop];
    }
  }

  const mappedValues = [
    'accessibilityValidation',
    'browser',
    'useDom',
    'matchLevel',
    'enablePatterns',
    'ignoreDisplacements',
    'ignoreCaret',
    'batchName',
    'batchId',
    'batchSequenceName',
  ];

  if (browsersInfo) {
    if (Array.isArray(browsersInfo)) {
      browsersInfo.forEach(fillDefaultBrowserName);
    } else {
      fillDefaultBrowserName(browsersInfo);
      browsersInfo = [browsersInfo];
    }
  }

  const defaultMatchSettings = {
    accessibilitySettings,
    matchLevel: args.matchLevel || appliConfFile.matchLevel,
    ignoreCaret: args.ignoreCaret || appliConfFile.ignoreCaret,
    useDom: args.useDom || appliConfFile.useDom,
    enablePatterns: args.enablePatterns || appliConfFile.enablePatterns,
    ignoreDisplacements: args.ignoreDisplacements || appliConfFile.ignoreDisplacements,
  };

  const appliConfFileCopy = {...appliConfFile};
  for (const val of mappedValues) {
    if (args.hasOwnProperty(val)) {
      delete args[val];
    }
    if (appliConfFileCopy.hasOwnProperty(val)) {
      delete appliConfFileCopy[val];
    }
  }

  const mappedArgs = {
    ...args,
    browsersInfo,
    defaultMatchSettings,
    batch,
  };

  return Object.assign(
    {testName, dontCloseBatches: !shouldUseBrowserHooks},
    appliConfFileCopy,
    mappedArgs,
  );
}

function fillDefaultBrowserName(browser) {
  if (!browser.name && !browser.iosDeviceInfo && !browser.chromeEmulationInfo) {
    browser.name = 'chrome';
  }
}

module.exports = {eyesOpenMapValues};
