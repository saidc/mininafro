const express = require("express");
const { authRequired } = require("../middleware/auth");
const { getEvidencePage, uploadEvidence } = require("../controllers/evidence.controller");

const router = express.Router();

router.get("/", (req, res) => res.redirect("/home"));

router.get("/home", authRequired, (req, res) => {
  res.render("home", { user: req.user });
});

router.get("/evidencia", authRequired, getEvidencePage);
router.post("/evidencia", authRequired, uploadEvidence);

module.exports = router;
