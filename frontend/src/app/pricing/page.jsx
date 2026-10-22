'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from '@/components/LocaleLink';
import api from '@/lib/api';

import { useT } from '@/lib/i18n/useT';
const FAQS = [
  {
    q: "Quels sont les modes de paiement acceptés ?",
    a: "Les abonnements se règlent par virement bancaire ou versement CCP. Contactez-nous depuis la page Contact pour recevoir les coordonnées de paiement."
  },
  {
    q: "Puis-je changer de plan ou annuler mon abonnement à tout moment ?",
    a: "Oui, absolument. Vous pouvez mettre à niveau, rétrograder ou annuler votre abonnement à tout moment depuis vos paramètres de profil. En cas d'annulation, votre abonnement reste actif jusqu'à la fin de la période facturée."
  },
  {
    q: "Quelle est la durée de chaque formule ?",
    a: "Starter : 15 jours gratuits pour essayer Meskan. Growth : abonnement mensuel. Pro : abonnement annuel, sans renouvellement chaque mois."
  },
  {
    q: "Y a-t-il des frais ou commissions supplémentaires sur mes réservations ?",
    a: "Non. Contrairement à d'autres plateformes, Meskan fonctionne sur un modèle d'abonnement pur. Vous gardez 100% de vos gains sans aucune commission prélevée sur vos réservations."
  },
  {
    q: "Que se passe-t-il si je dépasse la limite d'établissements de mon plan ?",
    a: "Si vous atteignez votre limite, vous serez invité à passer au plan supérieur (Growth ou Pro) pour pouvoir ajouter de nouvelles annonces d'hôtels ou de maisons."
  }
];

const COMPARISON_FEATURES = [
  { name: "Nombre d'établissements", starter: "1", growth: "Jusqu'à 5", pro: "Illimité" },
  { name: "Photos par annonce", starter: "5 photos", growth: "Illimitées", pro: "Illimitées" },
  { name: "Réservation directe", starter: true, growth: true, pro: true },
  { name: "Mise en avant (Featured)", starter: false, growth: true, pro: true },
  { name: "Badge de profil vérifié", starter: false, growth: false, pro: true },
  { name: "Statistiques de visites", starter: "De base", growth: "Avancées", pro: "Pro & Export" },
  { name: "Dossiers de location en ligne", starter: false, growth: true, pro: true },
  { name: "Accès API & Sync iCal", starter: false, growth: false, pro: true }
];

const DoubleLoopIcon = ({ color = 'text-slate-300' }) => (
  <svg className={`h-8 w-16 ${color}`} viewBox="0 0 48 32" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
    <path d="M16 8 C6 8, 6 24, 16 24 C22 24, 26 8, 32 8 C42 8, 42 24, 32 24 C26 24, 22 8, 16 8 Z" />
  </svg>
);

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`overflow-hidden rounded-2xl border transition-all duration-300 ${
      open ? 'border-teal-500 bg-teal-50/5 shadow-sm' : 'border-slate-100 bg-white hover:shadow-md'
    }`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left font-bold text-slate-800 transition"
      >
        <span className="text-sm md:text-base font-serif">{q}</span>
        {open ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-teal-600 animate-fade-in" />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" />
        )}
      </button>
      {open && (
        <div className="px-6 pb-5 text-xs md:text-sm leading-relaxed text-slate-500 animate-fade-in">
          {a}
        </div>
      )}
    </div>
  );
}

export default function PricingPage() {
  const { t } = useT();
  // Each plan has its own period: Starter = 15 days free, Growth = monthly, Pro = yearly
  const [prices, setPrices] = useState({
    growthMonthly: 2900,
    growthYearly: 29000,
    proMonthly: 6900,
    proYearly: 69000
  });

  useEffect(() => {
    api.get('/pricing/prices')
      .then(({ data }) => {
        if (data.success && data.settings) {
          setPrices({
            growthMonthly: data.settings.growthMonthlyPrice || 2900,
            growthYearly: data.settings.growthYearlyPrice || 29000,
            proMonthly: data.settings.proMonthlyPrice || 6900,
            proYearly: data.settings.proYearlyPrice || 69000
          });
        }
      })
      .catch((err) => console.error("Error loading prices:", err));
  }, []);

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />

      {/* Hero Header */}
      <section className="text-center py-20 px-4 bg-gradient-to-b from-white to-slate-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-60"></div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-4 py-1.5 text-xs font-extrabold text-brand-600 uppercase tracking-widest mb-4 border border-brand-200 shadow-sm animate-pulse">
            {t('✦ Nouveau Modèle d\'Abonnement')}
          </span>
          <h1 className="text-4xl md:text-6xl font-black font-serif text-slate-800 tracking-tight leading-none">
            {t('Flexible pricing plans')} <br />
            {t('for')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-slate-500">{t('every growing business')}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-slate-500 text-sm md:text-base font-medium leading-relaxed">
            {t('Start free, scale as you grow. Choose the plan that matches your customer engagement goals. Aucune commission sur vos gains.')}
          </p>

        </div>
      </section>

      {/* Compare Plans Desktop Unified Grid (Matches Screenshot) */}
      <section className="max-w-7xl mx-auto px-4 pb-20 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black font-serif text-slate-800">{t('Compare plans')}</h2>
          <p className="text-slate-500 text-sm mt-2 max-w-xl mx-auto">
            {t('See which plan fits your team\'s goals — from essential customer data tools to advanced automation and analytics.')}
          </p>
        </div>

        {/* Large screen layout */}
        <div className="hidden lg:block overflow-hidden rounded-3xl border border-slate-200/80 shadow-md bg-white">
          <div className="grid grid-cols-4 items-stretch divide-x divide-slate-100">
            
            {/* Header Column 1: Title card */}
            <div className="p-8 flex flex-col justify-end bg-slate-50/30">
              <h4 className="text-2xl font-black text-slate-800 font-serif leading-none">{t('Features')}</h4>
            </div>

            {/* Header Column 2: Starter Card */}
            <div className="p-8 flex flex-col justify-between bg-white">
              <div>
                <div className="mb-4">
                  <DoubleLoopIcon color="text-slate-200" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 font-serif">{t('Starter Plan')}</h3>
                <p className="text-[11px] text-slate-400 font-bold mt-1 min-h-[32px]">{t('Best for small teams getting started.')}</p>
                <div className="flex items-baseline gap-1 mt-6">
                  <span className="text-4xl font-black text-slate-800 tracking-tight">0</span>
                  <span className="text-xs font-bold text-slate-400">{t('DZD /')} {t('15 jours')}</span>
                </div>
                <p className="mt-2 inline-block rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">{t('Essai gratuit de 15 jours')}</p>
              </div>
              <Link
                href="/register"
                className="mt-8 block w-full text-center py-2.5 px-4 rounded-full font-bold text-xs text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition"
              >
                {t('Get started free')}
              </Link>
            </div>

            {/* Header Column 3: Growth Card (Teal border highlight) */}
            <div className="p-8 flex flex-col justify-between bg-teal-50/5 relative ring-2 ring-teal-500/50 ring-inset">
              <div className="absolute -top-0.5 left-0 right-0 bg-teal-500 text-white font-extrabold text-[10px] text-center py-1 uppercase tracking-widest">
                {t('Most Popular')}
              </div>
              <div className="pt-2">
                <div className="mb-4">
                  <DoubleLoopIcon color="text-teal-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 font-serif">{t('Growth Plan')}</h3>
                <p className="text-[11px] text-slate-400 font-bold mt-1 min-h-[32px]">{t('For scaling teams ready to automate journeys.')}</p>
                <div className="flex items-baseline gap-1 mt-6">
                  <span className="text-4xl font-black text-slate-800 tracking-tight">
                    {new Intl.NumberFormat('fr-DZ').format(prices.growthMonthly)}
                  </span>
                  <span className="text-xs font-bold text-slate-400">{t('DZD /')} {t('mois')}</span>
                </div>
              </div>
              <Link
                href="/register?plan=growth"
                className="mt-8 block w-full text-center py-2.5 px-4 rounded-full font-bold text-xs text-white bg-slate-900 hover:bg-slate-800 shadow-md transition"
              >
                {t('Choisir ce plan')}
              </Link>
            </div>

            {/* Header Column 4: Pro Card */}
            <div className="p-8 flex flex-col justify-between bg-white">
              <div>
                <div className="mb-4">
                  <DoubleLoopIcon color="text-emerald-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 font-serif">{t('Pro Plan')}</h3>
                <p className="text-[11px] text-slate-400 font-bold mt-1 min-h-[32px]">{t('For businesses that need customization.')}</p>
                <div className="flex items-baseline gap-1 mt-6">
                  <span className="text-4xl font-black text-slate-800 tracking-tight">
                    {new Intl.NumberFormat('fr-DZ').format(prices.proYearly)}
                  </span>
                  <span className="text-xs font-bold text-slate-400">{t('DZD /')} {t('an')}</span>
                </div>
              </div>
              <Link
                href="/contact?subject=pro-plan"
                className="mt-8 block w-full text-center py-2.5 px-4 rounded-full font-bold text-xs text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition"
              >
                {t('Book demo')}
              </Link>
            </div>

          </div>

          {/* Comparison Rows */}
          <div className="divide-y divide-slate-100 border-t border-slate-200">
            {COMPARISON_FEATURES.map((feat, idx) => (
              <div key={idx} className="grid grid-cols-4 items-center divide-x divide-slate-100 hover:bg-slate-50/20 transition-colors">
                {/* Feature Name */}
                <div className="p-5 text-sm font-bold text-slate-700 bg-slate-50/10">{t(feat.name)}</div>
                
                {/* Starter */}
                <div className="p-5 text-sm font-semibold text-slate-500 text-center">
                  {typeof feat.starter === 'boolean' ? (
                    feat.starter ? <span className="text-emerald-500 text-base">✔</span> : <span className="text-slate-300">✕</span>
                  ) : t(feat.starter)}
                </div>

                {/* Growth (Highlighted border) */}
                <div className="p-5 text-sm font-bold text-teal-600 text-center bg-teal-50/5 ring-2 ring-teal-500/50 ring-inset">
                  {typeof feat.growth === 'boolean' ? (
                    feat.growth ? <span className="text-emerald-500 text-base">✔</span> : <span className="text-slate-300">✕</span>
                  ) : t(feat.growth)}
                </div>

                {/* Pro */}
                <div className="p-5 text-sm font-semibold text-slate-500 text-center">
                  {typeof feat.pro === 'boolean' ? (
                    feat.pro ? <span className="text-emerald-500 text-base">✔</span> : <span className="text-slate-300">✕</span>
                  ) : t(feat.pro)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile alternative view (Simple cards stacked) */}
        <div className="grid gap-6 lg:hidden">
          {/* Card 1 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 font-serif">{t('Starter Plan')}</h3>
            <p className="text-4xl font-black text-slate-800 mt-2">{t('0 DZD')} <span className="text-xs text-slate-400 font-bold">/ {t('15 jours')}</span></p>
            <p className="mt-2 inline-block rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">{t('Essai gratuit de 15 jours')}</p>
            <ul className="mt-4 space-y-2">
              <li className="text-xs text-slate-600 font-semibold">{t('1 établissement')}</li>
              <li className="text-xs text-slate-600 font-semibold">{t('5 photos max')}</li>
              <li className="text-xs text-slate-600 font-semibold">{t('Support par email')}</li>
            </ul>
            <Link href="/register" className="mt-6 block text-center py-2.5 rounded-full font-bold text-xs text-slate-700 border border-slate-200">
              {t('Get started free')}
            </Link>
          </div>
          {/* Card 2 */}
          <div className="bg-white rounded-2xl p-6 border-2 border-teal-500 shadow-sm relative">
            <span className="absolute -top-3.5 right-6 bg-teal-500 text-white font-extrabold text-[8px] uppercase px-3 py-0.5 rounded-full">{t('Most Popular')}</span>
            <h3 className="text-lg font-bold text-slate-800 font-serif">{t('Growth Plan')}</h3>
            <p className="text-4xl font-black text-slate-800 mt-2">
              {new Intl.NumberFormat('fr-DZ').format(prices.growthMonthly)} {t('DZD')}
              <span className="text-xs text-slate-400 font-bold"> / {t('mois')}</span>
            </p>
            <ul className="mt-4 space-y-2">
              <li className="text-xs text-slate-600 font-semibold">{t('Jusqu\'à 5 établissements')}</li>
              <li className="text-xs text-slate-600 font-semibold">{t('Photos illimitées')}</li>
              <li className="text-xs text-slate-600 font-semibold">{t('Mise en avant (Featured)')}</li>
              <li className="text-xs text-slate-600 font-semibold">{t('Support prioritaire 7j/7')}</li>
            </ul>
            <Link href="/register?plan=growth" className="mt-6 block text-center py-2.5 rounded-full font-bold text-xs text-white bg-slate-900">
              {t('Choisir ce plan')}
            </Link>
          </div>
          {/* Card 3 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 font-serif">{t('Pro Plan')}</h3>
            <p className="text-4xl font-black text-slate-800 mt-2">
              {new Intl.NumberFormat('fr-DZ').format(prices.proYearly)} {t('DZD')}
              <span className="text-xs text-slate-400 font-bold"> / {t('an')}</span>
            </p>
            <ul className="mt-4 space-y-2">
              <li className="text-xs text-slate-600 font-semibold">{t('Établissements illimités')}</li>
              <li className="text-xs text-slate-600 font-semibold">{t('Badge vérifié')}</li>
              <li className="text-xs text-slate-600 font-semibold">{t('API Sync Calendrier')}</li>
              <li className="text-xs text-slate-600 font-semibold">{t('Dossiers de location')}</li>
            </ul>
            <Link href="/contact?subject=pro-plan" className="mt-6 block text-center py-2.5 rounded-full font-bold text-xs text-slate-700 border border-slate-200">
              {t('Book demo')}
            </Link>
          </div>
        </div>
      </section>

      {/* Partner Logos Grid */}
      <section className="bg-white py-14 border-y border-slate-100 select-none">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-8">
            {t('REJOINT PAR LES LEADERS DE L\'HÔTELLERIE 5 ÉTOILES EN ALGÉRIE')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-10 md:gap-16 opacity-75">
            {/* Sheraton */}
            <div className="flex items-center gap-2 text-slate-700 font-serif font-bold text-lg md:text-xl tracking-tight">
              <span className="w-7 h-7 rounded-full border-2 border-slate-700 flex items-center justify-center font-serif text-sm font-bold shadow-sm">{t('S')}</span>
              <span>{t('Sheraton')}</span>
            </div>
            {/* Sofitel */}
            <div className="flex items-center gap-2 text-slate-700 font-serif font-bold text-lg md:text-xl tracking-widest uppercase">
              <span>{t('Sofitel')}</span>
            </div>
            {/* Marriott */}
            <div className="flex items-center gap-1 text-slate-800 font-sans font-black text-lg md:text-xl tracking-tight uppercase">
              <span className="text-red-700 font-serif text-2xl font-black leading-none mr-0.5">{t('M')}</span>
              <span>{t('Marriott')}</span>
            </div>
            {/* Hyatt Regency */}
            <div className="flex flex-col items-center text-slate-700 font-sans font-bold text-xs tracking-[0.2em] uppercase leading-none">
              <span>{t('Hyatt')}</span>
              <span className="text-[8px] font-medium text-slate-400 mt-1 tracking-widest">{t('Regency')}</span>
            </div>
            {/* El Aurassi */}
            <div className="flex items-center gap-1.5 text-slate-700 font-serif font-bold text-lg md:text-xl">
              <span className="text-lg text-slate-500">🌙</span>
              <span>{t('El Aurassi')}</span>
            </div>
            {/* Royal Hotel */}
            <div className="flex items-center gap-1.5 text-slate-700 font-serif font-bold text-lg md:text-xl">
              <span className="text-amber-500 text-lg">👑</span>
              <span>{t('Royal Hotel')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Split Screen Section (Matches Screenshot) */}
      <section className="bg-white py-20 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row gap-12 items-start">
            
            {/* Left Column (40% width) */}
            <div className="w-full lg:w-[40%] sticky top-8">
              <div className="border border-slate-200 rounded-lg px-3 py-1 flex items-center gap-1.5 text-xs font-black text-slate-500 bg-white w-fit shadow-sm">
                <HelpCircle className="h-3.5 w-3.5 text-teal-600" />
                <span>{t('FAQ')}</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black font-serif text-slate-800 mt-4 tracking-tight leading-none">
                {t('Frequently asked')} <br />{t('questions')}
              </h2>
              <p className="text-slate-500 text-sm mt-4 font-medium max-w-sm leading-relaxed">
                {t('These are the most commonly asked questions about Meskan. Can\'t find what you\'re looking for?')}
              </p>
              <Link
                href="/contact"
                className="inline-block mt-6 px-6 py-3 rounded-full font-bold text-xs text-white bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 transition shadow-md hover:scale-102"
              >
                {t('Help Center')}
              </Link>
            </div>

            {/* Right Column (60% width) */}
            <div className="w-full lg:w-[60%] flex flex-col gap-4">
              {FAQS.map((faq, i) => (
                <FaqItem key={i} q={t(faq.q)} a={t(faq.a)} />
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* Final CTA Banner */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 p-12 text-center text-white shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.03]"></div>
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-serif font-black tracking-tight leading-tight">
              {t('Prêt à publier vos biens et garder 100% de vos gains ?')}
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-slate-400 text-xs md:text-sm font-medium">
              {t('Inscrivez-vous dès aujourd\'hui sur Meskan. Choisissez le plan d\'abonnement idéal et touchez des clients dans les 69 wilayas d\'Algérie.')}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/register"
                className="rounded-full bg-white px-8 py-3.5 font-bold text-slate-900 shadow-md hover:bg-slate-50 transition hover:scale-102"
              >
                {t('Inscrire mon établissement')}
              </Link>
              <Link
                href="/contact"
                className="rounded-full border border-slate-700 bg-slate-800/40 px-8 py-3.5 font-bold text-white backdrop-blur-sm transition hover:bg-slate-800/80 hover:scale-102"
              >
                {t('Nous contacter')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
