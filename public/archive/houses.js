(() => {
  const houses = {
    slytherin: { name: 'SLYTHERIN', mark: 'S', trait: '야망과 지혜', place: 'UNDER THE LAKE', browserColor: '#081b15', call: 'Your ambition knows no bounds...' },
    gryffindor: { name: 'GRYFFINDOR', mark: 'G', trait: '용기와 결단', place: 'IN THE TOWER', browserColor: '#2b0d14', call: 'A brave heart, I see...' },
    ravenclaw: { name: 'RAVENCLAW', mark: 'R', trait: '지혜와 탐구', place: 'ABOVE THE CLOUDS', browserColor: '#0b1b30', call: 'Such a curious mind...' },
    hufflepuff: { name: 'HUFFLEPUFF', mark: 'H', trait: '성실과 의리', place: 'BY THE HEARTH', browserColor: '#201c12', call: 'Loyal and true of heart...' }
  };
  const pickerOrder = ['slytherin', 'gryffindor', 'ravenclaw', 'hufflepuff'];
  const commonShield = '<path d="M50 5 89 17v46c0 27-18 47-39 61C29 110 11 90 11 63V17Z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M50 12 82 22v40c0 22-13 39-32 52-19-13-32-30-32-52V22Z" fill="none" stroke="currentColor" stroke-opacity=".48"/>';
  const animalMarks = {
    gryffindor: '<path d="M50 27 57 36 68 32 69 44 79 51 71 61 75 73 63 77 59 90 50 84 41 90 37 77 25 73 29 61 21 51 31 44 32 32 43 36Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="M37 52q13-13 26 0l-2 18q-11 15-22 0Z M39 58h5m12 0h5M45 69l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    ravenclaw: '<path d="M50 39q-8-13-26-7l10 11-14 4 15 6-8 8 15-2 8 18 8-18 15 2-8-8 15-6-14-4 10-11q-18-6-26 7Z" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M50 40q10-4 14 7l-9 8-5 22-5-22-9-8q4-11 14-7Z M50 55l8 4-8 4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="55" cy="48" r="1.8" fill="currentColor"/>',
    hufflepuff: '<path d="M29 39 38 29l8 8h8l8-8 9 10-4 11 3 20q-8 22-20 23-12-1-20-23l3-20Z" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M39 38 34 56l7 18 9 9 9-9 7-18-5-18-7 12h-8Z M46 63h8M50 64v9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="39" cy="58" r="2" fill="currentColor"/><circle cx="61" cy="58" r="2" fill="currentColor"/>'
  };
  const crest = document.querySelector('.archway-crest');
  const slytherinCrest = crest?.innerHTML;
  const pickers = [...document.querySelectorAll('[data-house-picker]')];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let voiceEnabled = true;
  try { voiceEnabled = localStorage.getItem('cedrai-house-voice') !== 'off'; } catch {}
  let sortingTimer;
  let finishTimer;
  let sortingHouse = null;
  let returnFocusTo = null;
  const sortingBackground = [];

  pickers.forEach((picker, index) => {
    const menuId = `house-picker-menu-${index}`;
    picker.classList.add('house-picker');
    picker.innerHTML = `<button class="house-picker__toggle" type="button" aria-expanded="false" aria-controls="${menuId}" aria-label="기숙사 선택"><span class="house-picker__hat" aria-hidden="true"><svg viewBox="0 0 64 52"><path d="M29 3c-5 11-10 20-19 30 12 6 30 7 43 0C43 23 37 12 29 3Z"/><path d="M10 34C1 36 1 43 10 46c12 5 34 5 46 0 9-4 9-10-3-12"/><path d="M23 31q5-4 9 0m7 0q4-4 8 0M26 37q8 8 17 0"/></svg></span><span class="house-picker__label"><small>THE SORTING HAT</small><strong class="house-picker__current">SLYTHERIN</strong></span><span class="house-picker__mark" aria-hidden="true">S</span></button><div class="house-picker__menu" id="${menuId}" hidden><div class="house-picker__heading"><span>CHOOSE YOUR HOUSE</span><small>이 브라우저에 선택이 저장됩니다.</small></div><div class="house-picker__choices">${pickerOrder.map(id => `<button type="button" data-house-choice="${id}" aria-pressed="false"><span class="house-picker__choice-mark" aria-hidden="true">${houses[id].mark}</span><span><strong>${houses[id].name}</strong><small>${houses[id].trait}</small></span><i aria-hidden="true">✦</i></button>`).join('')}</div><button class="house-picker__voice" type="button" data-house-voice aria-pressed="true" aria-label="마법모자 음성 켜짐"><span aria-hidden="true">♪</span><span>VOICE ON</span></button></div>`;
  });

  const reveal = document.createElement('div');
  reveal.className = 'sorting-reveal';
  reveal.hidden = true;
  reveal.setAttribute('role', 'dialog');
  reveal.setAttribute('aria-modal', 'true');
  reveal.setAttribute('aria-label', 'The Sorting Hat');
  reveal.innerHTML = `<div class="sorting-reveal__aura" aria-hidden="true"></div><div class="sorting-reveal__stars" aria-hidden="true"><i>✧</i><i>✦</i><i>✧</i><i>✦</i><i>✧</i><i>✦</i></div><div class="sorting-reveal__content"><span class="sorting-reveal__eyebrow">THE SORTING HAT</span><div class="sorting-reveal__hat" aria-hidden="true"><svg viewBox="0 0 240 230"><path class="sorting-reveal__hat-crown" d="M113 18c-21 35-23 61-50 89-10 11-17 26-19 51 38 20 115 25 154-1-10-21-22-40-37-56-13-14-24-42-48-83Z"/><path class="sorting-reveal__hat-fold" d="M113 18c9 23 7 44-2 60 25 2 45 12 55 30M63 107c19-7 42-7 58 1M82 125c9-6 18-5 26 0m28 0c9-6 18-5 26 0"/><path class="sorting-reveal__hat-face" d="M91 151c14 7 24 6 31-2 8 8 19 9 32 1-8 18-18 26-32 26-14 0-24-8-31-25Z"/><path class="sorting-reveal__hat-brim" d="M42 157c-23 4-36 12-35 23 3 19 50 30 111 31 62 0 112-12 115-31 1-13-15-21-41-25-40 23-108 24-150 2Z"/></svg></div><p class="sorting-reveal__line"></p><strong class="sorting-reveal__house" aria-live="assertive"></strong><span class="sorting-reveal__after">YOUR HOUSE HAS BEEN REVEALED</span></div><button class="sorting-reveal__skip" type="button">SKIP ↗</button>`;
  document.body.append(reveal);
  const voiceButtons = [...document.querySelectorAll('[data-house-voice]')];

  function syncVoiceButtons() {
    voiceButtons.forEach(button => {
      button.setAttribute('aria-pressed', String(voiceEnabled));
      button.setAttribute('aria-label', voiceEnabled ? '마법모자 음성 켜짐' : '마법모자 음성 꺼짐');
      button.lastElementChild.textContent = voiceEnabled ? 'VOICE ON' : 'VOICE OFF';
    });
  }
  syncVoiceButtons();

  function speakSorting(house) {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      const line = new SpeechSynthesisUtterance(`${house.call.replace(/\.+$/, '.')} ${house.name}!`);
      line.lang = 'en-GB';
      line.rate = .86;
      line.pitch = .78;
      line.volume = .9;
      const voices = speechSynthesis.getVoices();
      line.voice = voices.find(voice => voice.lang.toLowerCase() === 'en-gb') || voices.find(voice => voice.lang.toLowerCase().startsWith('en')) || null;
      speechSynthesis.speak(line);
    } catch {}
  }

  function finishSorting(skip = false) {
    if (!sortingHouse) return;
    clearTimeout(sortingTimer);
    clearTimeout(finishTimer);
    if (skip && 'speechSynthesis' in window) speechSynthesis.cancel();
    if (document.documentElement.dataset.house !== sortingHouse) setHouse(sortingHouse, true);
    reveal.classList.add('is-leaving');
    const focusTarget = returnFocusTo;
    sortingHouse = null;
    window.setTimeout(() => {
      reveal.hidden = true;
      reveal.classList.remove('is-visible', 'is-announced', 'is-leaving');
      sortingBackground.splice(0).forEach(element => { element.inert = false; });
      focusTarget?.focus();
    }, reducedMotion.matches ? 0 : 320);
  }

  function startSorting(id, sourceToggle) {
    if (sortingHouse) return;
    sortingHouse = id;
    returnFocusTo = sourceToggle;
    const house = houses[id];
    reveal.dataset.sortingHouse = id;
    reveal.querySelector('.sorting-reveal__line').textContent = house.call;
    reveal.querySelector('.sorting-reveal__house').textContent = `${house.name}!`;
    reveal.hidden = false;
    reveal.classList.remove('is-leaving', 'is-announced');
    [...document.body.children].filter(element => element !== reveal && !element.inert).forEach(element => {
      element.inert = true;
      sortingBackground.push(element);
    });
    void reveal.offsetWidth;
    reveal.classList.add('is-visible');
    reveal.querySelector('.sorting-reveal__skip').focus();
    speakSorting(house);
    const announce = () => {
      setHouse(id, true);
      reveal.classList.add('is-announced');
    };
    if (reducedMotion.matches) announce();
    else sortingTimer = window.setTimeout(announce, 850);
    finishTimer = window.setTimeout(() => finishSorting(), reducedMotion.matches ? 1800 : 3400);
  }

  function closePickers(returnFocus = false) {
    pickers.forEach(picker => {
      const menu = picker.querySelector('.house-picker__menu');
      if (menu.hidden) return;
      const focusedInside = menu.contains(document.activeElement);
      menu.hidden = true;
      picker.querySelector('.house-picker__toggle').setAttribute('aria-expanded', 'false');
      if (returnFocus && focusedInside) picker.querySelector('.house-picker__toggle').focus();
    });
  }

  function setHouse(id, save = false) {
    id = houses[id] ? id : 'slytherin';
    const house = houses[id];
    document.documentElement.dataset.house = id;
    if (save) { try { localStorage.setItem('cedrai-house', id); } catch {} }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', house.browserColor);
    document.querySelectorAll('[data-house-name]').forEach(el => { el.textContent = house.name; });
    document.querySelectorAll('[data-house-location]').forEach(el => { el.textContent = house.place; });
    document.querySelectorAll('.house-picker__current').forEach(el => { el.textContent = house.name; });
    document.querySelectorAll('.house-picker__mark').forEach(el => { el.textContent = house.mark; });
    document.querySelectorAll('.house-picker__toggle').forEach(el => { el.setAttribute('aria-label', `기숙사 선택: ${house.name}`); });
    document.querySelectorAll('[data-house-choice]').forEach(el => { el.setAttribute('aria-pressed', String(el.dataset.houseChoice === id)); });
    if (crest) crest.innerHTML = id === 'slytherin' ? slytherinCrest : `<svg viewBox="0 0 100 130" aria-hidden="true">${commonShield}${animalMarks[id]}</svg>`;
    const sigil = document.querySelector('.home-sigil__ring small');
    if (sigil) sigil.textContent = `${house.name} · CÉDRAI · 2026`;
  }

  document.addEventListener('click', event => {
    const choice = event.target.closest('[data-house-choice]');
    if (choice) {
      const nextHouse = choice.dataset.houseChoice;
      const sourceToggle = choice.closest('.house-picker').querySelector('.house-picker__toggle');
      closePickers(true);
      if (nextHouse !== document.documentElement.dataset.house) startSorting(nextHouse, sourceToggle);
      return;
    }
    const voiceButton = event.target.closest('[data-house-voice]');
    if (voiceButton) {
      voiceEnabled = !voiceEnabled;
      try { localStorage.setItem('cedrai-house-voice', voiceEnabled ? 'on' : 'off'); } catch {}
      if (!voiceEnabled && 'speechSynthesis' in window) speechSynthesis.cancel();
      syncVoiceButtons();
      return;
    }
    if (event.target.closest('.sorting-reveal__skip')) { finishSorting(true); return; }
    const toggle = event.target.closest('.house-picker__toggle');
    if (toggle) {
      const picker = toggle.closest('.house-picker');
      const menu = picker.querySelector('.house-picker__menu');
      const opening = menu.hidden;
      closePickers();
      menu.hidden = !opening;
      toggle.setAttribute('aria-expanded', String(opening));
      return;
    }
    if (!event.target.closest('.house-picker')) closePickers();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (sortingHouse) finishSorting(true);
      else closePickers(true);
    }
  });
  window.addEventListener('storage', event => {
    if (event.key === 'cedrai-house') setHouse(event.newValue || 'slytherin');
  });
  setHouse(document.documentElement.dataset.house || 'slytherin');
})();
