'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { MapPin, Maximize2, FileCheck2, Coins, PieChart, Handshake, Building2, Home, Send, CheckCircle2, Phone, MessageCircle, ArrowLeft, Eye, Users, ShieldCheck, Mail } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from '@/components/LocaleLink';
import ShareButton from '@/components/ShareButton';
import SaveProjectButton from '@/components/SaveProjectButton';
import LocationMap from '@/components/LocationMap';
import api, { getImageUrl } from '@/lib/api';
import { formatDZD } from '@/lib/data';
import { formatArea, assetLabel, documentLabel, isCapital, budgetRange, areaRange, placeLabel, PROJECT_COLORS, projectGradient } from '@/lib/projects';
import { useInitialData } from '@/components/InitialData';
import { useAuthStore } from '@/store/authStore';
import { useT } from '@/lib/i18n/useT';

const intlPhone = (raw = '') => {
  const d = String(raw).replace(/[^\d+]/g, '');
  if (d.startsWith('+')) return d;
  if (d.startsWith('00')) return `+${d.slice(2)}`;
  if (d.startsWith('0')) return `+213${d.slice(1)}`;
  return d;
};

export default function ProjectPage() {
  const { t, lang } = useT();
  const { id } = useParams();
  const initial = useInitialData();
  const user = useAuthStore((s) => s.user);
  const [project, setProject] = useState(initial?.project?._id === id ? initial.project : null);
  const [missing, setMissing] = useState(false);
  const [photo, setPhoto] = useState(0);
  // Meskan's own phone / email: the intermediary between the two parties (the publisher's contact is never public)
  const [contact, setContact] = useState(initial?.project?._id === id ? initial.contact || {} : {});

  useEffect(() => {
    api
      .get(`/projects/${id}`)
      .then(({ data }) => {
        setProject(data.project);
        setContact(data.contact || {});
      })
      .catch(() => setMissing(true));
  }, [id]);

  if (missing && !project) {
    return (
      <main className="min-h-screen bg-[#F5FBFC]">
        <Navbar />
        <div className="mx-auto max-w-xl px-4 py-24 text-center">
          <p className="text-lg font-bold" style={{ color: PROJECT_COLORS.ink }}>{t('Ce projet n’existe pas ou n’est plus en ligne.')}</p>
          <Link href="/investir" className="mt-4 inline-block font-semibold text-[#00B3D2] hover:underline">{t('Voir les projets')}</Link>
        </div>
        <Footer />
      </main>
    );
  }
  if (!project) {
    return (
      <main className="min-h-screen bg-[#F5FBFC]">
        <Navbar />
        <p className="py-24 text-center text-slate-400">{t('Chargement...')}</p>
      </main>
    );
  }

  const p = project;
  const images = (p.images || []).map((i) => getImageUrl(i.url || i));
  const mine = user && String(p.owner?._id || p.owner) === String(user._id);
  const capital = isCapital(p);
  const facts = capital ? [
    { icon: Home, label: 'Bien recherché', value: assetLabel(p, t) },
    { icon: MapPin, label: 'Emplacement souhaité', value: p.city ? placeLabel(p, t) : t('Toute la wilaya de {w}', { w: t(p.wilaya) }) },
    { icon: Maximize2, label: 'Surface souhaitée', value: areaRange(p, t, lang) },
    { icon: Coins, label: 'Budget', value: budgetRange(p, t, formatDZD) },
    { icon: Building2, label: 'Type de projet', value: t(p.projectType) },
    { icon: Handshake, label: 'Partenariat proposé', value: t(p.partnership) },
  ] : [
    { icon: Home, label: 'Type de bien', value: assetLabel(p, t) },
    { icon: Maximize2, label: 'Surface', value: formatArea(p.area, lang) },
    { icon: Building2, label: 'Type de projet', value: t(p.projectType) },
    { icon: Handshake, label: 'Partenariat proposé', value: t(p.partnership) },
    { icon: FileCheck2, label: 'Papiers du bien', value: documentLabel(p, t) },
    { icon: Coins, label: 'Investissement estimé', value: p.budget ? formatDZD(p.budget) : t('À définir') },
    ...(p.ownerShare != null ? [{ icon: PieChart, label: 'Part gardée par le propriétaire', value: `${p.ownerShare} %` }] : []),
  ];

  return (
    <main className="min-h-screen bg-[#F5FBFC]">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Link href="/investir" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-[#00B3D2]">
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" /> {t('Tous les projets')}
        </Link>

        {p.status !== 'approved' && (
          <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            {p.status === 'rejected' ? `${t('Projet refusé :')} ${p.rejectionReason}` : t('Aperçu : ce projet attend la validation de l’administration.')}
          </p>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left: photos, facts, description */}
          <div className="space-y-6 lg:col-span-2">
            <div className="overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-black/5">
              <div className={`relative bg-slate-100 ${capital ? 'aspect-[16/6]' : 'aspect-[16/9]'}`}>
                {capital ? (
                  // an investor's search has no photo: a banner with what they look for
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-center text-white" style={{ background: projectGradient }}>
                    <Coins className="h-12 w-12" aria-hidden="true" />
                    <p className="font-semibold text-white/85">{t('Investisseur cherche')}</p>
                    <p className="text-2xl font-black">{assetLabel(p, t)} · {t(p.wilaya)}</p>
                  </div>
                ) : (
                  images[photo] && <img src={images[photo]} alt={p.title} className="h-full w-full object-cover" />
                )}
                <div className="absolute end-4 top-4 flex flex-wrap justify-end gap-2">
                  <SaveProjectButton projectId={p._id} />
                  <ShareButton title={`${p.title} — ${t(p.city)}, ${t(p.wilaya)}`} text={t('Projet à la recherche d’un investisseur sur Meskan : {title}', { title: p.title })} />
                </div>
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto p-3">
                  {images.map((src, i) => (
                    <button key={src} type="button" onClick={() => setPhoto(i)} aria-label={t('Photo {n}', { n: i + 1 })} className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg ring-2 ${i === photo ? 'ring-[#00B3D2]' : 'ring-transparent'}`}>
                      <img src={src} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-card ring-1 ring-black/5">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full px-3 py-1 font-bold text-white" style={{ background: projectGradient }}>{capital ? t('Investisseur cherche un bien') : t('Recherche investisseur')}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">{p.reference}</span>
              </div>
              <h1 className="text-2xl font-black leading-tight md:text-3xl" style={{ color: PROJECT_COLORS.ink }} dir="auto">{p.title}</h1>
              <p className="mt-2 flex items-center gap-1 text-slate-500">
                <MapPin className="h-4 w-4 text-[#00B3D2]" aria-hidden="true" /> {p.address ? `${p.address}, ` : ''}{placeLabel(p, t)}
              </p>

              <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {facts.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="rounded-2xl bg-[#F5FBFC] p-4">
                    <dt className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                      <Icon className="h-4 w-4 text-[#00B3D2]" aria-hidden="true" /> {t(label)}
                    </dt>
                    <dd className="mt-1 font-extrabold" style={{ color: PROJECT_COLORS.ink }}>{value}</dd>
                  </div>
                ))}
              </dl>

              {p.description && (
                <>
                  <h2 className="mb-2 mt-8 text-lg font-bold" style={{ color: PROJECT_COLORS.ink }}>{capital ? t('Ce que l’investisseur recherche') : t('Le projet imaginé')}</h2>
                  <p className="whitespace-pre-line leading-relaxed text-slate-700" dir="auto">{p.description}</p>
                </>
              )}
              <p className="mt-6 flex flex-wrap gap-4 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1"><Eye className="h-4 w-4" aria-hidden="true" /> {t('{n} vue(s)', { n: p.views || 0 })}</span>
                <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" aria-hidden="true" /> {capital ? t('{n} proposition(s) reçue(s)', { n: p.interestsCount || 0 }) : t('{n} investisseur(s) intéressé(s)', { n: p.interestsCount || 0 })}</span>
              </p>
            </div>

            {p.coordinates?.lat && (
              <div className="rounded-3xl bg-white p-6 shadow-card ring-1 ring-black/5">
                <h2 className="mb-3 text-lg font-bold" style={{ color: PROJECT_COLORS.ink }}>{t('Emplacement du bien')}</h2>
                <LocationMap lat={p.coordinates.lat} lng={p.coordinates.lng} label={p.title} accent="#00B3D2" />
              </div>
            )}
          </div>

          {/* Right: Meskan (the intermediary) + interest form. The publisher's name and phone are never shown. */}
          <aside className="space-y-6">
            <div className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-black/5">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400 rtl:tracking-normal">{t('Votre contact pour ce projet')}</p>
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-white" style={{ background: projectGradient }}>
                  <ShieldCheck className="h-6 w-6" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-bold" style={{ color: PROJECT_COLORS.ink }}>{t('Meskan — intermédiaire')}</p>
                  <p className="text-xs text-slate-500">{t('Nous vous mettons en relation en toute confidentialité.')}</p>
                </div>
              </div>
              {!mine && (contact.phone || contact.email) && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {contact.phone && (
                    <>
                      <a href={`tel:${intlPhone(contact.phone)}`} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                        <Phone className="h-4 w-4" aria-hidden="true" /> {t('Appeler')}
                      </a>
                      <a href={`https://wa.me/${intlPhone(contact.phone).replace('+', '')}?text=${encodeURIComponent(capital ? t('Bonjour, j’ai un bien qui correspond à la recherche {ref} sur Meskan.', { ref: p.reference }) : t('Bonjour, le projet {ref} sur Meskan m’intéresse.', { ref: p.reference }))}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600">
                        <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp
                      </a>
                    </>
                  )}
                  {contact.email && (
                    <a href={`mailto:${contact.email}?subject=${encodeURIComponent(`${p.reference} — ${p.title}`)}`} className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                      <Mail className="h-4 w-4" aria-hidden="true" /> {contact.email}
                    </a>
                  )}
                </div>
              )}
            </div>

            {mine ? (
              <Link href="/investor/projects" className="block rounded-3xl p-5 text-center font-bold text-white shadow-card" style={{ background: projectGradient }}>
                {capital ? t('Gérer ma recherche et voir les propositions') : t('Gérer mon projet et voir les demandes')}
              </Link>
            ) : (
              p.status === 'approved' && <InterestForm project={p} user={user} />
            )}
          </aside>
        </div>
      </div>
      <Footer />
    </main>
  );
}

/** "Je suis intéressé" — goes to the land owner (their space + email). */
function InterestForm({ project, user }) {
  const capital = isCapital(project); // an investor's search: the visitor offers a property
  const { t } = useT();
  const [form, setForm] = useState({ name: user?.fullName || '', phone: user?.phone || '', email: user?.email || '', amount: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    if (user) setForm((f) => ({ ...f, name: f.name || user.fullName || '', phone: f.phone || user.phone || '', email: f.email || user.email || '' }));
  }, [user]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.name.trim().length < 2) return setError(t('Veuillez entrer votre nom complet.'));
    if (!/^\d{8,15}$/.test(form.phone.replace(/\D/g, ''))) return setError(t('Numéro de téléphone invalide (ex. 0555 12 34 56).'));
    if (form.message.trim().length < 10) return setError(t('Votre message doit contenir au moins 10 caractères.'));
    setSending(true);
    try {
      await api.post(`/projects/${project._id}/interest`, { ...form, amount: form.amount ? Number(String(form.amount).replace(/\D/g, '')) : '' });
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-3xl bg-white p-6 text-center shadow-card ring-1 ring-black/5">
        <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-500" aria-hidden="true" />
        <p className="font-bold" style={{ color: PROJECT_COLORS.ink }}>{t('Demande envoyée !')}</p>
        <p className="mt-1 text-sm text-slate-500">{t('L’équipe Meskan a reçu votre demande et vous contactera pour vous mettre en relation.')}</p>
      </div>
    );
  }

  const input = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#00B3D2]';
  return (
    <form onSubmit={submit} noValidate className="space-y-3 rounded-3xl bg-white p-5 shadow-card ring-1 ring-black/5">
      <h2 className="text-lg font-bold" style={{ color: PROJECT_COLORS.ink }}>{capital ? t('Vous avez ce bien ?') : t('Ce projet vous intéresse ?')}</h2>
      <p className="text-sm text-slate-500">{capital ? t('Décrivez votre bien : l’équipe Meskan reçoit votre proposition et vous met en relation avec l’investisseur.') : t('Envoyez votre demande : l’équipe Meskan la reçoit et vous met en relation avec le propriétaire.')}</p>
      <label className="block text-xs font-semibold text-slate-600">
        {t('Nom complet')} *
        <input value={form.name} onChange={set('name')} autoComplete="name" className={`${input} mt-1`} />
      </label>
      <label className="block text-xs font-semibold text-slate-600">
        {t('Téléphone')} *
        <input value={form.phone} onChange={set('phone')} type="tel" inputMode="tel" dir="ltr" autoComplete="tel" placeholder="0555 12 34 56" className={`${input} mt-1 rtl:text-right`} />
      </label>
      <label className="block text-xs font-semibold text-slate-600">
        {t('Email')}
        <input value={form.email} onChange={set('email')} type="email" autoComplete="email" className={`${input} mt-1`} />
      </label>
      <label className="block text-xs font-semibold text-slate-600">
        {capital ? t('Prix demandé (DZD)') : t('Montant que vous envisagez d’investir (DZD)')}
        <input value={form.amount} onChange={set('amount')} inputMode="numeric" dir="ltr" placeholder="50 000 000" className={`${input} mt-1 rtl:text-right`} />
      </label>
      <label className="block text-xs font-semibold text-slate-600">
        {t('Message')} *
        <textarea value={form.message} onChange={set('message')} rows={4} maxLength={2000} placeholder={capital ? t('Votre bien : type, surface, emplacement, papiers…') : t('Présentez-vous et votre proposition…')} className={`${input} mt-1 resize-y`} />
      </label>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={sending} className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 font-bold text-white shadow transition hover:brightness-95 disabled:opacity-60" style={{ background: projectGradient }}>
        <Send className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" /> {sending ? t('Envoi...') : capital ? t('Envoyer ma proposition') : t('Envoyer ma demande')}
      </button>
    </form>
  );
}
