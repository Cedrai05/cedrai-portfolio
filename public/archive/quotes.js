(() => {
  const placements = [
    { page: 'home', after: '.chapter-grid' },
    { page: 'about', after: '.about-layout' },
    { page: 'work', after: '.work-list' },
    { page: 'journal', after: '.journal-shell' },
    { page: 'now', after: '.now-layout' }
  ];
  const passages = [
    {
      english: 'I solemnly swear that I am up to no good.',
      credit: 'THE MARAUDER’S MAP · PRISONER OF AZKABAN',
      source: 'https://www.harrypotter.com/fact-file/objects/the-marauders-map'
    },
    {
      english: 'It is our choices, Harry, that show what we truly are, far more than our abilities.',
      credit: 'ALBUS DUMBLEDORE · CHAMBER OF SECRETS',
      source: 'https://www.harrypotter.com/features/what-professor-quirrell-taught-harry-outside-the-classroom'
    },
    {
      english: 'We are only as strong as we are united, as weak as we are divided.',
      credit: 'ALBUS DUMBLEDORE · GOBLET OF FIRE',
      source: 'https://www.harrypotter.com/features/the-importance-of-dumbledores-many-armies'
    },
    {
      english: 'Of course it is happening inside your head, Harry, but why on earth should that mean that it is not real?',
      credit: 'ALBUS DUMBLEDORE · DEATHLY HALLOWS',
      source: 'https://www.harrypotter.com/features/the-chapter-that-made-us-fall-in-love-with-albus-dumbledore'
    },
    {
      english: 'Happiness can be found, even in the darkest of times, if one only remembers to turn on the light.',
      credit: 'ALBUS DUMBLEDORE · PRISONER OF AZKABAN FILM',
      source: 'https://www.harrypotter.com/quiz/do-you-know-which-harry-potter-film-this-is'
    },
    {
      english: 'It does not do to dwell on dreams and forget to live.',
      credit: 'ALBUS DUMBLEDORE · PHILOSOPHER’S STONE',
      source: 'https://www.harrypotter.com/features/important-pieces-of-dialogue-from-philosophers-stone'
    },
    {
      english: 'It matters not what someone is born, but what they grow to be!',
      credit: 'ALBUS DUMBLEDORE · GOBLET OF FIRE',
      source: 'https://www.harrypotter.com/features/pearls-of-wisdom-from-professor-dumbledore'
    },
    {
      english: 'I think I can tell who the wrong sort are for myself, thanks.',
      credit: 'HARRY POTTER · PHILOSOPHER’S STONE',
      source: 'https://www.harrypotter.com/features/when-harry-potter-got-it-right'
    },
    {
      english: 'Mischief managed.',
      credit: 'THE MARAUDER’S MAP · PRISONER OF AZKABAN',
      source: 'https://www.harrypotter.com/fact-file/objects/the-marauders-map'
    },
    {
      english: 'Harry – yer a wizard.',
      credit: 'RUBEUS HAGRID · PHILOSOPHER’S STONE',
      source: 'https://www.harrypotter.com/quiz/the-quick-quotes-quiz'
    },
    {
      english: 'Always.',
      credit: 'SEVERUS SNAPE · DEATHLY HALLOWS',
      source: 'https://www.harrypotter.com/features/always-why-the-princes-tale-is-the-most-emotional-chapter'
    },
    {
      english: 'Anything’s possible if you’ve got enough nerve.',
      credit: 'GINNY WEASLEY · ORDER OF THE PHOENIX',
      source: 'https://www.harrypotter.com/quiz/the-quick-quotes-quiz'
    },
    {
      english: 'Wit beyond measure is man’s greatest treasure.',
      credit: 'LUNA LOVEGOOD · ORDER OF THE PHOENIX',
      source: 'https://www.harrypotter.com/features/seven-reasons-to-love-luna-lovegood'
    },
    {
      english: 'Don’t worry. You’re just as sane as I am.',
      credit: 'LUNA LOVEGOOD · ORDER OF THE PHOENIX',
      source: 'https://www.harrypotter.com/features/seven-reasons-to-love-luna-lovegood'
    },
    {
      english: 'Dobby is free.',
      credit: 'DOBBY · CHAMBER OF SECRETS',
      source: 'https://www.harrypotter.com/features/9-times-we-really-wanted-to-give-these-harry-potter-characters-a-hug'
    },
    {
      english: 'Have a biscuit, Potter.',
      credit: 'MINERVA MCGONAGALL · ORDER OF THE PHOENIX',
      source: 'https://www.harrypotter.com/features/9-times-we-really-wanted-to-give-these-harry-potter-characters-a-hug'
    },
    {
      english: 'Constant vigilance!',
      credit: '“MAD-EYE” MOODY · GOBLET OF FIRE',
      source: 'https://www.harrypotter.com/features/ranked-the-defence-against-the-dark-arts-teachers'
    },
    {
      english: 'Fear of a name increases fear of the thing itself.',
      credit: 'ALBUS DUMBLEDORE · PHILOSOPHER’S STONE',
      source: 'https://www.harrypotter.com/features/important-pieces-of-dialogue-from-philosophers-stone'
    },
    {
      english: 'Curiosity is not a sin.',
      credit: 'ALBUS DUMBLEDORE · GOBLET OF FIRE',
      source: 'https://www.harrypotter.com/features/pearls-of-wisdom-from-professor-dumbledore'
    },
    {
      english: 'We’ve all got both light and dark inside us.',
      credit: 'SIRIUS BLACK · ORDER OF THE PHOENIX FILM',
      source: 'https://www.harrypotter.com/features/a-complex-man-exploring-the-light-and-shade-of-severus-snape'
    },
    {
      english: 'I am not worried, Harry… I am with you.',
      credit: 'ALBUS DUMBLEDORE · HALF-BLOOD PRINCE',
      source: 'https://www.harrypotter.com/news/15-exciting-things-we-learnt-in-the-back-to-hogwarts-showcase-2025'
    },
    {
      english: 'I’m worth twelve of you, Malfoy.',
      credit: 'NEVILLE LONGBOTTOM · PHILOSOPHER’S STONE',
      source: 'https://www.harrypotter.com/features/how-harry-potter-and-the-philosophers-stone-tackled-bullying'
    },
    {
      english: 'Until the very end.',
      credit: 'JAMES POTTER · DEATHLY HALLOWS',
      source: 'https://www.harrypotter.com/features/everything-we-know-about-the-marauders'
    },
    {
      english: 'Are you a wizard, or what?',
      credit: 'HERMIONE GRANGER · DEATHLY HALLOWS',
      source: 'https://www.harrypotter.com/features/10-of-hermiones-funniest-moments'
    },
    {
      english: 'I’m hoping to do some good in the world!',
      credit: 'HERMIONE GRANGER · DEATHLY HALLOWS',
      source: 'https://www.harrypotter.com/features/10-of-hermiones-funniest-moments'
    },
    {
      english: 'The Ministry has fallen. Scrimgeour is dead. They are coming.',
      credit: 'KINGSLEY SHACKLEBOLT · DEATHLY HALLOWS',
      source: 'https://www.harrypotter.com/features/what-is-a-patronus'
    },
    {
      english: 'You see what you expect to see, Severus.',
      credit: 'ALBUS DUMBLEDORE · DEATHLY HALLOWS',
      source: 'https://www.harrypotter.com/features/a-complex-man-exploring-the-light-and-shade-of-severus-snape'
    },
    {
      english: 'There’s no need to call me “sir”, Professor.',
      credit: 'HARRY POTTER · HALF-BLOOD PRINCE',
      source: 'https://www.harrypotter.com/features/sassy-comebacks-harry-potter'
    },
    {
      english: 'We are part of you. Invisible to anyone else.',
      credit: 'SIRIUS BLACK · DEATHLY HALLOWS',
      source: 'https://www.harrypotter.com/features/everything-we-know-about-the-marauders'
    },
    {
      english: 'If there is one thing Voldemort cannot understand, it is love.',
      credit: 'ALBUS DUMBLEDORE · PHILOSOPHER’S STONE',
      source: 'https://www.harrypotter.com/features/how-harry-potter-and-the-philosophers-stone-tackled-bullying'
    }
  ];

  const storageKey = 'cedrai-last-quotes';
  let previous = {};
  try {
    const stored = JSON.parse(sessionStorage.getItem(storageKey) || '{}');
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) previous = stored;
  } catch {}
  const next = {};
  const used = new Set();
  const quotes = placements.flatMap(({ page, before, after }) => {
    const section = document.getElementById(page);
    const anchor = section?.querySelector(before || after);
    if (!anchor) return [];
    const choices = passages.map((_, index) => index).filter(index => !used.has(index) && index !== previous[page]);
    const selection = choices[Math.floor(Math.random() * choices.length)];
    const { english, credit, source } = passages[selection];
    next[page] = selection;
    used.add(selection);

    const quote = document.createElement('blockquote');
    quote.className = `archive-quote archive-quote--${page}`;
    const original = document.createElement('p');
    original.className = 'archive-quote__original';
    original.lang = 'en';
    original.textContent = `“${english}”`;
    const cite = document.createElement('cite');
    const link = document.createElement('a');
    link.href = source;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = `${credit} ↗`;
    cite.append(link);
    quote.append(original, cite);
    anchor.insertAdjacentElement(before ? 'beforebegin' : 'afterend', quote);
    return [quote];
  });
  try { sessionStorage.setItem(storageKey, JSON.stringify(next)); } catch {}

  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: .13 });
  quotes.forEach(quote => {
    quote.classList.add('is-quote-pending');
    observer.observe(quote);
  });
})();
