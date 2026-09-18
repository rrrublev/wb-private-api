const {
  parseRenderedRoutes,
  validateManifestChanges,
} = require("../scripts/validate-route-release");
const { renderRoutes } = require("../scripts/update-upstreams-routes");

function makeLockfile(version) {
  return {
    name: "@rrrublev/wb-private-api",
    version,
    lockfileVersion: 3,
    packages: {
      "": {
        name: "@rrrublev/wb-private-api",
        version,
        dependencies: { qs: "^6.15.1" },
      },
    },
  };
}

describe("validate-route-release", () => {
  test("разрешает только точное patch-обновление manifest и lockfile", () => {
    const previousPackage = {
      name: "@rrrublev/wb-private-api",
      version: "0.8.9",
      scripts: { test: "jest" },
    };
    const nextPackage = { ...previousPackage, version: "0.8.10" };

    expect(() => validateManifestChanges(
      previousPackage,
      nextPackage,
      makeLockfile("0.8.9"),
      makeLockfile("0.8.10")
    )).not.toThrow();
  });

  test("отклоняет изменение package scripts вместе с версией", () => {
    const previousPackage = {
      name: "@rrrublev/wb-private-api",
      version: "0.8.9",
      scripts: { test: "jest" },
    };
    const nextPackage = {
      ...previousPackage,
      version: "0.8.10",
      scripts: { test: "node malicious.js" },
    };

    expect(() => validateManifestChanges(
      previousPackage,
      nextPackage,
      makeLockfile("0.8.9"),
      makeLockfile("0.8.10")
    )).toThrow(/package.json may only change the version/);
  });

  test("отклоняет дополнительные изменения lockfile", () => {
    const previousPackage = { name: "package", version: "0.8.9" };
    const nextPackage = { name: "package", version: "0.8.10" };
    const nextLockfile = makeLockfile("0.8.10");
    nextLockfile.packages[""].dependencies.qs = "malicious";

    expect(() => validateManifestChanges(
      previousPackage,
      nextPackage,
      makeLockfile("0.8.9"),
      nextLockfile
    )).toThrow(/package-lock.json may only change root version fields/);
  });

  test("разбирает только точный сгенерированный формат snapshot", () => {
    const routes = {
      mediaBasketRanges: [143, 287],
      videoBasketRanges: [11, 23],
    };
    const rendered = renderRoutes(routes);

    expect(parseRenderedRoutes(rendered)).toEqual(routes);
    expect(() => parseRenderedRoutes(`${rendered}\nmodule.exports.injected = true;\n`)).toThrow(
      /generated format/
    );
  });
});
