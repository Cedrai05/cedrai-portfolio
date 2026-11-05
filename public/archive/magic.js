(() => {
  const gate = document.getElementById('spell-gate');
  const toggle = document.getElementById('spellbook-toggle');
  const menu = document.getElementById('spellbook-menu');
  const veil = document.querySelector('.spellbook__veil');
  const toast = document.getElementById('spellbook-toast');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const home = document.getElementById('home');
  const homeSigil = document.querySelector('.home-sigil');
  const homeMagic = document.getElementById('home-magic');
  let busy = false;
  let summoning = false;
  let toastTimer;
  let lastTrail = 0;
  let guardian;
  let patronusLoginTimer;
  const inertWhileOpen = [];

  function spark(x, y, burst = false) {
    if (reducedMotion.matches) return;
    const count = burst ? 9 : 1;
    for (let i = 0; i < count; i++) {
      const mote = document.createElement('span');
      const angle = burst ? (Math.PI * 2 * i / count) : (Math.random() * Math.PI * 2);
      const distance = burst ? 42 + Math.random() * 40 : 10 + Math.random() * 18;
      mote.className = 'cast-spark';
      mote.style.left = `${x}px`;
      mote.style.top = `${y}px`;
      mote.style.setProperty('--spark-x', `${Math.cos(angle) * distance}px`);
      mote.style.setProperty('--spark-y', `${Math.sin(angle) * distance}px`);
      mote.style.setProperty('--spark-size', `${burst ? 3 + (i % 3) : 2}px`);
      document.body.append(mote);
      setTimeout(() => mote.remove(), 850);
    }
  }

  if (homeMagic && !reducedMotion.matches) {
    for (let i = 0; i < 17; i++) {
      const mote = document.createElement('span');
      mote.className = 'home-magic__mote';
      mote.style.left = `${6 + (i * 57) % 89}%`;
      mote.style.top = `${9 + (i * 37) % 76}%`;
      mote.style.animationDelay = `-${(i % 7) * .72}s`;
      mote.style.animationDuration = `${3.5 + (i % 5) * .65}s`;
      homeMagic.append(mote);
    }
    home.addEventListener('pointermove', event => {
      if (home.hidden || event.pointerType !== 'mouse') return;
      const bounds = homeSigil.getBoundingClientRect();
      homeSigil.style.setProperty('--tilt-x', `${Math.max(-13, Math.min(13, (event.clientX - bounds.left - bounds.width / 2) / 14))}deg`);
      homeSigil.style.setProperty('--tilt-y', `${Math.max(-13, Math.min(13, (bounds.top + bounds.height / 2 - event.clientY) / 14))}deg`);
      if (Date.now() - lastTrail > 95) { spark(event.clientX, event.clientY); lastTrail = Date.now(); }
    });
    home.addEventListener('pointerleave', () => {
      homeSigil.style.setProperty('--tilt-x', '0deg');
      homeSigil.style.setProperty('--tilt-y', '0deg');
    });
    home.addEventListener('pointerdown', event => { if (!home.hidden) spark(event.clientX, event.clientY, true); });
  }

  const remember = (key, value) => {
    try { sessionStorage.setItem(key, value ? '1' : '0'); } catch {}
  };
  const recalled = key => {
    try { return sessionStorage.getItem(key) === '1'; } catch { return false; }
  };
  const closeMenu = () => {
    const focusWasInside = menu.contains(document.activeElement);
    menu.hidden = true;
    veil.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', '주문서 펼치기');
    inertWhileOpen.splice(0).forEach(element => { element.inert = false; });
    if (focusWasInside) toggle.focus();
  };
  window.closeSpellbook = closeMenu;
  const announce = message => {
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2900);
  };
  window.castPatronus = () => {
    closeMenu();
    clearTimeout(patronusLoginTimer);
    const center = { x: innerWidth / 2, y: innerHeight * .47 };
    spark(center.x, center.y, true);
    announce('Expecto Patronum — 은빛 수호자가 서재의 문을 엽니다.');
    guardian?.remove();
    if (reducedMotion.matches) {
      window.openArchiveLogin?.(toggle);
      return;
    }
    guardian = document.createElement('div');
    guardian.className = 'patronus-flight';
    guardian.setAttribute('aria-hidden', 'true');
    guardian.innerHTML = `<span class="patronus-flight__halo"></span><svg viewBox="0 0 260 170"><path class="patronus-flight__wing patronus-flight__wing--left" d="M130 91C96 45 49 27 10 47c38 13 58 48 86 62 16 8 28 3 34-5Z"/><path class="patronus-flight__wing patronus-flight__wing--right" d="M130 91c34-46 81-64 120-44-38 13-58 48-86 62-16 8-28 3-34-5Z"/><path d="M110 91c-2-16-5-25-10-38l17 10q13-9 26 0l17-10c-5 13-8 22-10 38 6 27-4 49-20 63-16-14-26-36-20-63Z"/><path d="M116 103q14 10 28 0m-30 15q16 12 32 0M126 95l4 6 4-6" fill="none"/><circle class="patronus-flight__eyes" cx="119" cy="83" r="2.8"/><circle class="patronus-flight__eyes" cx="141" cy="83" r="2.8"/></svg><span class="patronus-flight__ribbon">EXPECTO PATRONUM</span><i class="patronus-flight__mote"></i><i class="patronus-flight__mote"></i><i class="patronus-flight__mote"></i><i class="patronus-flight__mote"></i>`;
    document.body.append(guardian);
    const current = guardian;
    setTimeout(() => { current.remove(); if (guardian === current) guardian = null; }, 3150);
    patronusLoginTimer = setTimeout(() => window.openArchiveLogin?.(toggle), 2600);
  };
  const setLumos = enabled => {
    document.body.classList.toggle('lumos-active', enabled);
    remember('cedrai-lumos', enabled);
    const button = document.querySelector('.spellbook__menu [data-spell="lumos"]');
    button.querySelector('strong').textContent = enabled ? 'Nox' : 'Lumos';
    button.querySelector('small').textContent = enabled ? '빛을 거두기' : '아카이브에 빛 밝히기';
    button.setAttribute('aria-pressed', String(enabled));
    if (homeSigil) { homeSigil.setAttribute('aria-label', enabled ? 'Cast Nox' : 'Cast Lumos'); homeSigil.setAttribute('aria-pressed', String(enabled)); }
    const heroCast = document.querySelector('.hero-cast');
    if (heroCast) { heroCast.querySelector('.hero-cast__label').textContent = enabled ? 'CAST NOX' : 'CAST LUMOS'; heroCast.setAttribute('aria-pressed', String(enabled)); }
  };
  const setRevelio = enabled => {
    document.body.classList.toggle('revelio-active', enabled);
    document.querySelectorAll('[data-revelio]').forEach(element => { element.hidden = !enabled; });
    document.querySelector('[data-spell="revelio"]').setAttribute('aria-pressed', String(enabled));
    remember('cedrai-revelio', enabled);
  };

  window.magicCurtain = (spell, caption, action, leaving = false, scene = 'journal') => {
    if (busy) return;
    if (reducedMotion.matches) { action(); return; }
    busy = true;
    document.getElementById('spell-gate-name').textContent = spell;
    document.getElementById('spell-gate-caption').textContent = caption;
    gate.dataset.scene = scene;
    gate.classList.remove('is-visible');
    void gate.offsetWidth;
    gate.classList.add('is-visible');
    setTimeout(() => {
      action();
      if (!leaving) setTimeout(() => { gate.classList.remove('is-visible'); busy = false; }, 420);
    }, 560);
    if (leaving) setTimeout(() => { gate.classList.remove('is-visible'); busy = false; }, 1800);
  };
  window.magicNavigate = (url, spell = 'Aparecium', caption = '기록의 다음 장을 펼칩니다', scene = 'journal') => {
    window.magicCurtain(spell, caption, () => location.assign(url), true, scene);
  };

  async function summonNote() {
    if (summoning) return;
    summoning = true;
    announce('Accio — 기록을 불러옵니다…');
    try {
      const response = await fetch('/api/archive-home', { cache: 'no-store' });
      if (!response.ok) throw new Error('Posts unavailable');
      const data = await response.json();
      const posts = data.posts || [];
      const current = new URLSearchParams(location.search).get('post');
      const choices = posts.filter(post => post.slug !== current);
      if (!choices.length) throw new Error('No notes');
      const post = choices[Math.floor(Math.random() * choices.length)];
      window.magicNavigate(`/blog?post=${encodeURIComponent(post.number || post.slug.replace(/^tistory-/, ""))}`, 'Accio', '기록 한 장을 불러옵니다', 'journal');
    } catch {
      window.magicNavigate('/blog', 'Accio', '기록의 잉크를 드러냅니다', 'journal');
    }
    setTimeout(() => { summoning = false; }, 2000);
  }

  setLumos(recalled('cedrai-lumos'));
  setRevelio(recalled('cedrai-revelio'));
  toggle.addEventListener('click', () => {
    if (!menu.hidden) { closeMenu(); return; }
    menu.hidden = false;
    veil.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', '주문서 닫기');
    document.querySelectorAll('.app-main, .archive-mark, .article-main, .house-orb, body > footer, #app-shell > footer').forEach(element => {
      if (!element.inert) { element.inert = true; inertWhileOpen.push(element); }
    });
    const bounds = toggle.getBoundingClientRect();
    spark(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2, true);
    (document.getElementById('spell-input') || menu.querySelector('a,button'))?.focus();
  });
  document.addEventListener('click', event => {
    if (event.target.closest('.spellbook__close, .spellbook__veil')) { closeMenu(); return; }
    const spellButton = event.target.closest('[data-spell]');
    if (spellButton) {
      const spell = spellButton.dataset.spell;
      closeMenu();
      if (spell === 'lumos') {
        const enabled = !document.body.classList.contains('lumos-active');
        setLumos(enabled);
        const source = spellButton.getBoundingClientRect();
        spark(source.left + source.width / 2, source.top + source.height / 2, true);
        announce(enabled ? 'Lumos — the archive is illuminated.' : 'Nox — the shadows return.');
      } else if (spell === 'revelio') {
        const enabled = !document.body.classList.contains('revelio-active');
        setRevelio(enabled);
        const source = spellButton.getBoundingClientRect();
        spark(source.left + source.width / 2, source.top + source.height / 2, true);
        announce(enabled ? 'Revelio — invisible ink revealed.' : 'Finite — hidden again.');
      } else if (spell === 'accio') {
        summonNote();
      } else if (spell === 'patronus') {
        window.castPatronus();
      }
      return;
    }
    if (!event.target.closest('#spellbook')) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenu();
    if (event.altKey && event.key.toLowerCase() === 's') {
      event.preventDefault();
      toggle.click();
    }
  });
  document.addEventListener('pointermove', event => {
    if (!document.body.classList.contains('lumos-active')) return;
    document.body.style.setProperty('--wand-x', `${event.clientX}px`);
    document.body.style.setProperty('--wand-y', `${event.clientY}px`);
  }, {passive:true});
  window.addEventListener('pageshow', () => { gate.classList.remove('is-visible'); busy = false; });
})();
