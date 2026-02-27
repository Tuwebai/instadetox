import type { PrivacySection } from "@/components/privacy/privacyContent";

interface PrivacySectionCardProps {
  section: PrivacySection;
}

const PrivacySectionCard = ({ section }: PrivacySectionCardProps) => {
  return (
    <section id={section.id} className="privacy-section-card" aria-labelledby={`${section.id}-title`}>
      <header className="privacy-section-head">
        <h2 id={`${section.id}-title`} className="privacy-section-title">
          {section.title}
        </h2>
        <p className="privacy-section-summary">{section.summary}</p>
      </header>

      <ul className="privacy-section-points">
        {section.points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </section>
  );
};

export default PrivacySectionCard;
