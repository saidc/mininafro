const env = require("../config/env");
const { createSession, revokeToken } = require("../services/tokenStore");

function getLogin(req, res) {
  res.render("login", { error: null });
}

function postLogin(req, res) {
  const { username, password } = req.body;

  if (username !== env.BASIC_USER || password !== env.BASIC_PASS) {
    return res.status(401).render("login", { error: "Credenciales inválidas." });
  }

  const { token, expiresAt } = createSession(username);

  res.cookie(env.COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    expires: new Date(expiresAt),
  });

  return res.redirect("/home");
}

function logout(req, res) {
  const token = req.cookies?.[env.COOKIE_NAME];
  revokeToken(token);

  res.clearCookie(env.COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
  });

  return res.redirect("/login");
}

module.exports = { getLogin, postLogin, logout };
