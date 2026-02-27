import { useState } from "react";
import AccountPrivacyConfirmModal from "@/components/edit-profile/AccountPrivacyConfirmModal";

interface AccountPrivacyTabProps {
  isPrivate: boolean;
  saving: boolean;
  onToggle: (next: boolean) => void;
}

const AccountPrivacyTab = ({ isPrivate, saving, onToggle }: AccountPrivacyTabProps) => {
  const [confirmMode, setConfirmMode] = useState<"public" | "private" | null>(null);

  const handleToggleSwitch = () => {
    if (saving) return;
    setConfirmMode(isPrivate ? "public" : "private");
  };

  const handleConfirm = () => {
    if (!confirmMode) return;
    const nextValue = confirmMode === "private";
    setConfirmMode(null);
    onToggle(nextValue);
  };

  return (
    <section className="w-full max-w-[706px] min-h-[calc(100vh-135px)] rounded-2xl border border-white/15 bg-slate-950/40 backdrop-blur-xl p-6">
      <header className="mb-6">
        <h2 className="text-2xl font-semibold text-white leading-[1.2]">Privacidad de la cuenta</h2>
      </header>

      <div className="rounded-xl border border-white/15 bg-black/20 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-base font-semibold text-white">Cuenta privada</p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={isPrivate}
            aria-label="Cuenta privada"
            onClick={handleToggleSwitch}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors disabled:opacity-60 ${
              isPrivate ? "border-cyan-300/70 bg-cyan-400/80" : "border-white/30 bg-white/10"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isPrivate ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-3 text-sm leading-6 text-gray-300">
        <p>
          Si tu cuenta es pública, cualquier persona dentro y fuera de Instagram podrá ver tu perfil y tus publicaciones,
          incluso quienes no tengan una cuenta de Instagram.
        </p>
        <p>
          Si tu cuenta es privada, solo los seguidores que apruebes podrán ver el contenido que compartas, como tus fotos
          o videos en páginas de ubicaciones y hashtags, y tus listas de seguidores y seguidos. Cierta información de tu
          perfil, como la foto y el nombre de usuario, es visible para todas las personas dentro y fuera de Instagram.{" "}
          <a
            href="https://help.instagram.com/116024195217477"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-300 hover:text-cyan-200"
          >
            Más información
          </a>
        </p>
      </div>

      {saving ? (
        <footer className="mt-6 border-t border-white/10 pt-4 text-xs text-cyan-300">Guardando configuración...</footer>
      ) : null}

      <AccountPrivacyConfirmModal
        open={confirmMode !== null}
        mode={confirmMode ?? "public"}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmMode(null)}
      />
    </section>
  );
};

export default AccountPrivacyTab;