import type { PrivacyFaqItem } from "@/components/privacy/privacyContent";

interface PrivacyFaqProps {
  items: PrivacyFaqItem[];
}

const PrivacyFaq = ({ items }: PrivacyFaqProps) => {
  return (
    <section className="privacy-faq" aria-labelledby="privacy-faq-title">
      <h2 id="privacy-faq-title" className="privacy-faq-title">
        Preguntas frecuentes
      </h2>

      <div className="privacy-faq-list">
        {items.map((item) => (
          <details key={item.id} className="privacy-faq-item">
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
};

export default PrivacyFaq;
