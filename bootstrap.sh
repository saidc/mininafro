#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${1:-mininafro}"
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

# =========
# Pre-chequeos mínimos
# =========
if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: Docker no está instalado. Instálalo primero y vuelve a ejecutar."
  echo "Guía rápida (Ubuntu): https://docs.docker.com/engine/install/ubuntu/"
  exit 1
fi

# Soporta 'docker compose' (plugin) o compose standalone (v1)
if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  echo "ERROR: Docker Compose no está disponible. Instala el plugin Docker Compose."
  exit 1
fi

# =========
# Redes (para futuro DB en otro stack)
# Creamos una red externa compartible: shared_net
# =========
if ! docker network inspect shared_net >/dev/null 2>&1; then
  docker network create shared_net >/dev/null
  echo "Creada red externa: shared_net"
else
  echo "Red externa ya existe: shared_net"
fi

# =========
# Carpetas
# =========
mkdir -p nginx/conf.d
mkdir -p app/src/{config,middleware,routes,controllers,services,utils}
mkdir -p app/views
mkdir -p app/public/{css,js}
mkdir -p storage/evidences

# Ajusta permisos para que el contenedor pueda escribir evidencias.
# En Ubuntu, el usuario principal suele ser UID 1000. Tomamos tu UID/GID actual:
UID_NOW="$(id -u)"
GID_NOW="$(id -g)"
chmod -R 775 storage || true
chown -R "$UID_NOW":"$GID_NOW" storage || true

# =========
# .env (para Compose + app)
# =========
cat > .env <<EOF
PORT=3000

BASIC_USER=admin
BASIC_PASS=admin123

COOKIE_NAME=auth_token
COOKIE_SECRET=cambia_esto_por_un_secreto_largo_y_unico

UPLOAD_DIR=storage/evidences
TOKEN_TTL_MINUTES=480
NODE_ENV=production

# Para correr el contenedor app con tu UID/GID y evitar líos de permisos en volúmenes
UID=${UID_NOW}
GID=${GID_NOW}
EOF

# =========
# docker-compose.yml
# - nginx expone 80
# - app solo interno (nginx proxy)
# - networks:
#   - edge_net: red interna entre nginx y app
#   - shared_net: red EXTERNA para futuro DB u otros servicios en otro compose
# =========
cat > docker-compose.yml <<'EOF'
services:
  nginx:
    image: nginx:1.27-alpine
    container_name: webapp_nginx
    depends_on:
      - app
    ports:
      - "80:80"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
    networks:
      - edge_net
    restart: unless-stopped

  app:
    build:
      context: ./app
      dockerfile: Dockerfile
    container_name: webapp_app
    env_file:
      - ./.env
    environment:
      - PORT=3000
    user: "${UID}:${GID}"
    volumes:
      - ./storage:/app/storage
    expose:
      - "3000"
    networks:
      - edge_net
      - shared_net
    restart: unless-stopped

networks:
  edge_net:
    name: webapp_edge_net
    driver: bridge

  shared_net:
    external: true
    name: shared_net
EOF

# =========
# Nginx reverse proxy (puerto 80 -> app:3000)
# Nota: proxy_request_buffering off ayuda a "streaming" en uploads
# =========
cat > nginx/conf.d/webapp.conf <<'EOF'
server {
  listen 80;
  server_name _;

  client_max_body_size 100m;

  # Logs (opcionales)
  access_log /var/log/nginx/access.log;
  error_log  /var/log/nginx/error.log warn;

  location / {
    proxy_pass http://app:3000;
    proxy_http_version 1.1;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

    # Sube archivos "streaming" hacia upstream
    proxy_request_buffering off;

    proxy_connect_timeout 60s;
    proxy_send_timeout 600s;
    proxy_read_timeout 600s;
  }
}
EOF

# =========
# App Node: package.json
# =========
cat > app/package.json <<'EOF'
{
  "name": "mininafro",
  "version": "1.0.0",
  "private": true,
  "main": "src/server.js",
  "type": "commonjs",
  "scripts": {
    "start": "node src/server.js"
  },
  "dependencies": {
    "busboy": "^1.6.0",
    "cookie-parser": "^1.4.6",
    "dotenv": "^16.4.5",
    "ejs": "^3.1.10",
    "express": "^4.19.2",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0"
  }
}
EOF

# =========
# App Node: Dockerfile
# =========
cat > app/Dockerfile <<'EOF'
FROM node:20-alpine

WORKDIR /app

# Dependencias
COPY package.json ./
RUN npm install --omit=dev

# Código
COPY . .

# Seguridad: crea carpeta y da permisos (el usuario real se setea desde compose con UID/GID)
RUN mkdir -p /app/storage/evidences

ENV PORT=3000
EXPOSE 3000

CMD ["node", "src/server.js"]
EOF

# =========
# App Node: src/config/env.js
# =========
cat > app/src/config/env.js <<'EOF'
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
EOF

# =========
# App Node: src/utils/paths.js
# =========
cat > app/src/utils/paths.js <<'EOF'
const path = require("path");
const env = require("../config/env");

function safeFileName(name) {
  return String(name).replace(/[^a-zA-Z0-9._-]/g, "_");
}

function evidencePath(fileName) {
  return path.join(env.UPLOAD_DIR_ABS, safeFileName(fileName));
}

module.exports = { safeFileName, evidencePath };
EOF

# =========
# App Node: token store (memoria)
# =========
cat > app/src/services/tokenStore.js <<'EOF'
const crypto = require("crypto");
const env = require("../config/env");

const tokens = new Map(); // token -> { username, expiresAt }

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
EOF

# =========
# App Node: middleware/auth.js
# =========
cat > app/src/middleware/auth.js <<'EOF'
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
EOF

# =========
# App Node: controllers
# =========
cat > app/src/controllers/auth.controller.js <<'EOF'
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
EOF

cat > app/src/controllers/evidence.controller.js <<'EOF'
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
EOF

# =========
# App Node: routes
# =========
cat > app/src/routes/auth.routes.js <<'EOF'
const express = require("express");
const { getLogin, postLogin, logout } = require("../controllers/auth.controller");

const router = express.Router();

router.get("/login", getLogin);
router.post("/login", postLogin);
router.get("/logout", logout);

module.exports = router;
EOF

cat > app/src/routes/app.routes.js <<'EOF'
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
EOF

# =========
# App Node: app + server
# =========
cat > app/src/app.js <<'EOF'
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const morgan = require("morgan");

const env = require("./config/env");
const authRoutes = require("./routes/auth.routes");
const appRoutes = require("./routes/app.routes");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "views"));

app.use(helmet());
app.use(morgan("combined"));

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(env.COOKIE_SECRET));

app.use("/public", express.static(path.join(process.cwd(), "public")));

app.use(authRoutes);
app.use(appRoutes);

module.exports = app;
EOF

cat > app/src/server.js <<'EOF'
require("dotenv").config();
const env = require("./config/env");
const app = require("./app");

app.listen(env.PORT, () => {
  console.log(`App escuchando en puerto ${env.PORT}`);
});
EOF

# =========
# Vistas mínimas (EJS)
# =========
cat > app/views/login.ejs <<'EOF'
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Login</title>
  <link rel="stylesheet" href="/public/css/base.css">
  <script defer src="/public/js/page-loader.js"></script>
</head>
<body>
  <div id="pageLoader" class="loader-overlay">
    <div class="spinner"></div>
  </div>

  <main class="container">
    <h1>Login</h1>

    <% if (error) { %>
      <p class="error"><%= error %></p>
    <% } %>

    <form method="POST" action="/login" class="card">
      <label>Usuario</label>
      <input name="username" required />

      <label>Contraseña</label>
      <input name="password" type="password" required />

      <button type="submit">Entrar</button>
    </form>
  </main>
</body>
</html>
EOF

cat > app/views/home.ejs <<'EOF'
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Home</title>
  <link rel="stylesheet" href="/public/css/base.css">
  <script defer src="/public/js/page-loader.js"></script>
</head>
<body>
  <div id="pageLoader" class="loader-overlay">
    <div class="spinner"></div>
  </div>

  <main class="container">
    <h1>Home</h1>
    <p>Usuario: <b><%= user.username %></b></p>

    <div class="card">
      <a href="/evidencia">Ir a módulo de evidencia</a><br/>
      <a href="/logout">Cerrar sesión</a>
    </div>
  </main>
</body>
</html>
EOF

cat > app/views/evidence.ejs <<'EOF'
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Evidencia</title>
  <link rel="stylesheet" href="/public/css/base.css">
  <script defer src="/public/js/page-loader.js"></script>
  <script defer src="/public/js/upload.js"></script>
</head>
<body>
  <div id="pageLoader" class="loader-overlay">
    <div class="spinner"></div>
  </div>

  <main class="container">
    <h1>Módulo de envío de evidencia</h1>
    <p>Usuario: <b><%= user.username %></b></p>

    <div class="card">
      <form id="uploadForm">
        <input type="file" name="evidence" id="evidenceFile" required />
        <button type="submit">Subir evidencia</button>
      </form>

      <div class="progress-wrap">
        <div id="progressBar" class="progress-bar"></div>
      </div>

      <pre id="resultBox" class="result"></pre>

      <a href="/home">Volver</a> | <a href="/logout">Cerrar sesión</a>
    </div>
  </main>
</body>
</html>
EOF

# =========
# Front estático mínimo
# =========
cat > app/public/js/page-loader.js <<'EOF'
(function () {
  const loader = document.getElementById("pageLoader");
  if (loader) loader.style.display = "flex";

  window.addEventListener("load", () => {
    if (!loader) return;
    loader.classList.add("fade-out");
    setTimeout(() => (loader.style.display = "none"), 250);
  });

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;
    const href = a.getAttribute("href");
    if (!href || href.startsWith("#")) return;
    if (loader) loader.style.display = "flex";
  });
})();
EOF

cat > app/public/js/upload.js <<'EOF'
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("uploadForm");
  const fileInput = document.getElementById("evidenceFile");
  const bar = document.getElementById("progressBar");
  const resultBox = document.getElementById("resultBox");

  function setProgress(pct) {
    bar.style.width = `${pct}%`;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const file = fileInput.files?.[0];
    if (!file) return;

    resultBox.textContent = "";
    setProgress(0);

    const fd = new FormData();
    fd.append("evidence", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/evidencia");

    xhr.upload.addEventListener("progress", (ev) => {
      if (!ev.lengthComputable) return;
      const pct = Math.round((ev.loaded / ev.total) * 100);
      setProgress(pct);
    });

    xhr.addEventListener("load", () => {
      try {
        resultBox.textContent = JSON.stringify(JSON.parse(xhr.responseText), null, 2);
      } catch {
        resultBox.textContent = xhr.responseText;
      }
      setTimeout(() => setProgress(0), 800);
    });

    xhr.addEventListener("error", () => {
      resultBox.textContent = "Error subiendo archivo.";
      setTimeout(() => setProgress(0), 800);
    });

    xhr.send(fd);
  });
});
EOF

cat > app/public/css/base.css <<'EOF'
* { box-sizing: border-box; font-family: system-ui, Arial; }
body { margin: 0; background: #f6f7fb; color: #111; }
.container { max-width: 720px; margin: 40px auto; padding: 0 16px; }
.card { background: #fff; padding: 16px; border-radius: 10px; border: 1px solid #e6e6e6; }
label { display:block; margin-top: 10px; }
input { width: 100%; padding: 10px; margin-top: 6px; }
button { margin-top: 12px; padding: 10px 14px; cursor: pointer; }
.error { color: #b00020; }

.progress-wrap {
  width: 100%;
  height: 10px;
  background: #eaeaea;
  border-radius: 99px;
  margin-top: 12px;
  overflow: hidden;
}
.progress-bar {
  width: 0%;
  height: 100%;
  background: #111;
  transition: width .1s linear;
}
.result {
  background: #0f172a;
  color: #e2e8f0;
  padding: 12px;
  border-radius: 10px;
  overflow: auto;
  margin-top: 12px;
}

/* Loader overlay */
.loader-overlay{
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,.85);
  z-index: 9999;
}
.spinner{
  width: 44px;
  height: 44px;
  border: 4px solid #ddd;
  border-top-color: #111;
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.fade-out { opacity: 0; transition: opacity .25s ease; }
EOF

echo "Construyendo y levantando con Docker Compose..."
$COMPOSE up -d --build

echo ""
echo "✅ Listo. Abre: http://<TU_IP_PUBLICA>/login"
echo "Credenciales por defecto (cámbialas en .env): admin / admin123"
echo ""
echo "Logs:"
echo "  $COMPOSE logs -f --tail=200"
