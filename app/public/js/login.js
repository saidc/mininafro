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

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearError();

    if (!user.value.trim()) return showError('Ingresa tu usuario.');
    if (!pass.value.trim()) return showError('Ingresa tu contraseña.');

    // Aquí integras tu backend (fetch / submit real).
    // Demo: dispara un evento para que el app shell lo capture.
    document.dispatchEvent(new CustomEvent('app:login', {
      detail: { username: user.value.trim() }
    }));

    // Demo visual:
    showError('Demo: credenciales validadas por frontend. Conecta aquí tu API.');
  });

  $('#forgotLink').addEventListener('click', (e) => {
    e.preventDefault();
    showError('Contacta a mesa de ayuda para recuperación de acceso.');
  });
})();