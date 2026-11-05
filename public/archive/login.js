(() => {
  const dialog = document.createElement('dialog');
  dialog.className = 'archive-login';
  dialog.setAttribute('aria-labelledby', 'archive-login-title');
  dialog.innerHTML = `
    <div class="archive-login__frame">
      <button class="archive-login__close" type="button" aria-label="Close sign in">×</button>
      <span class="archive-login__eyebrow">✦ &nbsp; THE SEALED DESK &nbsp; ✦</span>
      <div class="archive-login__seal" aria-hidden="true">C</div>
      <h2 id="archive-login-title">Enter the archive</h2>
      <p class="archive-login__intro">개인 서재로 들어가는 문입니다.</p>
      <form class="archive-login__form">
        <label for="archive-email">ACCOUNT ID</label>
        <input id="archive-email" name="id" type="text" autocomplete="username" placeholder="Account ID" required>
        <label for="archive-password">PASSWORD</label>
        <div class="archive-login__password"><input id="archive-password" name="password" type="password" autocomplete="current-password" placeholder="••••••••" required><button type="button" aria-label="Show password" aria-pressed="false">SHOW</button></div>
        <button class="archive-login__submit" type="submit"><span>CAST ALOHOMORA</span><span aria-hidden="true">↗</span></button>
      </form>
      <p class="archive-login__notice" role="status" aria-live="polite"></p>
    </div>`;
  document.body.append(dialog);

  let opener;
  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-open-login]');
    if (!trigger) return;
    opener = trigger;
    dialog.showModal();
    dialog.querySelector('#archive-email').focus();
  });
  const close = () => dialog.close();
  dialog.querySelector('.archive-login__close').addEventListener('click', close);
  dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
  dialog.addEventListener('close', () => {
    dialog.querySelector('#archive-password').value = '';
    opener?.focus();
  });

  const password = dialog.querySelector('#archive-password');
  const toggle = dialog.querySelector('.archive-login__password button');
  toggle.addEventListener('click', () => {
    const visible = password.type === 'password';
    password.type = visible ? 'text' : 'password';
    toggle.textContent = visible ? 'HIDE' : 'SHOW';
    toggle.setAttribute('aria-label', visible ? 'Hide password' : 'Show password');
    toggle.setAttribute('aria-pressed', String(visible));
  });
  dialog.querySelector('form').addEventListener('submit', async event => {
    event.preventDefault();
    const submit = dialog.querySelector('.archive-login__submit');
    const notice = dialog.querySelector('.archive-login__notice');
    submit.disabled = true;
    notice.textContent = '서재를 여는 중…';
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: dialog.querySelector('#archive-email').value, password: password.value }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '로그인에 실패했어요.');
      password.value = '';
      dialog.close();
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('cedrai-auth');
        channel.postMessage('login');
        channel.close();
      }
      location.assign('/blog');
    } catch (error) {
      notice.textContent = error.message || '서버에 연결할 수 없어요.';
    } finally {
      submit.disabled = false;
    }
  });
})();
