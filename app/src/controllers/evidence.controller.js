const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const Busboy = require("busboy");

const env = require("../config/env");
const { evidencePath, safeFileName } = require("../utils/paths");

async function ensureUploadDir() {
  await fsp.mkdir(env.UPLOAD_DIR_ABS, { recursive: true });
}

function getEvidencePage(req, res) {
  res.render("evidence", { user: req.user });
}

async function uploadEvidence(req, res) {
  await ensureUploadDir();

  const busboy = Busboy({ headers: req.headers });
  let savedFile = null;

  busboy.on("file", (fieldname, fileStream, info) => {
    const originalName = info.filename || "archivo";
    const finalName = `${Date.now()}_${safeFileName(originalName)}`;
    const finalPath = evidencePath(finalName);

    const writeStream = fs.createWriteStream(finalPath);
    savedFile = { originalName, finalName, finalPath };

    fileStream.pipe(writeStream);

    writeStream.on("error", (err) => {
      console.error("Error escribiendo archivo:", err);
      return res.status(500).json({ ok: false, error: "Error guardando archivo." });
    });
  });

  busboy.on("finish", () => {
    if (!savedFile) return res.status(400).json({ ok: false, error: "No se recibió archivo." });

    return res.json({
      ok: true,
      message: "Evidencia cargada.",
      file: {
        originalName: savedFile.originalName,
        savedAs: path.basename(savedFile.finalPath),
        storedIn: env.UPLOAD_DIR
      }
    });
  });

  req.pipe(busboy);
}

module.exports = { getEvidencePage, uploadEvidence };
