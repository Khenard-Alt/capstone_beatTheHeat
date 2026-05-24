export type Lang = 'english' | 'tagalog' | 'taglish';

const STORAGE_KEY = 'bth_preferred_lang';

export const getPreferredLang = (): Lang => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'english' || v === 'tagalog' || v === 'taglish') return v;
  } catch (_) {
    /* ignore */
  }
  return 'taglish';
};

export const setPreferredLang = (lang: Lang): void => {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch (_) {
    /* ignore */
  }
};

export const availableLangs: { value: Lang; label: string }[] = [
  { value: 'taglish', label: 'Taglish (default)' },
  { value: 'tagalog', label: 'Tagalog only' },
  { value: 'english', label: 'English only' },
];
