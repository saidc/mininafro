(() => {
  const $ = (s, p=document) => p.querySelector(s);

  const form = $('#loginForm');
  const alertBox = $('#loginAlert');
  const year = $('#year');
  const toggle = $('#togglePassword');
  const pass = $('#password');
  const user = $('#username');

  year.textContent = new Date().getFullYear();

  toggle.addEventListener('click', () => {
    const show = pass.type === 'password';
    pass.type = show ? 'text' : 'password';
    toggle.setAttribute('aria-pressed', String(show));
    toggle.textContent = show ? '🙈' : '👁️';
  });

  function showError(msg){
    alertBox.hidden = false;
    alertBox.textContent = msg;
  }
  function clearError(){
    alertBox.hidden = true;
    alertBox.textContent = '';
  }

  function setLoading(isLoading) {
    // opcional: deshabilitar form mientras valida
    const btn = form.querySelector('button[type="submit"]');
    if (btn) btn.disabled = isLoading;
    if (btn) btn.textContent = isLoading ? 'Ingresando...' : 'Ingresar';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const username = user.value.trim();
    const password = pass.value.trim();

    if (!username) return showError('Ingresa tu usuario.');
    if (!password) return showError('Ingresa tu contraseña.');

    setLoading(true);

    try {
      // Express está usando express.urlencoded() => enviamos x-www-form-urlencoded
      const body = new URLSearchParams({ username, password });

      const res = await fetch('/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body,
        credentials: 'same-origin', // importante para que se guarden cookies
        redirect: 'follow',         // seguirá el 302 hacia /home
      });

      // Si credenciales malas, tu backend hace status 401 y renderiza login
      if (res.status === 401) {
        // intenta extraer un mensaje simple (si tu HTML lo incluye)
        showError('Credenciales inválidas.');
        return;
      }

      // Si todo OK, normalmente terminarás en /home luego del redirect
      if (res.ok) {
        // res.url suele contener la url final después del redirect (en muchos navegadores)
        // Si por alguna razón no está, mandamos a /home.
        const finalUrl = res.url || '/home';

        // Si el servidor devolvió HTML de /home, igual navegamos para cargar correctamente la página
        window.location.assign(finalUrl.includes('/home') ? finalUrl : '/home');
        return;
      }

      // Otros códigos
      showError(`Error: ${res.status} ${res.statusText}`);
    } catch (err) {
      console.error(err);
      showError('No se pudo conectar con el servidor. Verifica tu conexión o intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  });

  $('#forgotLink').addEventListener('click', (e) => {
    e.preventDefault();
    showError('Contacta a mesa de ayuda para recuperación de acceso.');
  });
})();
