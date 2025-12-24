// app/src/routes/territorio.routes.js
const express = require("express");
const { authRequired } = require("../middleware/auth");
const { getEvidencePage, uploadEvidence } = require("../controllers/evidence.controller");

const router = express.Router();

router.get("/territorio", authRequired, (req, res) => {
  res.render("partials/territorio", { user: req.user });
});


module.exports = router;
