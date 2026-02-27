import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import PrivacyFaq from "@/components/privacy/PrivacyFaq";
import PrivacySectionCard from "@/components/privacy/PrivacySectionCard";
import PrivacySideNav from "@/components/privacy/PrivacySideNav";
import { PRIVACY_FAQ, PRIVACY_SECTIONS } from "@/components/privacy/privacyContent";

const Privacy = () => {
  const sections = useMemo(() => PRIVACY_SECTIONS, []);
  const [activeSectionId, setActiveSectionId] = useState<string>(sections[0]?.id ?? "");

  useEffect(() => {
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible.length > 0) {
          setActiveSectionId(visible[0].target.id);
        }
      },
      {
        rootMargin: "-120px 0px -55% 0px",
        threshold: [0.2, 0.45, 0.7],
      },
    );

    sections.forEach((section) => {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  return (
    <div className="privacy-page animate-in fade-in duration-500">
      <div className="privacy-layout">
        <PrivacySideNav activeSectionId={activeSectionId} />

        <main className="privacy-main" aria-label="Contenido de política de privacidad">
          <section className="privacy-hero" id="privacy-hero">
            <p className="privacy-hero-eyebrow">Transparencia y control</p>
            <h2 className="privacy-hero-title">Cómo protegemos tus datos en Instadetox</h2>
            <p className="privacy-hero-copy">
              Diseñamos la plataforma para reducir fricción digital sin comprometer privacidad. Esta política detalla qué datos usamos,
              por qué los usamos y qué controles tenés disponibles.
            </p>
            <div className="privacy-hero-actions">
              <a className="privacy-hero-link" href="#datos-recopilados">
                Ver datos recopilados
              </a>
              <Link href="/mas" className="privacy-hero-link muted">
                Volver a Más
              </Link>
            </div>
          </section>

          {sections.map((section) => (
            <PrivacySectionCard key={section.id} section={section} />
          ))}

          <PrivacyFaq items={PRIVACY_FAQ} />
        </main>
      </div>
    </div>
  );
};

export default Privacy;
