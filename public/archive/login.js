(() => {
  const dialog = document.createElement('dialog');
  dialog.className = 'archive-login';
  dialog.setAttribute('aria-labelledby', 'archive-login-title');
  dialog.innerHTML = `
    <div class="archive-login__frame">
      <button class="archive-login__close" type="button" aria-label="Close sign in">×</button>
      <span class="archive-login__eyebrow">✦ &nbsp; EXPECTO PATRONUM &nbsp; ✦</span>
      <div class="archive-login__seal" aria-hidden="true">✧</div>
      <h2 id="archive-login-title">The Guardian's Gate</h2>
      <p class="archive-login__intro">은빛 수호자가 서재의 문을 밝혔습니다. 로그인해 주세요.</p>
      <form class="archive-login__form">
        <label for="archive-email">ACCOUNT ID</label>
        <input id="archive-email" name="id" type="text" autocomplete="username" placeholder="Account ID" required>
        <label for="archive-password">PASSWORD</label>
        <div class="archive-login__password"><input id="archive-password" name="password" type="password" autocomplete="current-password" placeholder="••••••••" required><button type="button" aria-label="Show password" aria-pressed="false">SHOW</button></div>
        <button class="archive-login__submit" type="submit"><span>ENTER THE ARCHIVE</span><span aria-hidden="true">↗</span></button>
      </form>
      <p class="archive-login__notice" role="status" aria-live="polite"></p>
    </div>`;
  document.body.append(dialog);

  const desk = document.querySelector('.journal-access');
  const adminBar = document.getElementById('journal-admin-bar');
  const signInButton = desk?.querySelector('[data-spell="patronus"]');
  const writeLink = desk?.querySelector('.archive-write-link');
  const logoutButton = desk?.querySelector('.archive-logout');
  const deskMessage = desk?.querySelector('p');
  const signedOutMessage = deskMessage?.textContent || '';
  let currentRole = null;
  let authCheck = 0;

  async function refreshAuth() {
    const check = ++authCheck;
    let role = null;
    try {
      const response = await fetch('/api/me', { cache: 'no-store' });
      if (!response.ok) throw new Error('Session check failed');
      const session = await response.json();
      role = session.role;
    } catch {
      role = null;
    }
    if (check !== authCheck) return;
    currentRole = role;
    const isAdmin = role === 'admin';
    const signedIn = isAdmin || role === 'club-member';
    if (adminBar) adminBar.hidden = !isAdmin;
    if (signInButton) signInButton.hidden = signedIn;
    if (writeLink) writeLink.hidden = !isAdmin;
    if (logoutButton) logoutButton.hidden = !signedIn;
    if (deskMessage) {
      deskMessage.textContent = isAdmin
        ? '관리자로 로그인 중입니다. 새 글을 작성할 수 있습니다.'
        : signedIn ? '회원으로 로그인 중입니다. 글 작성은 관리자만 할 수 있습니다.' : signedOutMessage;
    }
  }

  refreshAuth();
  window.addEventListener('pageshow', event => { if (event.persisted) refreshAuth(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshAuth(); });
  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel('cedrai-auth');
    channel.addEventListener('message', refreshAuth);
  }
  logoutButton?.addEventListener('click', async () => {
    logoutButton.disabled = true;
    let loggedOut = false;
    try {
      const response = await fetch('/api/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Logout failed');
      loggedOut = true;
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('cedrai-auth');
        channel.postMessage('logout');
        channel.close();
      }
    } catch {
      // Keep the current session and let the next check restore the correct controls.
    } finally {
      await refreshAuth();
      if (!loggedOut && deskMessage) deskMessage.textContent = '로그아웃하지 못했습니다. 다시 시도해 주세요.';
      logoutButton.disabled = false;
    }
  });

  let opener;
  window.openArchiveLogin = trigger => {
    if (currentRole === 'admin') {
      location.assign('/blog/write');
      return;
    }
    if (dialog.open) return;
    opener = trigger || document.getElementById('spellbook-toggle');
    dialog.showModal();
    dialog.querySelector('#archive-email').focus();
  };
  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-open-login]');
    if (!trigger) return;
    window.openArchiveLogin(trigger);
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
