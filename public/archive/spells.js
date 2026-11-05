(() => {
  const normalize = value => String(value).normalize('NFKC').toLocaleLowerCase().replace(/[^a-z가-힣]/g, '');
  const spells = [
    ['Wingardium Leviosa', '물체를 공중에 띄웁니다.', 'air', '윙가르디움 레비오사', '윙가디움 레비오사'],
    ['Expelliarmus', '상대의 손에서 지팡이나 무기를 튕겨 냅니다.', 'burst', '엑스펠리아르무스'],
    ['Protego', '마법 방패를 만들어 공격을 막습니다.', 'shield', '프로테고'],
    ['Stupefy', '상대를 기절시킵니다.', 'burst', '스투페파이', '스튜페파이'],
    ['Petrificus Totalus', '상대의 온몸을 일시적으로 굳게 만듭니다.', 'frost', '페트리피쿠스 토탈루스'],
    ['Riddikulus', '보가트를 우스꽝스러운 모습으로 바꿉니다.', 'sparkle', '리디큘러스'],
    ['Obliviate', '기억을 지우거나 바꿉니다.', 'mist', '오블리비아테'],
    ['Reparo', '부서진 물건을 원래대로 고칩니다.', 'repair', '레파로'],
    ['Incendio', '불꽃을 일으킵니다.', 'fire', '인센디오'],
    ['Aguamenti', '지팡이 끝에서 물을 뿜어냅니다.', 'water', '아구아멘티'],
    ['Diffindo', '대상을 가르거나 자릅니다.', 'slice', '디핀도'],
    ['Silencio', '대상의 소리를 잠시 없앱니다.', 'mist', '실렌시오'],
    ['Colloportus', '문을 마법으로 잠급니다.', 'shield', '콜로포터스'],
    ['Nox', '지팡이 끝의 불빛을 끕니다.', 'mist', '녹스'],
    ['Rictusempra', '상대를 간지럽게 만듭니다.', 'sparkle', '릭투셈프라'],
    ['Tarantallegra', '상대의 다리를 멈추지 않고 춤추게 합니다.', 'sparkle', '타란탈레그라'],
    ['Glisseo', '계단을 미끄럼틀처럼 평평하게 바꿉니다.', 'air', '글리세오'],
    ['Ascendio', '시전자를 위로 솟구치게 합니다.', 'air', '아센디오'],
    ['Sectumsempra', '보이지 않는 칼날로 대상을 베어 냅니다.', 'slice', '섹튬셈프라'],
    ['Crucio', '대상에게 극심한 고통을 가합니다.', 'dark', '크루시오'],
    ['Imperio', '대상의 행동을 지배합니다.', 'dark', '임페리오'],
    ['Avada Kedavra', '대상의 생명을 앗아갑니다.', 'dark', '아바다 케다브라']
  ];
  const index = new Map();
  spells.forEach(([name, description, effect, ...aliases]) => {
    const spell = {name, description, effect};
    [name, ...aliases].forEach(alias => index.set(normalize(alias), spell));
  });
  (window.archiveSpellEntries || []).forEach(([name, korean, description, effect, ...aliases]) => {
    const spell = index.get(normalize(name)) || {name, description, effect};
    [name, korean, ...aliases].forEach(alias => index.set(normalize(alias), spell));
  });

  const dialog = document.getElementById('spell-effect');
  const motes = dialog.querySelector('.spell-effect__motes');
  for (let i = 0; i < 16; i++) {
    const mote = document.createElement('i');
    mote.style.setProperty('--angle', `${i * 22.5}deg`);
    mote.style.setProperty('--delay', `${i * -0.11}s`);
    motes.append(mote);
  }
  dialog.querySelector('.spell-effect__close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });

  window.normalizeArchiveSpell = normalize;
  window.findArchiveSpell = value => index.get(normalize(value));
  window.showArchiveSpellEffect = spell => {
    window.closeSpellbook?.();
    dialog.dataset.effect = spell.effect;
    dialog.classList.toggle('spell-effect--long', spell.name.length > 24);
    dialog.querySelector('#spell-effect-name').textContent = spell.name;
    dialog.querySelector('#spell-effect-description').textContent = spell.description;
    dialog.showModal();
    dialog.querySelector('.spell-effect__close').focus();
  };
})();
