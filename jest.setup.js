/**
 * Jest setupFiles — выполняется в каждом тестовом воркере.
 * Читает токен из файла .wbaas_token (записанного globalSetup) или из env.
 */
const fs = require("fs");
const path = require("path");

const TOKEN_FILE = path.resolve(__dirname, ".wbaas_token");

if (!process.env.WBAAS_TOKEN) {
  try {
    const data = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf8"));
    if (data.token && data.expires_at > Date.now()) {
      process.env.WBAAS_TOKEN = data.token;
    }
  } catch {
    // файла нет — токен не установлен
  }
}
