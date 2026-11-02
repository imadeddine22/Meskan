'use client';

import { useEffect, useState } from 'react';
import { Landmark } from 'lucide-react';
import Link from '@/components/LocaleLink';
import api from '@/lib/api';
import ProjectCard from '@/components/ProjectCard';
import { findWilaya } from '@/hooks/useCommunes';
import { useT } from '@/lib/i18n/useT';

/** Home page search results: investment projects (both kinds) of the chosen wilaya; hidden when there are none. */
export default function PlaceProjects({ selectedCity }) {
  const { t } = useT();
  const [projects, setProjects] = useState([]);
  const wilaya = findWilaya(selectedCity)?.name;

  useEffect(() => {
    if (!wilaya) return setProjects([]);
    const get = (extra) => api.get('/projects', { params: { wilaya, limit: 6, ...extra } }).then(({ data }) => data.projects || []).catch(() => []);
    Promise.all([get({}), get({ kind: 'capital' })]).then(([assets, capital]) => setProjects([...assets, ...capital]));
  }, [wilaya]);

  if (!projects.length) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow">
            <Landmark className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 className="text-[22px] font-extrabold text-ink">{t('Projets d’investissement')}</h2>
        </div>
        <Link href="/investir" className="rounded-full border border-gray-200 bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          {t('Voir tout')}
        </Link>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => <ProjectCard key={p._id} project={p} />)}
      </div>
    </section>
  );
}
