const { extractRoutes } = require("../scripts/update-upstreams-routes");

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
});
