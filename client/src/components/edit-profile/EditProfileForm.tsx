import { useCallback, useRef } from "react";
import type { AuthUser } from "@/lib/AuthContext";
import type { EditProfileValues } from "@/hooks/useEditProfileForm";

interface EditProfileFormProps {
  user: AuthUser;
  values: EditProfileValues;
  errors: Partial<Record<"website" | "bio" | "gender" | "showProfileSuggestions", string>>;
  saving: boolean;
  avatarBusy: boolean;
  hasChanges: boolean;
  onFieldChange: <K extends keyof EditProfileValues>(field: K, value: EditProfileValues[K]) => void;
  onAvatarFileChange: (file: File) => void | Promise<void>;
  onSave: () => void | Promise<boolean>;
}

const EditProfileForm = ({
  user,
  values,
  errors,
  saving,
  avatarBusy,
  hasChanges,
  onFieldChange,
  onAvatarFileChange,
  onSave,
}: EditProfileFormProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bioLength = (values.bio ?? "").length;

  return (
    <section className="rounded-2xl border border-white/15 bg-slate-950/40 backdrop-blur-xl p-6">
      <header className="mb-7">
        <h2 className="text-2xl font-semibold text-white">Editar perfil</h2>
      </header>

      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-white/15 bg-white/10">
              {values.avatarUrl ? (
                <img src={values.avatarUrl} alt={`Avatar de ${values.username}`} className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{values.username}</p>
              <p className="truncate text-xs text-gray-400">{values.fullName || user.full_name || "Sin nombre visible"}</p>
            </div>
          </div>
          <button
            type="button"
            disabled={avatarBusy}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {avatarBusy ? "Subiendo..." : "Cambiar foto"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.currentTarget.value = "";
              if (!file) return;
              void onAvatarFileChange(file);
            }}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-200">Sitio web</label>
          <input
            type="text"
            value={values.website}
            onChange={(event) => onFieldChange("website", event.target.value)}
            placeholder="Sitio web"
            className="w-full rounded-xl border border-white/20 bg-black/25 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
          />
          {errors.website ? <p className="mt-1 text-xs text-rose-300">{errors.website}</p> : null}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-200">Presentación</label>
          <textarea
            value={values.bio ?? ""}
            onChange={(event) => onFieldChange("bio", event.target.value)}
            className="min-h-[90px] w-full rounded-xl border border-white/20 bg-black/25 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
            placeholder="Presentación"
            maxLength={150}
          />
          <div className="mt-1 flex items-center justify-between">
            {errors.bio ? <p className="text-xs text-rose-300">{errors.bio}</p> : <span />}
            <p className="text-xs text-gray-400">{bioLength} / 150</p>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-200">Género</label>
          <select
            value={values.gender}
            onChange={(event) => onFieldChange("gender", event.target.value as EditProfileValues["gender"])}
            className="w-full rounded-xl border border-white/20 bg-black/25 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
          >
            <option>Hombre</option>
            <option>Mujer</option>
            <option>No especificado</option>
          </select>
          {errors.gender ? <p className="mt-1 text-xs text-rose-300">{errors.gender}</p> : null}
        </div>

        <div className="rounded-xl border border-white/15 bg-black/20 px-4 py-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">Mostrar sugerencias de cuentas en los perfiles</p>
              <p className="mt-1 text-xs text-gray-400">
                Elige si las personas pueden ver sugerencias de cuentas similares en tu perfil y si se puede sugerir tu cuenta en otros perfiles.
              </p>
            </div>
            <input
              type="checkbox"
              checked={values.showProfileSuggestions}
              onChange={(event) => onFieldChange("showProfileSuggestions", event.target.checked)}
              className="h-4 w-4 shrink-0 accent-cyan-400 mt-1"
            />
          </div>
          {errors.showProfileSuggestions ? <p className="mt-1 text-xs text-rose-300">{errors.showProfileSuggestions}</p> : null}
        </div>

        <p className="text-xs text-gray-500">Cierta información del perfil, como tu nombre, presentación y enlaces, es visible para todos.</p>
      </div>

      <footer className="mt-8 flex justify-end">
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={saving || !hasChanges}
          className="rounded-xl bg-indigo-600 px-8 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Guardar perfil"}
        </button>
      </footer>
    </section>
  );
};

export default EditProfileForm;
