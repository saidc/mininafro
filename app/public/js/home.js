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
  const ROUTES = {
    dashboard: { title: "Inicio", tpl: "#tpl-dashboard" },
    mesas: { title: "Módulo", tpl: "#tpl-mesas" },
    reportes: { title: "Reportes", tpl: "#tpl-reportes" },
    admin: { title: "Administración", tpl: "#tpl-admin" },
    mapa: { title: "Territorio", tpl: "#tpl-territorio" }
  };

  const setActiveNav = (route) => {
    nav.querySelectorAll(".nav__item").forEach((b) => {
      const on = b.dataset.route === route;
      b.classList.toggle("is-active", on);
      b.toggleAttribute("aria-current", on);
    });
  };

  const renderRoute = (route) => {
    const cfg = ROUTES[route] || ROUTES.dashboard;
    const tpl = document.querySelector(cfg.tpl);

    pageTitle.textContent = cfg.title;
    activeRouteEl.textContent = route;

    view.innerHTML = "";
    view.append(tpl.content.cloneNode(true));

    setActiveNav(route);
    localStorage.setItem("ui.route", route);
    if (isMobile()) openSidebar(false);
  };

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
