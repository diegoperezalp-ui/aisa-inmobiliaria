import { createFileRoute } from "@tanstack/react-router";
import { Phone, MessageCircle, Facebook, Instagram, Mail, MapPin, Bed, Bath, Ruler, Home, KeyRound, Handshake } from "lucide-react";
import hero from "@/assets/hero-casa.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Inmobiliaria Verde | Casas y departamentos" },
      { name: "description", content: "Compra, venta y renta de propiedades. Contáctanos por teléfono, WhatsApp o redes sociales." },
      { property: "og:title", content: "Inmobiliaria Verde | Casas y departamentos" },
      { property: "og:description", content: "Compra, venta y renta de propiedades con asesoría personalizada." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

// Datos de ejemplo: reemplazar por los reales
const PHONE = "+52 55 1234 5678";
const PHONE_LINK = "tel:+525512345678";
const WHATSAPP = "https://wa.me/525512345678";

const TikTok = (p: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={p.className} aria-hidden="true">
    <path d="M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.1v12.4a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.7a5.7 5.7 0 1 0 4.9 5.7V9a7.4 7.4 0 0 0 4.3 1.4V7.3a4.3 4.3 0 0 1-3.2-1.5Z" />
  </svg>
);

const socials = [
  { name: "WhatsApp", href: WHATSAPP, Icon: MessageCircle },
  { name: "Facebook", href: "https://facebook.com", Icon: Facebook },
  { name: "Instagram", href: "https://instagram.com", Icon: Instagram },
  { name: "TikTok", href: "https://tiktok.com", Icon: TikTok },
];

const props = [
  { title: "Casa Los Pinos", place: "Zapopan, Jal.", price: "$3,850,000", bed: 3, bath: 2, m2: 180 },
  { title: "Depto. Jardín Central", place: "CDMX", price: "$2,490,000", bed: 2, bath: 2, m2: 95 },
  { title: "Residencia Bosque Real", place: "Monterrey, N.L.", price: "$7,200,000", bed: 4, bath: 4, m2: 320 },
];

function Index() {
  return (
    <div className="min-h-screen">
      {/* Barra superior de contacto */}
      <div className="bg-deep text-deep-foreground text-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2">
          <a href={PHONE_LINK} className="flex items-center gap-2 font-semibold hover:text-accent">
            <Phone className="h-4 w-4" /> {PHONE}
          </a>
          <div className="flex gap-3">
            {socials.map(({ name, href, Icon }) => (
              <a key={name} href={href} target="_blank" rel="noreferrer" aria-label={name} className="hover:text-accent">
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <a href="#" className="flex items-center gap-2 font-display text-2xl font-bold text-primary">
            <Home className="h-6 w-6" /> Inmobiliaria Verde
          </a>
          <div className="hidden gap-8 text-sm font-medium md:flex">
            <a href="#propiedades" className="hover:text-primary">Propiedades</a>
            <a href="#servicios" className="hover:text-primary">Servicios</a>
            <a href="#contacto" className="hover:text-primary">Contacto</a>
          </div>
          <a href={PHONE_LINK} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
            Llámanos
          </a>
        </nav>
      </header>

      <main>
        <section className="relative">
          <img src={hero} alt="Casa moderna rodeada de jardín" className="h-[600px] w-full object-cover" width={1600} height={1000} />
          <div className="absolute inset-0 bg-gradient-to-r from-deep/90 via-deep/60 to-transparent" />
          <div className="absolute inset-0 mx-auto flex max-w-6xl flex-col justify-center px-4 text-deep-foreground">
            <p className="mb-3 font-semibold uppercase tracking-widest text-accent">Tu nuevo hogar te espera</p>
            <h1 className="max-w-2xl text-5xl font-bold leading-tight md:text-6xl">Encuentra la propiedad ideal para tu familia</h1>
            <p className="mt-5 max-w-lg text-lg opacity-90">Compra, venta y renta con asesoría cercana y transparente.</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a href={WHATSAPP} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-semibold text-accent-foreground hover:opacity-90">
                <MessageCircle className="h-5 w-5" /> Escríbenos por WhatsApp
              </a>
              <a href={PHONE_LINK} className="flex items-center gap-2 rounded-full border-2 border-deep-foreground px-6 py-3 font-semibold hover:bg-deep-foreground hover:text-deep">
                <Phone className="h-5 w-5" /> {PHONE}
              </a>
            </div>
          </div>
        </section>

        <section id="propiedades" className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-4xl font-bold">Propiedades destacadas</h2>
          <p className="mt-2 text-muted-foreground">Una selección de nuestras mejores opciones.</p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {props.map((p) => (
              <article key={p.title} className="overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <img src={hero} alt={p.title} className="h-48 w-full object-cover" loading="lazy" />
                <div className="p-5">
                  <p className="text-2xl font-bold text-primary">{p.price}</p>
                  <h3 className="mt-1 text-xl font-semibold">{p.title}</h3>
                  <p className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-4 w-4" /> {p.place}</p>
                  <div className="mt-4 flex gap-4 border-t pt-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Bed className="h-4 w-4" /> {p.bed}</span>
                    <span className="flex items-center gap-1"><Bath className="h-4 w-4" /> {p.bath}</span>
                    <span className="flex items-center gap-1"><Ruler className="h-4 w-4" /> {p.m2} m²</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="servicios" className="bg-secondary py-20">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-3">
            {[
              { Icon: Home, t: "Compra", d: "Te ayudamos a encontrar la casa perfecta." },
              { Icon: Handshake, t: "Venta", d: "Vendemos tu propiedad al mejor precio." },
              { Icon: KeyRound, t: "Renta", d: "Opciones de renta seguras y verificadas." },
            ].map(({ Icon, t, d }) => (
              <div key={t} className="rounded-2xl bg-card p-8">
                <div className="mb-4 inline-flex rounded-xl bg-primary p-3 text-primary-foreground"><Icon className="h-6 w-6" /></div>
                <h3 className="text-2xl font-semibold">{t}</h3>
                <p className="mt-2 text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="contacto" className="mx-auto max-w-6xl px-4 py-20 text-center">
          <h2 className="text-4xl font-bold">Contáctanos por donde prefieras</h2>
          <a href={PHONE_LINK} className="mt-6 inline-block font-display text-4xl font-bold text-primary md:text-5xl">{PHONE}</a>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-5">
            {socials.map(({ name, href, Icon }) => (
              <a key={name} href={href} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-6 font-semibold hover:border-primary hover:text-primary">
                <Icon className="h-8 w-8" /> {name}
              </a>
            ))}
            <a href="mailto:contacto@inmobiliariaverde.com" className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-6 font-semibold hover:border-primary hover:text-primary">
              <Mail className="h-8 w-8" /> Correo
            </a>
          </div>
        </section>
      </main>

      <footer className="bg-deep py-10 text-deep-foreground">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 md:flex-row">
          <p className="font-display text-xl font-bold">Inmobiliaria Verde</p>
          <a href={PHONE_LINK} className="flex items-center gap-2"><Phone className="h-4 w-4" /> {PHONE}</a>
          <div className="flex gap-4">
            {socials.map(({ name, href, Icon }) => (
              <a key={name} href={href} target="_blank" rel="noreferrer" aria-label={name} className="hover:text-accent"><Icon className="h-5 w-5" /></a>
            ))}
          </div>
        </div>
      </footer>

      {/* Botones flotantes */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col gap-3">
        <a href={PHONE_LINK} aria-label="Llamar" className="flex h-14 w-14 items-center justify-center rounded-full bg-deep text-deep-foreground shadow-lg hover:scale-105"><Phone className="h-6 w-6" /></a>
        <a href={WHATSAPP} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105"><MessageCircle className="h-6 w-6" /></a>
      </div>
    </div>
  );
}
