(() => {
  const key = 'cedrai-field-notes-v1';
  let state = { saved: [], progress: {}, last: '' };
  const restore = raw => {
    try {
      const stored = JSON.parse(raw || '{}');
      state = {
        saved: Array.isArray(stored.saved) ? stored.saved.filter(item => typeof item === 'string') : [],
        progress: stored.progress && typeof stored.progress === 'object' && !Array.isArray(stored.progress) ? stored.progress : {},
        last: typeof stored.last === 'string' ? stored.last : ''
      };
    } catch {}
  };
  try { restore(localStorage.getItem(key)); } catch {}
  window.addEventListener('storage', event => { if (event.key === key) restore(event.newValue); });

  const persist = () => {
    try { localStorage.setItem(key, JSON.stringify(state)); } catch {}
  };

  window.fieldNotes = {
    isSaved: slug => state.saved.includes(slug),
    savedCount: () => state.saved.length,
    toggleSaved(slug) {
      state.saved = state.saved.includes(slug) ? state.saved.filter(item => item !== slug) : [...state.saved, slug];
      persist();
      return state.saved.includes(slug);
    },
    getProgress: slug => Math.max(0, Math.min(100, Number(state.progress[slug]) || 0)),
    setProgress(slug, amount) {
      const value = Math.max(0, Math.min(100, Math.round(amount)));
      if (state.progress[slug] === value) return;
      state.progress[slug] = value;
      persist();
    },
    getLast: () => state.last,
    setLast(slug) {
      if (state.last === slug) return;
      state.last = slug;
      persist();
    }
  };
})();
