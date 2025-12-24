const env = require("../config/env");
const { validateToken } = require("../services/tokenStore");

function authRequired(req, res, next) {
  const token = req.cookies?.[env.COOKIE_NAME];
  const session = validateToken(token);

  if (!session) return res.redirect("/login");

  req.user = { username: session.username };
  next();
}

module.exports = { authRequired };
