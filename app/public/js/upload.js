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
