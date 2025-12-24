/* =========================================
   CONFIG (fácil de modificar)
   ========================================= */
window.APP_USER = window.APP_USER || { name: "Said Cortes" };
window.APP_CONFIG = window.APP_CONFIG || { appName: "Herramienta Tecnológica", version: "1.0" };

const ready = (fn) =>
  document.readyState !== "loading" ? fn() : document.addEventListener("DOMContentLoaded", fn);

ready(() => {
  const $ = (s, p = document) => p.querySelector(s);

  const root = document.documentElement;
  const mql = window.matchMedia("(max-width: 960px)");

  // Header
  const burger = $("#btnBurger");
  //$("#appName").textContent = window.APP_CONFIG.appName;

  // User menu
  const userMenu = $("#userMenu");
  const avatarBtn = $("#userAvatarBtn");
  const dropdown = $("#userDropdown");
  const userNameEl = $("#userName");
  const initialsEl = $("#userInitials");

  // Sidebar
  const nav = $("#sidebarNav");
  const overlay = $("#sidebarOverlay");

  // Footer
  $("#appVersion").textContent = window.APP_CONFIG.version;
  $("#footerYear").textContent = new Date().getFullYear();

  // Theme
  const themeSwitch = $("#themeSwitch");
  const themeLabel = $("#themeLabel");

  // Content module hooks
  const view = $("#view");
  const pageTitle = $("#pageTitle");
  const activeRouteEl = $("#activeRoute");

  const isMobile = () => mql.matches;

  /* ---------- User ---------- */
  const setUser = (name) => {
    const safe = (name || "Usuario").trim();
    userNameEl.textContent = safe;
    initialsEl.textContent =
      safe.split(/\s+/).slice(0, 2).map(w => (w[0] || "").toUpperCase()).join("") || "U";
  };
  setUser(window.APP_USER?.name);

  /* ---------- Dropdown ---------- */
  const setDropdown = (open) => {
    dropdown.hidden = !open;
    avatarBtn.setAttribute("aria-expanded", String(open));
  };

  avatarBtn.addEventListener("click", () => setDropdown(dropdown.hidden));
  document.addEventListener("click", (e) => {
    if (!userMenu.contains(e.target)) setDropdown(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      setDropdown(false);
      openSidebar(false);
    }
  });

  dropdown.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    setDropdown(false);

    // Demo hooks
    const action = btn.dataset.action;
    if (action === "logout") {
        fetch("/logout", {
            method: "GET",                 // cambia a "POST" si tu backend lo requiere
            credentials: "same-origin",    // manda cookies de sesión
            headers: { "Accept": "text/html" }
        }).then(() => {
            window.location.assign("/login"); // o a donde quieras ir tras logout
        }).catch(() => {
            // fallback si falla
            window.location.assign("/logout");
        });
        return;
    }else{ alert(`Acción (demo): ${action}`);}
  });

  /* ---------- Sidebar behavior ---------- */
  const setCollapsed = (collapsed) => {
    document.body.classList.toggle("sidebar-collapsed", collapsed);
    localStorage.setItem("ui.sidebarCollapsed", collapsed ? "1" : "0");
  };

  const openSidebar = (open) => {
    document.body.classList.toggle("sidebar-open", open);
    overlay.hidden = !open;
  };

  // Restore collapsed (solo desktop)
  if (localStorage.getItem("ui.sidebarCollapsed") === "1" && !isMobile()) setCollapsed(true);

  burger.addEventListener("click", () => {
    if (isMobile()) openSidebar(!document.body.classList.contains("sidebar-open"));
    else setCollapsed(!document.body.classList.contains("sidebar-collapsed"));
  });

  overlay.addEventListener("click", () => openSidebar(false));

  // Limpia estados cruzados al cambiar tamaño
  mql.addEventListener("change", () => {
    openSidebar(false);
    if (isMobile()) document.body.classList.remove("sidebar-collapsed");
    else if (localStorage.getItem("ui.sidebarCollapsed") === "1") setCollapsed(true);
  });

  /* ---------- Theme ---------- */
  const THEME_KEY = "ui.theme";
  const applyTheme = (theme) => {
    root.setAttribute("data-theme", theme);
    const dark = theme === "dark";
    themeSwitch.checked = dark;
    themeLabel.textContent = dark ? "Nocturno" : "Diurno";
  };

  const savedTheme = localStorage.getItem(THEME_KEY);
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(savedTheme || (systemDark ? "dark" : "light"));

  themeSwitch.addEventListener("change", () => {
    const theme = themeSwitch.checked ? "dark" : "light";
    localStorage.setItem(THEME_KEY, theme);
    applyTheme(theme);
  });

  /* =========================================
     ✅ CONTENT MODULE JS (REEMPLAZABLE)
     👉 Si cambias el módulo, puedes borrar
        este bloque y poner tu propio render.
     ========================================= */
/* =========================================
   ROUTES
   - tpl: usa templates locales (los <template> de home.ejs)
   - server: trae HTML desde backend y lo inserta en #view
   ========================================= */
const ROUTES = {
  dashboard: { title: "Inicio", tpl: "#tpl-dashboard" },
  mesas: { title: "Módulo", tpl: "#tpl-mesas" },
  reportes: { title: "Reportes", tpl: "#tpl-reportes" },
  admin: { title: "Administración", tpl: "#tpl-admin" },

  // ✅ Territorio se carga desde backend
  territorio: { title: "Territorio", server: "/territorio" }
};

const setActiveNav = (route) => {
  nav.querySelectorAll(".nav__item").forEach((b) => {
    const on = b.dataset.route === route;
    b.classList.toggle("is-active", on);
    b.toggleAttribute("aria-current", on);
  });
};

/* =========================================
   Leaflet loader + mapa init
   (se ejecuta SOLO al entrar a "territorio")
   ========================================= */
async function loadLeafletOnce() {
  if (window.L) return; // ya está cargado

  // CSS Leaflet
  if (!document.getElementById("leaflet-css")) {
    const link = document.createElement("link");
    link.id = "leaflet-css";
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
  }

  // JS Leaflet
  await new Promise((resolve, reject) => {
    if (document.getElementById("leaflet-js")) return resolve();

    const s = document.createElement("script");
    s.id = "leaflet-js";
    s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.onload = resolve;
    s.onerror = reject;
    document.body.appendChild(s);
  });
}

let territorioMap = null;

function destroyTerritorioMap() {
  if (territorioMap) {
    territorioMap.remove();
    territorioMap = null;
  }
}

async function initTerritorioMap() {
  const mapDiv = document.getElementById("map");
  if (!mapDiv) return; // si el backend no trajo el div, no hay nada que inicializar

  destroyTerritorioMap();

  // crea el mapa
  territorioMap = L.map("map", { zoomControl: true }).setView([4.6, -74.1], 6);

  // tiles
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(territorioMap);

  // geojson (DANE) - igual que tu ejemplo base
  const DANE_DEPTOS_GEOJSON =
    "https://geoportal.dane.gov.co/mparcgis/rest/services/INDICADORES_CTERRITORIO/Cache_MpiosCTDeptosAM_DivisionPolitica_2012/MapServer/2/query" +
    "?where=1%3D1&outFields=*&returnGeometry=true&f=geojson&outSR=4326&geometryPrecision=5";

  const resp = await fetch(DANE_DEPTOS_GEOJSON);
  if (!resp.ok) throw new Error("No se pudo cargar el GeoJSON de departamentos");
  const geojson = await resp.json();

  const baseStyle = () => ({ weight: 1.2, opacity: 0.9, color: "#444", fillOpacity: 0.08 });
  const highlightStyle = () => ({ weight: 4.5, opacity: 1, color: "#ff6a00", fillOpacity: 0.12, dashArray: "6 4" });

  let activeLayer = null;
  let deptosLayer = null;

  function resetHighlight() {
    if (activeLayer && deptosLayer) {
      deptosLayer.resetStyle(activeLayer);
      activeLayer = null;
    }
  }

  function highlightLayer(layer, opts = { zoomTo: true, openPopup: true }) {
    resetHighlight();
    activeLayer = layer;
    layer.setStyle(highlightStyle());
    if (layer.bringToFront) layer.bringToFront();
    if (opts.openPopup) layer.openPopup();
    if (opts.zoomTo) territorioMap.fitBounds(layer.getBounds(), { padding: [20, 20] });
  }

  deptosLayer = L.geoJSON(geojson, {
    style: baseStyle,
    onEachFeature: (feature, layer) => {
      const depto = feature?.properties?.NOM_DPTO || "Departamento";
      const codigo = feature?.properties?.COD_DPTO || "";
      layer.bindPopup(`<b>${depto}</b><br/>Código: ${codigo}<br/><small>Click para subrayar</small>`);
      layer.on("click", () => highlightLayer(layer, { zoomTo: false, openPopup: true }));
    }
  }).addTo(territorioMap);

  territorioMap.fitBounds(deptosLayer.getBounds(), { padding: [10, 10] });

  // Botones opcionales si existen en el HTML que devuelve el backend:
  document.getElementById("btnReset")?.addEventListener("click", () => {
    resetHighlight();
    territorioMap.fitBounds(deptosLayer.getBounds(), { padding: [10, 10] });
  });
}

/* =========================================
   ✅ renderRoute (listo para copiar/pegar)
   - Si hay tpl => render local
   - Si hay server => fetch backend, inyecta HTML y luego init mapa
   ========================================= */
async function renderRoute(route) {
  const cfg = ROUTES[route] || ROUTES.dashboard;

  pageTitle.textContent = cfg.title;
  activeRouteEl.textContent = route;
  setActiveNav(route);
  localStorage.setItem("ui.route", route);

  // si salgo de territorio, limpio el mapa (evita bugs al volver)
  if (route !== "territorio") destroyTerritorioMap();

  // 1) RUTA LOCAL (templates <template>)
  if (cfg.tpl) {
    const tpl = document.querySelector(cfg.tpl);
    view.innerHTML = "";
    view.append(tpl.content.cloneNode(true));
    if (isMobile()) openSidebar(false);
    return;
  }

  // 2) RUTA SERVER (backend retorna HTML)
  if (cfg.server) {
    view.innerHTML = `<p class="muted">Cargando...</p>`;

    const resp = await fetch(cfg.server, { headers: { "Accept": "text/html" } });
    const html = await resp.text();

    view.innerHTML = html;

    // 👇 IMPORTANTE: el mapa se inicializa DESPUÉS de insertar el HTML
    if (route === "territorio") {
      await loadLeafletOnce();
      await initTerritorioMap();
    }

    if (isMobile()) openSidebar(false);
    return;
  }

  // fallback por si alguien configura mal la ruta
  view.innerHTML = `<p class="muted">Ruta no configurada.</p>`;
}


  nav.addEventListener("click", (e) => {
    const btn = e.target.closest(".nav__item");
    if (!btn) return;
    renderRoute(btn.dataset.route || "dashboard");
  });

  // Initial route
  renderRoute(localStorage.getItem("ui.route") || "dashboard");

  /* Footer demo */
  document.querySelector(".footer").addEventListener("click", (e) => {
    const link = e.target.closest("[data-footer]");
    if (!link) return;
    e.preventDefault();
    alert(`Footer (demo): ${link.dataset.footer}`);
  });
});
