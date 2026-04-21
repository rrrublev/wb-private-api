/* eslint-disable no-undef */

jest.mock("undici", () => ({
  fetch: jest.fn(),
  Agent: jest.fn().mockImplementation(() => ({})),
}));

const { fetch: mockFetch } = require("undici");
const SessionBuilder = require("../src/SessionBuilder");

// Формирует минимальный mock ответа с нужным статусом.
// Для 2xx добавляет headers и json — они читаются в Session.get().
function makeResponse(status, data = {}) {
  const ok = status >= 200 && status < 300;
  return {
    status,
    headers: { get: () => (ok ? "application/json" : null) },
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(""),
  };
}

function makeNetworkError(message = "Network failure") {
  return Object.assign(new Error(message), { name: "TypeError" });
}

// Хелпер для тестов где ожидаем УСПЕХ и нужно пропустить backoff-задержки.
// Advance на 30s покрывает максимально возможный суммарный backoff (retries <= 3).
async function awaitWithTimers(promise) {
  promise.catch(() => {}); // подавляем unhandled rejection до settle
  await jest.advanceTimersByTimeAsync(30000);
  return promise;
}

// Хелпер для тестов где ожидаем ОШИБКУ — возвращает объект ошибки.
async function catchWithTimers(promise) {
  let error;
  promise.catch((e) => { error = e; });
  await jest.advanceTimersByTimeAsync(30000);
  await promise.catch(() => {});
  return error;
}

beforeEach(() => {
  mockFetch.mockClear();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------

describe("SessionBuilder.create()", () => {
  test("создаёт сессию с методом get", () => {
    const session = SessionBuilder.create();
    expect(typeof session.get).toBe("function");
  });

  test("retries по умолчанию — 3", async () => {
    const session = SessionBuilder.create();
    mockFetch
      .mockResolvedValueOnce(makeResponse(429))
      .mockResolvedValueOnce(makeResponse(429))
      .mockResolvedValueOnce(makeResponse(429))
      .mockResolvedValueOnce(makeResponse(200, { ok: true }));

    const result = await awaitWithTimers(session.get("http://test.com"));
    expect(result.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(4); // 1 попытка + 3 retry
  });
});

// ---------------------------------------------------------------------------

describe("Session.get() — успешные запросы", () => {
  test("возвращает данные при 200 без повторов", async () => {
    const session = SessionBuilder.create({ retries: 3 });
    mockFetch.mockResolvedValueOnce(makeResponse(200, { id: 1 }));

    const result = await session.get("http://test.com");
    expect(result.status).toBe(200);
    expect(result.data).toEqual({ id: 1 });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------

describe("Session.get() — HTTP retry (замечание 1, часть 1)", () => {
  test("повтор при 429, успех со второй попытки", async () => {
    const session = SessionBuilder.create({ retries: 1 });
    mockFetch
      .mockResolvedValueOnce(makeResponse(429))
      .mockResolvedValueOnce(makeResponse(200, { ok: true }));

    const result = await awaitWithTimers(session.get("http://test.com"));
    expect(result.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  test("повтор при 500, успех со второй попытки", async () => {
    const session = SessionBuilder.create({ retries: 1 });
    mockFetch
      .mockResolvedValueOnce(makeResponse(500))
      .mockResolvedValueOnce(makeResponse(200, {}));

    const result = await awaitWithTimers(session.get("http://test.com"));
    expect(result.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  test("бросает ошибку когда все HTTP retry исчерпаны", async () => {
    const session = SessionBuilder.create({ retries: 2 });
    mockFetch
      .mockResolvedValueOnce(makeResponse(429))
      .mockResolvedValueOnce(makeResponse(429))
      .mockResolvedValueOnce(makeResponse(429));

    const error = await catchWithTimers(session.get("http://test.com"));
    expect(error.message).toContain("429");
    expect(error.response.status).toBe(429);
    expect(mockFetch).toHaveBeenCalledTimes(3); // 1 + 2 retry
  });
});

// ---------------------------------------------------------------------------

describe("Session.get() — network/transport retry (замечание 1, часть 2)", () => {
  test("повтор при network-ошибке (fetch throws), успех со второй попытки", async () => {
    const session = SessionBuilder.create({ retries: 1 });
    mockFetch
      .mockRejectedValueOnce(makeNetworkError())
      .mockResolvedValueOnce(makeResponse(200, { ok: true }));

    const result = await awaitWithTimers(session.get("http://test.com"));
    expect(result.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  test("бросает ошибку когда все network retry исчерпаны", async () => {
    const session = SessionBuilder.create({ retries: 2 });
    mockFetch
      .mockRejectedValueOnce(makeNetworkError())
      .mockRejectedValueOnce(makeNetworkError())
      .mockRejectedValueOnce(makeNetworkError());

    const error = await catchWithTimers(session.get("http://test.com"));
    expect(error.message).toBe("Network failure");
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});

// ---------------------------------------------------------------------------

describe("Session.get() — retryOptions (замечание 2)", () => {
  test("retryOptions.retries: 0 отключает retry — fetch вызывается ровно 1 раз", async () => {
    const session = SessionBuilder.create({ retries: 3 });
    mockFetch.mockResolvedValueOnce(makeResponse(429));

    // retries: 0 → никакого sleep, promise отклоняется сразу
    const error = await catchWithTimers(
      session.get("http://test.com", { retryOptions: { retries: 0 } })
    );
    expect(error.response.status).toBe(429);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  test("retryOptions.retries: 1 делает ровно один повтор (2 вызова fetch)", async () => {
    const session = SessionBuilder.create({ retries: 3 });
    mockFetch
      .mockResolvedValueOnce(makeResponse(429))
      .mockResolvedValueOnce(makeResponse(429));

    const error = await catchWithTimers(
      session.get("http://test.com", { retryOptions: { retries: 1 } })
    );
    expect(error.response.status).toBe(429);
    expect(mockFetch).toHaveBeenCalledTimes(2); // не 4 (от сессионных retries: 3)
  });

  test("без retryOptions используются retries сессии", async () => {
    const session = SessionBuilder.create({ retries: 1 });
    mockFetch
      .mockResolvedValueOnce(makeResponse(500))
      .mockResolvedValueOnce(makeResponse(200, {}));

    const result = await awaitWithTimers(session.get("http://test.com"));
    expect(result.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  test("кастомный retryCondition переопределяет дефолтный", async () => {
    const session = SessionBuilder.create({ retries: 3 });
    mockFetch.mockResolvedValueOnce(makeResponse(429));

    const error = await catchWithTimers(
      session.get("http://test.com", {
        retryOptions: { retryCondition: () => false },
      })
    );
    expect(error.response.status).toBe(429);
    expect(mockFetch).toHaveBeenCalledTimes(1); // условие всегда false — retry нет
  });
});
