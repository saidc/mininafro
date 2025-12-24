const path = require("path");

function required(name, value) {
  if (!value) throw new Error(`Falta variable de entorno: ${name}`);
  return value;
}

const env = {
  PORT: Number(process.env.PORT || 3000),

  BASIC_USER: required("BASIC_USER", process.env.BASIC_USER),
  BASIC_PASS: required("BASIC_PASS", process.env.BASIC_PASS),

  COOKIE_NAME: process.env.COOKIE_NAME || "auth_token",
  COOKIE_SECRET: required("COOKIE_SECRET", process.env.COOKIE_SECRET),

  UPLOAD_DIR: process.env.UPLOAD_DIR || "storage/evidences",
  TOKEN_TTL_MINUTES: Number(process.env.TOKEN_TTL_MINUTES || 480),

  NODE_ENV: process.env.NODE_ENV || "production",
};

env.UPLOAD_DIR_ABS = path.resolve(process.cwd(), env.UPLOAD_DIR);

module.exports = env;
