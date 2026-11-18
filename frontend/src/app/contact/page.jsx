'use client';

import { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import api from '@/lib/api';

import { useT } from '@/lib/i18n/useT';
const SUBJECTS = [
  'Question sur une réservation',
  'Inscrire mon hôtel',
  'Problème de paiement',
  'Partenariat',
  'Autre',
];

export default function ContactPage() {
  const { t } = useT();
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: SUBJECTS[0], message: '' });
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (form.name.trim().length < 2) errs.name = 'Veuillez entrer votre nom complet.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Adresse email invalide.';
    // so the site owner can call back: 8 to 15 digits, + ( ) - . and spaces allowed
    if (!/^\+?[\d\s().-]{8,22}$/.test(form.phone.trim()) || !/^\d{8,15}$/.test(form.phone.replace(/\D/g, '')))
      errs.phone = 'Numéro de téléphone invalide (ex. 0555 12 34 56).';
    if (form.message.trim().length < 10)
      errs.message = 'Votre message doit contenir au moins 10 caractères.';
    return errs;
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSending(true);
    try {
      // Backend expects `content`, the form field is named `message`.
      const { message, ...rest } = form;
      await api.post('/messages', { ...rest, content: message });
      setSent(true);
    } catch (err) {
      alert(err.message || t('Erreur lors de l\'envoi du message. Veuillez réessayer.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen">
      <Navbar />

      {/* Header */}
      <section className="bg-gradient-to-r from-brand-500 to-brand-700 py-16 text-center text-white">
        <h1 className="text-4xl font-extrabold">{t('Contactez-nous')}</h1>
        <p className="mx-auto mt-3 max-w-xl px-4 text-brand-50">
          {t('Une question, un problème ou une suggestion ? Notre équipe vous répond sous 24 heures ouvrées.')}
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Contact info */}
          <div className="space-y-4">
            {[
              { icon: Mail, title: 'Email', value: 'meskandz208@gmail.com' },
              { icon: Phone, title: 'Téléphone', value: '+213 (0) 21 00 00 00' },
              { icon: MapPin, title: 'Adresse', value: t('Alger Centre, Alger, Algérie') },
            ].map((c) => (
              <div key={c.title} className="flex items-start gap-4 rounded-2xl bg-white p-5 shadow-card">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <c.icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-semibold text-ink">{t(c.title)}</h3>
                  <p className="mt-0.5 text-sm text-gray-600">{c.value}</p>
                </div>
              </div>
            ))}
            <div className="rounded-2xl bg-white p-5 shadow-card">
              <h3 className="font-semibold text-ink">{t('Horaires')}</h3>
              <p className="mt-1 text-sm text-gray-600">
                {t('Dimanche – Jeudi : 9h00 – 17h00')}
                <br />
                {t('Vendredi – Samedi : fermé')}
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="rounded-2xl bg-white p-6 shadow-card sm:p-8 lg:col-span-2">
            {sent ? (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <CheckCircle2 className="h-14 w-14 text-brand-500" />
                <h2 className="text-2xl font-bold text-ink">{t('Message envoyé !')}</h2>
                <p className="max-w-md text-gray-600">
                  {t('Merci')} {form.name.split(' ')[0]} {t('— nous avons bien reçu votre message et nous vous répondrons à')} <b>{form.email}</b> {t('dans les plus brefs délais.')}
                </p>
                <button
                  onClick={() => {
                    setSent(false);
                    setForm({ name: '', email: '', phone: '', subject: SUBJECTS[0], message: '' });
                  }}
                  className="mt-2 rounded-full border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {t('Envoyer un autre message')}
                </button>
              </div>
            ) : (
              <form onSubmit={submit} noValidate>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-gray-700">
                      {t('Nom complet')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={form.name}
                      onChange={set('name')}
                      autoComplete="name"
                      className={`w-full rounded-xl border px-4 py-3 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 ${
                        errors.name ? 'border-red-400' : 'border-gray-200'
                      }`}
                      placeholder={t('Votre nom')}
                    />
                    {errors.name && <p className="mt-1.5 text-sm text-red-600">{t(errors.name)}</p>}
                  </div>
                  <div>
                    <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
                      {t('Email')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={set('email')}
                      autoComplete="email"
                      className={`w-full rounded-xl border px-4 py-3 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 ${
                        errors.email ? 'border-red-400' : 'border-gray-200'
                      }`}
                      placeholder={t('vous@exemple.com')}
                    />
                    {errors.email && <p className="mt-1.5 text-sm text-red-600">{t(errors.email)}</p>}
                  </div>
                </div>

                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-gray-700">
                    {t('Téléphone')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    dir="ltr"
                    value={form.phone}
                    onChange={set('phone')}
                    autoComplete="tel"
                    className={`w-full rounded-xl border px-4 py-3 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 rtl:text-right ${
                      errors.phone ? 'border-red-400' : 'border-gray-200'
                    }`}
                    placeholder="0555 12 34 56"
                  />
                  {errors.phone && <p className="mt-1.5 text-sm text-red-600">{t(errors.phone)}</p>}
                </div>
                <div>
                  <label htmlFor="subject" className="mb-1.5 block text-sm font-medium text-gray-700">
                    {t('Sujet')}
                  </label>
                  <select
                    id="subject"
                    value={form.subject}
                    onChange={set('subject')}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s}>{t(s)}</option>
                    ))}
                  </select>
                </div>
                </div>

                <div className="mt-5">
                  <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-gray-700">
                    {t('Message')} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    rows={6}
                    value={form.message}
                    onChange={set('message')}
                    className={`w-full resize-y rounded-xl border px-4 py-3 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 ${
                      errors.message ? 'border-red-400' : 'border-gray-200'
                    }`}
                    placeholder={t('Décrivez votre demande...')}
                  />
                  {errors.message && <p className="mt-1.5 text-sm text-red-600">{t(errors.message)}</p>}
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="mt-6 flex items-center justify-center gap-2 rounded-full bg-brand-500 px-8 py-3 font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
                >
                  <Send className="h-5 w-5" />
                  {sending ? t('Envoi en cours...') : t('Envoyer le message')}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
