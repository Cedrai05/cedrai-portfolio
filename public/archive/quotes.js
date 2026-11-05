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
