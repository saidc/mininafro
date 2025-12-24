const path = require("path");
const env = require("../config/env");

function safeFileName(name) {
  return String(name).replace(/[^a-zA-Z0-9._-]/g, "_");
}

function evidencePath(fileName) {
  return path.join(env.UPLOAD_DIR_ABS, safeFileName(fileName));
}

module.exports = { safeFileName, evidencePath };
