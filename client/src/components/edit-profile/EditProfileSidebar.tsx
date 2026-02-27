import { Bell, Lock, UserRound } from "lucide-react";

export type EditSettingsTab = "edit-profile" | "privacy" | "notifications" | "security";

type MenuIcon = "profile" | "privacy" | "notifications" | "security";

const MENU_ITEMS: Array<{ id: EditSettingsTab; label: string; subtitle?: string; icon: MenuIcon }> = [
  { id: "edit-profile", label: "Editar perfil", subtitle: "", icon: "profile" },
  { id: "privacy", label: "Privacidad de la cuenta", subtitle: "", icon: "privacy" },
  { id: "notifications", label: "Notificaciones", subtitle: "", icon: "notifications" },
  { id: "security", label: "Seguridad", subtitle: "", icon: "security" },
];

interface EditProfileSidebarProps {
  activeTab: EditSettingsTab;
  onChangeTab: (tab: EditSettingsTab) => void;
}

const PrivacyIcon = () => (
  <svg aria-hidden="true" fill="currentColor" height="22" viewBox="0 0 24 24" width="22">
    <path
      d="M6.71 9.555h10.581a2.044 2.044 0 0 1 2.044 2.044v8.357a2.044 2.044 0 0 1-2.043 2.043H6.71a2.044 2.044 0 0 1-2.044-2.044V11.6A2.044 2.044 0 0 1 6.71 9.555Zm1.07 0V6.222a4.222 4.222 0 0 1 8.444 0v3.333"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  </svg>
);

const NavIcon = ({ kind }: { kind: MenuIcon }) => {
  if (kind === "privacy") return <PrivacyIcon />;
  if (kind === "notifications") return <Bell size={20} />;
  if (kind === "security") return <Lock size={20} />;
  return <UserRound size={20} />;
};

const EditProfileSidebar = ({ activeTab, onChangeTab }: EditProfileSidebarProps) => {
  return (
    <aside className="w-full md:w-[320px] shrink-0 rounded-2xl border border-white/15 bg-slate-950/40 backdrop-blur-xl p-3">
      <h1 className="px-3 py-2 text-sm font-semibold tracking-wide text-gray-200">Configuración</h1>
      <ul className="space-y-1.5">
        {MENU_ITEMS.map((item) => {
          const isActive = item.id === activeTab;

          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onChangeTab(item.id)}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                  isActive
                    ? "bg-cyan-500/15 text-white border border-cyan-400/30"
                    : "text-gray-300 border border-transparent hover:bg-white/5"
                }`}
              >
                <span className="shrink-0 inline-flex items-center justify-center text-gray-100">
                  <NavIcon kind={item.icon} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm leading-5">{item.label}</span>
                  <span className="block text-xs leading-4 text-gray-400">{item.subtitle || ""}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
};

export default EditProfileSidebar;
