import BrandLogo from "@/components/BrandLogo";
import PrivacyCenterIcon from "@/components/privacy/PrivacyCenterIcon";
import {
  PRIVACY_OTHER_LABEL,
  PRIVACY_POLICY_ITEMS,
  PRIVACY_SIDE_PRIMARY_ITEMS,
} from "@/components/privacy/privacySideNavData";

interface PrivacySideNavProps {
  activeSectionId: string;
}

const PrivacySideNav = ({ activeSectionId }: PrivacySideNavProps) => {
  return (
    <aside className="privacy-sidenav-shell" aria-label="Centro de privacidad">
      <header className="privacy-sidenav-head" role="banner">
        <div className="privacy-sidenav-brand">
          <BrandLogo variant="icon" className="h-9" alt="InstaDetox" />
          <h1 className="privacy-sidenav-title">Centro de privacidad</h1>
        </div>
      </header>

      <nav className="privacy-nav-root" aria-label="Centro de privacidad">
        <ul className="privacy-nav-list">
          {PRIVACY_SIDE_PRIMARY_ITEMS.map((item) => {
            const isActive = item.sectionId ? item.sectionId === activeSectionId : false;
            const rowHref = item.sectionId ? `#${item.sectionId}` : "#privacy-hero";
            return (
              <li key={item.id}>
                <a
                  href={rowHref}
                  className={`privacy-nav-row ${isActive ? "is-active" : ""}`}
                  aria-current={isActive ? "true" : undefined}
                  data-source-href={item.href}
                  title={item.href}
                >
                  <span className="privacy-nav-icon">
                    <PrivacyCenterIcon icon={item.icon} className="privacy-nav-icon-svg" />
                  </span>
                  <span className="privacy-nav-label">{item.label}</span>
                </a>
              </li>
            );
          })}

          <li>
            <details className="privacy-nav-group" open>
              <summary className="privacy-nav-row privacy-nav-group-title">
                <span className="privacy-nav-icon">
                  <PrivacyCenterIcon icon="policy" className="privacy-nav-icon-svg" />
                </span>
                <span className="privacy-nav-label">Política de privacidad</span>
                <span className="privacy-nav-chevron" aria-hidden="true">
                  <PrivacyCenterIcon icon="chevron" className="privacy-nav-chevron-svg" />
                </span>
              </summary>
              <div className="privacy-nav-group-items">
                {PRIVACY_POLICY_ITEMS.map((item) => {
                  const isActive = item.sectionId === activeSectionId;
                  const rowHref = item.sectionId ? `#${item.sectionId}` : "#privacy-hero";
                  return (
                    <a
                      key={item.id}
                      href={rowHref}
                      className={`privacy-nav-subrow ${isActive ? "is-active" : ""}`}
                      aria-current={isActive ? "true" : undefined}
                      data-source-href={item.href}
                      title={item.href}
                    >
                      <span>{item.label}</span>
                    </a>
                  );
                })}
              </div>
            </details>
          </li>

          <li>
            <details className="privacy-nav-group">
              <summary className="privacy-nav-row privacy-nav-group-title">
                <span className="privacy-nav-icon">
                  <PrivacyCenterIcon icon="other" className="privacy-nav-icon-svg" />
                </span>
                <span className="privacy-nav-label">{PRIVACY_OTHER_LABEL}</span>
                <span className="privacy-nav-chevron" aria-hidden="true">
                  <PrivacyCenterIcon icon="chevron" className="privacy-nav-chevron-svg" />
                </span>
              </summary>
            </details>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default PrivacySideNav;
