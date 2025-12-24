const express = require("express");
const { getLogin, postLogin, logout } = require("../controllers/auth.controller");

const router = express.Router();

router.get("/login", getLogin);
router.post("/login", postLogin);
router.get("/logout", logout);

module.exports = router;
