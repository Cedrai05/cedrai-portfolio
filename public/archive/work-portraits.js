(() => {
  const gallery = document.querySelector('#work .work-list');
  if (!gallery) return;

  const scenes = [
    `<svg viewBox="0 0 480 260" aria-hidden="true" focusable="false">
      <path class="portrait-horizon" d="M0 195Q110 166 222 187T480 174V260H0Z"/>
      <circle class="portrait-orbit" cx="355" cy="95" r="95"/>
      <path class="portrait-constellation" d="m31 34 58 25 53-18 32 37m235-36-44 35 52 29"/>
      <g class="portrait-page"><path d="M113 69 276 52l29 151-164 18Z"/><path d="m141 91 109-12m-106 27 79-8m-73 93 119-13"/><path class="portrait-print" d="M215 117c-22 4-33 21-29 39 5 18 23 26 39 18 12-6 15-18 8-28-7-9-22-7-26 3m-12-2c-1-21 18-38 40-36 20 3 34 22 28 43m-69 12c10 27 44 36 66 16"/></g>
      <g class="portrait-lens"><circle cx="321" cy="111" r="55"/><circle cx="321" cy="111" r="42"/><path d="m360 151 57 65"/><path class="portrait-lens-glint" d="M294 87q18-22 44-10"/></g>
      <circle class="portrait-spark portrait-spark--one" cx="81" cy="129" r="3"/><circle class="portrait-spark portrait-spark--two" cx="398" cy="45" r="2"/>
    </svg>`,
    `<svg viewBox="0 0 480 260" aria-hidden="true" focusable="false">
      <circle class="portrait-moon" cx="364" cy="62" r="42"/><path class="portrait-constellation" d="m39 37 42 24 38-13m296 14 28 24"/>
      <path class="portrait-horizon" d="M0 221q97-48 185-20t152 3q79-31 143-14v70H0Z"/>
      <g class="portrait-castle"><path d="M91 220V111l18-12 18 12v109m-28-108V75h19v37m34 108V136l28-18 28 18v84m-45-87V91h34v42m41 87V72l22-17 22 17v148m-32-151V28h20v41m31 151V122l25-15 25 15v98m-35-100V84h20v35"/><path d="M73 220h335M223 220v-61q17-24 34 0v61"/></g>
      <g class="portrait-lock"><circle cx="240" cy="159" r="31"/><circle cx="240" cy="159" r="21"/><path d="M240 148a6 6 0 0 0-2 12l-3 10h10l-3-10a6 6 0 0 0-2-12Z"/></g>
      <path class="portrait-beam" d="M240 160 312 73 410 20 336 116Z"/>
      <circle class="portrait-spark portrait-spark--one" cx="111" cy="44" r="3"/><circle class="portrait-spark portrait-spark--two" cx="330" cy="128" r="2"/>
    </svg>`,
    `<svg viewBox="0 0 480 260" aria-hidden="true" focusable="false">
      <path class="portrait-horizon" d="M0 218q125-30 231-5t249-13v60H0Z"/>
      <circle class="portrait-orbit" cx="375" cy="74" r="68"/><path class="portrait-constellation" d="m38 44 54 14 42-29m278 20 29 33"/>
      <g class="portrait-book"><path d="M69 90q78-28 166 4v123q-74-24-166-3Zm166 4q87-32 174-4v124q-88-22-174 3Z"/><path d="M235 94v123M87 113q53-13 121 4m-121 15q57-11 121 5m51-20q60-17 124-5m-124 25q67-13 124-4"/></g>
      <path class="portrait-ink" d="M92 176q36-17 69-3t51-5"/>
      <g class="portrait-quill"><path d="M181 161q63-95 160-131-14 75-115 133Z"/><path d="M182 161 343 28M215 139q34-40 83-70m-55 45q28-25 59-41"/></g>
      <g class="portrait-seal"><circle cx="350" cy="179" r="29"/><path d="m350 163 5 11 12 5-12 4-5 12-5-12-12-4 12-5Z"/></g>
      <circle class="portrait-spark portrait-spark--one" cx="116" cy="54" r="3"/><circle class="portrait-spark portrait-spark--two" cx="407" cy="65" r="2"/>
    </svg>`
  ];

  gallery.querySelectorAll(':scope > a').forEach((link, index) => {
    const number = link.querySelector(':scope > span');
    const title = link.querySelector(':scope > strong');
    const summary = link.querySelector(':scope > small');
    const arrow = link.querySelector(':scope > b');
    if (!number || !title || !summary || !arrow || !scenes[index]) return;

    number.className = 'work-entry__number';
    arrow.className = 'work-entry__arrow';
    const copy = document.createElement('span');
    copy.className = 'work-entry__copy';
    copy.append(title, summary);
    const portrait = document.createElement('span');
    portrait.className = `work-portrait work-portrait--${['forensics', 'castle', 'book'][index]}`;
    portrait.setAttribute('aria-hidden', 'true');
    portrait.innerHTML = scenes[index];
    link.classList.add('work-entry');
    link.replaceChildren(number, copy, portrait, arrow);
  });
  gallery.classList.add('is-enchanted');

  if (!matchMedia('(pointer:fine) and (prefers-reduced-motion:no-preference)').matches) return;
  gallery.querySelectorAll('.work-entry').forEach(link => {
    const portrait = link.querySelector('.work-portrait');
    link.addEventListener('pointermove', event => {
      const bounds = portrait.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - .5;
      const y = (event.clientY - bounds.top) / bounds.height - .5;
      portrait.style.setProperty('--portrait-x', `${Math.max(-7, Math.min(7, x * 9))}px`);
      portrait.style.setProperty('--portrait-y', `${Math.max(-7, Math.min(7, y * 9))}px`);
    }, {passive: true});
    link.addEventListener('pointerleave', () => {
      portrait.style.removeProperty('--portrait-x');
      portrait.style.removeProperty('--portrait-y');
    });
  });
})();
