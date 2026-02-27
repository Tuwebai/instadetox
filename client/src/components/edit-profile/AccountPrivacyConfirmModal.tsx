import type { JSX } from "react";

interface PrivacyModalItem {
  icon: JSX.Element;
  text: string;
}

interface AccountPrivacyConfirmModalProps {
  open: boolean;
  mode: "public" | "private";
  onConfirm: () => void;
  onCancel: () => void;
}

const ReelsIcon = () => (
  <svg fill="currentColor" height="24" viewBox="0 0 24 24" width="24" aria-hidden="true">
    <path d="M22.935 7.468c-.063-1.36-.307-2.142-.512-2.67a5.341 5.341 0 0 0-1.27-1.95 5.345 5.345 0 0 0-1.95-1.27c-.53-.206-1.311-.45-2.672-.513C15.333 1.012 14.976 1 12 1s-3.333.012-4.532.065c-1.36.063-2.142.307-2.67.512-.77.298-1.371.69-1.95 1.27a5.36 5.36 0 0 0-1.27 1.95c-.206.53-.45 1.311-.513 2.672C1.012 8.667 1 9.024 1 12s.012 3.333.065 4.532c.063 1.36.307 2.142.512 2.67.297.77.69 1.372 1.27 1.95.58.581 1.181.974 1.95 1.27.53.206 1.311.45 2.672.513C8.667 22.988 9.024 23 12 23s3.333-.012 4.532-.065c1.36-.063 2.142-.307 2.67-.512a5.33 5.33 0 0 0 1.95-1.27 5.356 5.356 0 0 0 1.27-1.95c.206-.53.45-1.311.513-2.672.053-1.198.065-1.555.065-4.531s-.012-3.333-.065-4.532Zm-1.998 8.972c-.05 1.07-.228 1.652-.38 2.04-.197.51-.434.874-.82 1.258a3.362 3.362 0 0 1-1.258.82c-.387.151-.97.33-2.038.379-1.162.052-1.51.063-4.441.063s-3.28-.01-4.44-.063c-1.07-.05-1.652-.228-2.04-.38a3.354 3.354 0 0 1-1.258-.82 3.362 3.362 0 0 1-.82-1.258c-.151-.387-.33-.97-.379-2.038C3.011 15.28 3 14.931 3 12s.01-3.28.063-4.44c.05-1.07.228-1.652.38-2.04.197-.51.434-.875.82-1.26a3.372 3.372 0 0 1 1.258-.819c.387-.15.97-.329 2.038-.378C8.72 3.011 9.069 3 12 3s3.28.01 4.44.063c1.07.05 1.652.228 2.04.38.51.197.874.433 1.258.82.385.382.622.747.82 1.258.151.387.33.97.379 2.038C20.989 8.72 21 9.069 21 12s-.01 3.28-.063 4.44Zm-4.584-6.828-5.25-3a2.725 2.725 0 0 0-2.745.01A2.722 2.722 0 0 0 6.988 9v6c0 .992.512 1.88 1.37 2.379.432.25.906.376 1.38.376.468 0 .937-.123 1.365-.367l5.25-3c.868-.496 1.385-1.389 1.385-2.388s-.517-1.892-1.385-2.388Zm-.993 3.04-5.25 3a.74.74 0 0 1-.748-.003.74.74 0 0 1-.374-.649V9a.74.74 0 0 1 .374-.65.737.737 0 0 1 .748-.002l5.25 3c.341.196.378.521.378.652s-.037.456-.378.651Z" />
  </svg>
);

const MentionIcon = () => (
  <svg fill="currentColor" height="24" viewBox="0 0 24 24" width="24" aria-hidden="true">
    <path d="M15.108 13.652a3.342 3.342 0 0 1-3.341 3.342h-.661a2.246 2.246 0 0 1-2.246-2.246v-.634a2.246 2.246 0 0 1 2.246-2.246h3.654" fill="none" stroke="currentColor" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="2" />
    <path d="M17.521 22h-7.368a6.95 6.95 0 0 1-3.695-.642 4.356 4.356 0 0 1-1.813-1.812 6.96 6.96 0 0 1-.64-3.696v-7.7a6.964 6.964 0 0 1 .64-3.697 4.36 4.36 0 0 1 1.813-1.812A6.952 6.952 0 0 1 10.153 2h3.74a6.95 6.95 0 0 1 3.694.64 4.356 4.356 0 0 1 1.814 1.813 6.956 6.956 0 0 1 .64 3.696v6.464a2.38 2.38 0 0 1-2.38 2.38h-.13a2.423 2.423 0 0 1-2.422-2.422V9.019a2.471 2.471 0 0 0-2.47-2.471h-.994a2.471 2.471 0 0 0-2.47 2.47v.268" fill="none" stroke="currentColor" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="2" />
  </svg>
);

const ReuseIcon = () => (
  <svg fill="currentColor" height="24" viewBox="0 0 24 24" width="24" aria-hidden="true">
    <path d="M11.999 6.999a1 1 0 0 0-1 1V11H8a1 1 0 0 0 0 2h2.999v2.998a1 1 0 0 0 2 0V13H16a1 1 0 0 0 0-2h-3.001V7.999a1 1 0 0 0-1-1ZM21.001 11a1 1 0 0 0-1 1v3.104c0 2.355-.552 3.12-1.14 3.732-.637.614-1.404 1.165-3.758 1.165H8.896c-2.352 0-3.12-.552-3.731-1.139a3.729 3.729 0 0 1-.644-.864H7a1 1 0 0 0 0-2H2a1 1 0 0 0-1 1v5a1 1 0 0 0 2 0v-2.65a6.257 6.257 0 0 0 .751.928c1.076 1.036 2.362 1.725 5.146 1.725h6.206c2.786 0 4.072-.69 5.171-1.751 1.037-1.073 1.727-2.36 1.727-5.146V12a1 1 0 0 0-1-1ZM22 .999a1 1 0 0 0-1 1v2.653a6.2 6.2 0 0 0-.751-.926c-1.073-1.037-2.36-1.727-5.146-1.727H8.897c-2.788 0-4.074.69-5.17 1.751C2.69 4.82 2 6.104 2 8.896V12a1 1 0 0 0 2 0V8.896c0-2.358.55-3.122 1.14-3.731.635-.614 1.402-1.166 3.757-1.166h6.206c2.355 0 3.12.552 3.733 1.142a3.705 3.705 0 0 1 .638.858H17a1 1 0 0 0 0 2h5a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1Z" />
  </svg>
);

const SettingsIcon = () => (
  <svg fill="currentColor" height="24" viewBox="0 0 24 24" width="24" aria-hidden="true">
    <circle cx="12" cy="12" fill="none" r="8.635" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    <path d="M14.232 3.656a1.269 1.269 0 0 1-.796-.66L12.93 2h-1.86l-.505.996a1.269 1.269 0 0 1-.796.66m-.001 16.688a1.269 1.269 0 0 1 .796.66l.505.996h1.862l.505-.996a1.269 1.269 0 0 1 .796-.66M3.656 9.768a1.269 1.269 0 0 1-.66.796L2 11.07v1.862l.996.505a1.269 1.269 0 0 1 .66.796m16.688-.001a1.269 1.269 0 0 1 .66-.796L22 12.93v-1.86l-.996-.505a1.269 1.269 0 0 1-.66-.796M7.678 4.522a1.269 1.269 0 0 1-1.03.096l-1.06-.348L4.27 5.587l.348 1.062a1.269 1.269 0 0 1-.096 1.03m11.8 11.799a1.269 1.269 0 0 1 1.03-.096l1.06.348 1.318-1.317-.348-1.062a1.269 1.269 0 0 1 .096-1.03m-14.956.001a1.269 1.269 0 0 1 .096 1.03l-.348 1.06 1.317 1.318 1.062-.348a1.269 1.269 0 0 1 1.03.096m11.799-11.8a1.269 1.269 0 0 1-.096-1.03l.348-1.06-1.317-1.318-1.062.348a1.269 1.269 0 0 1-1.03-.096" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
  </svg>
);

const MODAL_CONFIG = {
  public: {
    title: "¿Cambiar a cuenta pública?",
    confirmLabel: "Cambiar a cuenta pública",
    items: [
      { icon: <ReelsIcon />, text: "Cualquiera puede ver tus publicaciones, reels e historias, y usar tu texto y audio original." },
      { icon: <MentionIcon />, text: "Esto no cambiará quién puede enviarte mensajes, etiquetarte o @mencionarte." },
      { icon: <ReuseIcon />, text: "Las personas pueden reutilizar tus publicaciones y reels o parte de ellos en funciones como remixes, secuencias, plantillas y stickers y descargarlos como parte de su reel o publicación." },
      { icon: <SettingsIcon />, text: "Puedes desactivar la reutilización en cada publicación o reel, o cambiar la opción predeterminada en la configuración." },
    ] satisfies PrivacyModalItem[],
  },
  private: {
    title: "¿Cambiar a cuenta privada?",
    confirmLabel: "Cambiar a cuenta privada",
    items: [
      { icon: <ReelsIcon />, text: "Solo tus seguidores podrán ver tus fotos y videos." },
      { icon: <MentionIcon />, text: "Esto no cambiará quién puede enviarte mensajes, etiquetarte o @mencionarte, pero no podrás etiquetar a las personas que no te siguen." },
      { icon: <ReuseIcon />, text: "Nadie puede reutilizar tu contenido. Se eliminarán todos los reels, las publicaciones y las historias que anteriormente hayan usado tu contenido en funciones como remixes, secuencias, plantillas o stickers. Si vuelves a configurar tu cuenta como pública en menos de 24 horas, estos se restaurarán." },
    ] satisfies PrivacyModalItem[],
  },
} as const;

const AccountPrivacyConfirmModal = ({ open, mode, onConfirm, onCancel }: AccountPrivacyConfirmModalProps) => {
  if (!open) return null;

  const config = MODAL_CONFIG[mode];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4">
      <div
        role="dialog"
        className="w-[min(559px,calc(100vw-2rem))] min-h-[410px] overflow-hidden rounded-2xl border border-white/10 bg-[#20242f] text-white shadow-2xl"
      >
        <div className="px-6 pt-6 pb-4">
          <h3 className="text-[32px] leading-[1.2] font-semibold text-center">{config.title}</h3>

          <div className="mt-5 space-y-4 text-sm text-white/95">
            {config.items.map((item) => (
              <div key={item.text} className="flex gap-3">
                <span className="shrink-0 mt-0.5 text-white/95">{item.icon}</span>
                <p className="leading-5">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-white/10">
          <button type="button" onClick={onConfirm} className="h-12 w-full text-[15px] font-semibold text-[#7f92ff] hover:bg-white/5">
            {config.confirmLabel}
          </button>
        </div>

        <div className="border-t border-white/10">
          <button type="button" onClick={onCancel} className="h-12 w-full text-[15px] font-semibold text-white hover:bg-white/5">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountPrivacyConfirmModal;
