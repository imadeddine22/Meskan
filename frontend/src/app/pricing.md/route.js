import { apiGet, formatDZD, SITE_URL } from '@/lib/seo';

export const revalidate = 3600;

// Machine-readable pricing for AI agents and answer engines. Prices come live from the backend.
export async function GET() {
  const p = (await apiGet('/pricing/prices'))?.settings || {
    growthMonthlyPrice: 2900, growthYearlyPrice: 29000, proMonthlyPrice: 6900, proYearlyPrice: 69000,
  };

  const body = `# Tarifs — Meskan (propriétaires et vendeurs)

Les voyageurs réservent gratuitement ; les formules ci-dessous concernent les hôteliers, propriétaires et vendeurs qui publient des annonces. Prix en dinars algériens (DZD).
Page complète : ${SITE_URL}/pricing

**Lancement : tous les plans (Starter, Growth et Pro) sont actuellement gratuits, sans aucun paiement.** Les prix ci-dessous sont les tarifs prévus après la période de lancement.

## Starter
- Prix : 0 DZD
- Établissements : 1
- Photos par annonce : 5
- Inclus : réservation directe, statistiques de visites de base

## Growth
- Prix : ${formatDZD(p.growthMonthlyPrice)} / mois ou ${formatDZD(p.growthYearlyPrice)} / an
- Établissements : jusqu'à 5
- Photos par annonce : illimitées
- Inclus : tout Starter + mise en avant (Featured), statistiques avancées, dossiers de location en ligne

## Pro
- Prix : ${formatDZD(p.proMonthlyPrice)} / mois ou ${formatDZD(p.proYearlyPrice)} / an
- Établissements : illimités
- Photos par annonce : illimitées
- Inclus : tout Growth + badge de profil vérifié, statistiques Pro avec export, accès API et synchronisation iCal

## Paiement des abonnements
- Par virement bancaire ou versement CCP (coordonnées sur demande via ${SITE_URL}/contact)

## Réservations des voyageurs
- Gratuites : le voyageur envoie une demande, l'établissement l'accepte, le paiement se fait sur place à l'arrivée
`;
  return new Response(body, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
}
