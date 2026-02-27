import { Button } from "@/components/ui/button";

interface MessagesEmptyStateProps {
  onStartMessage: () => void;
}

const MessagesEmptyState = ({ onStartMessage }: MessagesEmptyStateProps) => {
  return (
    <div className="ig-dm-empty-state" role="status" aria-live="polite">
      <div className="ig-dm-empty-icon-wrap" aria-hidden="true">
        <svg fill="currentColor" height="96" viewBox="0 0 96 96" width="96">
          <circle cx="48" cy="48" fill="none" r="47" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path
            d="m52.309 67.221 17.024-28.643c2.25-3.784-.478-8.578-4.88-8.578H31.55c-5.084 0-7.605 6.169-3.976 9.73l10.574 10.376 3.762 15.55c1.197 4.947 7.798 5.94 10.399 1.565Z"
            fill="none"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="2"
          />
          <line fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x1="38.148" x2="55.675" y1="50.106" y2="40.134" />
        </svg>
      </div>

      <h2 className="ig-dm-empty-title">Tus mensajes</h2>
      <p className="ig-dm-empty-copy">Envia fotos y mensajes privados a un amigo o un grupo.</p>
      <Button className="ig-dm-primary-btn" onClick={onStartMessage}>
        Enviar mensaje
      </Button>
    </div>
  );
};

export default MessagesEmptyState;
