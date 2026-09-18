const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  extractRoutes,
  main,
  renderRoutes,
  validateRouteUpdate,
} = require("../scripts/update-upstreams-routes");

function makeUpstreams(mediaHosts, videoHosts) {
  return {
    origin: {
      mediabasket_route_map: [{ method: "range", hosts: mediaHosts }],
      videonme_route_map: [{ method: "range", hosts: videoHosts }],
    },
  };
}

function host(vol_range_from, vol_range_to) {
  return { vol_range_from, vol_range_to, host: "basket.wbbasket.ru" };
}

describe("update-upstreams-routes", () => {
  test("извлекает верхние границы из origin range-карт", () => {
    const routes = extractRoutes(makeUpstreams(
      [host(0, 143), host(144, 287)],
      [host(0, 11), host(12, 23)]
    ));

    expect(routes.mediaBasketRanges).toEqual([143, 287]);
    expect(routes.videoBasketRanges).toEqual([11, 23]);
  });

  test("отклоняет карту с разрывом диапазонов", () => {
    const upstreams = makeUpstreams(
      [host(0, 143), host(145, 287)],
      [host(0, 11), host(12, 23)]
    );

    expect(() => extractRoutes(upstreams)).toThrow(/must start at 144/);
  });

  test("отклоняет несколько range-маршрутов для одной карты", () => {
    const upstreams = makeUpstreams(
      [host(0, 143)],
      [host(0, 11)]
    );
    upstreams.origin.mediabasket_route_map.push({
      method: "range",
      hosts: [host(144, 287)],
    });

    expect(() => extractRoutes(upstreams)).toThrow(/must contain exactly one range route/);
  });

  test("отклоняет изменение уже опубликованных границ", () => {
    const currentRoutes = {
      mediaBasketRanges: [143, 287],
      videoBasketRanges: [11, 23],
    };
    const nextRoutes = {
      mediaBasketRanges: [143, 300],
      videoBasketRanges: [11, 23],
    };

    expect(() => validateRouteUpdate(currentRoutes, nextRoutes)).toThrow(
      /mediaBasketRanges must only append new ranges/
    );
  });

  test("отклоняет аномально большое число новых диапазонов", () => {
    const currentRoutes = {
      mediaBasketRanges: [143],
      videoBasketRanges: [11],
    };
    const nextRoutes = {
      mediaBasketRanges: [143, 287, 431, 575],
      videoBasketRanges: [11],
    };

    expect(() => validateRouteUpdate(currentRoutes, nextRoutes, 2)).toThrow(
      /mediaBasketRanges adds 3 ranges; maximum is 2/
    );
  });

  test("разрешает ограниченное добавление диапазонов в конец", () => {
    const currentRoutes = {
      mediaBasketRanges: [143, 287],
      videoBasketRanges: [11],
    };
    const nextRoutes = {
      mediaBasketRanges: [143, 287, 431],
      videoBasketRanges: [11, 23],
    };

    expect(() => validateRouteUpdate(currentRoutes, nextRoutes, 2)).not.toThrow();
  });

  test("отклоняет добавленные границы не по возрастанию", () => {
    const currentRoutes = {
      mediaBasketRanges: [143, 287],
      videoBasketRanges: [11],
    };
    const nextRoutes = {
      mediaBasketRanges: [143, 287, 200],
      videoBasketRanges: [11, 23],
    };

    expect(() => validateRouteUpdate(currentRoutes, nextRoutes)).toThrow(
      /mediaBasketRanges must contain strictly increasing non-negative integers/
    );
  });

  test("не перезаписывает snapshot при несовместимом upstream", async () => {
    const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "upstream-routes-"));
    const inputPath = path.join(tempDirectory, "upstreams.json");
    const outputPath = path.join(tempDirectory, "UpstreamRoutes.js");
    const originalOutput = renderRoutes({
      mediaBasketRanges: [143, 287],
      videoBasketRanges: [11, 23],
    });

    try {
      fs.writeFileSync(outputPath, originalOutput);
      fs.writeFileSync(inputPath, JSON.stringify(makeUpstreams(
        [host(0, 143), host(144, 300)],
        [host(0, 11), host(12, 23)]
      )));

      await expect(main(["--input", inputPath, "--output", outputPath])).rejects.toThrow(
        /mediaBasketRanges must only append new ranges/
      );
      expect(fs.readFileSync(outputPath, "utf8")).toBe(originalOutput);
    } finally {
      fs.rmSync(tempDirectory, { recursive: true, force: true });
    }
  });
});
