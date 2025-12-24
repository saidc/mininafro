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
