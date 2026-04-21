/* eslint-disable no-undef */

jest.mock("undici", () => ({
  fetch: jest.fn(),
  Agent: jest.fn().mockImplementation(() => ({})),
}));

const Constants = require("../src/Constants");
const WBProduct = require("../src/WBProduct");
const WBQuestion = require("../src/WBQuestion");

// Создаёт WBProduct с mocked session.get.
// totalQuestions задаётся через _rawResponse.imt_id и totalQuestions.
function makeProduct(totalQuestions, imtId = 12345678) {
  const product = new WBProduct(imtId);
  product.totalQuestions = totalQuestions;
  product._rawResponse.imt_id = imtId;
  product.session = { get: jest.fn() };
  return product;
}

// Формирует ответ API для страницы вопросов с `count` записями.
function makeQuestionsResponse(count) {
  const questions = Array.from({ length: count }, (_, i) => ({
    id: String(i + 1),
    text: `Question ${i + 1}`,
    answer: null,
    productDetails: { imtId: 12345678 },
    createdDate: "2024-01-01T00:00:00Z",
  }));
  return { status: 200, data: { questions } };
}

// ---------------------------------------------------------------------------

describe("WBProduct.getQuestions() — структура ответа", () => {
  test("возвращает объект с items, totalQuestions, fetchedQuestions, truncated", async () => {
    const product = makeProduct(Constants.QUESTIONS_PER_PAGE);
    product.session.get
      .mockResolvedValueOnce(makeQuestionsResponse(Constants.QUESTIONS_PER_PAGE))
      .mockResolvedValueOnce(makeQuestionsResponse(0)); // пустая страница — стоп

    const result = await product.getQuestions();

    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("totalQuestions");
    expect(result).toHaveProperty("fetchedQuestions");
    expect(result).toHaveProperty("truncated");
  });

  test("items содержат экземпляры WBQuestion", async () => {
    const product = makeProduct(1);
    product.session.get.mockResolvedValueOnce(makeQuestionsResponse(1));

    const result = await product.getQuestions();

    expect(result.items.length).toBe(1);
    expect(result.items[0]).toBeInstanceOf(WBQuestion);
  });
});

// ---------------------------------------------------------------------------

describe("WBProduct.getQuestions() — truncated: false (полная выдача)", () => {
  test("truncated: false когда fetched === total", async () => {
    const count = Constants.QUESTIONS_PER_PAGE;
    const product = makeProduct(count);
    product.session.get
      .mockResolvedValueOnce(makeQuestionsResponse(count))
      .mockResolvedValueOnce(makeQuestionsResponse(0));

    const result = await product.getQuestions();

    expect(result.fetchedQuestions).toBe(count);
    expect(result.totalQuestions).toBe(count);
    expect(result.truncated).toBe(false);
  });

  test("totalQuestions: 0 → truncated: false, items: []", async () => {
    const product = makeProduct(0);
    product.session.get.mockResolvedValueOnce(makeQuestionsResponse(0));

    const result = await product.getQuestions();

    expect(result.items).toEqual([]);
    expect(result.fetchedQuestions).toBe(0);
    expect(result.truncated).toBe(false);
  });
});

// ---------------------------------------------------------------------------

describe("WBProduct.getQuestions() — truncated: true (API обрезал выдачу)", () => {
  test("truncated: true когда пустая страница приходит раньше конца", async () => {
    // API говорит 60 вопросов, но отдаёт только одну страницу (30), потом пустую
    const product = makeProduct(Constants.QUESTIONS_PER_PAGE * 2);
    product.session.get
      .mockResolvedValueOnce(makeQuestionsResponse(Constants.QUESTIONS_PER_PAGE))
      .mockResolvedValueOnce(makeQuestionsResponse(0)); // WB API обрезал

    const result = await product.getQuestions();

    expect(result.fetchedQuestions).toBe(Constants.QUESTIONS_PER_PAGE);
    expect(result.totalQuestions).toBe(Constants.QUESTIONS_PER_PAGE * 2);
    expect(result.truncated).toBe(true);
  });
});

// ---------------------------------------------------------------------------

describe("WBProduct.getQuestions() — side effects", () => {
  test("this.questions содержит массив items после вызова", async () => {
    const count = 5;
    const product = makeProduct(count);
    product.session.get
      .mockResolvedValueOnce(makeQuestionsResponse(count))
      .mockResolvedValueOnce(makeQuestionsResponse(0));

    const result = await product.getQuestions();

    expect(product.questions).toBe(result.items);
    expect(Array.isArray(product.questions)).toBe(true);
  });

  test("this.questionsMeta совпадает с возвращённым объектом", async () => {
    const count = 5;
    const product = makeProduct(count);
    product.session.get
      .mockResolvedValueOnce(makeQuestionsResponse(count))
      .mockResolvedValueOnce(makeQuestionsResponse(0));

    const result = await product.getQuestions();

    expect(product.questionsMeta).toBe(result);
  });
});
