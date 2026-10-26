// Investment projects (land or property looking for an investor): same lists as the InvestmentProject model.
export const ASSET_TYPES = ['Terrain', 'Local commercial', 'Bâtiment / immeuble', 'Maison / villa', 'Hangar / entrepôt', 'Ferme', 'Hôtel / établissement existant', 'Autre bien'];
export const PROJECT_TYPES = ['Résidentiel', 'Hôtel et tourisme', 'Commercial', 'Bureaux', 'Industriel', 'Agricole', 'Santé et éducation', 'Mixte', 'Autre'];
export const PARTNERSHIP_TYPES = ['Partenariat (parts du projet)', 'Construction contre logements', 'Location longue durée', 'Financement contre bénéfices', 'Exploitation en commun', 'À discuter'];
export const LAND_DOCUMENTS = ['Acte notarié', 'Livret foncier', 'Acte administratif', 'Acte sous seing privé', 'Décision de concession', 'Certificat de possession', 'En cours de régularisation', 'Autre'];

/** "Terrain", "Local commercial"… or what the owner wrote when they picked "Autre bien". */
export const assetLabel = (p, t) => (p.assetType === 'Autre bien' && p.assetOther ? p.assetOther : t(p.assetType || 'Terrain'));
/** Type of ownership document, or its name when "Autre" was picked. */
export const documentLabel = (p, t) => (p.landDocument === 'Autre' && p.documentOther ? p.documentOther : t(p.landDocument));

// Colours of the brand banner (teal gradient + navy)
export const PROJECT_COLORS = { ink: '#152A41', from: '#0DD5C4', to: '#00B3D2' };
export const projectGradient = `linear-gradient(135deg, ${PROJECT_COLORS.from}, ${PROJECT_COLORS.to})`;

// Two kinds of investor: one brings a property ('asset'), the other brings money and looks for one ('capital')
export const isCapital = (p) => p?.kind === 'capital';

/** Price range of an investor's search: "5 000 000 – 20 000 000 DZD", "jusqu'à …", "à partir de …" or "À définir". */
export function budgetRange(p, t, formatDZD) {
  const min = Number(p.budgetMin) || 0;
  const max = Number(p.budget) || 0;
  if (min && max) return `${formatDZD(min)} – ${formatDZD(max)}`;
  if (max) return t('Jusqu’à {v}', { v: formatDZD(max) });
  if (min) return t('À partir de {v}', { v: formatDZD(min) });
  return t('À définir');
}

/** Area wanted by an investor: "500 m² – 2 ha", "min. …", "max. …" or "Indifférente". */
export function areaRange(p, t, lang = 'fr') {
  const min = Number(p.area) || 0;
  const max = Number(p.areaMax) || 0;
  if (min && max) return `${formatArea(min, lang)} – ${formatArea(max, lang)}`;
  if (min) return t('Min. {v}', { v: formatArea(min, lang) });
  if (max) return t('Max. {v}', { v: formatArea(max, lang) });
  return t('Indifférente');
}

/** "Hydra, Alger" or just "Alger" when the investor accepts any commune. */
export const placeLabel = (p, t) => (p.city ? `${t(p.city)}, ${t(p.wilaya)}` : t(p.wilaya));

/** "12 000 m²" or "1,2 ha" for large plots. */
export function formatArea(m2, lang = 'fr') {
  const n = Number(m2) || 0;
  const loc = lang === 'ar' ? 'ar-DZ' : 'fr-DZ';
  if (n >= 10000) return `${(n / 10000).toLocaleString(loc, { maximumFractionDigits: 1 })} ha`;
  return `${n.toLocaleString(loc)} m²`;
}
