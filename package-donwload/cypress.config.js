const { defineConfig } = require("cypress");

module.exports = defineConfig({
  projectId: 'o7uzyy',
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});


require('@applitools/eyes-cypress')(module);
