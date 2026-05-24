import React from 'react';
import { getPreferredLang, setPreferredLang, availableLangs, Lang } from '../utils/lang';

export const LanguageSelector: React.FC<{ className?: string }> = ({ className }) => {
  const [lang, setLang] = React.useState<Lang>(getPreferredLang());

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value as Lang;
    setLang(v);
    setPreferredLang(v);
    // trigger possible app-level updates by emitting an event
    try {
      window.dispatchEvent(new CustomEvent('bth:lang-changed', { detail: { lang: v } }));
    } catch (_) {}
  };

  return (
    <select className={className} value={lang} onChange={handleChange} aria-label="Language preference">
      {availableLangs.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
};

export default LanguageSelector;
