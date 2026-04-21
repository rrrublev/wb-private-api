/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: "unit",
      testEnvironment: "node",
      testMatch: [
        "**/tests/Constants.URLs.utils.test.js",
        "**/tests/SessionBuilder.test.js",
        "**/tests/Utils.test.js",
        "**/tests/WBPrivateAPI.unit.test.js",
        "**/tests/WBCatalog.unit.test.js",
        "**/tests/WBProduct.unit.test.js",
      ],
    },
    {
      displayName: "integration",
      testEnvironment: "node",
      setupFiles: ["./jest.setup.js"],
      testMatch: [
        "**/tests/Constants.URLs.test.js",
        "**/tests/Constants.URLs.integration.test.js",
        "**/tests/WBCatalog.test.js",
        "**/tests/WBPrivateAPI.test.js",
        "**/tests/WBProduct.test.js",
        "**/tests/WBProduct.getStocks.test.js",
      ],
    },
  ],
};
