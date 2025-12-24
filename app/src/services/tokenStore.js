const crypto = require("crypto");
const env = require("../config/env");

const tokens = new Map();

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

function createSession(username) {
  const token = generateToken();
  const expiresAt = Date.now() + env.TOKEN_TTL_MINUTES * 60 * 1000;
  tokens.set(token, { username, expiresAt });
  return { token, expiresAt };
}

function validateToken(token) {
  if (!token) return null;
  const data = tokens.get(token);
  if (!data) return null;
  if (Date.now() > data.expiresAt) {
    tokens.delete(token);
    return null;
  }
  return data;
}

function revokeToken(token) {
  if (token) tokens.delete(token);
}

module.exports = { createSession, validateToken, revokeToken };
