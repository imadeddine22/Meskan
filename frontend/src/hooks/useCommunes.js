import { useEffect, useState } from 'react';
import { WILAYA_LIST } from '@/lib/wilayas';

let cache = null;
// Lazy-load the commune list (≈50 KB) only on pages that need it.
const loadCommunes = () => (cache ||= import('@/lib/communes.json').then((m) => m.default || m));

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export const findWilaya = (name) => {
  const n = norm(name);
  return WILAYA_LIST.find((w) => norm(w.name) === n || norm(w.ascii) === n || w.arabic === String(name).trim());
};

/** A wilaya's name in the visitor's language ('Oran' → 'وهران' in Arabic); communes and other places are kept as typed. */
export const placeName = (place, lang) => (lang === 'ar' && findWilaya(place)?.arabic) || place;

/** Communes of the given wilaya (by French, ASCII or Arabic name): [{ name, arabic }]. */
export function useCommunes(wilayaName) {
  const [communes, setCommunes] = useState([]);

  useEffect(() => {
    const wilaya = findWilaya(wilayaName);
    if (!wilaya) {
      setCommunes([]);
      return undefined;
    }
    let active = true;
    loadCommunes().then((all) => {
      if (active) setCommunes((all[wilaya.code] || []).map(([name, arabic]) => ({ name, arabic })));
    });
    return () => {
      active = false;
    };
  }, [wilayaName]);

  return communes;
}
