import { SITE_URL } from '@/lib/seo';
import { TOOLS } from '@/app/outils/tools';

export const revalidate = 86400;

// Context file for AI systems — see https://llmstxt.org
export function GET() {
  const body = `# Meskan

> Meskan est une plateforme algérienne et un intermédiaire immobilier : réserver des hôtels, louer des maisons et appartements (à la nuit, au mois ou à l'année), acheter des biens immobiliers et trouver un investisseur ou un projet, dans les 69 wilayas d'Algérie. Les annonces sont vérifiées par l'équipe avant publication. Les utilisateurs ne se contactent pas entre eux : ils contactent Meskan, qui met les deux parties en relation. La réservation d'hôtel est gratuite : le voyageur envoie une demande, l'établissement l'accepte, et le paiement se fait en dinars (DZD) sur place à l'arrivée.

Langues : français (${SITE_URL}/), arabe (${SITE_URL}/ar) et anglais (${SITE_URL}/en) ; chaque page existe dans les trois langues (préfixe /ar ou /en). Pays couvert : Algérie (69 wilayas). Contact : support@hotelsdz.dz.

Wilaya pages use ASCII slugs: ${SITE_URL}/destinations/oran, ${SITE_URL}/destinations/bordj-bou-arreridj.

## Pages principales
- [Hôtels](${SITE_URL}/hotels): hôtels vérifiés, avis clients, chambres et réservation en ligne
- [Locations](${SITE_URL}/houses): villas, appartements, chalets et studios à louer à la nuit, au mois ou à l'année
- [Ventes immobilières](${SITE_URL}/sales): appartements, villas, terrains et locaux à vendre, avec référence d'annonce
- [Investissement](${SITE_URL}/investir): terrains, locaux et projets qui cherchent un investisseur, et investisseurs qui cherchent un projet
- [Destinations](${SITE_URL}/destinations): une page par wilaya avec nombre d'annonces, prix médians et FAQ
- [Comparatif](${SITE_URL}/comparatif): Meskan face à Booking.com, Airbnb et Ouedkniss (paiement, frais, réservation)
- [Tarifs](${SITE_URL}/pricing): formules pour propriétaires et vendeurs (version texte : ${SITE_URL}/pricing.md)

## Comment Meskan est rémunéré
- Réservation d'hôtel ou location à la nuit : gratuite pour le voyageur, sans commission pour l'établissement.
- Location au mois de moins de 7 mois : 5 000 DA ; location à l'année ou de 7 mois et plus : 10 000 DA. Dus par le propriétaire, seulement si la location se conclut grâce à Meskan.
- Vente : Meskan ajoute 1 % au prix demandé par le vendeur ; le prix affiché sur le site inclut déjà ce 1 %.
- Investissement : 2 % de la valeur de la transaction, seulement si elle aboutit. Meskan met les parties en relation ; les démarches (papiers, contrat, notaire) se font ensuite entre elles.
- Détail : ${SITE_URL}/pricing.md

## Outils gratuits
${TOOLS.map((t) => `- [${t.title}](${SITE_URL}/outils/${t.slug}): ${t.short}`).join('\n')}

## À propos
- [À propos](${SITE_URL}/about)
- [Contact](${SITE_URL}/contact)
- [Plan du site](${SITE_URL}/sitemap.xml)
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
