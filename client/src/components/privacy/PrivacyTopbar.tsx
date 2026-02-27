import { ShieldCheck } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { PRIVACY_LAST_UPDATED } from "@/components/privacy/privacyContent";

interface PrivacyTopbarProps {
  onJumpToFirstSection: () => void;
}

const PrivacyTopbar = ({ onJumpToFirstSection }: PrivacyTopbarProps) => {
  return (
    <header className="privacy-topbar" aria-label="Cabecera de privacidad">
      <div className="privacy-topbar-brand">
        <BrandLogo variant="icon" className="h-8" alt="InstaDetox" />
        <div className="privacy-topbar-title-wrap">
          <p className="privacy-topbar-kicker">Centro de privacidad</p>
          <h1 className="privacy-topbar-title">Política de privacidad de Instadetox</h1>
        </div>
      </div>

      <div className="privacy-topbar-actions">
        <p className="privacy-topbar-updated">Vigente desde {PRIVACY_LAST_UPDATED}</p>
        <button type="button" className="privacy-pill-btn" onClick={onJumpToFirstSection}>
          <ShieldCheck className="h-4 w-4" />
          <span>Ver secciones</span>
        </button>
      </div>
    </header>
  );
};

export default PrivacyTopbar;
