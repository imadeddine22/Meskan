import { apiGetListing, NOT_FOUND, absoluteImage, truncate } from '@/lib/seo';
import { getT, pageMeta } from '@/lib/i18n/server';
import { localized } from '@/lib/i18n/localizeData';
import { InitialData } from '@/components/InitialData';
import { assetLabel } from '@/lib/projects';

// NOT_FOUND = doesn't exist or isn't public yet (an owner previewing a pending project): never indexed
const getProject = async (id) => {
  const data = await apiGetListing(`/projects/${encodeURIComponent(id)}?noview=1`);
  if (data === NOT_FOUND) return { notFound: true };
  return localized(data, getT().lang);
};

export async function generateMetadata({ params }) {
  const data = await getProject(params.id);
  const p = data?.project;
  if (!p) {
    return { title: 'Projet d’investissement', alternates: { canonical: `/investir/${params.id}` }, robots: data?.notFound ? { index: false, follow: true } : undefined };
  }
  const { t } = getT();
  const capital = p.kind === 'capital';
  const meta = pageMeta({
    path: `/investir/${p._id}`,
    title: capital
      ? t('{title} — investisseur cherche {asset} à {place}', { title: p.title, asset: assetLabel(p, t).toLowerCase(), place: t(p.city || p.wilaya) })
      : t('{title} — {asset} à {city} cherche investisseur', { title: p.title, asset: assetLabel(p, t).toLowerCase(), city: t(p.city) }),
    description:
      truncate(p.description, 155) ||
      (capital && t('Un investisseur cherche {asset} dans la wilaya de {wilaya} pour un projet {type}. Propriétaires : proposez votre bien.', { asset: assetLabel(p, t).toLowerCase(), wilaya: t(p.wilaya), type: t(p.projectType) })) ||
      t('{asset} de {area} m² à {city} ({wilaya}) pour un projet {type}. Partenariat : {partnership}.', { asset: assetLabel(p, t), area: p.area, city: t(p.city), wilaya: t(p.wilaya), type: t(p.projectType), partnership: t(p.partnership) }),
    robots: p.status === 'approved' ? undefined : { index: false, follow: false },
  });
  return { ...meta, openGraph: { ...meta.openGraph, images: (p.images || []).slice(0, 1).map(absoluteImage), type: 'website' } };
}

export default async function Layout({ children, params }) {
  const data = await getProject(params.id);
  return <InitialData value={data?.project ? data : null}>{children}</InitialData>;
}
